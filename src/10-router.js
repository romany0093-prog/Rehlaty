
/* ---------- 11. Router (hash-based, role-guarded) ---------- */
const ROUTES = [
  ['/', () => viewHome()],
  ['/trips', () => viewTrips()],
  ['/destinations', () => viewDestinations()],
  ['/companies', () => viewCompanies()],
  ['/trip/:id', (p) => viewTrip(p.id)],
  ['/company/:id', (p) => viewCompany(p.id)],
  ['/login', () => viewLogin(), 'guest'],
  ['/register', () => viewRegister(), 'guest'],
  ['/register/company', () => viewRegisterCompany(), 'guest'],
  ['/page/:slug', (p) => viewPage(p.slug)],
  ['/book/:id', (p) => viewCheckout(p.id), 'customer'],
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
      document.title = tr('غير مسموح | رحلاتي', 'Not allowed | Rehlati');
      $('#app').innerHTML = publicLayout(`<div class="wrap sec">${empty('lock', tr('الصفحة دي مش متاحة لحسابك', 'This page isn’t available for your account'), tr('كل نوع حساب ليه لوحة خاصة بيه.', 'Each account type has its own dashboard.'), `<a class="btn btn-primary" href="${homeFor(me())}">${tr('روح للوحة بتاعتك', 'Go to your dashboard')}</a>`)}</div>`);
      return;
    }
  }
  if (path !== LAST_PATH) { UI.mnav = false; UI.side = false; UI.menu = null; UI.filtersOpen = false; closeModal(); if (!path.startsWith('/book')) { if (UI.co && UI.co.done) UI.co = null; } }
  $('#app').innerHTML = m ? m.fn(m.p) : viewNotFound();
  const h1 = $('#app h1'); document.title = (h1 ? h1.textContent.trim().slice(0, 60) + ' | ' : '') + tr('رحلاتي', 'Rehlati');
  if (path !== LAST_PATH) { scrollTo(0, 0); LAST_PATH = path; }
  tickHold();
}
window.addEventListener('hashchange', render);
initDB();
if (SESSION && !me()) setSession(null);
render();
