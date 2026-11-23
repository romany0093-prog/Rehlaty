"""UTravel brand QA: logo on every surface, no leftover old name, palette applied, WCAG AA contrast of
text tokens, Arabic RTL + English LTR, mobile without horizontal scroll."""
import os, re
ROOT = os.environ.get('REHLATI_URL', 'file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
SHOTS = os.path.join(os.path.dirname(__file__), 'shots'); os.makedirs(SHOTS, exist_ok=True)
from playwright.sync_api import sync_playwright
U = ROOT + '/index.html?demo=1'
res = []; err = []
def ok(n, c, x=''):
    res.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n + (' :: ' + str(x) if x != '' else ''))
def lum(rgb):
    v = [int(x) / 255 for x in re.findall(r'\d+', rgb)[:3]]
    f = lambda c: c / 12.92 if c <= .03928 else ((c + .055) / 1.055) ** 2.4
    return .2126 * f(v[0]) + .7152 * f(v[1]) + .0722 * f(v[2])
def ratio(a, b):
    x, y = sorted([lum(a), lum(b)], reverse=True); return (x + .05) / (y + .05)
ROUTES = {'guest': ['#/', '#/trips', '#/trip/t1', '#/offers', '#/compare', '#/companies', '#/company/c1', '#/destinations', '#/page/faq', '#/login', '#/register', '#/register/company', '#/forgot'],
          'mariam': ['#/me', '#/me/bookings', '#/me/requests', '#/me/request/rq1', '#/plan', '#/me/payments', '#/me/profile', '#/me/notifications'],
          'bahr': ['#/co', '#/co/trips', '#/co/bookings', '#/co/requests', '#/co/request/rq1', '#/co/finance', '#/co/profile'],
          'admin': ['#/admin', '#/admin/companies', '#/admin/bookings', '#/admin/finance', '#/admin/requests', '#/admin/settings']}
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 1360, 'height': 900}); pg.on('pageerror', lambda e: err.append(str(e)[:150]))
    pg.goto(U); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(500)
    tokens = pg.evaluate("(()=>{const s=getComputedStyle(document.documentElement);return ['--navy','--teal','--sand','--bg','--ink'].map(k=>s.getPropertyValue(k).trim().toUpperCase())})()")
    ok('palette tokens = UTravel colour palette', tokens == ['#1E3F5B', '#6F9EC6', '#C8A96E', '#F7F5F0', '#23303D'], tokens)
    ok('header shows the UTravel wordmark with the custom T', pg.locator('.site-h .ut-word svg.ut-t').count() == 1 and pg.get_attribute('.site-h .ut-word', 'aria-label') == 'UTravel')
    ok('footer logo with tagline on dark background', pg.locator('.site-f .ut-logo.ut-dark .ut-tag').inner_text() == 'Your Choice. Your Journey.')
    ok('document title uses UTravel', pg.title().endswith('UTravel'), pg.title())
    leftovers = {}; low = []
    def scan(tag):
        txt = pg.inner_text('body')
        bad = [m for m in re.findall(r'.{0,12}(?:رحلاتي|Rehlati).{0,12}', txt) if 'رحلاتي المخصصة' not in m]
        if bad: leftovers[tag] = bad[:3]
        # contrast of visible text against its nearest opaque background (sampled)
        sample = pg.evaluate("""() => { const out = []; const els = [...document.querySelectorAll('p,small,span,label,a,b,h1,h2,h3,td,th,.badge,.btn')].filter(e => e.offsetParent && e.childNodes.length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1)).slice(0, 400);
          const bgOf = (el) => { while (el) { const s = getComputedStyle(el); if (s.backgroundImage !== 'none' && !/gradient/.test(s.backgroundImage)) return null; if (/gradient/.test(s.backgroundImage)) return 'grad'; const c = s.backgroundColor; if (c && !/rgba\\(\\d+, \\d+, \\d+, 0\\)/.test(c) && c !== 'transparent') { if (/rgba/.test(c) && +c.split(',')[3].replace(')', '') < 0.9) { el = el.parentElement; continue; } return c; } el = el.parentElement; } return 'rgb(247, 245, 240)'; };
          for (const e of els) { const s = getComputedStyle(e); const bg = bgOf(e); if (!bg || bg === 'grad' || e.closest('.hero,.phead,.dest,.tcard .media,.plan-band,.side,.site-f,.promo,.camp,.offer-card,.gallery,.cap')) continue; if (+s.opacity < 1) continue; out.push([s.color, bg, parseFloat(s.fontSize), +s.fontWeight, (e.className || e.tagName) + ': ' + e.textContent.trim().slice(0, 30)]); } return out; }""")
        for fg, bg, size, wt, what in sample:
            r = ratio(fg, bg); need = 3 if (size >= 24 or (size >= 18.66 and wt >= 700)) else 4.5
            if r < need - 0.05: low.append((tag, round(r, 2), fg, bg, what))
    for who, routes in ROUTES.items():
        if who != 'guest':
            pg.evaluate("setSession(null)"); pg.goto(U + '#/login'); pg.wait_for_timeout(200); pg.click(f'[data-a=demo-login][data-e="{who}"]'); pg.wait_for_timeout(400)
        for r in routes:
            pg.goto(U + r); pg.wait_for_timeout(250); scan(who + ' ' + r)
        if who != 'guest': ok(f'{who}: sidebar shows the UTravel logo', pg.locator('.side .ut-logo.ut-dark').count() == 1)
    ok('no leftover old brand name in any page (AR)', not leftovers, leftovers)
    uniq = sorted(set((x[1], x[2], x[3], x[4][:40]) for x in low))
    ok('text contrast meets WCAG AA on sampled pages', not uniq, uniq[:15])
    pg.screenshot(path=SHOTS + '/brand-admin.png')
    # English / LTR
    pg.evaluate("setSession(null)"); pg.goto(U + '#/'); pg.evaluate("document.querySelector('[data-a=lang]').click()"); pg.wait_for_timeout(400)
    ok('English LTR keeps the logo left-to-right', pg.evaluate("document.dir") == 'ltr' and pg.evaluate("getComputedStyle(document.querySelector('.site-h .ut-logo')).direction") == 'ltr')
    leftovers = {}
    for r in ROUTES['guest']: pg.goto(U + r); pg.wait_for_timeout(200); scan('en ' + r)
    ok('no leftover old brand name in English pages', not leftovers, leftovers)
    pg.goto(U + '#/'); pg.wait_for_timeout(300); pg.screenshot(path=SHOTS + '/brand-home-en.png')
    pg.evaluate("document.querySelector('[data-a=lang]').click()"); pg.wait_for_timeout(300)
    # mobile
    m = b.new_page(viewport={'width': 390, 'height': 844}); m.on('pageerror', lambda e: err.append(str(e)[:150]))
    for r in ['#/', '#/trips', '#/trip/t1', '#/offers', '#/compare', '#/login']:
        m.goto(U + r); m.wait_for_timeout(300)
        sw = m.evaluate('document.documentElement.scrollWidth'); ok(f'mobile {r}: no horizontal scroll', sw <= 391, sw)
    m.goto(U + '#/'); m.wait_for_timeout(300); m.screenshot(path=SHOTS + '/brand-home-mobile.png')
    ok('mobile header logo fits', m.evaluate("document.querySelector('.site-h .ut-logo').getBoundingClientRect().width") < 170)
    b.close()
print('errors:', err[:5]); print(f'{sum(res)}/{len(res)} passed')
