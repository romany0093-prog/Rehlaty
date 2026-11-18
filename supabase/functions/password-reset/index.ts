// Edge Function: password-reset
// Accepts a username OR e-mail and asks Supabase Auth to send the reset e-mail.
// The username → e-mail lookup runs here with the service role, so the browser never sees anyone's
// e-mail, and the response is identical whether the account exists or not (no account enumeration).
// Deploy with verify_jwt = false (the site calls it with the publishable key).
import { createClient } from 'npm:@supabase/supabase-js@2';

const URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (status = 200) => new Response(JSON.stringify({ ok: true }), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response('{}', { status: 405, headers: cors });
  let body: { ident?: unknown; redirectTo?: unknown } = {};
  try { body = await req.json(); } catch { return reply(); }
  const ident = String(body.ident ?? '').trim().toLowerCase().slice(0, 120);
  const redirectTo = String(body.redirectTo ?? '').slice(0, 300); // Supabase Auth only honours allow-listed redirect URLs
  let email: string | null = null;
  if (/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(ident)) email = ident;
  else if (/^[a-z0-9_.]{3,24}$/.test(ident)) {
    const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
    const { data } = await admin.from('profiles').select('email').eq('username', ident).maybeSingle();
    email = data?.email ?? null;
  }
  if (email) {
    const anon = createClient(URL, ANON, { auth: { persistSession: false } });
    const { error } = await anon.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
    if (error && (error.status === 429 || /rate limit|seconds/i.test(error.message))) return reply(429);
    if (error) console.warn('reset', error.message);
  }
  return reply();
});
