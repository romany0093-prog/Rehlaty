// Signature check for the payment webhook (Web Crypto: runs on Deno and Node 18+).
// signature = hex(HMAC-SHA256(secret, `${timestamp}.${rawBody}`)), timestamp in ms.
export async function verifySignature(raw: string, sigHex: string, ts: string, secret: string, now: number): Promise<boolean> {
  if (!secret || !/^[0-9a-f]{64}$/i.test(sigHex) || !/^\d{10,16}$/.test(ts)) return false;
  if (Math.abs(now - Number(ts)) > 5 * 60 * 1000) return false; // replay window
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${ts}.${raw}`)));
  const want = Array.from(mac, (b) => b.toString(16).padStart(2, '0')).join('');
  // constant-time compare
  let diff = want.length ^ sigHex.length;
  for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ (sigHex.toLowerCase().charCodeAt(i) || 0);
  return diff === 0;
}
export type PayEvent = { eventId: string; bookingId: string; amount: number; currency: string; provider: string; txn: string; status: string };
export function parseEvent(o: Record<string, unknown>): PayEvent {
  const s = (v: unknown) => String(v ?? '');
  const ev = { eventId: s(o.event_id), bookingId: s(o.merchant_order_id), amount: Number(o.amount), currency: s(o.currency), provider: s(o.provider || 'gateway'), txn: s(o.transaction_id), status: s(o.status) };
  if (!/^[A-Za-z0-9_-]{4,80}$/.test(ev.eventId) || !/^[A-Za-z0-9_-]{4,64}$/.test(ev.bookingId) || !Number.isFinite(ev.amount)) throw new Error('payload');
  return ev;
}
