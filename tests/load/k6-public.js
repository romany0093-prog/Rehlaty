// k6 load test – public read traffic against the live Supabase API.
// NOT executed by the audit (the audit environment cannot reach supabase.co).
// Run it yourself only with the project owner's approval, outside peak hours:
//   k6 run -e SCENARIO=normal tests/load/k6-public.js     (50 VUs, 10 min)
//   k6 run -e SCENARIO=medium tests/load/k6-public.js     (100 VUs, 15 min)
//   k6 run -e SCENARIO=spike  tests/load/k6-public.js     (20 → 200 → 20 VUs)
// The free Supabase plan has request and connection limits; expect 429/503 well before 500 VUs.
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = 'https://soysfbirinxmkivenvnp.supabase.co/rest/v1/';
const KEY = 'sb_publishable_s8gZKounghBOLKBAFgxe0g_EP-aQ6f7'; // public (publishable) key, same as in index.html
const H = { headers: { apikey: KEY, 'Content-Type': 'application/json' } };

const SCENARIOS = {
  normal: { executor: 'constant-vus', vus: 50, duration: '10m' },
  medium: { executor: 'constant-vus', vus: 100, duration: '15m' },
  high: { executor: 'constant-vus', vus: 250, duration: '15m' },
  stress: { executor: 'ramping-vus', startVUs: 100, stages: [{ duration: '5m', target: 300 }, { duration: '5m', target: 500 }, { duration: '2m', target: 0 }] },
  spike: { executor: 'ramping-vus', startVUs: 20, stages: [{ duration: '1m', target: 20 }, { duration: '20s', target: 200 }, { duration: '3m', target: 200 }, { duration: '1m', target: 20 }] },
};
export const options = {
  scenarios: { main: SCENARIOS[__ENV.SCENARIO || 'normal'] },
  thresholds: {
    'http_req_duration{kind:public}': ['p(95)<500'],
    'http_req_duration{kind:search}': ['p(95)<800'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  // what the site loads for a guest (see loadCloud in src/4b-cloud.js)
  const r1 = http.get(BASE + 'trips?select=*', { ...H, tags: { kind: 'public' } });
  const r2 = http.get(BASE + 'departures?select=*', { ...H, tags: { kind: 'search' } });
  const r3 = http.post(BASE + 'rpc/seat_counts', '{}', { ...H, tags: { kind: 'public' } });
  const r4 = http.get(BASE + 'reviews?select=*', { ...H, tags: { kind: 'public' } });
  check(r1, { 'trips 200': (r) => r.status === 200 });
  check(r2, { 'departures 200': (r) => r.status === 200 });
  check(r3, { 'seats 200': (r) => r.status === 200 });
  check(r4, { 'reviews 200': (r) => r.status === 200 });
  sleep(1 + Math.random() * 2);
}
