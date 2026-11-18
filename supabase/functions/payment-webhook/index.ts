// Edge Function: payment-webhook  (NOT DEPLOYED – ready for when a gateway account exists)
// The payment provider calls this URL after a payment. It:
//   1. verifies the HMAC signature of the raw body with the provider secret (PAYMENT_WEBHOOK_SECRET),
//   2. rejects stale events (timestamp older than 5 minutes),
//   3. calls confirm_gateway_payment() with the service role – that function is idempotent per event,
//      checks amount and currency, and records late / duplicate payments for reconciliation.
// The browser can never confirm a payment in 'gateway' mode (settings.paymentMode = 'gateway').
// Provider-specific field names (Paymob / Fawry / Kashier) are mapped in `parseEvent`.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifySignature, parseEvent } from './verify.ts';

const SECRET = Deno.env.get('PAYMENT_WEBHOOK_SECRET') ?? '';
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method', { status: 405 });
  const raw = await req.text();
  const ok = await verifySignature(raw, req.headers.get('x-signature') ?? '', req.headers.get('x-timestamp') ?? '', SECRET, Date.now());
  if (!ok) return new Response('bad signature', { status: 401 });
  let ev;
  try { ev = parseEvent(JSON.parse(raw)); } catch { return new Response('bad payload', { status: 400 }); }
  if (ev.status !== 'success') return new Response('ignored', { status: 200 });
  const { data, error } = await db.rpc('confirm_gateway_payment', {
    p_event_id: ev.eventId, p_booking: ev.bookingId, p_amount: ev.amount, p_currency: ev.currency, p_provider: ev.provider, p_txn: ev.txn,
  });
  if (error) {
    // amount/currency mismatch etc.: 422 so the provider does not keep retrying a payload that will never be valid
    const code = (error.message || '').split(':')[0];
    return new Response(code, { status: ['AMOUNT_MISMATCH', 'CURRENCY_MISMATCH', 'NOT_FOUND'].includes(code) ? 422 : 500 });
  }
  return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
});
