"""'Exclusive offers for you' corner card for travellers: slides in on the home page and dashboard, cycles through
offers, pauses on hover, closes to a reopen button for the visit; hidden for guests/companies and when there are no offers."""
import os
ROOT = os.environ.get('REHLATI_URL', 'file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
from playwright.sync_api import sync_playwright
U = ROOT + '/index.html?demo=1'
res = []; err = []
def ok(n, c, x=''):
    res.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n + (' :: ' + str(x) if x != '' else ''))
def login(pg, who):
    pg.evaluate("setSession(null)"); pg.goto(U + '#/login'); pg.wait_for_timeout(250); pg.click(f'[data-a=demo-login][data-e="{who}"]'); pg.wait_for_timeout(400)
cur = "document.querySelector('.ofc-slide.on').dataset.k"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    for vw, size in {'desktop': (1440, 900), 'phone': (390, 844)}.items():
        ctx = b.new_context(viewport={'width': size[0], 'height': size[1]}, permissions=['clipboard-read', 'clipboard-write'])
        pg = ctx.new_page(); pg.on('pageerror', lambda e: err.append(str(e)[:160]))
        pg.goto(U); pg.evaluate('localStorage.clear(); sessionStorage.clear()'); pg.reload(); pg.wait_for_timeout(2400)
        ok(f'{vw}: guests get no corner card; home offers section as usual', pg.locator('.ofc').count() == 0 and pg.locator('.camp').count() >= 1)
        login(pg, 'mariam')
        ok(f'{vw}: dashboard no longer has the big block', pg.locator('.cust-offers').count() == 0)
        pg.mouse.move(5, 5); pg.goto(U + '#/'); pg.wait_for_timeout(300)
        ok(f'{vw}: card waits a moment before appearing', pg.locator('.ofc.in').count() == 0 and pg.locator('.ofc').count() == 1)
        pg.wait_for_timeout(2000)
        ok(f'{vw}: card slides in', pg.locator('.ofc.in').count() == 1 and pg.evaluate("getComputedStyle(document.querySelector('.ofc')).opacity") == '1')
        ok(f'{vw}: titled "عروض حصرية ليك"', pg.inner_text('.ofc-h b') == 'عروض حصرية ليك')
        bb = pg.locator('.ofc').bounding_box()
        ok(f'{vw}: sits in the bottom corner, inside the screen', bb['y'] + bb['height'] <= size[1] - 10 and bb['x'] >= 0 and bb['x'] + bb['width'] <= size[0], bb)
        if vw == 'phone':
            tb = pg.locator('.tabbar').bounding_box(); ok('phone: card sits above the tab bar', bb['y'] + bb['height'] <= tb['y'], (bb, tb))
        ok(f'{vw}: home page back to its normal order (hero first)', pg.evaluate("document.querySelector('#main').firstElementChild.className.split(' ')[0]") == 'hero')
        n = pg.locator('.ofc-slide').count()
        ok(f'{vw}: seasonal offers and promo codes in the card', n >= 3 and pg.locator('.ofc-promo').count() >= 1, n)
        ok(f'{vw}: counter reads 1 / n', pg.inner_text('.ofc-n') == f'1 / {n}', pg.inner_text('.ofc-n'))
        pg.wait_for_timeout(4800)
        ok(f'{vw}: rotates to the next offer by itself', pg.evaluate(cur) == '1' and pg.inner_text('.ofc-n') == f'2 / {n}')
        ok(f'{vw}: only the shown offer is reachable (others inert)', pg.locator('.ofc-slide[inert]').count() == n - 1)
        if vw == 'desktop':
            pg.hover('.ofc'); pg.wait_for_timeout(5000)
            ok('desktop: pauses while the mouse is on it', pg.evaluate(cur) == '1')
        else:
            pass  # phones: no hover; taps must not pause the rotation
        pg.mouse.move(5, 5)
        pg.click('.ofc-dots button[data-k="%d"]' % (n - 1)); pg.wait_for_timeout(700)
        ok(f'{vw}: dots jump to an offer', pg.evaluate(cur) == str(n - 1))
        pg.locator('.ofc-slide.on [data-a=copy-code]').click(); pg.wait_for_timeout(300)
        code = pg.locator('.ofc-slide.on [data-a=copy-code]').get_attribute('data-code')
        ok(f'{vw}: copy-code copies the promo code', pg.evaluate('navigator.clipboard.readText()') == code)
        pg.click('[data-a=ofc-close]'); pg.wait_for_timeout(500)
        ok(f'{vw}: close leaves a small reopen button', pg.locator('.ofc').count() == 0 and pg.locator('.ofc-pill').count() == 1)
        pg.goto(U + '#/me'); pg.wait_for_timeout(2400)
        ok(f'{vw}: stays closed for the rest of the visit (dashboard too)', pg.locator('.ofc').count() == 0 and pg.locator('.ofc-pill').is_visible())
        pg.click('.ofc-pill'); pg.wait_for_timeout(600)
        ok(f'{vw}: reopen button brings the card back', pg.locator('.ofc.in').count() == 1)
        pg.goto(U + '#/trips'); pg.wait_for_timeout(500)
        ok(f'{vw}: not shown on other pages', pg.locator('.ofc, .ofc-pill').count() == 0)
        pg.goto(U + '#/'); pg.wait_for_timeout(2400)
        pg.locator('.ofc-slide.on').first.wait_for()
        if pg.evaluate("document.querySelector('.ofc-slide.on').tagName") == 'A':
            pg.click('.ofc-slide.on'); pg.wait_for_timeout(400); ok(f'{vw}: offer opens its trips', '#/trips?offer=' in pg.url, pg.url)
        else:
            pg.evaluate("ofcGo(0)"); pg.wait_for_timeout(700); pg.click('.ofc-slide.on .btn'); pg.wait_for_timeout(400); ok(f'{vw}: offer opens its trips', '#/trips?offer=' in pg.url, pg.url)
        ok(f'{vw}: no sideways scroll', pg.evaluate('document.documentElement.scrollWidth') <= size[0] + 1)
        login(pg, 'bahr'); pg.goto(U + '#/'); pg.wait_for_timeout(2400)
        ok(f'{vw}: companies don\'t get the card', pg.locator('.ofc, .ofc-pill').count() == 0)
        login(pg, 'mariam'); pg.evaluate("sessionStorage.clear(); tx(d => { d.settings.campaigns = []; d.settings.offers = []; }); render()"); pg.wait_for_timeout(2400)
        ok(f'{vw}: no offers → no card', pg.locator('.ofc, .ofc-pill').count() == 0)
        ctx.close()
    b.close()
print('errors:', err[:5]); print(f'{sum(res)}/{len(res)} passed')
