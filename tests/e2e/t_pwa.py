import os
ROOT = os.environ.get('REHLATI_URL', 'file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
HTTP_ROOT = os.environ.get('REHLATI_HTTP', 'http://localhost:8765')
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
from playwright.sync_api import sync_playwright
import json
U = HTTP_ROOT + '/index.html?demo=1'
O = os.path.join(os.path.dirname(__file__), 'shots') + '/'
res = []; err = []
def ok(n, c, x=''):
    res.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n + (' :: ' + str(x) if x != '' else ''))
FAKE_PROMPT = """window.__prompted=0; setTimeout(()=>{const e=new Event('beforeinstallprompt',{cancelable:true}); e.prompt=()=>{window.__prompted++}; e.userChoice=Promise.resolve({outcome:'accepted'}); window.dispatchEvent(e);},300);"""
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    # ---- Android-like
    ctx = b.new_context(viewport={'width': 412, 'height': 900}, device_scale_factor=2, user_agent='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36')
    ctx.add_init_script(FAKE_PROMPT)
    pg = ctx.new_page(); pg.on('pageerror', lambda e: err.append(str(e)))
    pg.goto(U); pg.wait_for_timeout(1500)
    man = pg.evaluate("fetch(document.querySelector('link[rel=manifest]').href).then(r=>r.json())")
    ok('manifest valid', man['display'] == 'standalone' and man['short_name'] == 'UTravel' and len(man['icons']) == 3, man['start_url'])
    ok('icons load', all(pg.evaluate(f"fetch('{i['src']}').then(r=>r.status)") == 200 for i in man['icons']))
    sw = pg.evaluate("navigator.serviceWorker.ready.then(r=>!!r.active)")
    ok('service worker active', sw)
    pg.reload(); pg.wait_for_timeout(1200)
    ok('page controlled by SW', pg.evaluate("!!navigator.serviceWorker.controller"))
    keys = pg.evaluate("caches.keys().then(k=>Promise.all(k.map(n=>caches.open(n).then(c=>c.keys()).then(r=>r.map(x=>x.url)))))")
    flat = sum(keys, [])
    ok('app shell cached', any(u.endswith('/index.html') for u in flat) and any('hero.jpg' in u for u in flat), len(flat))
    ok('no bar on first page', pg.locator('#install-layer .inst').count() == 0)
    pg.goto(U + '#/trip/t4'); pg.wait_for_timeout(4800)
    ok('install bar after trip page', pg.locator('#install-layer .inst').count() == 1, pg.evaluate("({views:INSTALL.views, shown:INSTALL.shown, deferred:!!INSTALL.deferred, snoozed:snoozed(), sa:isStandalone(), ua:navigator.userAgent.slice(0,40)})"))
    pg.screenshot(path=O + 'p1-android-bar.png')
    pg.click('#install-layer [data-a=app-install]'); pg.wait_for_timeout(300)
    ok('install button triggers browser prompt', pg.evaluate("window.__prompted") == 1)
    ok('bar hidden after install tap', pg.locator('#install-layer .inst').count() == 0)
    ok('footer "get the app" button', pg.locator('footer [data-install-btn]').count() == 1)
    # offline
    ctx.set_offline(True)
    pg.goto(U + '#/trips'); pg.wait_for_timeout(1200)
    ok('opens offline from cache', pg.locator('.tcard').count() > 3)
    ctx.set_offline(False)
    # snooze
    ctx2 = b.new_context(viewport={'width': 412, 'height': 900}); ctx2.add_init_script(FAKE_PROMPT)
    q = ctx2.new_page(); q.goto(U + '#/trip/t1'); q.wait_for_timeout(4800)
    q.click('#install-layer [data-a=install-later]'); q.wait_for_timeout(200)
    q.goto(U + '#/trip/t3'); q.reload(); q.wait_for_timeout(4800)
    ok('"not now" snoozes the bar', q.locator('#install-layer .inst').count() == 0)
    # ---- iPhone (no install event)
    ip = b.new_context(**p.devices['iPhone 13'])
    i = ip.new_page(); i.on('pageerror', lambda e: err.append('iOS ' + str(e)))
    i.goto(U + '#/trip/t7'); i.wait_for_timeout(4800)
    ok('iPhone bar shows how-to button', i.locator('#install-layer [data-a=app-install]').inner_text().strip() in ('إزاي أثبّته؟',))
    i.screenshot(path=O + 'p2-ios-bar.png')
    i.click('#install-layer [data-a=app-install]'); i.wait_for_timeout(400)
    ok('iPhone instructions modal', i.locator('.install-steps li').count() == 3)
    i.screenshot(path=O + 'p3-ios-steps.png')
    # installed (standalone) → nothing shown
    st = b.new_context(**p.devices['iPhone 13']); st.add_init_script("Object.defineProperty(navigator,'standalone',{get:()=>true})")
    s = st.new_page(); s.goto(U + '#/trip/t7'); s.wait_for_timeout(4800)
    ok('installed app: no bar, no buttons', s.locator('#install-layer .inst').count() == 0 and s.locator('[data-install-btn]').count() == 0)
    b.close()
print('ERRORS', json.dumps(err[:8], ensure_ascii=False)); print('SUMMARY', sum(res), '/', len(res))
