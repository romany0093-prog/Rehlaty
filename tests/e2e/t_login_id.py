"""Travellers don't pick a username: their username is the e-mail or the mobile number they chose at sign-up.
Companies still choose one. Existing usernames keep working."""
import os
ROOT = os.environ.get('REHLATI_URL', 'file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
SHOTS = os.path.join(os.path.dirname(__file__), 'shots'); os.makedirs(SHOTS, exist_ok=True)
from playwright.sync_api import sync_playwright
U = ROOT + '/index.html?demo=1'
res = []; err = []
def ok(n, c, x=''):
    res.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n + (' :: ' + str(x) if x != '' else ''))
def signup(pg, via, name, email, phone, pw='Secret123'):
    pg.evaluate("setSession(null)"); pg.goto(U + '#/register'); pg.wait_for_timeout(300)
    pg.click(f'[data-a=reg-via][data-v={via}]'); pg.wait_for_timeout(150)
    pg.fill('#f-name', name); pg.fill('#f-email', email)
    if phone: pg.fill('#f-phone', phone)
    pg.fill('#f-password', pw); pg.check('input[name=terms]'); pg.click('form[data-f=register] button[type=submit]'); pg.wait_for_timeout(700)
def login(pg, ident, pw='Secret123'):
    pg.evaluate("setSession(null)"); pg.goto(U + '#/login'); pg.wait_for_timeout(250)
    pg.fill('#f-ident', ident); pg.fill('#f-password', pw); pg.click('form[data-f=login] button[type=submit]'); pg.wait_for_timeout(600)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    for vw, size in {'desktop': (1360, 900), 'phone': (390, 844)}.items():
        pg = b.new_page(viewport={'width': size[0], 'height': size[1]}); pg.on('pageerror', lambda e: err.append(str(e)[:160]))
        pg.goto(U); pg.evaluate('localStorage.clear(); sessionStorage.clear()'); pg.reload(); pg.wait_for_timeout(400)
        pg.goto(U + '#/register'); pg.wait_for_timeout(300)
        ok(f'{vw}: sign-up has no separate username field', pg.locator('#f-username').count() == 0)
        ok(f'{vw}: choice is labelled as the username', 'اسم المستخدم بتاعك هيكون' in pg.inner_text('.auth-box'))
        ok(f'{vw}: email hint says it is the username', 'ده اسم المستخدم بتاعك' in pg.inner_text('form[data-f=register]'))
        if vw == 'phone': pg.screenshot(path=SHOTS + '/login-id-register.png', full_page=True)
        # e-mail traveller
        signup(pg, 'email', 'Laila Hassan', f'laila.{vw}@example.com', '01055556666')
        ok(f'{vw}: e-mail sign-up works without a username', '#/me' in pg.url, pg.url)
        login(pg, f'laila.{vw}@example.com'); ok(f'{vw}: logs in with the e-mail', '#/me' in pg.url and pg.evaluate("me().email") == f'laila.{vw}@example.com')
        pg.goto(U + '#/me/profile'); pg.wait_for_timeout(300)
        ok(f'{vw}: profile shows the e-mail as the username', pg.input_value('#f-login_ro') == f'laila.{vw}@example.com')
        ok(f'{vw}: e-mail traveller can still edit the mobile', pg.locator('#f-phone').count() == 1 and pg.locator('#f-phone').is_editable())
        login(pg, '01055556666')
        ok(f'{vw}: an optional mobile on an e-mail account is not a login name', '#/login' in pg.url)
        # mobile traveller
        ph = '0101111222' + ('1' if vw == 'desktop' else '2')
        signup(pg, 'phone', 'Omar Samir', f'omar.{vw}@example.com', ph)
        ok(f'{vw}: mobile sign-up works without a username', '#/me' in pg.url, pg.url)
        login(pg, ph); ok(f'{vw}: logs in with the mobile', '#/me' in pg.url and pg.evaluate("me().email") == f'omar.{vw}@example.com')
        pg.goto(U + '#/me/profile'); pg.wait_for_timeout(300)
        ok(f'{vw}: profile shows the mobile as the username', pg.input_value('#f-login_ro') == ph)
        ok(f'{vw}: login mobile not editable from the profile (no mismatch)', pg.locator('#f-phone').count() == 0)
        pg.fill('#f-name', 'Omar Samir Ali'); pg.click('form[data-f=me-profile] button[type=submit]'); pg.wait_for_timeout(300)
        ok(f'{vw}: saving the profile keeps the login mobile', pg.evaluate("me().name") == 'Omar Samir Ali' and pg.evaluate("me().phone") == ph)
        if vw == 'phone': pg.screenshot(path=SHOTS + '/login-id-profile.png', full_page=True)
        # duplicates still caught
        signup(pg, 'email', 'Laila Two', f'laila.{vw}@example.com', '')
        ok(f'{vw}: same e-mail twice is refused', '#/register' in pg.url and 'مسجل' in pg.inner_text('form[data-f=register]'))
        # existing usernames + companies unchanged
        login(pg, 'mariam', '123456'); ok(f'{vw}: existing traveller username still logs in', '#/me' in pg.url)
        pg.evaluate("setSession(null)"); pg.goto(U + '#/register/company'); pg.wait_for_timeout(300)
        ok(f'{vw}: company sign-up still asks for a username', pg.locator('#f-username').count() == 1)
        pg.close()
    b.close()
print('errors:', err[:5]); print(f'{sum(res)}/{len(res)} passed')
