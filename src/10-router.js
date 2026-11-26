
/* ---------- 11. Router (hash-based, role-guarded) ---------- */
const ROUTES = [
  ['/', () => viewHome()],
  ['/trips', () => viewTrips()],
  ['/destinations', () => viewDestinations()],
  ['/companies', () => viewCompanies()],
  ['/offers', () => viewOffers()],
  ['/compare', () => viewCompare()],
  ['/trip/:id', (p) => viewTrip(p.id)],
  ['/company/:id', (p) => viewCompany(p.id)],
  ['/login', () => viewLogin(), 'guest'],
  ['/forgot', () => viewForgot(), 'guest'],
  ['/reset-password', () => viewResetPassword()],
  ['/register', () => viewRegister(), 'guest'],
  ['/register/company', () => viewRegisterCompany(), 'guest'],
  ['/page/:slug', (p) => viewPage(p.slug)],
  ['/book/:id', (p) => viewCheckout(p.id), 'customer'],
  ['/plan', () => viewPlan(), 'customer'],
  ['/me/requests', () => viewMyRequests(), 'customer'],
  ['/me/request/:id', (p) => viewMyRequest(p.id), 'customer'],
  ['/me', () => viewMe(), 'customer'],
  ['/me/bookings', () => viewMyBookings(), 'customer'],
  ['/me/booking/:ref', (p) => viewMyBooking(p.ref), 'customer'],
  ['/me/payments', () => viewMyPayments(), 'customer'],
  ['/me/cancellations', () => viewMyCancellations(), 'customer'],
  ['/me/favorites', () => viewMyFavorites(), 'customer'],
  ['/me/reviews', () => viewMyReviews(), 'customer'],
  ['/me/notifications', () => dashLayout('me', tr('الإشعارات', 'Notifications'), notifList(myNotifs())), 'customer'],
  ['/me/profile', () => viewMyProfile(), 'customer'],
  ['/co', () => viewCo(), 'company'],
  ['/co/requests', () => viewCoRequests(), 'company'],
  ['/co/request/:id', (p) => viewCoRequest(p.id), 'company'],
  ['/co/trips', () => viewCoTrips(), 'company'],
  ['/co/trip/new', () => viewCoTripForm(null), 'company'],
  ['/co/trip/:id/edit', (p) => viewCoTripForm(p.id), 'company'],
  ['/co/trip/:id/departures', (p) => viewCoDepartures(p.id), 'company'],
  ['/co/bookings', () => viewCoBookings(), 'company'],
  ['/co/finance', () => viewCoFinance(), 'company'],
  ['/co/reviews', () => viewCoReviews(), 'company'],
  ['/co/notifications', () => dashLayout('co', tr('الإشعارات', 'Notifications'), notifList(myNotifs())), 'company'],
  ['/co/profile', () => viewCoProfile(), 'company'],
  ['/admin', () => viewAdmin(), 'admin'],
  ['/admin/companies', () => viewAdCompanies(), 'admin'],
  ['/admin/trips', () => viewAdTrips(), 'admin'],
  ['/admin/customers', () => viewAdCustomers(), 'admin'],
  ['/admin/bookings', () => viewAdBookings(), 'admin'],
  ['/admin/finance', () => viewAdFinance(), 'admin'],
  ['/admin/offers', () => viewAdOffers(), 'admin'],
  ['/admin/requests', () => viewAdRequests(), 'admin'],
  ['/admin/content', () => viewAdContent(), 'admin'],
  ['/admin/taxonomy', () => viewAdTaxonomy(), 'admin'],
  ['/admin/notifications', () => dashLayout('admin', tr('الإشعارات', 'Notifications'), notifList(myNotifs())), 'admin'],
  ['/admin/settings', () => viewAdSettings(), 'admin']
];
function matchRoute(path) {
  for (const [pat, fn, guard] of ROUTES) {
    const a = pat.split('/'), b = path.split('/'); if (a.length !== b.length) continue;
    const p = {}; let ok = true;
    for (let i = 0; i < a.length; i++) { if (a[i].startsWith(':')) p[a[i].slice(1)] = decodeURIComponent(b[i]); else if (a[i] !== b[i]) { ok = false; break; } }
    if (ok) return { fn, p, guard };
  }
  return null;
}
function go(h) { if (location.hash === h) render(); else location.hash = h; }
let LAST_PATH = '';
function render() {
  const h = location.hash.replace(/^#/, '') || '/';
  const path = h.split('?')[0].replace(/\/$/, '') || '/';
  const m = matchRoute(path);
  const r = role();
  if (m && m.guard) {
    if (m.guard === 'guest' && r !== 'guest') return go(homeFor(me()));
    if (m.guard !== 'guest' && r === 'guest') { return go('#/login?next=' + encodeURIComponent('#' + h)); }
    if (m.guard !== 'guest' && m.guard !== r) {
      // RBAC: a role can only see its own area
      document.title = tr('غير مسموح | UTravel', 'Not allowed | UTravel');
      $('#app').innerHTML = publicLayout(`<div class="wrap sec">${empty('lock', tr('الصفحة دي مش متاحة لحسابك', 'This page isn’t available for your account'), tr('كل نوع حساب ليه لوحة خاصة بيه.', 'Each account type has its own dashboard.'), `<a class="btn btn-primary" href="${homeFor(me())}">${tr('روح للوحة بتاعتك', 'Go to your dashboard')}</a>`)}</div>`);
      return;
    }
  }
  if (path !== LAST_PATH) { UI.mnav = false; UI.side = false; UI.menu = null; UI.filtersOpen = false; closeModal(); if (!path.startsWith('/book')) { if (UI.co && UI.co.done) UI.co = null; } }
  $('#app').innerHTML = m ? m.fn(m.p) : viewNotFound();
  const h1 = $('#app h1'); document.title = (h1 ? h1.textContent.trim().slice(0, 60) + ' | ' : '') + tr('UTravel', 'UTravel');
  if (path !== LAST_PATH) { scrollTo(0, 0); LAST_PATH = path; }
  tickHold();
  ofcMount();
  if (role() !== 'admin') installEngage(path.startsWith('/trip/') ? 'trip' : path.startsWith('/me/booking/') && readQuery().new ? 'booked' : 'page');
}
window.addEventListener('hashchange', () => { if (db) render(); });
function bootScreen(inner) { $('#app').innerHTML = `<main style="min-height:100vh;display:grid;place-items:center;padding:24px;text-align:center"><div class="stack" style="max-width:440px;align-items:center;display:flex;flex-direction:column">${brandLogo({ tagline: true, cls: 'ut-lg' })}${inner}</div></main>`; }
async function boot() {
  if (CLOUD_MISSING && !navigator.onLine) return bootScreen(`<h2 style="font-size:20px">${tr('مفيش اتصال بالإنترنت', 'You’re offline')}</h2><p class="muted">${tr('UTravel محتاج إنترنت علشان يعرض الرحلات المتاحة والأسعار الحالية. اتصل بالإنترنت وحاول تاني.', 'UTravel needs a connection to show current trips and prices. Connect and try again.')}</p><button class="btn btn-primary" onclick="location.reload()">${tr('حاول تاني', 'Try again')}</button>`);
  if (CLOUD_MISSING) return bootScreen(`<h2 style="font-size:20px">${tr('تعذر تحميل مكتبة الاتصال بالسيرفر', 'Couldn’t load the server library')}</h2><p class="muted">${tr('غالبًا مشكلة في الإنترنت أو مانع إعلانات. حدّث الصفحة.', 'Usually a connection problem or an ad blocker. Refresh the page.')}</p><div class="row"><button class="btn btn-primary" onclick="location.reload()">${tr('حاول تاني', 'Try again')}</button><a class="btn btn-ghost" href="?demo=1">${tr('افتح العرض التجريبي', 'Open the offline demo')}</a></div>`);
  if (CLOUD) {
    bootScreen(`<span class="spin" style="color:var(--teal);width:28px;height:28px;margin-top:8px"></span><p class="muted">${tr('جاري تحميل الرحلات…', 'Loading trips…')}</p>`);
    try { await loadCloud(); }
    catch (e) { console.error(e); if (!navigator.onLine) return bootScreen(`<h2 style="font-size:20px">${tr('مفيش اتصال بالإنترنت', 'You’re offline')}</h2><p class="muted">${tr('UTravel محتاج إنترنت علشان يعرض الرحلات المتاحة والأسعار الحالية. اتصل بالإنترنت وحاول تاني.', 'UTravel needs a connection to show current trips and prices. Connect and try again.')}</p><button class="btn btn-primary" onclick="location.reload()">${tr('حاول تاني', 'Try again')}</button>`); return bootScreen(`<h2 style="font-size:20px">${tr('السيرفر مش بيرد دلوقتي', 'The server isn’t responding')}</h2><p class="muted">${esc(cloudMsg(e))}</p><div class="row"><button class="btn btn-primary" onclick="location.reload()">${tr('حاول تاني', 'Try again')}</button><a class="btn btn-ghost" href="?demo=1">${tr('افتح العرض التجريبي', 'Open the offline demo')}</a></div>`); }
    if (RECOVERY_IN_URL && AUTH_UID) { RESET.recovering = AUTH_UID; history.replaceState(null, '', location.pathname + location.search + '#/reset-password'); }
    else if (RECOVERY_ERROR_IN_URL) history.replaceState(null, '', location.pathname + location.search + '#/forgot?expired=1');
  } else { initDB(); if (SESSION && !me()) setSession(null); }
  render();
}
boot();
