import os
ROOT = os.environ.get('REHLATI_URL', 'file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
HTTP_ROOT = os.environ.get('REHLATI_HTTP', 'http://localhost:8765')
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
from playwright.sync_api import sync_playwright
import json
D = ROOT + '/index.html?demo=1'
C = ROOT + '/index.html'
O = os.path.join(os.path.dirname(__file__), 'shots') + '/'
res = []; err = []
def ok(n, c, x=''):
    res.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n + (' :: ' + str(x) if x != '' else ''))
# stand-in Supabase client: records calls, simulates a recovery session when asked
FAKE = """
window.__calls = [];
const SESS = sessionStorage.getItem('fake_recovery') ? { user: { id: 'u-mariam', email: 'mariam@demo.eg' } } : null;
const tables = { settings: [{ id: 'main', data: { commission: 10, holdMinutes: 15, offers: [], campaigns: [], banners: [], featuredTrips: [], faq: [], pages: {}, showDemo: true } }],
  profiles: SESS ? [{ id: 'u-mariam', username: 'mariam', email: 'mariam@demo.eg', role: 'customer', name: 'مريم عادل', phone: '01000000000', status: 'active', favorites: [], created_at: '2026-01-01', data: {} }] : [] };
const q = (t) => { const o = { select: () => o, range: () => Promise.resolve({ data: tables[t] || [], error: null }), update: () => o, eq: () => Promise.resolve({ error: null }), insert: () => Promise.resolve({ error: null }), delete: () => o, in: () => Promise.resolve({ error: null }) }; return o; };
window.supabase = { createClient: () => ({
  from: q,
  functions: { invoke: (n, o) => { window.__calls.push(['fn', n, o.body.ident, o.body.redirectTo]); return Promise.resolve({ data: { ok: true }, error: null }); } },
  rpc: (n, a) => { window.__calls.push(['rpc', n, a]); if (n === 'resolve_login') return Promise.resolve({ data: a.p_ident.includes('@') ? a.p_ident : (a.p_ident.toLowerCase() === 'mariam' ? 'mariam@demo.eg' : null), error: null }); return Promise.resolve({ data: [], error: null }); },
  auth: {
    getSession: () => Promise.resolve({ data: { session: SESS } }),
    onAuthStateChange: (cb) => { window.__authcb = cb; return { data: { subscription: { unsubscribe() {} } } }; },
    resetPasswordForEmail: (e, o) => { window.__calls.push(['reset', e, o.redirectTo]); return Promise.resolve({ data: {}, error: null }); },
    updateUser: (u) => { window.__calls.push(['update', u.password]); return Promise.resolve({ data: { user: SESS.user }, error: null }); },
    signInWithPassword: () => Promise.resolve({ error: { message: 'Invalid login credentials' } }),
    signOut: () => Promise.resolve({})
  } }) };
"""
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    # ===== demo mode =====
    pg = b.new_page(); pg.on('pageerror', lambda e: err.append(str(e)))
    pg.goto(D); pg.evaluate('localStorage.clear()'); pg.goto(D + '#/login'); pg.reload(); pg.wait_for_timeout(500)
    pg.fill('#f-ident', 'mariam'); pg.click('[data-a=to-forgot]'); pg.wait_for_timeout(300)
    ok('login → forgot keeps the username', pg.input_value('#f-ident') == 'mariam' and '#/forgot' in pg.url)
    pg.screenshot(path=O + 'r1-forgot.png')
    pg.fill('#f-ident', 'nobody_here'); pg.click('form[data-f=forgot] button[type=submit]'); pg.wait_for_timeout(800)
    txt_unknown = pg.inner_text('.auth-box h1')
    ok('unknown account: same generic answer, no link', txt_unknown == 'بص على إيميلك' and pg.locator('[data-a=reset-demo-link]').count() == 0)
    ok('resend button cooling down', pg.locator('#resend-btn').is_disabled())
    pg.click('[data-a=forgot-other]'); pg.wait_for_timeout(200)
    pg.fill('#f-ident', 'admin'); pg.click('form[data-f=forgot] button[type=submit]'); pg.wait_for_timeout(800)
    ok('admin cannot reset from public page', pg.locator('[data-a=reset-demo-link]').count() == 0)
    pg.click('[data-a=forgot-other]'); pg.wait_for_timeout(200)
    pg.fill('#f-ident', 'bahr'); pg.click('form[data-f=forgot] button[type=submit]'); pg.wait_for_timeout(800)
    pg.screenshot(path=O + 'r2-sent.png')
    pg.click('[data-a=reset-demo-link]'); pg.wait_for_timeout(300)
    ok('reset page for the company account', pg.locator('form[data-f=reset-pw]').count() == 1 and 'bahr' in pg.inner_text('.auth-box'))
    pg.fill('#f-nw', 'newpass11'); pg.fill('#f-nw2', 'newpass22'); pg.click('form[data-f=reset-pw] button[type=submit]'); pg.wait_for_timeout(200)
    ok('mismatch rejected', pg.locator('.field.err').count() == 1)
    pg.fill('#f-nw2', 'newpass11'); pg.click('form[data-f=reset-pw] button[type=submit]'); pg.wait_for_timeout(500)
    ok('company logged in to dashboard after reset', '#/co' in pg.url and pg.evaluate("me() && me().email==='bahr@demo.eg'"), pg.url)
    pg.screenshot(path=O + 'r3-after.png')
    pg.evaluate("logout()"); pg.goto(D + '#/login'); pg.wait_for_timeout(300)
    pg.fill('#f-ident', 'bahr'); pg.fill('#f-password', '123456'); pg.click('form[data-f=login] button[type=submit]'); pg.wait_for_timeout(700)
    ok('old password no longer works', pg.locator('form[data-f=login] .field.err').count() == 1)
    pg.fill('#f-password', 'newpass11'); pg.click('form[data-f=login] button[type=submit]'); pg.wait_for_timeout(700)
    ok('new password works', '#/co' in pg.url)
    pg.evaluate("logout()"); pg.goto(D + '#/reset-password'); pg.wait_for_timeout(300)
    ok('reset page without a link shows guidance', pg.locator('form[data-f=reset-pw]').count() == 0 and pg.locator('a[href="#/forgot"]').count() >= 1)
    # ===== cloud mode with stand-in client =====
    ctx = b.new_context(); ctx.add_init_script(FAKE)
    c = ctx.new_page(); c.on('pageerror', lambda e: err.append('cloud ' + str(e)))
    c.goto(C + '#/forgot'); c.wait_for_timeout(800)
    c.fill('#f-ident', 'Mariam'); c.click('form[data-f=forgot] button[type=submit]'); c.wait_for_timeout(600)
    calls = c.evaluate("window.__calls.filter(x=>x[0]==='fn')")
    ok('cloud: reset goes to the server function (no e-mail lookup in the browser)', len(calls) == 1 and calls[0][1] == 'password-reset' and calls[0][2] == 'Mariam' and calls[0][3].endswith('/index.html') and not c.evaluate("window.__calls.some(x=>x[1]==='resolve_login')"), calls)
    c.click('[data-a=forgot-other]'); c.wait_for_timeout(200)
    c.fill('#f-ident', 'ghost'); c.click('form[data-f=forgot] button[type=submit]'); c.wait_for_timeout(600)
    calls2 = c.evaluate("window.__calls.filter(x=>x[0]==='fn').length")
    ok('cloud: unknown username gets the same answer', calls2 == 2 and c.inner_text('.auth-box h1') == 'بص على إيميلك')
    # recovery link
    c.evaluate("sessionStorage.setItem('fake_recovery','1')")
    c.goto(C + '#access_token=abc&refresh_token=def&expires_in=3600&token_type=bearer&type=recovery'); c.reload(); c.wait_for_timeout(2500)
    ok('cloud: recovery link opens new-password page', c.url.endswith('#/reset-password') and c.locator('form[data-f=reset-pw]').count() == 1, c.url)
    c.screenshot(path=O + 'r4-cloud-reset.png')
    c.fill('#f-nw', 'Secret77'); c.fill('#f-nw2', 'Secret77'); c.click('form[data-f=reset-pw] button[type=submit]'); c.wait_for_timeout(1000)
    upd = c.evaluate("window.__calls.filter(x=>x[0]==='update')")
    ok('cloud: password updated on the server', upd == [['update', 'Secret77']], upd)
    ok('cloud: lands on customer dashboard', c.url.endswith('#/me'), c.url)
    c.evaluate("sessionStorage.removeItem('fake_recovery')")
    c.goto(C + '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'); c.reload(); c.wait_for_timeout(900)
    ok('cloud: expired link explained', '#/forgot?expired=1' in c.url and 'انتهت صلاحيته' in c.inner_text('.auth-box'), c.url)
    c.screenshot(path=O + 'r5-expired.png')
    b.close()
print('ERRORS', json.dumps(err[:8], ensure_ascii=False)); print('SUMMARY', sum(res), '/', len(res))
