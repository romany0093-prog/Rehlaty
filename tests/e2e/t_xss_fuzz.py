import os
ROOT = os.environ.get('REHLATI_URL', 'file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
HTTP_ROOT = os.environ.get('REHLATI_HTTP', 'http://localhost:8765')
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
"""Deep stored-XSS fuzz: every free-text string in the data gets a polyglot payload
(HTML + attribute context). Then every route is rendered for every role and modal/confirm
texts are opened. Any executed payload is reported with the data path it came from."""
import sys, json
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else ROOT + '/index.html?demo=1'
FUZZ = r"""
(() => {
  window.__hits = new Set(); window.__hit = (p) => window.__hits.add(p);
  const EXCL = /^(id|ref|status|paymentStatus|role|method|kind|season|art|code|start|end|from|to|at|until|validUntil|createdAt|updatedAt|paidAt|holdUntil|expiresAt|acceptedAt|processedAt|approvedAt|seededAt|email|password|phone|stay|meals|stayLevel|transportType|sender|lang|to_user|icon|mark|color|logo|cover|images|link|tripId|depId|departureId|companyId|customerId|requestId|offerId|bookingId|destId|catId|campaignId|acceptedOfferId|basedOn|requestCustomer|companyIdRef|username)$/;
  const P = (path) => `"'><img src=x onerror="__hit('${path}')">`;
  let n = 0;
  const walk = (o, path, key) => {
    if (Array.isArray(o)) return o.map((v, i) => walk(v, path + '[' + i + ']', key));
    if (o && typeof o === 'object') { for (const k of Object.keys(o)) o[k] = walk(o[k], path + '.' + k, k); return o; }
    if (typeof o === 'string' && !EXCL.test(key) && !/^\d{4}-\d{2}/.test(o) && !/^(art:|data:|#|assets\/)/.test(o) && o.length > 1 && !/^[a-z0-9_]+$/.test(o)) { n++; return o + P(path.slice(0, 80)); }
    return o;
  };
  tx((d) => { for (const k of Object.keys(d)) if (k !== 'version') d[k] = walk(d[k], k, k); });
  // attribute sinks that the client must neutralise even if the server let them through
  tx((d) => {
    d.companies.forEach((c, i) => { if (i % 2) { c.logo = `x" onerror="__hit('logo')`; } else { delete c.logo; c.color = `red" onmouseover="__hit('color')`; } c.cover = `x" onerror="__hit('cover')`; });
    d.trips.forEach((t) => { t.images = [`x" onerror="__hit('tripimg')`]; });
    d.notifications.forEach((x) => { x.link = `#" autofocus onfocus="__hit('notiflink')" x="`; });
    if (d.settings.banners) d.settings.banners.forEach((b) => { b.active = true; b.link = `#" onmouseover="__hit('bannerlink')" x="`; });
  });
  return n;
})()
"""
res = []
def ok(name, c, x=''):
    res.append(bool(c)); print(('PASS ' if c else 'FAIL ') + name + (' :: ' + str(x) if x != '' else ''))
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 1360, 'height': 900})
    pg.on('dialog', lambda d: d.dismiss())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:120]))
    pg.goto(URL); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(400)
    n = pg.evaluate(FUZZ); print('strings poisoned:', n)
    ids = pg.evaluate("({t: db.trips.find(t=>t.status==='active').id, c: db.companies.find(c=>c.status==='approved').id, d: db.destinations[0].id})")
    def sweep(routes, clicks=()):
        for r in routes:
            pg.goto(URL + r); pg.wait_for_timeout(250)
            for el in pg.query_selector_all('.co-logo, .promo, a.notif')[:8]:
                try: el.hover(timeout=300)
                except Exception: pass
            for sel in clicks:
                for el in pg.query_selector_all(sel)[:2]:
                    try: el.evaluate('e => e.click()'); pg.wait_for_timeout(200); pg.keyboard.press('Escape')
                    except Exception: pass
    pub = ['#/', '#/trips', f'#/trip/{ids["t"]}', '#/destinations', '#/companies', f'#/company/{ids["c"]}', '#/offers', f'#/compare?ids={ids["t"]}', '#/page/faq', '#/page/about', '#/login', '#/register', '#/register/company']
    sweep(pub, ['[data-a=cmp-add]', '[data-a=share]'])
    def login(who):
        pg.evaluate("setSession(null)"); pg.goto(URL + '#/login'); pg.wait_for_timeout(200)
        pg.click(f'[data-a=demo-login][data-e="{who}"]'); pg.wait_for_timeout(400)
    login('mariam')
    refs = pg.evaluate("myBookings().slice(0,3).map(b=>b.ref)")
    sweep(['#/me', '#/me/bookings', '#/me/payments', '#/me/cancellations', '#/me/favorites', '#/me/reviews', '#/me/notifications', '#/me/profile', '#/me/requests', '#/me/request/rq1', '#/plan'] + [f'#/me/booking/{r}' for r in refs] + [f'#/book/{ids["t"]}'],
          ['[data-a=offer-chat]', '[data-a=offers-compare]', '[data-a=offer-decline]', '[data-a=offer-accept]', '[data-a=req-cancel]', '[data-a=cancel-bk]', '[data-a=dispute]'])
    login('bahr')
    sweep(['#/co', '#/co/trips', '#/co/bookings', '#/co/finance', '#/co/reviews', '#/co/notifications', '#/co/profile', '#/co/requests', '#/co/request/rq1', '#/co/request/rq2', '#/co/trip/t1/edit', '#/co/trip/t1/departures'],
          ['[data-a=bk-open]', '[data-a=trip-del]', '[data-a=dep-cancel]', '[data-a=offer-edit]', 'tbody tr'])
    login('admin')
    sweep(['#/admin', '#/admin/companies', '#/admin/trips', '#/admin/customers', '#/admin/bookings', '#/admin/finance', '#/admin/offers', '#/admin/requests', '#/admin/content', '#/admin/taxonomy', '#/admin/notifications', '#/admin/settings'],
          ['[data-a=co-approve]', '[data-a=co-reject]', '[data-a=co-view]', '[data-a=tr-reject]', '[data-a=cp-del]', '[data-a=rf-open]', '[data-a=dp-resolve]', 'tbody tr'])
    hits = sorted(pg.evaluate('[...window.__hits]'))
    print('executed payload paths:', json.dumps(hits, ensure_ascii=False)[:3000])
    ok('no stored-XSS payload executed anywhere', not hits, len(hits))
    b.close()
print(f'{sum(res)}/{len(res)} passed')
