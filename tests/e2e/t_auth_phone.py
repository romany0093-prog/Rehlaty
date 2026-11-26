"""Sign-up with e-mail or mobile, show/hide password, login by mobile, WhatsApp-code recovery
(demo mode + cloud flow with a stand-in Supabase client), and the UTravel tagline placements."""
import os, json
ROOT = os.environ.get('REHLATI_URL', 'file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
SHOTS = os.path.join(os.path.dirname(__file__), 'shots'); os.makedirs(SHOTS, exist_ok=True)
from playwright.sync_api import sync_playwright
D = ROOT + '/index.html?demo=1'; C = ROOT + '/index.html'
TAG = 'Your Choice. Your Journey.'
res = []; err = []
def ok(n, c, x=''):
    res.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n + (' :: ' + str(x) if x != '' else ''))
FAKE = """
window.__calls = [];
const tables = { settings: [{ id: 'main', data: { commission: 10, holdMinutes: 15, offers: [], campaigns: [], banners: [], featuredTrips: [], faq: [], pages: {}, showDemo: true } }] };
const q = (t) => { const o = { select: () => o, range: () => Promise.resolve({ data: tables[t] || [], error: null }), update: () => o, eq: () => Promise.resolve({ error: null }), insert: () => Promise.resolve({ error: null }), delete: () => o, in: () => Promise.resolve({ error: null }) }; return o; };
window.supabase = { createClient: () => ({
  from: q, functions: { invoke: (n, o) => { window.__calls.push(['fn', n, o.body.ident]); return Promise.resolve({ data: { ok: true }, error: null }); } },
  rpc: (n, a) => { window.__calls.push(['rpc', n, a]); if (n === 'register_account') return Promise.resolve({ data: 'uid', error: null }); if (n === 'resolve_login') return Promise.resolve({ data: null, error: null }); return Promise.resolve({ data: [], error: null }); },
  auth: {
    getSession: () => Promise.resolve({ data: { session: null } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signInWithOtp: (o) => { window.__calls.push(['otp', o.phone, o.options.channel, o.options.shouldCreateUser]); return Promise.resolve(window.__otpErr ? { data: {}, error: window.__otpErr } : { data: {}, error: null }); },
    verifyOtp: (o) => { window.__calls.push(['verify', o.phone, o.token, o.type]); return Promise.resolve(o.token === '654321' ? { data: { session: { user: { id: 'u-ph' } } }, error: null } : { data: {}, error: { message: 'Token has expired or is invalid' } }); },
    signInWithPassword: () => Promise.resolve({ error: { message: 'Invalid login credentials' } }), signOut: () => Promise.resolve({}),
    updateUser: () => Promise.resolve({ data: {}, error: null })
  } }) };
"""
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 1360, 'height': 900}); pg.on('pageerror', lambda e: err.append(str(e)[:160]))
    pg.goto(D); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(500)
    # tagline placements
    ok('header: logo + tagline', pg.inner_text('.site-h .ut-tag') == TAG)
    ok('hero: tagline kicker', pg.inner_text('.hero-kicker') == TAG)
    ok('footer: tagline', pg.inner_text('.site-f .ut-tag') == TAG)
    ok('header logo is larger', pg.evaluate("parseFloat(getComputedStyle(document.querySelector('.site-h .ut-word')).fontSize)") >= 34)
    # register with mobile
    pg.goto(D + '#/register'); pg.wait_for_timeout(300)
    ok('sign-in page art shows brand + tagline', pg.locator('.auth-brand .ut-tag').inner_text() == TAG)
    ok('sign-up method switch (email default)', pg.locator('[data-a=reg-via][data-v=email].on').count() == 1)
    pg.fill('#f-name', 'سارة محمود'); pg.fill('#f-email', 'sara@example.com')
    pg.click('[data-a=reg-via][data-v=phone]'); pg.wait_for_timeout(200)
    ok('switching keeps what was typed', pg.input_value('#f-name') == 'سارة محمود' and pg.input_value('#f-email') == 'sara@example.com')
    ok('mobile mode: phone first and required', pg.evaluate("[...document.querySelectorAll('form[data-f=register] input')].map(i=>i.name).indexOf('phone') < [...document.querySelectorAll('form[data-f=register] input')].map(i=>i.name).indexOf('email')"))
    pg.fill('#f-password', 'Secret123'); 
    ok('password hidden by default', pg.get_attribute('#f-password', 'type') == 'password')
    pg.click('#f-password ~ .pw-eye'); ok('eye shows the password', pg.get_attribute('#f-password', 'type') == 'text' and pg.get_attribute('#f-password ~ .pw-eye', 'aria-pressed') == 'true')
    pg.click('#f-password ~ .pw-eye'); ok('eye hides it again', pg.get_attribute('#f-password', 'type') == 'password')
    ok('no username field: the email or mobile is the username', pg.locator('#f-username').count() == 0)
    pg.check('input[name=terms]')
    pg.click('form[data-f=register] button[type=submit]'); pg.wait_for_timeout(300)
    ok('mobile required in mobile mode', pg.locator('#f-phone').evaluate("e=>e.closest('.field').classList.contains('err')"))
    pg.fill('#f-phone', '0101 234 5678'); pg.screenshot(path=SHOTS + '/auth-register-phone.png')
    pg.click('form[data-f=register] button[type=submit]'); pg.wait_for_timeout(700)
    ok('account created and logged in', '#/me' in pg.url, pg.url)
    u = pg.evaluate("(({via,phone,email})=>({via,phone,email}))(me())")
    ok('stored as a mobile sign-up', u['via'] == 'phone' and u['phone'] == '01012345678', u)
    ok('sidebar logo with tagline', pg.inner_text('.side .ut-tag') == TAG)
    # duplicate mobile
    pg.evaluate("setSession(null)"); pg.goto(D + '#/register'); pg.wait_for_timeout(200); pg.click('[data-a=reg-via][data-v=phone]'); pg.wait_for_timeout(150)
    pg.fill('#f-name', 'Another One'); pg.fill('#f-phone', '01012345678'); pg.fill('#f-email', 'other@example.com'); pg.fill('#f-password', 'Secret123'); pg.check('input[name=terms]')
    pg.click('form[data-f=register] button[type=submit]'); pg.wait_for_timeout(600)
    ok('same mobile cannot register twice', 'مسجل' in pg.inner_text('form[data-f=register]'))
    # login by mobile
    pg.goto(D + '#/login'); pg.wait_for_timeout(200)
    ok('login page: password eye', pg.locator('#f-password ~ .pw-eye').count() == 1)
    pg.fill('#f-ident', '01012345678'); pg.fill('#f-password', 'Secret123'); pg.click('form[data-f=login] button[type=submit]'); pg.wait_for_timeout(600)
    ok('login with mobile number', '#/me' in pg.url and pg.evaluate("me().email") == 'sara@example.com', pg.url)
    # recovery by WhatsApp code
    pg.evaluate("setSession(null)"); pg.goto(D + '#/forgot'); pg.wait_for_timeout(200)
    pg.fill('#f-ident', '+20 101 234 5678'); pg.click('form[data-f=forgot] button[type=submit]'); pg.wait_for_timeout(800)
    ok('mobile → WhatsApp code screen', 'واتساب' in pg.inner_text('.auth-box') and pg.locator('form[data-f=wa-code]').count() == 1)
    pg.screenshot(path=SHOTS + '/auth-whatsapp-code.png')
    pg.fill('#f-code', '111111'); pg.click('form[data-f=wa-code] button[type=submit]'); pg.wait_for_timeout(300)
    ok('wrong code rejected', pg.locator('form[data-f=wa-code] .field.err').count() == 1)
    pg.fill('#f-code', '123456'); pg.click('form[data-f=wa-code] button[type=submit]'); pg.wait_for_timeout(400)
    ok('right code → new password page', '#/reset-password' in pg.url and pg.locator('#f-nw ~ .pw-eye').count() == 1)
    pg.fill('#f-nw', 'NewSecret99'); pg.fill('#f-nw2', 'NewSecret99'); pg.click('form[data-f=reset-pw] button[type=submit]'); pg.wait_for_timeout(500)
    ok('password changed and logged in', '#/me' in pg.url and pg.evaluate("me().password") == 'NewSecret99')
    # unknown mobile gets the same answer, email path unchanged
    pg.evaluate("setSession(null)"); pg.goto(D + '#/forgot'); pg.wait_for_timeout(200); pg.fill('#f-ident', '01199999999'); pg.click('form[data-f=forgot] button[type=submit]'); pg.wait_for_timeout(700)
    ok('unknown mobile: same screen, no demo code hint', pg.locator('form[data-f=wa-code]').count() == 1 and '123456' not in pg.inner_text('.auth-box'))
    pg.click('[data-a=forgot-other]'); pg.wait_for_timeout(150); pg.fill('#f-ident', 'mariam'); pg.click('form[data-f=forgot] button[type=submit]'); pg.wait_for_timeout(700)
    ok('username → email link screen', 'إيميلك' in pg.inner_text('.auth-box'))
    # mobile layout
    m = b.new_page(viewport={'width': 390, 'height': 844}); m.goto(D + '#/register'); m.wait_for_timeout(300)
    ok('mobile: no horizontal scroll on sign-up', m.evaluate('document.documentElement.scrollWidth') <= 391)
    ok('mobile header shows tagline', m.locator('.site-h .ut-tag').is_visible())
    m.screenshot(path=SHOTS + '/auth-register-mobile.png', full_page=True)
    # cloud flow with stand-in client
    ctx = b.new_context(); ctx.add_init_script(FAKE); c = ctx.new_page(); c.on('pageerror', lambda e: err.append('cloud ' + str(e)[:160]))
    c.goto(C + '#/register'); c.wait_for_timeout(900); c.click('[data-a=reg-via][data-v=phone]'); c.wait_for_timeout(150)
    c.fill('#f-name', 'Cloud User'); c.fill('#f-phone', '01012345678'); c.fill('#f-email', 'cloud@example.com'); c.fill('#f-password', 'Secret123'); c.check('input[name=terms]')
    c.click('form[data-f=register] button[type=submit]'); c.wait_for_timeout(800)
    reg = c.evaluate("window.__calls.find(x=>x[1]==='register_account')")
    ok('cloud: register_account sends p_via=phone and no username', reg and reg[2]['p_via'] == 'phone' and reg[2]['p_phone'] == '01012345678' and reg[2]['p_username'] is None, reg and reg[2])
    lg = c.evaluate("window.__calls.find(x=>x[1]==='resolve_login')")
    ok('cloud: login after sign-up sends the password with the lookup', lg and lg[2].get('p_password') == 'Secret123')
    c.goto(C + '#/forgot'); c.wait_for_timeout(500); c.fill('#f-ident', '01012345678'); c.click('form[data-f=forgot] button[type=submit]'); c.wait_for_timeout(700)
    otp = c.evaluate("window.__calls.find(x=>x[0]==='otp')")
    ok('cloud: WhatsApp OTP requested in E.164, no new users', otp == ['otp', '+201012345678', 'whatsapp', False], otp)
    ok('cloud: no e-mail lookup for a mobile number', not c.evaluate("window.__calls.some(x=>x[0]==='fn')"))
    c.fill('#f-code', '654321'); c.click('form[data-f=wa-code] button[type=submit]'); c.wait_for_timeout(900)
    ver = c.evaluate("window.__calls.find(x=>x[0]==='verify')")
    ok('cloud: code verified as phone OTP', ver == ['verify', '+201012345678', '654321', 'sms'], ver)
    c.goto(C + '#/forgot'); c.wait_for_timeout(400); c.evaluate("window.__otpErr = { code: 'phone_provider_disabled', message: 'Unsupported phone provider', status: 400 }")
    c.click('[data-a=forgot-other]') if c.locator('[data-a=forgot-other]').count() else None; c.wait_for_timeout(150)
    c.fill('#f-ident', '01012345678'); c.click('form[data-f=forgot] button[type=submit]'); c.wait_for_timeout(700)
    ok('cloud: WhatsApp not configured → clear message to use email', 'مش متاح' in c.inner_text('form[data-f=forgot]'))
    b.close()
print('errors:', err[:5]); print(f'{sum(res)}/{len(res)} passed')
