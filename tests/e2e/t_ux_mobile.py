"""Mobile & app UX (review of Nov 2026): no sideways scroll, bottom tab bar, sticky book bar on the trip page,
sideways-scrolling home sections, readable date fields, 44px touch targets, tables as cards on phones."""
import os, re
ROOT = os.environ.get('REHLATI_URL', 'file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
SHOTS = os.path.join(os.path.dirname(__file__), 'shots'); os.makedirs(SHOTS, exist_ok=True)
from playwright.sync_api import sync_playwright
U = ROOT + '/index.html?demo=1'
res = []; err = []
def ok(n, c, x=''):
    res.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n + (' :: ' + str(x) if x != '' else ''))
def login(pg, who):
    pg.evaluate("setSession(null)"); pg.goto(U + '#/login'); pg.wait_for_timeout(250); pg.click(f'[data-a=demo-login][data-e="{who}"]'); pg.wait_for_timeout(450)
SMALL = """() => [...document.querySelectorAll('.btn-sm,.icon-btn,.lang-btn,.tcard .fav,.cmp-btn,.chip,.tabbar a,.m-book .btn')].filter(e => e.offsetParent && e.checkVisibility({ visibilityProperty: true, opacityProperty: true }) && !e.closest('.ofc:not(.in)')).map(e => [e, e.getBoundingClientRect()]).filter(([e, r]) => r.height < 43.5 || r.width < 43.5).map(([e, r]) => (e.textContent.trim().slice(0, 14) || e.getAttribute('aria-label') || e.className) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height))"""
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    m = b.new_page(viewport={'width': 390, 'height': 844}); m.on('pageerror', lambda e: err.append(str(e)[:160]))
    m.goto(U); m.evaluate('localStorage.clear()'); m.reload(); m.wait_for_timeout(500)
    pages = {'guest': ['#/', '#/trips', '#/trip/t1', '#/offers', '#/compare', '#/companies', '#/destinations', '#/login', '#/register'],
             'mariam': ['#/me', '#/me/bookings', '#/me/payments', '#/me/requests', '#/plan'],
             'bahr': ['#/co', '#/co/trips', '#/co/bookings', '#/co/finance'], 'admin': ['#/admin', '#/admin/bookings', '#/admin/companies']}
    wide, small, tb = {}, {}, {}
    for who, rs in pages.items():
        if who != 'guest': login(m, who)
        for r in rs:
            m.goto(U + r); m.wait_for_timeout(350)
            sw = m.evaluate('document.documentElement.scrollWidth')
            if sw > 391: wide[who + r] = sw
            s = m.evaluate(SMALL)
            if s: small[who + r] = s[:4]
            tb[who + r] = m.locator('.tabbar').count()
    ok('phone: no page scrolls sideways (all roles)', not wide, wide)
    ok('phone: buttons, icons and tabs are at least 44px', not small, small)
    ok('tab bar for guests and travellers (sign-in pages stay focused)', all(v == (0 if k.endswith(('#/login', '#/register')) else 1) for k, v in tb.items() if k.startswith(('guest', 'mariam'))), tb)
    ok('no tab bar in company and admin dashboards', all(v == 0 for k, v in tb.items() if k.startswith(('bahr', 'admin'))))
    # tab bar marks the current page, shows unread count, and keeps content clear
    login(m, 'mariam'); m.goto(U + '#/me/bookings'); m.wait_for_timeout(350)
    ok('tab bar: current page highlighted', m.locator('.tabbar a.on').get_attribute('href') == '#/me/bookings')
    ok('tab bar: unread notifications badge', m.locator('.tabbar .tb-dot').count() == 1)
    pad = m.evaluate("parseFloat(getComputedStyle(document.body).paddingBottom)")
    ok('page leaves room for the tab bar', pad >= 64, pad)
    m.evaluate("toast('اختبار')"); m.wait_for_timeout(200)
    tbox, bar = m.locator('.toast').last.bounding_box(), m.locator('.tabbar').bounding_box()
    ok('messages appear above the tab bar', tbox['y'] + tbox['height'] <= bar['y'], (tbox, bar))
    # trip page: sticky book bar
    m.evaluate("setSession(null)"); m.goto(U + '#/trip/t1'); m.wait_for_timeout(500)
    ok('trip page: book bar visible at the top of the page', m.locator('#m-book').is_visible() and m.evaluate("!document.getElementById('m-book').classList.contains('hide')"))
    ok('book bar shows the starting price', 'ج.م' in m.inner_text('#m-book .price'))
    m.screenshot(path=SHOTS + '/ux-trip-mobile.png')
    m.click('[data-a=m-book]'); m.wait_for_timeout(900)
    top = m.evaluate("document.getElementById('bw').getBoundingClientRect().top")
    ok('book bar jumps to the booking box', top < 400, top)
    ok('book bar hides while the booking box is on screen', m.evaluate("document.getElementById('m-book').classList.contains('hide')"))
    m.evaluate("scrollTo({top: 0, behavior: 'instant'})"); m.wait_for_timeout(500)
    ok('book bar comes back after scrolling away', not m.evaluate("document.getElementById('m-book').classList.contains('hide')"))
    # home: sections scroll sideways
    m.goto(U + '#/'); m.wait_for_timeout(500)
    rails = m.evaluate("[...document.querySelectorAll('.rail,.rail-dest')].map(e => e.scrollWidth > e.clientWidth + 20)")
    ok('home: card sections scroll sideways on phones', len(rails) >= 5 and all(rails), rails)
    h = m.evaluate('document.documentElement.scrollHeight')
    ok('home page much shorter on phones', h < 7500, h)
    ok('hero: duplicate tagline hidden on phones (still in header)', not m.locator('.hero-kicker').is_visible() and m.locator('.site-h .ut-tag').is_visible())
    # readable date fields
    txt = m.inner_text('form.ticket')
    ok('date fields: Arabic placeholder, no mm/dd/yyyy', 'اختار التاريخ' in txt and not re.search(r'mm|dd|yyyy', txt))
    m.fill('#hs-date', '2026-12-10'); m.locator('#hs-dest').focus(); m.wait_for_timeout(150)
    ok('date field shows the chosen date in Arabic', '10 ديسمبر 2026' in m.inner_text('form.ticket'), m.inner_text('form.ticket .dx'))
    m.fill('#hs-to', '2026-12-14'); m.fill('#hs-date', '2026-12-20'); m.dispatch_event('#hs-date', 'change'); m.locator('#hs-dest').focus(); m.wait_for_timeout(150)
    ok('clearing an earlier "to" date updates its label', m.locator('.dx-v').nth(1).inner_text() == 'اختار التاريخ', m.locator('.dx-v').nth(1).inner_text())
    m.click('form.ticket button[type=submit]'); m.wait_for_timeout(400)
    ok('search still sends the date', 'date=2026-12-20' in m.url, m.url)
    # trips list
    m.goto(U + '#/trips'); m.wait_for_timeout(400)
    bx = m.locator('.tcard').first.bounding_box()
    ok('trips list: card fits inside the side margins', bx['x'] >= 16 and bx['x'] + bx['width'] <= 374, bx)
    ok('trips list: a card is shorter than the screen', bx['height'] < 520, bx['height'])
    m.mouse.wheel(0, 1500); m.wait_for_timeout(300)
    ok('filters & sort stay reachable while scrolling', 0 < m.locator('.toolbar').bounding_box()['y'] < 120)
    # dashboards: tables as cards
    login(m, 'bahr'); m.goto(U + '#/co/bookings'); m.wait_for_timeout(400)
    ok('phone: table header hidden, rows are cards', not m.locator('.tbl-cards thead').is_visible() and m.evaluate("getComputedStyle(document.querySelector('.tbl-cards tr')).display") == 'block')
    lab = m.evaluate("getComputedStyle(document.querySelector('.tbl-cards td'), '::before').content")
    ok('each value labelled on phones', 'رقم الحجز' in lab, lab)
    m.screenshot(path=SHOTS + '/ux-co-bookings-mobile.png')
    # footer e-mail
    m.goto(U + '#/'); m.wait_for_timeout(300)
    ok('support e-mail uses the new name', 'support@utravel.eg' in m.inner_text('.site-f') and 'rehlati.eg' not in m.inner_text('.site-f'))
    # desktop unchanged
    d = b.new_page(viewport={'width': 1440, 'height': 900}); d.on('pageerror', lambda e: err.append('d ' + str(e)[:160]))
    d.goto(U + '#/trip/t1'); d.wait_for_timeout(400)
    ok('desktop: no tab bar, no book bar', not d.locator('.tabbar').is_visible() and not d.locator('#m-book').is_visible())
    d.goto(U + '#/'); d.wait_for_timeout(400)
    ok('desktop: sections stay as grids', d.evaluate("getComputedStyle(document.querySelector('.rail')).overflowX") == 'visible')
    ok('desktop: tagline pill shown in the hero', d.locator('.hero-kicker').is_visible())
    d.evaluate("setSession(null)"); d.goto(U + '#/login'); d.wait_for_timeout(200); d.click('[data-a=demo-login][data-e="bahr"]'); d.wait_for_timeout(400); d.goto(U + '#/co/bookings'); d.wait_for_timeout(400)
    ok('desktop: tables keep their header row', d.locator('.tbl-cards thead').is_visible())
    b.close()
print('errors:', err[:5]); print(f'{sum(res)}/{len(res)} passed')
