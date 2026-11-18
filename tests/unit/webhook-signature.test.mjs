import { verifySignature, parseEvent } from '../../supabase/functions/payment-webhook/verify.ts';
import { createHmac } from 'node:crypto';
const S = 'test_secret_only', now = Date.now(); let pass = 0, n = 0;
const ok = (name, c) => { n++; if (c) pass++; console.log((c ? 'PASS ' : 'FAIL ') + name); };
const body = JSON.stringify({ event_id: 'evt_0001', merchant_order_id: 'b_abc123', amount: 1700, currency: 'EGP', transaction_id: 'T1', status: 'success' });
const sign = (b, ts, s = S) => createHmac('sha256', s).update(`${ts}.${b}`).digest('hex');
ok('valid signature accepted', await verifySignature(body, sign(body, now), String(now), S, now));
ok('tampered body rejected', !(await verifySignature(body.replace('1700', '1'), sign(body, now), String(now), S, now)));
ok('wrong secret rejected', !(await verifySignature(body, sign(body, now, 'other'), String(now), S, now)));
ok('stale timestamp (10 min) rejected', !(await verifySignature(body, sign(body, now - 600000), String(now - 600000), S, now)));
ok('missing signature rejected', !(await verifySignature(body, '', String(now), S, now)));
ok('empty server secret rejects everything', !(await verifySignature(body, sign(body, now, ''), String(now), '', now)));
ok('payload parsed', parseEvent(JSON.parse(body)).amount === 1700);
let threw = false; try { parseEvent({ event_id: 'x"; drop', merchant_order_id: 'b', amount: 'NaN' }); } catch { threw = true; }
ok('malformed payload rejected', threw);
console.log(`${pass}/${n} passed`);
