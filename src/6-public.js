
/* ---------- 6. Public website ---------- */
function header() {
  const u = me(), h = location.hash || '#/';
  const navs = [['#/', tr('الرئيسية', 'Home')], ['#/trips', tr('الرحلات', 'Trips')], ['#/offers', tr('العروض', 'Offers')], ['#/compare', tr('قارن', 'Compare') + (cmpList().length ? ` (${cmpList().length})` : '')], ['#/destinations', tr('الوجهات', 'Destinations')], ['#/companies', tr('شركات السياحة', 'Tour operators')], ['#/page/faq', tr('الأسئلة الشائعة', 'FAQ')]];
  const isOn = (p) => (p === '#/' ? h === '#/' || h === '#' : h.startsWith(p));
  return `<header class="site-h"><div class="wrap">
    <a href="#/" class="logo" aria-label="${tr('UTravel – الرئيسية', 'UTravel – home')}">${brandLogo({ tagline: true })}</a>
    <nav class="nav" aria-label="${tr('القائمة الرئيسية', 'Main')}">${navs.map(([p, l]) => `<a href="${p}" class="${isOn(p) ? 'on' : ''}">${l}</a>`).join('')}</nav>
    <div class="h-actions">
      <button class="lang-btn" data-a="lang" aria-label="${tr('English', 'العربية')}">${LANG === 'ar' ? 'EN' : 'ع'}</button>
      ${u ? `<a class="icon-btn hide-m" href="${notifLink()}" aria-label="${tr('الإشعارات', 'Notifications')}">${ic('bell')}${unread() ? `<span class="dot">${unread()}</span>` : ''}</a>
        <div class="user-menu"><button class="row" style="border:0;background:none;cursor:pointer;gap:8px" data-a="umenu" aria-haspopup="true" aria-expanded="${!!UI.menu}"><span class="avatar">${esc(initials(u.name))}</span></button>${UI.menu ? userMenu(u) : ''}</div>`
      : `<a class="btn btn-ghost btn-sm hide-m" href="#/login">${tr('تسجيل الدخول', 'Log in')}</a><a class="btn btn-primary btn-sm" href="#/register">${tr('إنشاء حساب', 'Sign up')}</a>`}
      <button class="icon-btn burger" data-a="mnav" aria-label="${tr('القائمة', 'Menu')}">${ic(UI.mnav ? 'x' : 'menu')}</button>
    </div></div></header>
    ${UI.mnav ? `<div class="m-nav">${navs.map(([p, l]) => `<a href="${p}">${l}</a>`).join('')}${u ? `<a href="${homeFor(u)}">${tr('لوحة التحكم', 'Dashboard')}</a>` : `<a href="#/login">${tr('تسجيل الدخول', 'Log in')}</a>`}<a href="#/register/company">${tr('سجّل شركتك', 'List your company')}</a>${installLink('btn btn-soft btn-block')}</div>` : ''}`;
}
const logoMark = () => `<span class="logo-mark" aria-hidden="true">${brandT()}</span>`;
const notifLink = () => (role() === 'admin' ? '#/admin/notifications' : role() === 'company' ? '#/co/notifications' : '#/me/notifications');
function userMenu(u) {
  return `<div class="menu" role="menu"><div style="padding:8px 10px 10px;border-bottom:1px solid var(--line-2);margin-bottom:4px"><b style="color:var(--navy)">${esc(u.name)}</b><div class="xs faint">${esc(u.email)}</div></div>
    <a href="${homeFor(u)}" role="menuitem">${ic('grid')}${tr('لوحة التحكم', 'Dashboard')}</a>
    ${u.role === 'customer' ? `<a href="#/me/bookings" role="menuitem">${ic('ticket')}${tr('حجوزاتي', 'My bookings')}</a><a href="#/me/favorites" role="menuitem">${ic('heart')}${tr('المفضلة', 'Saved trips')}</a>` : ''}
    <a href="${notifLink()}" role="menuitem">${ic('bell')}${tr('الإشعارات', 'Notifications')}</a>
    ${installLink('')}<button data-a="logout" role="menuitem">${ic('logout')}${tr('تسجيل الخروج', 'Log out')}</button></div>`;
}
ACTIONS.umenu = () => { UI.menu = !UI.menu; render(); };
ACTIONS.mnav = () => { UI.mnav = !UI.mnav; render(); };
ACTIONS.lang = () => { LANG = LANG === 'ar' ? 'en' : 'ar'; try { localStorage.setItem(LANG_KEY, LANG); } catch (e) { } applyLang(); render(); };
ACTIONS.logout = async () => { UI.menu = null; await logout(); toast(tr('تم تسجيل الخروج.', 'Logged out.')); go('#/'); };
function footer() {
  return `<footer class="site-f"><div class="wrap"><div class="f-grid">
    <div><a href="#/" class="logo" aria-label="UTravel">${brandLogo({ variant: 'dark', tagline: true })}</a><p style="margin-top:12px;font-size:14.5px;max-width:320px">${tr('منصة تجمع شركات السياحة المرخصة في مصر. قارن واحجز وادفع في مكان واحد.', 'Licensed Egyptian tour operators in one place. Compare, book and pay securely.')}</p></div>
    <div><h4>${tr('اكتشف', 'Explore')}</h4><a href="#/trips">${tr('كل الرحلات', 'All trips')}</a><a href="#/destinations">${tr('الوجهات', 'Destinations')}</a><a href="#/companies">${tr('شركات السياحة', 'Tour operators')}</a><a href="#/trips?cat=day">${tr('رحلات اليوم الواحد', 'Day trips')}</a></div>
    <div><h4>${tr('UTravel', 'UTravel')}</h4><a href="#/page/about">${tr('من نحن', 'About')}</a><a href="#/page/faq">${tr('الأسئلة الشائعة', 'FAQ')}</a><a href="#/page/terms">${tr('الشروط والأحكام', 'Terms')}</a><a href="#/page/privacy">${tr('الخصوصية', 'Privacy')}</a><a href="#/register/company">${tr('سجّل شركتك معنا', 'List your company')}</a></div>
    <div><h4>${tr('تواصل معنا', 'Contact')}</h4><a href="#/page/contact" class="row" style="gap:8px">${ic('phone')}<span dir="ltr">16xxx</span></a><a href="#/page/contact" class="row" style="gap:8px">${ic('mail')}support@utravel.eg</a><p style="font-size:14px;margin-top:6px">${tr('التجمع الخامس، القاهرة الجديدة', 'Fifth Settlement, New Cairo')}</p>${installLink('btn btn-sand btn-sm')}</div>
  </div><div class="f-bot"><span>© ${new Date().getFullYear()} ${tr('UTravel', 'UTravel')}${CLOUD ? '' : ' · ' + tr('وضع العرض التجريبي (البيانات في متصفحك فقط)', 'Demo mode (data stays in your browser)')}</span>${CLOUD ? '' : `<button class="btn-link" style="color:#B9C7D4" data-a="reset-demo">${tr('إعادة ضبط البيانات التجريبية', 'Reset demo data')}</button>`}</div></div></footer>`;
}
ACTIONS['reset-demo'] = async () => { if (await confirmDialog({ title: tr('إعادة ضبط البيانات؟', 'Reset demo data?'), text: tr('ستُحذف كل التعديلات والحجوزات التي أضفتها وتعود البيانات التجريبية الأصلية.', 'All your changes and bookings will be removed and the original demo data restored.'), ok: tr('إعادة الضبط', 'Reset'), danger: true })) { resetDB(); setSession(null); toast(tr('تمت إعادة ضبط البيانات.', 'Demo data reset.')); go('#/'); } };
const publicLayout = (inner) => header() + `<main id="main" class="route-fade">${inner}</main>` + footer() + cmpTray() + tabBar();
/* bottom tab bar (phones): travellers and guests get app-style navigation; companies and admins use their dashboards */
function tabBar() {
  const r = role(); if (r === 'company' || r === 'admin') return '';
  const h = (location.hash || '#/').split('?')[0], n = cmpList().length;
  const items = r === 'customer'
    ? [['#/', 'home', tr('الرئيسية', 'Home')], ['#/trips', 'search', tr('الرحلات', 'Trips')], ['#/me/bookings', 'ticket', tr('رحلاتي', 'My trips')], ['#/me/notifications', 'bell', tr('الإشعارات', 'Alerts'), unread()], ['#/me', 'user', tr('حسابي', 'Account')]]
    : [['#/', 'home', tr('الرئيسية', 'Home')], ['#/trips', 'search', tr('الرحلات', 'Trips')], ['#/plan', 'compass', tr('خطط رحلتك', 'Plan a trip')], ['#/compare', 'layers', tr('قارن', 'Compare'), n], ['#/login', 'user', tr('دخول', 'Log in')]];
  const on = (p) => p === '#/' ? h === '#/' || h === '#' || h === '' : p === '#/me' ? h === '#/me' || (h.startsWith('#/me/') && !h.startsWith('#/me/bookings') && !h.startsWith('#/me/booking/') && !h.startsWith('#/me/notifications')) : p === '#/me/bookings' ? h.startsWith('#/me/booking') : h.startsWith(p) || (p === '#/login' && h.startsWith('#/register'));
  return `<nav class="tabbar" aria-label="${tr('التنقل السريع', 'Quick navigation')}">${items.map(([p, i, l, c]) => `<a href="${p}" class="${on(p) ? 'on' : ''}" ${on(p) ? 'aria-current="page"' : ''}>${ic(i)}${c ? `<span class="tb-dot">${c}</span>` : ''}<span>${l}</span></a>`).join('')}</nav>`;
}

