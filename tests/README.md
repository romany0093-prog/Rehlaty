# Tests

| Folder | What | How to run |
|---|---|---|
| `e2e/` | Playwright (Python) browser tests on the offline demo (`index.html?demo=1`) – user journeys, compare, PWA, password reset, phone sign-up & WhatsApp-code recovery (`t_auth_phone.py`), brand (`t_brand.py`), mobile & app UX (`t_ux_mobile.py`), custom trips, stored-XSS fuzz, front-end performance | `pip install playwright` then `python3 tests/e2e/test_journeys.py` (set `CHROME` to your Chrome path; `t_pwa.py` and `t_perf.py` need `python3 -m http.server 8765` in the project root) |
| `sql/security_regression.sql` | RLS / RPC authorization, tenant isolation, input validation, booking & payment integrity – runs as the real API roles inside a transaction that is rolled back | paste into the Supabase SQL editor; every line of the report must say PASS |
| `unit/webhook-signature.test.mjs` | payment-webhook signature verification | `node --experimental-strip-types tests/unit/webhook-signature.test.mjs` |
| `load/k6-public.js` | load test of the public API (not run by the audit) | `k6 run -e SCENARIO=normal tests/load/k6-public.js` – only with the owner's approval |
