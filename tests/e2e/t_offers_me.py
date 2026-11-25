"""Offers up front for travellers: top of the dashboard and under the header on the home page; hidden when there are none."""
import os
ROOT = os.environ.get('REHLATI_URL', 'file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
from playwright.sync_api import sync_playwright
U = ROOT + '/index.html?demo=1'
res = []; err = []
def ok(n, c, x=''):
    res.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n + (' :: ' + str(x) if x != '' else ''))
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    for vw, size in {'desktop': (1440, 900), 'phone': (390, 844)}.items():
        ctx = b.new_context(viewport={'width': size[0], 'height': size[1]}, permissions=['clipboard-read', 'clipboard-write'])
        pg = ctx.new_page(); pg.on('pageerror', lambda e: err.append(str(e)[:160]))
        pg.goto(U); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(400)
        ok(f'{vw}: guest home has no traveller block, normal offers section', pg.locator('.cust-offers').count() == 0 and pg.locator('.camp').count() >= 1)
        pg.goto(U + '#/login'); pg.wait_for_timeout(250); pg.click('[data-a=demo-login][data-e="mariam"]'); pg.wait_for_timeout(500)
        first = pg.evaluate("document.querySelector('#main').firstElementChild.className")
        ok(f'{vw}: dashboard opens with the offers block first', 'cust-offers' in first, first)
        y = pg.locator('.cust-offers h2').bounding_box()['y']
        ok(f'{vw}: offers heading visible without scrolling', 0 < y < 200, y)
        ok(f'{vw}: seasonal offers and promo codes listed', pg.locator('.cust-offers .camp').count() >= 1 and pg.locator('.cust-offers .coupon').count() >= 1)
        pg.locator('.cust-offers [data-a=copy-code]').first.click(); pg.wait_for_timeout(300)
        code = pg.locator('.cust-offers [data-a=copy-code]').first.get_attribute('data-code')
        ok(f'{vw}: copy-code button copies the code', pg.evaluate('navigator.clipboard.readText()') == code and code in pg.inner_text('.toasts'))
        pg.goto(U + '#/'); pg.wait_for_timeout(400)
        order = pg.evaluate("[...document.querySelector('#main').children].map(e => e.className.split(' ')[0]).slice(0, 2)")
        ok(f'{vw}: home (logged in) shows offers right under the header, before the hero', order == ['cust-offers', 'hero'], order)
        ok(f'{vw}: home (logged in) does not repeat the offers section', pg.locator('.camp').count() == pg.locator('.cust-offers .camp').count())
        ok(f'{vw}: no sideways scroll', pg.evaluate('document.documentElement.scrollWidth') <= size[0] + 1)
        pg.locator('.cust-offers .camp').first.click(); pg.wait_for_timeout(400)
        ok(f'{vw}: offer card opens its trips', '#/trips?offer=' in pg.url, pg.url)
        pg.evaluate("tx(d => { d.settings.campaigns = []; d.settings.offers = []; })"); pg.goto(U + '#/me'); pg.wait_for_timeout(400)
        ok(f'{vw}: no offers → block hidden, dashboard starts as before', pg.locator('.cust-offers').count() == 0)
        ctx.close()
    b.close()
print('errors:', err[:5]); print(f'{sum(res)}/{len(res)} passed')
