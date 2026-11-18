import os
ROOT = os.environ.get('REHLATI_URL', 'file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
HTTP_ROOT = os.environ.get('REHLATI_HTTP', 'http://localhost:8765')
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
from playwright.sync_api import sync_playwright
U = ROOT + '/index.html?demo=1'
res = []; err = []
def ok(n, c, x=''):
    res.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n + (' :: ' + str(x) if x != '' else ''))
def login(pg, u):
    pg.goto(U + '#/login'); pg.wait_for_timeout(300); pg.click(f'[data-a=demo-login][data-e="{u}"]'); pg.wait_for_timeout(400)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    pg = b.new_page(); pg.on('pageerror', lambda e: err.append(str(e)))
    pg.goto(U); pg.evaluate("localStorage.clear(); localStorage.setItem('rehlati_compare', JSON.stringify(['t1','t3']))"); pg.reload(); pg.wait_for_timeout(500)
    ok('old shared list removed', pg.evaluate("cmpList().length") == 0 and pg.evaluate("localStorage.getItem('rehlati_compare')") is None)
    login(pg, 'mariam'); pg.evaluate("cmpSave(['t1','t3','t4'])")
    ok('mariam has 3', pg.evaluate("cmpList().length") == 3)
    pg.evaluate("logout()"); pg.goto(U + '#/'); pg.wait_for_timeout(300)
    ok('guest after logout sees empty list', pg.evaluate("cmpList().length") == 0 and pg.locator('.cmp-tray').count() == 0)
    login(pg, 'bahr'); pg.goto(U + '#/compare'); pg.wait_for_timeout(300)
    ok('another account sees nothing', pg.evaluate("cmpList().length") == 0 and pg.locator('table.cmp').count() == 0)
    pg.evaluate("cmpSave(['t7'])"); pg.evaluate("logout()")
    pg.goto(U + '#/'); pg.wait_for_timeout(300); pg.evaluate("cmpSave(['t9','t10'])")
    login(pg, 'mariam'); pg.goto(U + '#/compare'); pg.wait_for_timeout(300)
    l = pg.evaluate("cmpList()")
    ok('mariam keeps her list + guest picks moved in', l == ['t1','t3','t4','t9'], l)
    pg.evaluate("logout()"); pg.goto(U + '#/'); pg.wait_for_timeout(300)
    ok('guest list emptied after moving', pg.evaluate("cmpList().length") == 0)
    login(pg, 'bahr'); ok('bahr list untouched', pg.evaluate("cmpList()") == ['t7'])
    b.close()
print('ERRORS', err); print('SUMMARY', sum(res), '/', len(res))
