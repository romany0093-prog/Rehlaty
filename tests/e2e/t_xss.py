import os
ROOT = os.environ.get('REHLATI_URL', 'file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
HTTP_ROOT = os.environ.get('REHLATI_HTTP', 'http://localhost:8765')
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
"""Client-side XSS sink verification (demo mode uses the same rendering code as production).
Each payload sets window.__x to a tag; the test reports which sinks execute script."""
import sys
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else ROOT + '/index.html?demo=1'
res = []
def ok(n, c, x=''):
    res.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n + (' :: ' + str(x) if x != '' else ''))
A = lambda tag: f'#" autofocus tabindex=1 onfocus="window.__x=(window.__x||[]).concat(\'{tag}\')" x="'
IMG = lambda tag: f'x" onerror="window.__x=(window.__x||[]).concat(\'{tag}\')" x="'
COLOR = lambda tag: f'red" onmouseover="window.__x=(window.__x||[]).concat(\'{tag}\')" x="'
HTML = lambda tag: f'<img src=x onerror="window.__x=(window.__x||[]).concat(\'{tag}\')">'
inject = f"""
tx(d => {{
  d.notifications.push({{id:'nx1', to:'admin', title:{{ar:'x',en:'x'}}, body:{{ar:'x',en:'x'}}, link:{A('notif-link')!r}, read:false, createdAt:new Date().toISOString()}});
  d.activity.unshift({{id:'ax1', at:new Date().toISOString(), text:{{ar:{HTML('activity')!r}, en:{HTML('activity')!r}}}}});
  const c = d.companies.find(c=>c.id==='c2'); c.color = {COLOR('co-color')!r}; delete c.logo;
  const c1 = d.companies.find(c=>c.id==='c1'); c1.logo = {IMG('co-logo')!r};
  const t = d.trips.find(t=>t.id==='t1'); t.images = [{IMG('trip-img')!r}];
  const u = d.users.find(u=>u.id==='u_k1'); u.name = {HTML('cust-name')!r};
  const r = d.reviews[0]; r.text = {HTML('review')!r}; r.customerName = {HTML('review-name')!r};
  c.name = {{ar:{HTML('co-name')!r}, en:'x'}};
}});
"""
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 1360, 'height': 900})
    pg.on('dialog', lambda d: d.dismiss())
    pg.goto(URL); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(500)
    pg.evaluate(inject)
    def visit(h, hover=True):
        pg.goto(URL + h); pg.wait_for_timeout(500)
        if hover:
            for el in pg.query_selector_all('.co-logo')[:6]:
                try: el.hover(timeout=500)
                except Exception: pass
        pg.wait_for_timeout(200)
    for h in ['#/', '#/trips', '#/trip/t1', '#/companies', '#/company/c2']: visit(h)
    pg.goto(URL + '#/login'); pg.wait_for_timeout(200); pg.click('[data-a=demo-login][data-e="admin"]'); pg.wait_for_timeout(500)
    for h in ['#/admin', '#/admin/notifications', '#/admin/companies', '#/admin/customers', '#/admin/trips']: visit(h)
    hits = pg.evaluate('window.__x || []')
    print('executed sinks:', sorted(set(hits)))
    for s in ['notif-link', 'activity', 'co-color', 'co-logo', 'trip-img', 'cust-name', 'review', 'review-name', 'co-name']:
        ok(f'sink {s} does not execute script', s not in hits)
    b.close()
print(f'{sum(res)}/{len(res)} passed')