/* trip card */
function tripCard(t) {
  const s = tripStats(t), c = compById(t.companyId), dest = destById(t.destId), cr = companyRating(c.id);
  const fav = me() && me().role === 'customer' && (me().favorites || []).includes(t.id);
  const low = s.next && s.remaining > 0 && s.remaining <= 5, camp = tripCampaign(t);
  return `<article class="tcard">
    <a class="media" href="#/trip/${t.id}" aria-label="${esc(L(t.title))}"><img src="${imgSrc(t.images[0])}" alt=""><span class="tag">${camp ? esc(L(SEASONS[camp.season].l)) : esc(L(catById(t.catId).name))}</span>${camp ? `<span class="off">−${camp.percent}٪</span>` : ''}</a>
    <button class="fav ${fav ? 'on' : ''}" data-a="fav" data-id="${t.id}" aria-pressed="${fav}" aria-label="${tr('حفظ في المفضلة', 'Save')}">${ic('heart')}</button>${cmpBtn(t)}
    <div class="body">
      <div class="row between small"><span class="row" style="gap:5px;color:var(--teal-700);font-weight:600">${ic('pin')}${esc(L(dest.name))}</span>${starsHTML(s.rating, s.reviews)}</div>
      <h3><a href="#/trip/${t.id}">${esc(L(t.title))}</a></h3>
      <a class="co" href="#/company/${c.id}">${coLogo(c)}<span>${esc(L(c.name))}</span><span class="faint">· ${cr.count ? r1(cr.avg) + ' ★' : tr('جديد', 'New')}</span></a>
      <p class="desc">${esc(L(t.summary))}</p>
      <div class="meta"><span>${ic('clock')}${nightsLabel(t.days)}</span><span>${ic('cal')}${s.next ? fmtDS(s.next.start) : tr('لا توجد مواعيد', 'No dates')}</span></div>
      <div class="foot"><div class="price num"><small>${tr('يبدأ من / للفرد', 'From / person')}</small>${camp ? `<s>${money(s.minPrice)}</s> ` : ''}${money(offerPrice(s.minPrice, camp))}</div>
        <div style="text-align:end">${s.next ? `<div class="seats ${low ? 'low' : 'ok'}">${s.remaining ? tr(`متبقي ${s.remaining} مقعد`, `${s.remaining} seats left`) : tr('مكتمل', 'Sold out')}</div>` : ''}<a class="btn btn-soft btn-sm" href="#/trip/${t.id}" style="margin-top:4px">${tr('عرض التفاصيل', 'View details')}</a></div></div>
    </div></article>`;
}
ACTIONS.fav = (el) => {
  if (!me()) { toast(tr('سجّل الدخول لحفظ الرحلات.', 'Log in to save trips.'), 'info'); return go('#/login?next=' + encodeURIComponent(location.hash)); }
  if (role() !== 'customer') return toast(tr('المفضلة متاحة لحسابات العملاء.', 'Saved trips are for customer accounts.'), 'info');
  const on = toggleFav(el.dataset.id); el.classList.toggle('on', on); el.setAttribute('aria-pressed', on);
  toast(on ? tr('تمت الإضافة للمفضلة.', 'Saved.') : tr('أزيلت من المفضلة.', 'Removed from saved.'));
};

/* ---- home ---- */
function viewHome() {
  const trips = publicTrips();
  const featured = db.settings.featuredTrips.map(tripById).filter((t) => t && trips.includes(t));
  const popular = trips.slice().sort((a, b) => tripStats(b).popularity - tripStats(a).popularity).slice(0, 4);
  const latest = trips.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);
  const dests = db.destinations.filter((d) => d.featured);
  const comps = db.companies.filter((c) => c.status === 'approved');
  const revs = db.reviews.filter((r) => r.ratings.overall >= 5 && r.text.length > 40 && tripById(r.tripId)).slice(0, 3);
  const banner = db.settings.banners.find((b) => b.active);
  const heroTrip = featured[0] || trips[0];
  const destOpts = db.destinations.map((d) => `<option value="${d.id}">${esc(L(d.name))}</option>`).join('');
  const custOffers = role() === 'customer' ? customerOffers('home') : '';
  return publicLayout(`${custOffers}
  <section class="hero"><div class="hero-art"><img src="assets/hero.jpg" srcset="assets/hero-800.jpg 800w, assets/hero.jpg 1376w" sizes="100vw" alt="" fetchpriority="high" onerror="this.onerror=null;this.removeAttribute('srcset');this.src=artURL('nile',1)"></div>
    <div class="wrap hero-in" style="position:relative">
      <p class="hero-kicker" dir="ltr">${BRAND.tagline}</p>
      <h1>${tr('كل رحلات مصر، من شركات موثوقة، في حجز واحد', 'Every Egyptian trip, from trusted operators, in one booking')}</h1>
      <p class="lead">${tr('قارن البرامج والأسعار والمواعيد بين أكثر من شركة سياحة مرخصة، واحجز مقعدك وادفع أونلاين.', 'Compare programmes, prices and dates across licensed tour operators, then book your seat and pay online.')}</p>
      <form class="ticket" data-f="hero-search" role="search">
        <div class="tf"><label for="hs-dest">${tr('رايح فين؟', 'Where to?')}</label><select id="hs-dest" name="dest"><option value="">${tr('كل الوجهات', 'All destinations')}</option>${destOpts}</select></div>
        <div class="tf"><label for="hs-date">${tr('تاريخ السفر (من – إلى)', 'Travel dates (from – to)')}</label><div class="price-pair date-pair"><input id="hs-date" name="date" type="date" min="${iso(addDays(TODAY, 1))}" data-ch="date-from" data-to="hs-to" aria-label="${tr('من تاريخ', 'From date')}"><span class="sep">–</span><input id="hs-to" name="to" type="date" min="${iso(addDays(TODAY, 1))}" aria-label="${tr('إلى تاريخ', 'To date')}"></div></div>
        <div class="tf"><label>${tr('الميزانية للفرد (ج.م)', 'Budget per person (EGP)')}</label><div class="price-pair"><input name="min" type="number" min="0" step="500" placeholder="${tr('من', 'Min')}" aria-label="${tr('أقل سعر', 'Min price')}"><span class="faint">–</span><input name="max" type="number" min="0" step="500" placeholder="${tr('إلى', 'Max')}" aria-label="${tr('أعلى سعر', 'Max price')}"></div></div>
        <div class="go"><button class="btn btn-teal btn-lg" type="submit">${ic('search')}${tr('ابحث', 'Search')}</button></div>
      </form>
      <div class="hero-plan"><span>${tr('مش لاقي اللي في دماغك؟', 'Have something specific in mind?')}</span><a href="#/plan" class="hero-plan-link">${ic('compass')}${tr('خطط رحلتك بنفسك والشركات تبعتلك عروض', 'Plan your own trip and get offers from operators')}</a></div>
      <div class="hero-stats"><span><b class="num">${trips.length}</b>${tr('رحلة متاحة الآن', 'trips available now')}</span><span><b class="num">${comps.length}</b>${tr('شركات مرخصة', 'licensed operators')}</span><span><b class="num">${r1(avg(db.reviews.map((r) => r.ratings.overall)))} ★</b>${tr(`من ${db.reviews.length} تقييم حقيقي`, `from ${db.reviews.length} verified reviews`)}</span></div>
    </div></section>

  ${custOffers ? '' : homeOffers()}
  ${homePlanBand()}
  <section class="sec"><div class="wrap">
    <div class="sec-h"><div><h2>${tr('وجهات مختارة', 'Featured destinations')}</h2><p>${tr('من البحر الأحمر إلى واحات الصحراء الغربية.', 'From the Red Sea to the Western Desert oases.')}</p></div><a class="btn btn-ghost btn-sm" href="#/destinations">${tr('كل الوجهات', 'All destinations')}</a></div>
    <div class="dest-row rail-dest">${dests.map((d, i) => { const n = trips.filter((t) => t.destId === d.id).length; return `<a class="dest ${i === 0 ? 'big' : ''} ${i > 0 && i === dests.length - 1 && (dests.length + 3) % 4 === 2 ? 'wide' : ''}" href="#/trips?dest=${d.id}"><img src="${artURL(d.art, i % 3)}" alt=""><div class="dc"><h3>${esc(L(d.name))}</h3><small>${esc(L(d.region))} · ${tr(`${n} رحلة`, `${n} trips`)}</small></div></a>`; }).join('')}</div>
  </div></section>

  <section class="sec band"><div class="wrap">
    <div class="sec-h"><div><h2>${tr('الأكثر حجزًا', 'Most booked')}</h2><p>${tr('الرحلات اللي المسافرين اختاروها أكتر الشهر ده.', 'The trips travellers chose most this month.')}</p></div><a class="btn btn-ghost btn-sm" href="#/trips?sort=popular">${tr('عرض الكل', 'View all')}</a></div>
    <div class="grid g4 rail">${popular.map(tripCard).join('')}</div>
  </div></section>

  ${banner ? `<section class="sec" style="padding-bottom:0"><div class="wrap"><a class="promo" href="${safeLink(banner.link)}"><img src="${imgSrc(banner.art)}" alt=""><div class="pc"><h3>${esc(L(banner.title))}</h3><p>${esc(L(banner.text))} <span class="code">${esc(banner.code)}</span></p><span class="btn btn-sand">${tr('شوف رحلات العرض', 'See offer trips')}</span></div></a></div></section>` : ''}

  <section class="sec"><div class="wrap">
    <div class="sec-h"><div><h2>${tr('أُضيفت حديثًا', 'Recently added')}</h2></div><a class="btn btn-ghost btn-sm" href="#/trips?sort=new">${tr('عرض الكل', 'View all')}</a></div>
    <div class="grid g4 rail">${latest.map(tripCard).join('')}</div>
  </div></section>

  <section class="sec why"><div class="wrap grid g2" style="gap:48px;align-items:start">
    <div><h2>${tr('ليه تحجز من UTravel بدل ما تحوّل لشركة مباشرة؟', 'Why book through UTravel instead of paying a company directly?')}</h2><p style="color:#C7D5E2;margin-top:12px;max-width:440px">${tr('لأن فلوسك بتفضل محفوظة عندنا لحد ما الرحلة تتم، ولأنك بتقارن بين أكتر من شركة بنفس التفاصيل.', 'Because your money stays with us until the trip happens, and you compare operators on the same details.')}</p></div>
    <div>
      <div class="why-item"><h3>${tr('شركات راجعنا ورقها', 'Operators we have vetted')}</h3><p>${tr('مفيش شركة بتنشر رحلة قبل ما نراجع السجل التجاري وترخيص وزارة السياحة.', 'No company can publish before we review its commercial register and tourism licence.')}</p></div>
      <div class="why-item"><h3>${tr('فلوسك محفوظة لحد ما تسافر', 'Your payment is held until you travel')}</h3><p>${tr('الشركة بتستلم المبلغ بعد انتهاء الرحلة، ولو اتلغت بيرجعلك حسب السياسة المعلنة.', 'The operator is paid after the trip; if it’s cancelled you’re refunded under the published policy.')}</p></div>
      <div class="why-item"><h3>${tr('تقييمات من ناس سافرت فعلًا', 'Reviews from people who actually went')}</h3><p>${tr('التقييم متاح بس لصاحب حجز مكتمل، مرة واحدة لكل حجز.', 'Only a completed booking can leave a review, once.')}</p></div>
      <div class="why-item"><h3>${tr('ادفع بالطريقة اللي تريحك', 'Pay the way you like')}</h3><p>${tr('بطاقة بنكية، فوري، فودافون كاش وباقي المحافظ، أو إنستاباي.', 'Bank card, Fawry, Vodafone Cash and other wallets, or InstaPay.')}</p></div>
    </div></div></section>

  <section class="sec"><div class="wrap">
    <div class="sec-h"><div><h2>${tr('شركات السياحة على UTravel', 'Tour operators on UTravel')}</h2></div><a class="btn btn-ghost btn-sm" href="#/companies">${tr('كل الشركات', 'All operators')}</a></div>
    <div class="grid g4 rail">${comps.map(companyCard).join('')}</div>
  </div></section>

  <section class="sec band"><div class="wrap">
    <div class="sec-h"><div><h2>${tr('قالوا عن رحلاتهم', 'What travellers said')}</h2><p>${tr('تقييمات منشورة من حجوزات مكتملة.', 'Published reviews from completed bookings.')}</p></div></div>
    <div class="grid g3 rail">${revs.map((r) => { const u = { name: r.customerName || userById(r.customerId).name }, t = tripById(r.tripId); return `<figure class="quote" style="margin:0">${starsHTML(r.ratings.overall)}<p style="margin:10px 0 14px">${esc(r.text)}</p><figcaption class="row"><span class="avatar">${esc(initials(u.name))}</span><div><b style="color:var(--navy)">${esc(u.name)}</b><div class="xs faint"><a href="#/trip/${t.id}">${esc(L(t.title))}</a></div></div></figcaption></figure>`; }).join('')}</div>
  </div></section>

  <section class="sec"><div class="wrap"><div class="card card-pad row wrapx between" style="gap:20px;padding:28px"><div><h2 style="font-size:22px">${tr('عندك شركة سياحة؟', 'Run a tour company?')}</h2><p class="muted" style="margin-top:6px">${tr('اعرض رحلاتك لآلاف المسافرين وخلّي الحجز والتحصيل علينا. العمولة ' + db.settings.commission + '٪ على الحجز المكتمل فقط.', 'Reach thousands of travellers and let us handle booking and payment. ' + db.settings.commission + '% commission on completed bookings only.')}</p></div><a class="btn btn-primary btn-lg" href="#/register/company">${tr('سجّل شركتك', 'List your company')}</a></div></div></section>`);
}
CHANGES['date-from'] = (el) => { const to = document.getElementById(el.dataset.to); if (!to) return; to.min = el.value || to.min; if (to.value && el.value && to.value < el.value) { to.value = ''; to.dispatchEvent(new Event('input')); } };
FORMS['hero-search'] = (f) => { const d = formData(f); if (d.date && d.to && d.to < d.date) return toast(tr('تاريخ "إلى" لازم يكون بعد تاريخ "من".', 'The “to” date must be after the “from” date.'), 'bad'); const q = new URLSearchParams(); Object.entries(d).forEach(([k, v]) => v && q.set(k, v)); go('#/trips' + (q.toString() ? '?' + q : '')); };
function companyCard(c) {
  const cr = companyRating(c.id), n = publicTrips().filter((t) => t.companyId === c.id).length;
  return `<a class="card card-pad" href="#/company/${c.id}" style="display:flex;flex-direction:column;gap:10px"><div class="row">${coLogo(c, 'md')}<div class="grow" style="min-width:0"><h3 style="font-size:16px">${esc(L(c.name))}</h3><div class="xs faint">${esc(L(c.city))}</div></div></div><p class="small muted" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(L(c.desc))}</p><div class="row between small wrapx">${starsHTML(cr.avg, cr.count)}${prate(c)}<span class="muted">${tr(`${n} رحلة`, `${n} trips`)}</span></div></a>`;
}

/* ---- trips listing ---- */
function readQuery() { const q = (location.hash.split('?')[1] || ''); return Object.fromEntries(new URLSearchParams(q)); }
function filterTrips(q) {
  let list = publicTrips().map((t) => ({ t, s: tripStats(t) }));
  if (q.q) { const k = q.q.toLowerCase(); list = list.filter(({ t }) => (L(t.title) + ' ' + t.title.ar + ' ' + t.title.en + ' ' + L(destById(t.destId).name) + ' ' + L(compById(t.companyId).name)).toLowerCase().includes(k)); }
  if (q.dest) { const ds = q.dest.split(','); list = list.filter(({ t }) => ds.includes(t.destId)); }
  if (q.cat) { const cs = q.cat.split(','); list = list.filter(({ t }) => cs.includes(t.catId)); }
  if (q.co) list = list.filter(({ t }) => t.companyId === q.co);
  if (q.offer) { const cp = campaigns().find((c) => c.id === q.offer); list = list.filter(({ t }) => cp && (cp.tripIds || []).includes(t.id)); }
  if (q.deals === '1') list = list.filter(({ t }) => tripCampaign(t));
  if (q.dur) list = list.filter(({ t }) => (q.dur === '1' ? t.days === 1 : q.dur === '2-3' ? t.days >= 2 && t.days <= 3 : q.dur === '4-5' ? t.days >= 4 && t.days <= 5 : t.days >= 6));
  if (q.date || q.to) { const from = q.date || '', to = q.to && (!q.date || q.to >= q.date) ? q.to : ''; list = list.filter(({ s }) => s.deps.some((d) => (!from || d.start >= from) && (!to || d.start <= to))); }
  if (q.min) list = list.filter(({ s }) => s.minPrice >= +q.min);
  if (q.max) list = list.filter(({ s }) => s.minPrice <= +q.max);
  if (q.rating) list = list.filter(({ s }) => s.rating >= +q.rating);
  if (q.avail === '1') list = list.filter(({ s }) => s.avail.length > 0);
  const sorts = { price_asc: (a, b) => a.s.minPrice - b.s.minPrice, price_desc: (a, b) => b.s.minPrice - a.s.minPrice, rating: (a, b) => b.s.rating - a.s.rating, popular: (a, b) => b.s.popularity - a.s.popularity, new: (a, b) => b.t.createdAt.localeCompare(a.t.createdAt) };
  list.sort(sorts[q.sort] || sorts.popular);
  return list.map((x) => x.t);
}
function viewTrips() {
  const q = readQuery(), list = filterTrips(q);
  const chk = (key, val, label) => { const on = (q[key] || '').split(',').includes(val); return `<label class="opt"><input type="checkbox" data-ch="flt-multi" data-k="${key}" value="${val}" ${on ? 'checked' : ''}>${esc(label)}</label>`; };
  const rad = (key, val, label) => `<label class="opt"><input type="radio" name="${key}" data-ch="flt-one" data-k="${key}" value="${val}" ${(q[key] || '') === val ? 'checked' : ''}>${esc(label)}</label>`;
  const active = Object.keys(q).filter((k) => k !== 'sort' && q[k]).length;
  return publicLayout(`
  <section class="phead"><div class="wrap"><div class="crumbs"><a href="#/">${tr('الرئيسية', 'Home')}</a><span>/</span><span>${tr('الرحلات', 'Trips')}</span></div><h1>${q.offer && campaigns().find((c) => c.id === q.offer) ? esc(L(campaigns().find((c) => c.id === q.offer).title)) : q.dest && !q.dest.includes(',') ? tr('رحلات ', 'Trips to ') + esc(L(destById(q.dest).name)) : tr('كل الرحلات', 'All trips')}</h1><p>${tr('فلتر حسب الوجهة والسعر والتاريخ، وقارن بين الشركات.', 'Filter by destination, price and date, and compare operators.')}</p></div></section>
  <div class="wrap sec" style="padding-top:28px"><div class="list-layout">
    <aside class="card filters ${UI.filtersOpen ? 'open' : ''}" aria-label="${tr('الفلاتر', 'Filters')}">
      <div class="row between" style="padding-bottom:6px"><h3>${tr('الفلاتر', 'Filters')}</h3><div class="row">${active ? `<button class="btn-link small" data-a="flt-clear">${tr('مسح الكل', 'Clear all')}</button>` : ''}<button class="icon-btn filters-toggle" data-a="flt-toggle" aria-label="${tr('إغلاق', 'Close')}">${ic('x')}</button></div></div>
      <div class="fg"><div class="search" style="position:relative"><input class="input" placeholder="${tr('ابحث باسم الرحلة أو الشركة', 'Search trip or company')}" value="${esc(q.q || '')}" data-ch="flt-text" data-k="q" aria-label="${tr('بحث', 'Search')}"></div></div>
      <div class="fg"><h4>${tr('الوجهة', 'Destination')}</h4>${db.destinations.map((d) => chk('dest', d.id, L(d.name))).join('')}</div>
      <div class="fg"><h4>${tr('السعر للفرد (ج.م)', 'Price per person (EGP)')}</h4><div class="row"><input class="input" type="number" min="0" step="500" placeholder="${tr('من', 'Min')}" value="${esc(q.min || '')}" data-ch="flt-text" data-k="min" aria-label="${tr('أقل سعر', 'Min')}"><input class="input" type="number" min="0" step="500" placeholder="${tr('إلى', 'Max')}" value="${esc(q.max || '')}" data-ch="flt-text" data-k="max" aria-label="${tr('أعلى سعر', 'Max')}"></div></div>
      <div class="fg"><h4>${tr('تاريخ السفر', 'Travel date')}</h4><div class="stack" style="--gap:8px"><label class="small muted" for="fl-from">${tr('من', 'From')}</label><input class="input" id="fl-from" type="date" min="${iso(addDays(TODAY, 1))}" value="${esc(q.date || '')}" data-ch="flt-text" data-k="date"><label class="small muted" for="fl-to">${tr('إلى', 'To')}</label><input class="input" id="fl-to" type="date" min="${esc(q.date || iso(addDays(TODAY, 1)))}" value="${esc(q.to || '')}" data-ch="flt-text" data-k="to"></div><span class="hint">${q.date && q.to && q.to < q.date ? tr('تاريخ "إلى" قبل "من"، تم تجاهله.', 'The “to” date is before “from”, so it was ignored.') : tr('رحلات لها موعد سفر داخل الفترة دي', 'Trips with a departure in this range')}</span></div>
      <div class="fg"><h4>${tr('المدة', 'Duration')}</h4>${rad('dur', '', tr('أي مدة', 'Any'))}${rad('dur', '1', tr('يوم واحد', '1 day'))}${rad('dur', '2-3', tr('٢–٣ أيام', '2–3 days'))}${rad('dur', '4-5', tr('٤–٥ أيام', '4–5 days'))}${rad('dur', '6', tr('٦ أيام أو أكثر', '6+ days'))}</div>
      <div class="fg"><h4>${tr('نوع الرحلة', 'Trip type')}</h4>${db.categories.map((c) => chk('cat', c.id, L(c.name))).join('')}</div>
      <div class="fg"><h4>${tr('الشركة', 'Operator')}</h4><select class="select" data-ch="flt-text" data-k="co" aria-label="${tr('الشركة', 'Operator')}"><option value="">${tr('كل الشركات', 'All operators')}</option>${db.companies.filter((c) => c.status === 'approved').map((c) => `<option value="${c.id}" ${q.co === c.id ? 'selected' : ''}>${esc(L(c.name))}</option>`).join('')}</select></div>
      <div class="fg"><h4>${tr('التقييم', 'Rating')}</h4>${rad('rating', '', tr('أي تقييم', 'Any'))}${rad('rating', '4.5', '4.5+ ★')}${rad('rating', '4', '4+ ★')}</div>
      <div class="fg"><label class="opt"><input type="checkbox" data-ch="flt-avail" ${q.avail === '1' ? 'checked' : ''}>${tr('فيها مقاعد متاحة فقط', 'Only with seats available')}</label><label class="opt"><input type="checkbox" data-ch="flt-deals" ${q.deals === '1' ? 'checked' : ''}>${tr('عليها عروض الموسم فقط', 'Only with seasonal offers')}</label></div>
      <button class="btn btn-primary btn-block filters-toggle" data-a="flt-toggle">${tr(`اعرض ${list.length} رحلة`, `Show ${list.length} trips`)}</button>
    </aside>
    <div>
      <div class="toolbar"><div class="row"><button class="btn btn-ghost btn-sm filters-toggle" data-a="flt-toggle">${ic('filter')}${tr('الفلاتر', 'Filters')}${active ? ` (${active})` : ''}</button><span class="muted"><b class="num" style="color:var(--navy)">${list.length}</b> ${tr('رحلة', 'trips')}</span></div>
        <label class="row small sort-l"><span class="muted sort-t">${tr('ترتيب حسب', 'Sort by')}</span><select class="select" style="width:auto;height:38px" data-ch="flt-text" data-k="sort" aria-label="${tr('ترتيب حسب', 'Sort by')}">${[['popular', tr('الأكثر طلبًا', 'Most popular')], ['price_asc', tr('السعر: الأقل أولًا', 'Price: low to high')], ['price_desc', tr('السعر: الأعلى أولًا', 'Price: high to low')], ['rating', tr('الأعلى تقييمًا', 'Highest rated')], ['new', tr('الأحدث', 'Recently added')]].map(([v, l]) => `<option value="${v}" ${(q.sort || 'popular') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
      <div id="trip-results">${list.length ? `<div class="grid g3">${list.map(tripCard).join('')}</div>` : empty('compass', tr('مفيش رحلات بالشروط دي', 'No trips match these filters'), tr('جرّب توسّع نطاق السعر أو تشيل فلتر التاريخ.', 'Try a wider price range or remove the date filter.'), `<button class="btn btn-primary" data-a="flt-clear">${tr('مسح الفلاتر', 'Clear filters')}</button>`)}</div>
    </div></div></div>`);
}
function setQuery(k, v) {
  const q = readQuery(); if (v) q[k] = v; else delete q[k];
  const s = new URLSearchParams(q).toString();
  history.replaceState(null, '', '#/trips' + (s ? '?' + s : ''));
  const res = $('#trip-results'); if (res) res.innerHTML = `<div class="grid g3">${'<div class="sk" style="height:420px"></div>'.repeat(3)}</div>`;
  clearTimeout(UI.fltT); UI.fltT = setTimeout(() => { const y = scrollY; render(); scrollTo(0, y); }, 220);
}
CHANGES['flt-multi'] = (el) => { const q = readQuery(); const cur = (q[el.dataset.k] || '').split(',').filter(Boolean); const i = cur.indexOf(el.value); el.checked ? i < 0 && cur.push(el.value) : i >= 0 && cur.splice(i, 1); setQuery(el.dataset.k, cur.join(',')); };
CHANGES['flt-one'] = (el) => setQuery(el.dataset.k, el.value);
CHANGES['flt-text'] = (el) => setQuery(el.dataset.k, el.value);
CHANGES['flt-avail'] = (el) => setQuery('avail', el.checked ? '1' : '');
CHANGES['flt-deals'] = (el) => setQuery('deals', el.checked ? '1' : '');
ACTIONS['flt-clear'] = () => { UI.filtersOpen = false; go('#/trips'); };
ACTIONS['flt-toggle'] = () => { UI.filtersOpen = !UI.filtersOpen; render(); };

/* ---- destinations & companies index ---- */
function viewDestinations() {
  const trips = publicTrips();
  return publicLayout(`<section class="phead"><div class="wrap"><h1>${tr('الوجهات', 'Destinations')}</h1><p>${tr('اختار المكان، وبعدين قارن الرحلات المتاحة له.', 'Pick a place, then compare the trips available there.')}</p></div></section>
  <div class="wrap sec"><div class="dest-row" style="grid-auto-rows:220px">${db.destinations.map((d, i) => { const n = trips.filter((t) => t.destId === d.id); const min = n.length ? Math.min(...n.map((t) => tripStats(t).minPrice)) : 0; return `<a class="dest" href="#/trips?dest=${d.id}"><img src="${artURL(d.art, i % 3)}" alt=""><div class="dc"><h3>${esc(L(d.name))}</h3><small>${esc(L(d.region))} · ${n.length ? tr(`${n.length} رحلة من ${money(min)}`, `${n.length} trips from ${money(min)}`) : tr('قريبًا', 'Coming soon')}</small></div></a>`; }).join('')}</div></div>`);
}
function viewCompanies() {
  return publicLayout(`<section class="phead"><div class="wrap"><h1>${tr('شركات السياحة', 'Tour operators')}</h1><p>${tr('كل الشركات دي راجعنا ترخيصها من وزارة السياحة.', 'We have checked the Ministry of Tourism licence of every operator here.')}</p></div></section>
  <div class="wrap sec"><div class="grid g3">${db.companies.filter((c) => c.status === 'approved').map(companyCard).join('')}</div></div>`);
}

/* ---- trip details ---- */
function viewTrip(id) {
  const t = tripById(id);
  const visible = t && ((t.status === 'active' && compById(t.companyId).status === 'approved') || isMyPrivate(t) || role() === 'admin' || (role() === 'company' && me().companyId === t.companyId));
  if (!visible) return viewNotFound(tr('الرحلة غير متاحة', 'Trip not available'), tr('ممكن تكون الرحلة اتوقفت أو لسه بتتراجع.', 'It may be paused or still under review.'));
  const c = compById(t.companyId), d = destById(t.destId), s = tripStats(t), revs = tripReviews(t.id), cr = companyRating(c.id);
  UI.bw = UI.bw && UI.bw.tripId === t.id ? UI.bw : { tripId: t.id, depId: (s.avail[0] || {}).id, n: 2 };
  const ratingBars = ['organization', 'service', 'punctuality', 'company'].map((k) => [k, avg(revs.map((r) => r.ratings[k]))]);
  const rlabels = { organization: tr('التنظيم', 'Organization'), service: tr('الخدمة', 'Service'), punctuality: tr('الالتزام بالمواعيد', 'Punctuality'), company: tr('الشركة', 'Company') };
  const imgs = t.images.slice(0, 3); while (imgs.length < 3) imgs.push('art:' + d.art + ':' + imgs.length);
  const camp = tripCampaign(t);
  return publicLayout(`<div class="wrap" style="padding-top:20px">
    ${isMyPrivate(t) ? `<div class="callout ok" style="margin-bottom:14px">${ic('compass')}<div class="grow">${tr('الرحلة دي اتعملت مخصوص ليك بناءً على طلبك، ومحدش غيرك يقدر يشوفها أو يحجزها.', 'This trip was made just for you from your request — nobody else can see or book it.')}</div><a class="btn btn-sm btn-ghost" href="#/me/request/${t.requestId}">${tr('ارجع للعروض', 'Back to offers')}</a></div>` : t.status !== 'active' ? `<div class="callout warn" style="margin-bottom:14px">${ic('info')}<div>${tr('معاينة: هذه الرحلة غير منشورة للعملاء حاليًا', 'Preview: this trip is not visible to customers')} — ${badge(TSTAT, t.status)}</div></div>` : ''}
    <div class="crumbs" style="color:var(--faint)"><a href="#/">${tr('الرئيسية', 'Home')}</a><span>/</span><a href="#/trips?dest=${d.id}">${esc(L(d.name))}</a><span>/</span><span>${esc(L(catById(t.catId).name))}</span></div>
    <div class="row between wrapx" style="align-items:flex-end;margin-bottom:16px"><div style="max-width:820px"><h1 style="font-size:clamp(24px,3.2vw,36px)">${esc(L(t.title))}</h1>
      <div class="row wrapx small" style="margin-top:8px;gap:16px"><span class="row" style="gap:5px;color:var(--teal-700);font-weight:600">${ic('pin')}${esc(L(d.name))}، ${esc(L(d.region))}</span>${starsHTML(s.rating, s.reviews)}<a class="row" style="gap:8px" href="#/company/${c.id}">${coLogo(c)}<b style="color:var(--navy)">${esc(L(c.name))}</b></a></div></div>
      <div class="row t-actions"><button class="btn btn-ghost btn-sm" data-a="cmp-toggle" data-id="${t.id}">${ic(cmpList().includes(t.id) ? 'check' : 'layers')}${cmpList().includes(t.id) ? tr('في المقارنة', 'In comparison') : tr('أضف للمقارنة', 'Add to compare')}</button><a class="btn btn-ghost btn-sm" href="#/compare?dest=${d.id}">${tr('قارن رحلات ', 'Compare ')}${esc(L(d.name))}</a><button class="btn btn-ghost btn-sm" data-a="fav" data-id="${t.id}">${ic('heart')}${tr('حفظ', 'Save')}</button></div></div>
    ${camp ? `<div class="callout ok camp-note" style="margin-bottom:16px;align-items:center">${seasonChip(camp)}<div class="grow"><b>${esc(L(camp.title))}</b> — ${tr(`خصم ${camp.percent}٪ على كل المواعيد، للحجز حتى ${fmtD(camp.until)}`, `${camp.percent}% off every departure when you book by ${fmtD(camp.until)}`)}</div></div>` : ''}
    <div class="gallery">${imgs.map((im, i) => `<button data-a="lightbox" data-src="${i}" aria-label="${tr('تكبير الصورة', 'Enlarge image')}"><img src="${imgSrc(im)}" alt="${esc(L(t.title))}"></button>`).join('')}</div>
    <div class="detail-layout"><div>
      <div class="facts"><div><small>${tr('المدة', 'Duration')}</small><b>${nightsLabel(t.days)}</b></div><div><small>${tr('أقرب موعد', 'Next departure')}</small><b>${s.next ? fmtDS(s.next.start) : '—'}</b></div><div><small>${tr('السعر يبدأ من', 'From')}</small><b class="num">${money(offerPrice(s.minPrice, camp))}</b>${camp ? ` <s class="was">${money(s.minPrice)}</s>` : ''}</div><div><small>${tr('المقاعد المتاحة', 'Seats left')}</small><b class="num">${s.next ? s.remaining : 0}</b></div></div>
      <section class="dsec"><h2>${tr('عن الرحلة', 'About this trip')}</h2><p>${esc(L(t.desc))}</p></section>
      <section class="dsec"><h2>${tr('البرنامج يوم بيوم', 'Day by day')}</h2><div class="itin">${t.itinerary.map((x) => `<div class="itin-day"><h4><small>${tr('اليوم', 'Day')} ${x.day}</small>${esc(L(x.title))}</h4><p class="muted small" style="margin-top:4px">${esc(L(x.text))}</p></div>`).join('')}</div></section>
      <section class="dsec grid g2"><div><h2 style="font-size:17px" class="row">${ic('bed')}${tr('الإقامة', 'Accommodation')}</h2><p class="muted">${esc(L(t.accommodation))}</p></div><div><h2 style="font-size:17px" class="row">${ic('bus')}${tr('الانتقالات', 'Transport')}</h2><p class="muted">${esc(L(t.transport))}</p></div></section>
      <section class="dsec grid g2"><div><h2 style="font-size:17px">${tr('السعر يشمل', 'Included')}</h2><ul class="ticklist tick-ok">${t.included.map((x) => `<li>${ic('check')}${esc(L(x))}</li>`).join('')}</ul></div><div><h2 style="font-size:17px">${tr('السعر لا يشمل', 'Not included')}</h2><ul class="ticklist tick-no">${t.excluded.map((x) => `<li>${ic('x')}${esc(L(x))}</li>`).join('')}</ul></div></section>
      <section class="dsec"><h2>${tr('سياسة الحجز والإلغاء', 'Booking & cancellation policy')}</h2><p>${esc(L(t.policy))}</p></section>
      <section class="dsec"><h2>${tr('كل المواعيد', 'All departures')}</h2>${s.deps.length ? `<div class="tbl-wrap card"><table class="tbl"><thead><tr><th>${tr('السفر', 'Departs')}</th><th>${tr('العودة', 'Returns')}</th><th>${tr('السعر للفرد', 'Per person')}</th><th>${tr('المقاعد', 'Seats')}</th><th></th></tr></thead><tbody>${s.deps.map((dp) => { const si = seatInfo(dp); return `<tr><td>${fmtD(dp.start, { weekday: 'short', day: 'numeric', month: 'short' })}</td><td>${fmtDS(dp.end)}</td><td class="num"><b style="color:var(--navy)">${money(offerPrice(dp.price, camp))}</b>${camp ? ` <s class="was">${money(dp.price)}</s>` : ''}</td><td>${si.remaining ? `<span class="seats ${si.remaining <= 5 ? 'low' : 'ok'}">${tr(`${si.remaining} متاح`, `${si.remaining} left`)}</span>` : badge(DSTAT, 'full')}</td><td>${si.remaining ? `<button class="btn btn-soft btn-sm" data-a="bw-pick" data-id="${dp.id}">${tr('اختر', 'Select')}</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div>` : `<p class="muted">${tr('لا توجد مواعيد قادمة حاليًا.', 'No upcoming departures right now.')}</p>`}</section>
      <section class="dsec" id="reviews"><h2>${tr('تقييمات المسافرين', 'Traveller reviews')}</h2>
        ${revs.length ? `<div class="grid g2" style="align-items:center;margin-bottom:8px"><div class="row"><b style="font-family:var(--f-disp);font-size:44px;color:var(--navy);line-height:1">${r1(s.rating)}</b><div>${starsHTML(s.rating)}<div class="small muted">${tr(`${revs.length} تقييم من حجوزات مكتملة`, `${revs.length} reviews from completed bookings`)}</div></div></div><div class="rbars">${ratingBars.map(([k, v]) => `<div class="rbar"><span>${rlabels[k]}</span><i><b style="width:${(v / 5) * 100}%"></b></i><span class="num">${r1(v)}</span></div>`).join('')}</div></div>${revs.slice(0, 6).map(reviewItem).join('')}` : `<p class="muted">${tr('لسه مفيش تقييمات. التقييم بيكون متاح للمسافرين بعد انتهاء الرحلة.', 'No reviews yet. Travellers can review after the trip ends.')}</p>`}</section>
      <section class="dsec" style="border:0"><h2>${tr('الشركة المنظمة', 'Organised by')}</h2><div class="card card-pad"><div class="row wrapx">${coLogo(c, 'md')}<div class="grow"><h3><a href="#/company/${c.id}">${esc(L(c.name))}</a></h3><div class="small muted">${esc(c.license)} · ${tr('منذ', 'since')} ${c.founded}</div></div><div class="row wrapx">${prate(c)}${starsHTML(cr.avg, cr.count)}</div></div><p class="muted small" style="margin-top:10px">${esc(L(c.desc))}</p><div class="row wrapx small" style="margin-top:12px;gap:18px"><span class="row" style="gap:6px">${ic('phone')}<span dir="ltr">${esc(c.phone)}</span></span><span class="row" style="gap:6px">${ic('mail')}${esc(c.email)}</span><span class="row" style="gap:6px">${ic('pin')}${esc(L(c.city))}</span></div></div></section>
    </div>
    <aside><div class="bw" id="bw">${bookingWidget(t)}</div></aside></div></div>
    ${s.avail.length ? `<div class="m-book" id="m-book"><div class="price num"><small>${tr('يبدأ من / للفرد', 'From / person')}</small>${camp ? `<s>${money(s.minPrice)}</s> ` : ''}${money(offerPrice(s.minPrice, camp))}</div><button class="btn btn-teal" data-a="m-book">${ic('cal')}${tr('اختار الموعد واحجز', 'Pick a date & book')}</button></div>` : ''}`);
}
function reviewItem(r) {
  const u = { name: r.customerName || userById(r.customerId).name }; const c = compById(r.companyId) || { name: '' };
  return `<div class="rev"><div class="row between"><div class="row"><span class="avatar">${esc(initials(u.name))}</span><div><b style="color:var(--navy)">${esc(u.name)}</b><div class="xs faint">${fmtD(r.createdAt)} · ${tr('حجز مؤكد', 'Verified booking')}</div></div></div>${starsHTML(r.ratings.overall)}</div><p style="margin-top:8px">${esc(r.text)}</p>${r.reply ? `<div class="reply"><b class="small" style="color:var(--navy)">${tr('رد', 'Reply from')} ${esc(L(c.name))}</b><p class="small">${esc(r.reply.text)}</p></div>` : ''}</div>`;
}
function bookingWidget(t) {
  const s = tripStats(t), st = UI.bw;
  const dep = st.depId && depById(st.depId); const si = dep ? seatInfo(dep) : null;
  if (si && st.n > si.remaining) st.n = Math.max(1, si.remaining);
  const q = dep ? priceQuote(dep, st.n, '', t) : null, camp = tripCampaign(t), base = dep ? dep.price : s.minPrice;
  return `<div class="bw-top">${camp ? `<div style="margin-bottom:10px">${seasonChip(camp)} <b class="small" style="color:var(--ok)">${tr(`خصم ${camp.percent}٪`, `${camp.percent}% off`)}</b></div>` : ''}<div class="row between"><div class="price num"><small>${tr('السعر للفرد', 'Per person')}</small>${camp ? `<s>${money(base)}</s> ` : ''}${money(offerPrice(base, camp))}</div>${starsHTML(s.rating, s.reviews)}</div></div>
    <div class="bw-cut"></div>
    <div class="bw-bot stack">
      <div><div class="lbl" style="margin-bottom:8px">${tr('اختر موعد السفر', 'Choose a departure')}</div>${s.deps.length ? `<div class="dep-list" role="radiogroup">${s.deps.map((dp) => { const x = seatInfo(dp); return `<button class="dep ${dp.id === st.depId ? 'on' : ''} ${x.remaining ? '' : 'full'}" data-a="bw-pick" data-id="${dp.id}" ${x.remaining ? '' : 'disabled'} role="radio" aria-checked="${dp.id === st.depId}"><span class="dd"><b>${fmtD(dp.start, { weekday: 'short', day: 'numeric', month: 'short' })}</b><div class="xs muted">${tr('العودة', 'Back')} ${fmtDS(dp.end)} · ${x.remaining ? `<span class="${x.remaining <= 5 ? 'seats low' : ''}">${tr(`${x.remaining} مقعد`, `${x.remaining} seats`)}</span>` : tr('مكتمل', 'Sold out')}</div></span><span class="num" style="font-weight:700;color:var(--navy);font-size:14px;text-align:end">${money(offerPrice(dp.price, camp))}${camp ? `<s class="was" style="display:block">${money(dp.price)}</s>` : ''}</span></button>`; }).join('')}</div>` : `<p class="muted small">${tr('لا توجد مواعيد متاحة حاليًا.', 'No dates available right now.')}</p>`}</div>
      ${dep ? `<div class="row between"><span class="lbl">${tr('عدد المسافرين', 'Travellers')}</span><div class="qty"><button data-a="bw-n" data-d="-1" aria-label="${tr('أقل', 'Fewer')}" ${st.n <= 1 ? 'disabled' : ''}>−</button><span class="num" aria-live="polite">${st.n}</span><button data-a="bw-n" data-d="1" aria-label="${tr('أكثر', 'More')}" ${st.n >= Math.min(10, si.remaining) ? 'disabled' : ''}>+</button></div></div>
      <div class="calc"><div class="row"><span class="muted">${money(dep.price)} × ${st.n}</span><span class="num">${money(q.subtotal)}</span></div>${q.discount ? `<div class="row" style="color:var(--ok)"><span>${esc(L(q.campaign.title))}</span><span class="num">− ${money(q.discount)}</span></div>` : ''}<div class="row"><span class="muted">${tr('رسوم الخدمة', 'Service fee')}</span><span>${tr('بدون', 'None')}</span></div><div class="row" style="border-top:1px solid var(--line-2);padding-top:8px;margin-top:4px"><b>${tr('الإجمالي', 'Total')}</b><span class="total num">${money(q.total)}</span></div></div>
      <button class="btn btn-teal btn-lg btn-block" data-a="bw-book">${tr('احجز الآن', 'Book now')}</button>
      <p class="xs faint" style="text-align:center">${tr(`المقاعد بتتحجز لك ${db.settings.holdMinutes} دقيقة لحد ما تدفع`, `Seats are held for ${db.settings.holdMinutes} minutes while you pay`)}</p>` : ''}
    </div>`;
}
const refreshBW = () => { const el = $('#bw'); const t = tripById(UI.bw.tripId); if (el && t) el.innerHTML = bookingWidget(t); };
ACTIONS['bw-pick'] = (el) => { UI.bw.depId = el.dataset.id; refreshBW(); if (innerWidth < 980) $('#bw').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
ACTIONS['m-book'] = () => { const el = $('#bw'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
ACTIONS['bw-n'] = (el) => { UI.bw.n = clamp(UI.bw.n + +el.dataset.d, 1, 10); refreshBW(); };
ACTIONS['bw-book'] = () => {
  const target = `#/book/${UI.bw.tripId}?dep=${UI.bw.depId}&n=${UI.bw.n}`;
  if (!me()) { toast(tr('سجّل الدخول أو أنشئ حساب علشان تكمل الحجز.', 'Log in or sign up to continue booking.'), 'info'); return go('#/login?next=' + encodeURIComponent(target)); }
  if (role() !== 'customer') return toast(tr('الحجز متاح لحسابات العملاء فقط. سجّل الخروج وادخل بحساب عميل.', 'Booking is for customer accounts. Log out and use a customer account.'), 'info');
  go(target);
};
ACTIONS.lightbox = (el) => { const t = tripById(UI.bw.tripId); const imgs = t.images; let i = +el.dataset.src;
  const show = () => { $('#layer').innerHTML = `<div class="lightbox" data-a="lb-close"><img src="${imgSrc(imgs[i % imgs.length])}" alt=""><button class="icon-btn" style="position:absolute;top:20px;inset-inline-end:20px" data-a="lb-close" aria-label="${tr('إغلاق', 'Close')}">${ic('x')}</button>${imgs.length > 1 ? `<button class="icon-btn" style="position:absolute;inset-inline-start:20px;top:50%" data-a="lb-next" aria-label="${tr('التالي', 'Next')}">${ic(LANG === 'ar' ? 'chevr' : 'chev')}</button>` : ''}</div>`; };
  ACTIONS['lb-next'] = (b, e) => { e.stopPropagation(); i++; show(); }; ACTIONS['lb-close'] = (b, e) => { if (e.target === b || b.tagName === 'BUTTON') closeModal(); }; show(); };

/* ---- company profile ---- */
function viewCompany(id) {
  const c = compById(id);
  if (!c || (c.status !== 'approved' && role() !== 'admin')) return viewNotFound(tr('الشركة غير موجودة', 'Company not found'), tr('ممكن تكون الشركة غير مفعّلة حاليًا.', 'It may be inactive right now.'));
  const trips = publicTrips().filter((t) => t.companyId === c.id), revs = companyReviews(c.id), cr = companyRating(c.id);
  const done = CLOUD ? ((CO_STATS[c.id] || {}).travellers || 0) : db.bookings.filter((b) => b.companyId === c.id && b.status === 'completed').reduce((a, b) => a + b.count, 0);
  return publicLayout(`<section style="position:relative;height:240px;overflow:hidden;background:var(--navy)"><img src="${imgSrc(c.cover)}" alt="" style="width:100%;height:100%;object-fit:cover;opacity:.85"></section>
  <div class="wrap"><div class="card card-pad" style="margin-top:-70px;position:relative;display:flex;gap:20px;flex-wrap:wrap;align-items:flex-end">${coLogo(c, 'lg')}<div class="grow"><h1 style="font-size:28px">${esc(L(c.name))}</h1><div class="row wrapx small muted" style="gap:14px;margin-top:4px"><span class="row" style="gap:5px">${ic('pin')}${esc(L(c.city))}</span><span class="row" style="gap:5px">${ic('shield')}${esc(c.license)}</span></div></div><div class="row" style="gap:28px">${c.platformRating ? `<div><small class="muted">${tr('تقييم UTravel', 'UTravel rating')}</small><div>${pStars(c.platformRating)}</div></div>` : ''}<div><small class="muted">${tr('تقييم العملاء', 'Customer rating')}</small><div>${starsHTML(cr.avg, cr.count)}</div></div><div><small class="muted">${tr('مسافرون', 'Travellers')}</small><div><b class="num" style="color:var(--navy)">${fmtN(done)}</b></div></div><div><small class="muted">${tr('منذ', 'Since')}</small><div><b style="color:var(--navy)">${c.founded}</b></div></div></div></div>
  <div class="detail-layout"><div>
    <section class="dsec" style="padding-top:0"><h2>${tr('عن الشركة', 'About')}</h2><p>${esc(L(c.desc))}</p></section>
    <section class="dsec"><h2>${tr(`رحلات ${esc(L(c.name))}`, `Trips by ${esc(L(c.name))}`)} <span class="faint" style="font-size:15px">(${trips.length})</span></h2>${trips.length ? `<div class="grid g2">${trips.map(tripCard).join('')}</div>` : `<p class="muted">${tr('لا توجد رحلات منشورة حاليًا.', 'No published trips right now.')}</p>`}</section>
    <section class="dsec" style="border:0"><h2>${tr('تقييمات العملاء', 'Customer reviews')}</h2>${revs.length ? revs.slice(0, 8).map(reviewItem).join('') : `<p class="muted">${tr('لا توجد تقييمات بعد.', 'No reviews yet.')}</p>`}</section>
  </div><aside><div class="card card-pad stack" style="position:sticky;top:88px"><h3>${tr('بيانات التواصل', 'Contact details')}</h3>
    <div class="row small">${ic('phone')}<span dir="ltr">${esc(c.phone)}</span></div><div class="row small">${ic('mail')}${esc(c.email)}</div>${c.website ? `<div class="row small">${ic('globe')}${esc(c.website)}</div>` : ''}<div class="row small">${ic('pin')}${esc(L(c.city))}</div>
    <div class="callout ok" style="margin-top:8px">${ic('shield')}<div>${tr('راجعت UTravel السجل التجاري وترخيص وزارة السياحة لهذه الشركة.', 'UTravel checked this company’s commercial register and tourism licence.')}</div></div></div></aside></div></div>`);
}

/* ---- auth ---- */
function viewLogin() {
  const q = readQuery();
  const co = (id) => (compById(id) ? L(compById(id).name) : id);
  const demo = db.settings.showDemo === false ? [] : [['mariam', '123456', tr('عميل', 'Customer'), 'مريم عادل', 'user'], ['bahr', '123456', tr('شركة سياحة', 'Tour company'), co('c2'), 'building'], ['nilestar', '123456', tr('شركة سياحة', 'Tour company'), co('c1'), 'building'], ...(CLOUD ? [] : [['admin', 'admin123', tr('مدير المنصة', 'Platform admin'), tr('إدارة UTravel', 'UTravel admin'), 'shield']])];
  return header() + `<main class="auth route-fade"><div class="auth-art"><img src="${artURL('sinai', 2)}" alt="">${authBrand()}<p class="cap">${tr('الشروق من فوق جبل موسى، دهب', 'Sunrise from Mount Sinai, Dahab')}</p></div>
  <div class="auth-f"><div class="auth-box"><h1 style="font-size:28px">${tr('تسجيل الدخول', 'Log in')}</h1><p class="muted" style="margin:6px 0 22px">${tr('ادخل علشان تتابع حجوزاتك أو تدير شركتك.', 'Log in to manage your bookings or your company.')}</p>
    <form data-f="login" class="stack" novalidate data-next="${esc(q.next || '')}">${inp('ident', tr('الإيميل أو رقم الموبايل أو اسم المستخدم', 'Email, mobile number or username'), '', { attrs: 'autocomplete="username" dir="ltr" autocapitalize="none" spellcheck="false"' })}${inp('password', tr('كلمة المرور', 'Password'), '', { type: 'password', attrs: 'autocomplete="current-password" dir="ltr"' })}
    <div style="margin-top:-4px;text-align:end"><a class="btn-link small" href="#/forgot" data-a="to-forgot">${tr('نسيت كلمة المرور؟', 'Forgot password?')}</a></div>
    <button class="btn btn-primary btn-lg btn-block" type="submit">${tr('دخول', 'Log in')}</button></form>
    <p class="small muted" style="margin-top:14px;text-align:center">${tr('ما عندكش حساب؟', 'No account?')} <a class="btn-link" href="#/register${q.next ? '?next=' + encodeURIComponent(q.next) : ''}">${tr('أنشئ حساب', 'Sign up')}</a> · <a class="btn-link" href="#/register/company">${tr('سجّل شركتك', 'Register a company')}</a></p>
    ${demo.length ? `<div style="margin-top:26px"><div class="lbl">${tr('حسابات تجريبية (اضغط للدخول مباشرة)', 'Demo accounts (click to log in)')}</div><div class="demo-acc">${demo.map(([e, p, r, n, i]) => `<button type="button" data-a="demo-login" data-e="${e}" data-p="${p}"><span style="width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:var(--teal-50);color:var(--teal-700);flex:none">${ic(i)}</span><span class="grow"><b style="color:var(--navy);font-size:14px">${esc(n)}</b><div class="xs muted">${r} · <span dir="ltr">${e}</span> / <span dir="ltr">${p}</span></div></span>${ic(LANG === 'ar' ? 'chev' : 'chevr')}</button>`).join('')}</div></div>` : ''}
  </div></div></main>`;
}
FORMS.login = async (f) => {
  const d = validate(f, { ident: ['req'], password: ['req'] }); if (!d) return;
  const btn = $('button[type=submit]', f); busy(btn, true); if (!CLOUD) await wait(350);
  try { const u = await login(d.ident, d.password); toast(tr(`أهلًا ${u.name.split(' ')[0]}`, `Welcome, ${u.name.split(' ')[0]}`)); go(f.dataset.next && u.role === 'customer' ? f.dataset.next : homeFor(u)); }
  catch (e) { busy(btn, false); const fe = f.elements.password.closest('.field'); fe.classList.add('err'); $('.err-msg', fe).textContent = e.message; }
};
// carry whatever they typed as username into the forgot page
ACTIONS['to-forgot'] = () => { const v = ($('#f-ident') || {}).value || ''; RESET.sentTo = null; go('#/forgot' + (v ? '?u=' + encodeURIComponent(v) : '')); };
ACTIONS['demo-login'] = async (el) => { el.disabled = true; let u; try { u = await login(el.dataset.e, el.dataset.p); } finally { el.disabled = false; } const nx = readQuery().next; toast(tr(`أهلًا ${u.name.split(' ')[0]}`, `Welcome, ${u.name.split(' ')[0]}`)); go(nx && u.role === 'customer' ? nx : homeFor(u)); };
function viewRegister() {
  const q = readQuery(), via = UI.regVia || 'email';
  const phoneFld = inp('phone', via === 'phone' ? tr('رقم الموبايل (واتساب)', 'Mobile number (WhatsApp)') : tr('رقم الموبايل (اختياري)', 'Mobile number (optional)'), UI.regDraft && UI.regDraft.phone || '', { type: 'tel', ph: '01xxxxxxxxx', attrs: 'dir="ltr" inputmode="numeric" autocomplete="tel"', hint: via === 'phone' ? tr('هتدخل بيه، ولو نسيت كلمة المرور هيوصلك كود على واتساب.', 'You’ll log in with it, and a WhatsApp code recovers your password.') : '' });
  const emailFld = inp('email', tr('البريد الإلكتروني', 'Email'), UI.regDraft && UI.regDraft.email || '', { type: 'email', attrs: 'autocomplete="email" dir="ltr"', hint: via === 'phone' ? tr('مطلوب كمان، علشان التأكيدات والفواتير وطريقة تانية لاسترجاع الحساب.', 'Also required, for confirmations, invoices and as a second way to recover your account.') : tr('هتدخل بيه، ولو نسيت كلمة المرور هيوصلك رابط عليه.', 'You’ll log in with it, and a reset link is sent to it if you forget your password.') });
  return header() + `<main class="auth route-fade"><div class="auth-art"><img src="${artURL('coast', 0)}" alt="">${authBrand()}<p class="cap">${tr('العلمين الجديدة، الساحل الشمالي', 'New Alamein, North Coast')}</p></div>
  <div class="auth-f"><div class="auth-box"><h1 style="font-size:28px">${tr('إنشاء حساب مسافر', 'Create a traveller account')}</h1><p class="muted" style="margin:6px 0 18px">${tr('دقيقة واحدة وتقدر تحجز وتتابع رحلاتك.', 'One minute and you can book and track your trips.')}</p>
    <div class="field" style="margin-bottom:16px"><span class="lbl">${tr('سجّل بـ', 'Sign up with')}</span><div class="seg seg-block" role="radiogroup" aria-label="${tr('طريقة التسجيل', 'Sign-up method')}"><button type="button" role="radio" aria-checked="${via === 'email'}" class="${via === 'email' ? 'on' : ''}" data-a="reg-via" data-v="email">${ic('mail')}${tr('البريد الإلكتروني', 'Email')}</button><button type="button" role="radio" aria-checked="${via === 'phone'}" class="${via === 'phone' ? 'on' : ''}" data-a="reg-via" data-v="phone">${ic('phone')}${tr('رقم الموبايل', 'Mobile number')}</button></div></div>
    <form data-f="register" class="stack" novalidate data-next="${esc(q.next || '')}" data-via="${via}">${inp('name', tr('الاسم بالكامل', 'Full name'), UI.regDraft && UI.regDraft.name || '', { attrs: 'autocomplete="name"' })}${via === 'phone' ? phoneFld + emailFld : emailFld + phoneFld}${inp('username', tr('اسم المستخدم', 'Username'), UI.regDraft && UI.regDraft.username || '', { attrs: 'autocomplete="username" dir="ltr" autocapitalize="none" spellcheck="false"', hint: tr('حروف إنجليزي صغيرة وأرقام و _ أو . (٣–٢٤). تقدر تدخل بيه كمان.', 'Lowercase letters, numbers, _ or . (3–24). You can log in with it too.') })}${inp('password', tr('كلمة المرور', 'Password'), '', { type: 'password', hint: tr('٨ أحرف على الأقل', 'At least 8 characters'), attrs: 'autocomplete="new-password" dir="ltr"' })}
    <label class="check field"><input type="checkbox" name="terms" value="1"><span>${tr('أوافق على', 'I agree to the')} <a class="btn-link" href="#/page/terms" target="_blank">${tr('الشروط والأحكام', 'terms')}</a></span><span class="err-msg"></span></label>
    <button class="btn btn-primary btn-lg btn-block" type="submit">${tr('إنشاء الحساب', 'Create account')}</button></form>
    <p class="small muted" style="margin-top:14px;text-align:center">${tr('عندك حساب؟', 'Have an account?')} <a class="btn-link" href="#/login">${tr('سجّل الدخول', 'Log in')}</a> · <a class="btn-link" href="#/register/company">${tr('تسجيل شركة سياحة', 'Register a tour company')}</a></p></div></div></main>`;
}
ACTIONS['reg-via'] = (el) => { const f = $('form[data-f=register]'); if (f) { const d = formData(f); UI.regDraft = { name: d.name, email: d.email, phone: d.phone, username: d.username }; } UI.regVia = el.dataset.v; render(); };
FORMS.register = async (f) => {
  const via = f.dataset.via === 'phone' ? 'phone' : 'email';
  const d = validate(f, { name: ['req', (v) => v.length >= 3 || tr('اكتب اسمك بالكامل.', 'Enter your full name.')], email: ['req', 'email'], phone: via === 'phone' ? ['req', 'phone'] : ['phone'], username: ['req', 'username'], password: ['req', 'pw'], terms: [(v) => !!v || tr('لازم توافق على الشروط.', 'You must accept the terms.')] }); if (!d) return;
  d.username = d.username.toLowerCase(); d.via = via; d.phone = (d.phone || '').replace(/\s/g, '');
  const btn = $('button[type=submit]', f); busy(btn, true); if (!CLOUD) await wait(400);
  try { await registerCustomer(d); UI.regDraft = null; UI.regVia = null; toast(tr('تم إنشاء حسابك.', 'Account created.')); go(f.dataset.next || '#/me'); }
  catch (e) { busy(btn, false); const k = e.code === 'USERNAME_TAKEN' || e.code === 'BAD_USERNAME' ? 'username' : e.code === 'PHONE_TAKEN' || e.code === 'BAD_PHONE' ? 'phone' : e.code === 'WEAK_PASSWORD' ? 'password' : 'email'; const fe = f.elements[k].closest('.field'); fe.classList.add('err'); $('.err-msg', fe).textContent = e.message; }
};
/* brand mark + tagline over the photo on the sign-in / sign-up / recovery pages */
const authBrand = () => `<div class="auth-brand">${brandLogo({ variant: 'dark', tagline: true })}</div>`;
function viewRegisterCompany() {
  return header() + `<main class="route-fade"><section class="phead"><div class="wrap"><h1>${tr('سجّل شركتك على UTravel', 'List your company on UTravel')}</h1><p>${tr('بنراجع الطلب والمستندات خلال يومين عمل. بعد الاعتماد تقدر تنشر رحلاتك وتستقبل حجوزات.', 'We review applications within two business days. Once approved you can publish trips and take bookings.')}</p></div></section>
  <div class="wrap sec" style="padding-top:28px"><form class="card card-pad" data-f="register-company" novalidate style="max-width:860px"><h3 style="margin-bottom:16px">${tr('بيانات الشركة', 'Company details')}</h3><div class="form-grid">
    ${inp('company', tr('اسم الشركة (عربي)', 'Company name (Arabic)'), '')}${inp('companyEn', tr('اسم الشركة (إنجليزي)', 'Company name (English)'), '', { attrs: 'dir="ltr"' })}
    ${inp('license', tr('رقم ترخيص وزارة السياحة', 'Tourism licence number'), '', { ph: tr('مثال: فئة (أ) رقم 1234', 'e.g. Category A no. 1234') })}${inp('founded', tr('سنة التأسيس', 'Year founded'), '', { type: 'number', attrs: 'min="1950" max="2026"' })}
    ${inp('city', tr('المدينة والعنوان', 'City & address'), '')}${inp('phone', tr('موبايل الشركة', 'Company mobile'), '', { type: 'tel', ph: '01xxxxxxxxx', attrs: 'dir="ltr"' })}
    ${txa('desc', tr('نبذة عن الشركة', 'About the company'), '', { full: true, rows: 3 })}
    <div class="field full"><span class="lbl">${tr('المستندات المطلوبة', 'Required documents')}</span><label class="upload">${ic('upload', 'lg')}<div style="margin-top:6px">${tr('ارفع السجل التجاري، ترخيص وزارة السياحة، والبطاقة الضريبية (PDF أو صورة)', 'Upload commercial register, tourism licence and tax card (PDF or image)')}</div><input type="file" name="docs" multiple accept=".pdf,image/*" class="sr" data-ch="docs-pick"></label><div id="docs-list" class="small muted" style="margin-top:6px"></div><span class="err-msg"></span></div>
  </div><h3 style="margin:24px 0 16px">${tr('حساب المسؤول', 'Account owner')}</h3><div class="form-grid">
    ${inp('name', tr('اسم المسؤول', 'Contact name'), '')}${inp('username', tr('اسم المستخدم للدخول', 'Login username'), '', { attrs: 'dir="ltr" autocapitalize="none" spellcheck="false"', hint: tr('حروف إنجليزي صغيرة وأرقام و _ أو .', 'Lowercase letters, numbers, _ or .') })}${inp('email', tr('البريد الإلكتروني', 'Email'), '', { type: 'email', attrs: 'dir="ltr"' })}${inp('password', tr('كلمة المرور', 'Password'), '', { type: 'password', attrs: 'dir="ltr" autocomplete="new-password"', hint: tr('٨ أحرف على الأقل', 'At least 8 characters') })}
  </div><div class="row" style="margin-top:22px;justify-content:flex-end"><a class="btn btn-ghost" href="#/">${tr('إلغاء', 'Cancel')}</a><button class="btn btn-primary btn-lg" type="submit">${tr('إرسال الطلب', 'Submit application')}</button></div></form></div></main>` + footer();
}
CHANGES['docs-pick'] = (el) => { $('#docs-list').textContent = Array.from(el.files).map((f) => f.name).join('، '); el.closest('.field').classList.remove('err'); };
FORMS['register-company'] = async (f) => {
  const files = Array.from(f.elements.docs.files || []);
  const d = validate(f, { company: ['req'], license: ['req'], founded: ['req', 'int', (v) => (+v >= 1950 && +v <= 2026) || tr('سنة غير صحيحة.', 'Invalid year.')], city: ['req'], phone: ['req', 'phone'], name: ['req', (v) => v.length >= 3 || tr('اكتب الاسم بالكامل.', 'Enter the full name.')], username: ['req', 'username'], email: ['req', 'email'], password: ['req', 'pw'] });
  if (!files.length) { const fe = f.elements.docs.closest('.field'); fe.classList.add('err'); $('.err-msg', fe).textContent = tr('ارفع مستندًا واحدًا على الأقل.', 'Upload at least one document.'); }
  if (!d || !files.length) return;
  d.username = d.username.toLowerCase();
  const btn = $('button[type=submit]', f); busy(btn, true); if (!CLOUD) await wait(500);
  try { d.docs = files.map((x) => x.name); await registerCompany(d); toast(tr('تم إرسال طلبك. هنبلغك بعد المراجعة.', 'Application sent. We’ll notify you after review.')); go('#/co'); }
  catch (e) { busy(btn, false); toast(e.message, 'bad'); }
};

/* ---- static pages ---- */
function viewPage(slug) {
  if (slug === 'faq') return publicLayout(`<section class="phead"><div class="wrap"><h1>${tr('الأسئلة الشائعة', 'FAQ')}</h1></div></section><div class="wrap sec"><div class="page-body">${db.settings.faq.map((x) => `<details class="faq"><summary>${esc(L(x.q))}</summary><p>${esc(L(x.a))}</p></details>`).join('')}</div></div>`);
  const p = db.settings.pages[slug]; if (!p) return viewNotFound();
  return publicLayout(`<section class="phead"><div class="wrap"><h1>${esc(L(p.title))}</h1></div></section><div class="wrap sec"><div class="page-body">${esc(L(p.body)).split('\n').map((x) => `<p>${x}</p>`).join('')}</div></div>`);
}
function viewNotFound(title, text) {
  return publicLayout(`<div class="wrap sec">${empty('compass', title || tr('الصفحة غير موجودة', 'Page not found'), text || tr('الرابط ممكن يكون اتغير.', 'The link may have changed.'), `<a class="btn btn-primary" href="#/">${tr('للرئيسية', 'Go home')}</a>`)}</div>`);
}
