
/* ---------- 4. Data layer ----------
   Persistence: localStorage (one JSON document). `tx(fn)` is the only way to
   write: it re-reads the latest committed state (so a second tab can't sell
   the same seat), runs fn on a copy, and commits only if fn doesn't throw —
   the same all‑or‑nothing contract a Prisma $transaction gives on PostgreSQL. */
let MEMORY_ONLY = false;
let db = null;
function readDB() {
  try { const raw = localStorage.getItem(DB_KEY); if (raw) { const d = JSON.parse(raw); if (d.version === DB_VERSION) return d; } } catch (e) { MEMORY_ONLY = true; }
  return null;
}
function writeDB(d) {
  if (MEMORY_ONLY) return;
  try { localStorage.setItem(DB_KEY, JSON.stringify(d)); }
  catch (e) { const err = new Error('STORAGE_FULL'); err.code = 'STORAGE_FULL'; throw err; }
}
function initDB() { db = readDB(); if (!db) { db = seedDB(); try { writeDB(db); } catch (e) { MEMORY_ONLY = true; } } sweep(); }
function resetDB() { db = seedDB(); try { writeDB(db); } catch (e) { } }
class AppError extends Error { constructor(code, msg) { super(msg || code); this.code = code; } }
function tx(fn) {
  const fresh = readDB() || db;
  const draft = JSON.parse(JSON.stringify(fresh));
  const result = fn(draft);          // throws → nothing is committed
  writeDB(draft);
  db = draft;
  return result;
}
window.addEventListener('storage', (e) => { if (e.key === DB_KEY) { const d = readDB(); if (d) { db = d; render(); } } });

/* housekeeping run on load: expire seat holds, complete finished trips */
function sweep() {
  const now = Date.now(); let changed = false;
  db.bookings.forEach((b) => {
    if (b.status === 'pending_payment' && b.holdUntil && new Date(b.holdUntil).getTime() < now) { b.status = 'cancelled'; b.paymentStatus = 'failed'; b.cancelReason = 'hold_expired'; changed = true; }
    if (b.status === 'confirmed') { const d = depById(b.departureId); if (d && new Date(d.end) < TODAY) { b.status = 'completed'; changed = true; } }
  });
  db.departures.forEach((d) => { if (d.status === 'open' && new Date(d.start) <= TODAY) { d.status = 'closed'; changed = true; } });
  if (requestSweep(db)) changed = true;
  if (changed) { try { writeDB(db); } catch (e) { } }
}

/* ---------- repositories / selectors ---------- */
const byId = (arr, id) => arr.find((x) => x.id === id);
const userById = (id) => byId(db.users, id) || { id, name: tr('مسافر', 'Traveller'), phone: '', email: '', role: 'customer', status: 'active' };
const compById = (id) => byId(db.companies, id);
const tripById = (id) => byId(db.trips, id);
const depById = (id) => byId(db.departures, id);
const destById = (id) => byId(db.destinations, id);
const catById = (id) => byId(db.categories, id);
const bookingByRef = (ref) => db.bookings.find((b) => b.ref === ref);
const SEAT_STATUSES = ['confirmed', 'completed', 'refund_pending'];
function seatInfo(dep, d) {
  d = d || db; const now = Date.now();
  let booked = 0, held = 0;
  d.bookings.forEach((b) => {
    if (b.departureId !== dep.id) return;
    if (SEAT_STATUSES.includes(b.status)) booked += b.count;
    else if (b.status === 'pending_payment' && b.holdUntil && new Date(b.holdUntil).getTime() > now) held += b.count;
  });
  return { seats: dep.seats, booked, held, remaining: Math.max(0, dep.seats - booked - held) };
}
const isBookable = (dep) => dep.status === 'open' && new Date(dep.start) > TODAY;
const upcomingDeps = (tripId) => db.departures.filter((d) => d.tripId === tripId && isBookable(d)).sort((a, b) => a.start.localeCompare(b.start));
function tripReviews(tripId) { return db.reviews.filter((r) => r.tripId === tripId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
function companyReviews(cid) { return db.reviews.filter((r) => r.companyId === cid).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
const ratingOf = (revs) => avg(revs.map((r) => r.ratings.overall));
const companyRating = (cid) => { const r = companyReviews(cid); return { avg: avg(r.map((x) => x.ratings.company)), count: r.length }; };
function tripStats(t) {
  const deps = upcomingDeps(t.id); const avail = deps.filter((d) => seatInfo(d).remaining > 0);
  const revs = tripReviews(t.id);
  const booked = db.bookings.filter((b) => b.tripId === t.id && SEAT_STATUSES.includes(b.status)).reduce((a, b) => a + b.count, 0);
  return { deps, avail, next: avail[0] || deps[0] || null, minPrice: avail.length ? Math.min(...avail.map((d) => d.price)) : (deps.length ? Math.min(...deps.map((d) => d.price)) : t.basePrice), rating: ratingOf(revs), reviews: revs.length, remaining: avail[0] ? seatInfo(avail[0]).remaining : 0, popularity: (t.popular || 0) + booked * 3 };
}
const publicTrips = () => db.trips.filter((t) => t.status === 'active' && (compById(t.companyId) || {}).status === 'approved');
const effectiveRate = (c) => (c && c.commission != null && c.commission !== '' ? +c.commission : +db.settings.commission);
const retained = (b) => b.total - (b.refunded || 0);

/* ---------- session & RBAC ---------- */
const SESS_KEY = 'rehlati_session';
let SESSION = (() => { try { return JSON.parse(localStorage.getItem(SESS_KEY) || 'null'); } catch (e) { return null; } })();
let me = () => (SESSION ? byId(db.users, SESSION.userId) || null : null);
const role = () => (me() ? me().role : 'guest');
function setSession(u) { SESSION = u ? { userId: u.id, at: Date.now() } : null; try { u ? localStorage.setItem(SESS_KEY, JSON.stringify(SESSION)) : localStorage.removeItem(SESS_KEY); } catch (e) { } }
function login(ident, pw) {
  const v = String(ident).trim().toLowerCase(), ph = normPhone(v);
  const u = db.users.find((x) => x.email.toLowerCase() === v || (x.username || x.email.split('@')[0].toLowerCase()) === v || (ph && x.via === 'phone' && normPhone(x.phone) === ph));
  if (!u || u.password !== pw) throw new AppError('BAD_LOGIN', tr('البريد أو كلمة المرور غير صحيحة.', 'Email or password is incorrect.'));
  if (u.status === 'suspended') throw new AppError('SUSPENDED', tr('هذا الحساب موقوف. تواصل مع خدمة العملاء.', 'This account is suspended. Contact support.'));
  setSession(u); return u;
}
function logout() { setSession(null); }
function changePassword(oldPw, newPw) { if (oldPw !== me().password) throw new AppError('BAD_PW', tr('كلمة المرور الحالية غير صحيحة.', 'Current password is wrong.')); tx((d) => { byId(d.users, me().id).password = newPw; }); }
const homeFor = (u) => (!u ? '#/' : u.role === 'admin' ? '#/admin' : u.role === 'company' ? '#/co' : '#/me');
/** Company-scoped reads: a company user can only ever see rows with its own companyId. */
const myCompany = () => (role() === 'company' ? compById(me().companyId) : null);
const scoped = (arr) => { const u = me(); if (!u) return []; if (u.role === 'admin') return arr; if (u.role === 'company') return arr.filter((x) => x.companyId === u.companyId); return arr.filter((x) => x.customerId === u.id); };
function assertCompanyOwns(d, obj) { const u = me(); if (!u || u.role !== 'company' || !obj || obj.companyId !== u.companyId) throw new AppError('FORBIDDEN', tr('غير مسموح.', 'Not allowed.')); }
function assertRole(r) { if (role() !== r) throw new AppError('FORBIDDEN', tr('غير مسموح.', 'Not allowed.')); }

/* ---------- notifications ---------- */
/* `to` is a user id, 'admin', or 'company:<id>' (every user of that company sees it) */
function notify(d, to, title, body, link) { d.notifications.push({ id: uid('n'), to, title, body, link: link || '', read: false, createdAt: new Date().toISOString() }); }
const logAct = (d, ar, en) => d.activity.unshift({ id: uid('a'), at: new Date().toISOString(), text: { ar, en } });
function myNotifs() {
  const u = me(); if (!u) return [];
  const keys = [u.id]; if (u.role === 'admin') keys.push('admin'); if (u.role === 'company') keys.push('company:' + u.companyId, ...db.users.filter((x) => x.companyId === u.companyId && x.id !== u.id).map((x) => x.id));
  return db.notifications.filter((n) => keys.includes(n.to)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
const unread = () => myNotifs().filter((n) => !n.read).length;

/* ---------- auth services ---------- */
function registerCustomer(f) {
  const nu = tx((d) => {
    if (d.users.some((u) => u.email.toLowerCase() === f.email.toLowerCase())) throw new AppError('EMAIL_TAKEN', tr('البريد مسجل بالفعل. سجّل الدخول بدلًا من ذلك.', 'This email is already registered. Log in instead.'));
    if (d.users.some((u) => (u.username || u.email.split('@')[0]) === f.username)) throw new AppError('USERNAME_TAKEN', tr('اسم المستخدم محجوز. اختر اسمًا آخر.', 'That username is taken.'));
    if (f.via === 'phone' && d.users.some((u) => u.via === 'phone' && normPhone(u.phone) === normPhone(f.phone))) throw new AppError('PHONE_TAKEN', tr('رقم الموبايل ده مسجل بحساب تاني. سجّل الدخول بيه أو استرجع كلمة المرور.', 'This mobile number is already registered. Log in or recover your password.'));
    const u = { id: uid('u'), role: 'customer', via: f.via === 'phone' ? 'phone' : 'email', username: f.username, name: f.name, email: f.email, password: f.password, phone: f.phone, city: f.city || '', status: 'active', createdAt: new Date().toISOString(), favorites: [] };
    d.users.push(u);
    notify(d, u.id, { ar: 'أهلًا بك في UTravel', en: 'Welcome to UTravel' }, { ar: 'حسابك جاهز. ابدأ باكتشاف الرحلات.', en: 'Your account is ready. Start exploring trips.' }, '#/trips');
    return u;
  });
  setSession(nu); return nu;
}
function registerCompany(f) {
  const nu = tx((d) => {
    if (d.users.some((u) => u.email.toLowerCase() === f.email.toLowerCase())) throw new AppError('EMAIL_TAKEN', tr('البريد مسجل بالفعل.', 'This email is already registered.'));
    const palette = ['#2E6F6F', '#8C5A2B', '#5E4B8B', '#2F5D8A', '#9A3B3B', '#4E7A3A'];
    const c = { id: uid('c'), name: { ar: f.company, en: f.companyEn || f.company }, color: palette[d.companies.length % palette.length], city: { ar: f.city, en: f.city }, phone: f.phone, email: f.email, website: '', license: f.license, founded: +f.founded || new Date().getFullYear(), status: 'pending', commission: null, desc: { ar: f.desc || '', en: '' }, createdAt: new Date().toISOString(), logo: null, cover: 'art:sea:0', docs: (f.docs || []).map((n) => ({ name: n })) };
    d.companies.push(c);
    if (d.users.some((u) => (u.username || u.email.split('@')[0]) === f.username)) throw new AppError('USERNAME_TAKEN', tr('اسم المستخدم محجوز. اختر اسمًا آخر.', 'That username is taken.'));
    const u = { id: uid('u'), role: 'company', companyId: c.id, username: f.username, name: f.name, email: f.email, password: f.password, phone: f.phone, status: 'active', createdAt: new Date().toISOString() };
    d.users.push(u);
    notify(d, 'admin', { ar: 'طلب تسجيل شركة', en: 'Company application' }, { ar: `${f.company} أرسلت طلب انضمام.`, en: `${f.companyEn || f.company} applied to join.` }, '#/admin/companies');
    logAct(d, `${f.company} سجلت كشركة جديدة`, `${f.companyEn || f.company} registered`);
    return u;
  });
  setSession(nu); return nu;
}

/* ---------- booking & payment services ---------- */
/* ---------- seasonal offers (agreed with companies, managed by the admin) ---------- */
const SEASONS = {
  christmas: { l: { ar: 'الكريسماس ورأس السنة', en: 'Christmas & New Year' }, c: '#A8443F', i: 'sparkle' },
  midyear: { l: { ar: 'إجازة نصف العام', en: 'Mid‑year break' }, c: '#3D6C93', i: 'cal' },
  summer: { l: { ar: 'الصيف', en: 'Summer' }, c: '#8F6420', i: 'sun' },
  eid: { l: { ar: 'العيد', en: 'Eid' }, c: '#2C7560', i: 'star' }
};
const campaigns = () => db.settings.campaigns || [];
/** 'live' | 'upcoming' | 'ended' | 'off' — compares ISO dates so time zones can't shift a day */
function campaignState(c) { const t = iso(TODAY); return !c.active ? 'off' : t < c.from ? 'upcoming' : t > c.until ? 'ended' : 'live'; }
const liveCampaigns = () => campaigns().filter((c) => campaignState(c) === 'live' && (compById(c.companyId) || {}).status === 'approved');
const tripCampaign = (t) => (t ? liveCampaigns().filter((c) => c.companyId === t.companyId && (c.tripIds || []).includes(t.id)).sort((a, b) => b.percent - a.percent)[0] || null : null);
const offerPrice = (price, camp) => (camp ? price - Math.round(price * camp.percent / 100) : price);
/** Same rule as the server: the bigger of (seasonal offer, promo code) applies — they never stack. */
function priceQuote(dep, count, code, trip) {
  const subtotal = dep.price * count;
  let codeDisc = 0, codeOffer = null;
  if (code) {
    codeOffer = (db.settings.offers || []).find((o) => o.active && o.code.toUpperCase() === String(code).trim().toUpperCase() && o.until >= iso(TODAY) && (!o.dests.length || o.dests.includes(trip.destId))) || null;
    if (codeOffer) codeDisc = Math.round(subtotal * codeOffer.percent / 100);
  }
  const camp = tripCampaign(trip), campDisc = camp ? Math.round(subtotal * camp.percent / 100) : 0;
  const useCamp = campDisc > 0 && campDisc >= codeDisc;
  const discount = useCamp ? campDisc : codeDisc;
  return { subtotal, discount, total: subtotal - discount, offer: useCamp ? null : codeOffer, codeOffer, campaign: useCamp ? camp : null, promo: useCamp ? camp.title.ar : (codeOffer ? codeOffer.code : '') };
}
/* ---------- company ranking: UTravel's own rating (set by the admin) first, then customer reviews ---------- */
function rankedCompanies() {
  return db.companies.filter((c) => c.status === 'approved').map((c) => ({ c, pr: +c.platformRating || 0, cr: companyRating(c.id), trips: publicTrips().filter((t) => t.companyId === c.id).length }))
    .filter((x) => x.trips > 0).sort((a, b) => (b.pr - a.pr) || (b.cr.avg - a.cr.avg) || (b.cr.count - a.cr.count));
}
/** Step 1 of checkout: creates a Pending Payment booking and holds the seats for N minutes. */
function createBooking({ depId, travelers, code }) {
  const u = me(); if (!u || u.role !== 'customer') throw new AppError('AUTH', tr('سجّل الدخول كعميل لإتمام الحجز.', 'Log in as a customer to book.'));
  return tx((d) => {
    const dep = byId(d.departures, depId); const trip = dep && byId(d.trips, dep.tripId); const comp = trip && byId(d.companies, trip.companyId);
    const cust = byId(d.users, u.id);
    const priv = trip && trip.status === 'private' && trip.requestCustomer === u.id;
    if (!dep || !trip || (trip.status !== 'active' && !priv) || comp.status !== 'approved') throw new AppError('UNAVAILABLE', tr('هذه الرحلة غير متاحة للحجز حاليًا.', 'This trip is not available right now.'));
    if (cust.status !== 'active') throw new AppError('SUSPENDED', tr('حسابك موقوف.', 'Your account is suspended.'));
    if (!(dep.status === 'open' && new Date(dep.start) > TODAY)) throw new AppError('DEP_CLOSED', tr('هذا الموعد لم يعد متاحًا. اختر موعدًا آخر.', 'This date is no longer available. Pick another date.'));
    const n = travelers.length;
    if (n < 1 || n > (priv ? 40 : 10)) throw new AppError('COUNT', tr('عدد المسافرين من ١ إلى ١٠.', 'Travellers must be between 1 and 10.'));
    const dup = d.bookings.find((b) => b.customerId === u.id && b.departureId === dep.id && (b.status === 'confirmed' || (b.status === 'pending_payment' && new Date(b.holdUntil) > new Date())));
    if (dup) throw new AppError('DUPLICATE', tr(`لديك حجز على نفس الموعد بالفعل (${dup.ref}).`, `You already have a booking on this date (${dup.ref}).`), dup);
    const si = seatInfo(dep, d);
    if (si.remaining < n) throw new AppError('NO_SEATS', si.remaining ? tr(`المتاح الآن ${si.remaining} مقاعد فقط.`, `Only ${si.remaining} seats are left.`) : tr('اكتملت المقاعد في هذا الموعد.', 'This date is fully booked.'));
    const q = priceQuote(dep, n, code, trip);
    const rate = comp.commission != null && comp.commission !== '' ? +comp.commission : +d.settings.commission;
    const b = { id: uid('b'), ref: 'RH-' + dep.start.slice(2, 4) + dep.start.slice(5, 7) + '-' + (1000 + d.bookings.length + Math.floor(Math.random() * 900)), customerId: u.id, companyId: trip.companyId, tripId: trip.id, departureId: dep.id, count: n, travelers, unitPrice: dep.price, subtotal: q.subtotal, discount: q.discount, promo: q.promo, campaignId: q.campaign ? q.campaign.id : null, total: q.total, commissionRate: rate, commission: Math.round(q.total * rate / 100), status: 'pending_payment', paymentStatus: 'pending', requestId: priv ? trip.requestId : undefined, createdAt: new Date().toISOString(), holdUntil: new Date(Date.now() + d.settings.holdMinutes * 6e4).toISOString() };
    d.bookings.push(b);
    return b;
  });
}
/* Payment gateways: each has the same interface so a real Paymob / Fawry / Kashier
   adapter can replace `simulate` later without touching the booking logic. */
const GATEWAYS = {
  card: { name: { ar: 'بطاقة بنكية', en: 'Bank card' }, sub: { ar: 'فيزا · ماستركارد · ميزة', en: 'Visa, Mastercard, Meeza' }, color: '#1E3F5B', mark: 'CARD',
    simulate: (p) => { const n = String(p.card || '').replace(/\s/g, ''); if (n === '4000000000000002') return { ok: false, reason: { ar: 'رفض البنك العملية (رصيد غير كافٍ).', en: 'Card declined by the bank (insufficient funds).' } }; return { ok: true }; } },
  fawry: { name: { ar: 'فوري', en: 'Fawry' }, sub: { ar: 'ادفع بكود من أي منفذ فوري', en: 'Pay with a code at any Fawry outlet' }, color: '#F6B800', mark: 'fawry', simulate: () => ({ ok: true }) },
  wallet: { name: { ar: 'المحافظ الإلكترونية', en: 'Mobile wallets' }, sub: { ar: 'فودافون كاش · اتصالات كاش · أورانج كاش · WE Pay', en: 'Vodafone Cash, Etisalat Cash, Orange Cash, WE Pay' }, color: '#E60000', mark: 'CASH',
    simulate: (p) => (String(p.otp) === '123456' ? { ok: true } : { ok: false, reason: { ar: 'كود التأكيد غير صحيح.', en: 'The confirmation code is wrong.' } }) },
  instapay: { name: { ar: 'إنستاباي', en: 'InstaPay' }, sub: { ar: 'تحويل لحظي من تطبيق البنك', en: 'Instant transfer from your bank app' }, color: '#4B2A82', mark: 'IPN', simulate: () => ({ ok: true }) }
};
/** Step 2: charge. Idempotent on idemKey — a double click or retry never charges twice. */
function payBooking({ bookingId, method, idemKey, details }) {
  return tx((d) => {
    const existing = d.payments.find((p) => p.idemKey === idemKey);
    if (existing) return { payment: existing, booking: byId(d.bookings, existing.bookingId), replay: true };
    const b = byId(d.bookings, bookingId);
    if (!b || b.customerId !== (me() || {}).id) throw new AppError('NOT_FOUND', tr('الحجز غير موجود.', 'Booking not found.'));
    if (b.paymentStatus === 'paid') return { payment: d.payments.find((p) => p.bookingId === b.id && p.status === 'paid'), booking: b, replay: true };
    if (b.status !== 'pending_payment' || new Date(b.holdUntil) < new Date()) { if (b.status === 'pending_payment') { b.status = 'cancelled'; b.paymentStatus = 'failed'; } throw new AppError('EXPIRED', tr('انتهت مهلة حجز المقاعد. ابدأ الحجز من جديد.', 'The seat hold expired. Please start again.')); }
    const gw = GATEWAYS[method]; if (!gw) throw new AppError('METHOD', 'Unknown method');
    const res = gw.simulate(details || {});
    const p = { id: uid('p'), bookingId: b.id, method, amount: b.total, status: res.ok ? 'paid' : 'failed', idemKey, txn: res.ok ? 'TX' + Math.floor(1e6 + Math.random() * 9e6) : '', failReason: res.ok ? null : res.reason, meta: details && details.card ? { last4: String(details.card).replace(/\s/g, '').slice(-4) } : (details && details.phone ? { phone: details.phone } : {}), createdAt: new Date().toISOString() };
    d.payments.push(p);
    if (!res.ok) { b.paymentStatus = 'failed'; return { payment: p, booking: b, failed: true }; }
    b.status = 'confirmed'; b.paymentStatus = 'paid'; b.paidAt = p.createdAt; delete b.holdUntil;
    const trip = byId(d.trips, b.tripId), dep = byId(d.departures, b.departureId), cust = byId(d.users, b.customerId);
    notify(d, cust.id, { ar: 'تم تأكيد حجزك', en: 'Booking confirmed' }, { ar: `حجزك ${b.ref} لرحلة ${trip.title.ar} مؤكد.`, en: `Booking ${b.ref} for ${trip.title.en} is confirmed.` }, '#/me/booking/' + b.ref);
    notify(d, cust.id, { ar: 'تم استلام الدفع', en: 'Payment received' }, { ar: `استلمنا ${fmtN(b.total)} ج.م عن الحجز ${b.ref}.`, en: `We received EGP ${fmtN(b.total)} for ${b.ref}.` }, '#/me/payments');
    notify(d, 'company:' + b.companyId, { ar: 'حجز جديد', en: 'New booking' }, { ar: `${cust.name} حجز ${b.count} مقعد في ${trip.title.ar} (${dep.start}).`, en: `${cust.name} booked ${b.count} seat(s) on ${trip.title.en} (${dep.start}).` }, '#/co/bookings');
    requestPaid(d, b);
    notify(d, 'admin', { ar: 'حجز جديد', en: 'New booking' }, { ar: `${b.ref} بقيمة ${fmtN(b.total)} ج.م`, en: `${b.ref} worth EGP ${fmtN(b.total)}` }, '#/admin/bookings');
    if (seatInfo(dep, d).remaining === 0) notify(d, 'company:' + b.companyId, { ar: 'اكتملت المقاعد', en: 'Departure sold out' }, { ar: `موعد ${dep.start} لرحلة ${trip.title.ar} اكتمل.`, en: `${dep.start} for ${trip.title.en} is sold out.` }, '#/co/trips');
    if (b.total >= 50000) notify(d, 'admin', { ar: 'معاملة كبيرة', en: 'Large transaction' }, { ar: `دفعة بقيمة ${fmtN(b.total)} ج.م على ${b.ref}`, en: `Payment of EGP ${fmtN(b.total)} on ${b.ref}` }, '#/admin/finance');
    logAct(d, `حجز مؤكد ${b.ref} – ${cust.name}`, `Booking confirmed ${b.ref} – ${cust.name}`);
    return { payment: p, booking: b };
  });
}
function refundPolicy(b) {
  const dep = depById(b.departureId); const days = daysBetween(TODAY, dep.start);
  const pct = days >= 14 ? 100 : days >= 7 ? 50 : 0;
  return { days, pct, amount: Math.round(retained(b) * pct / 100) };
}
function requestCancel(bookingId, reason) {
  return tx((d) => {
    const b = byId(d.bookings, bookingId); const u = me();
    if (!b || b.customerId !== u.id) throw new AppError('FORBIDDEN', tr('غير مسموح.', 'Not allowed.'));
    const trip = byId(d.trips, b.tripId);
    if (b.status === 'pending_payment') { b.status = 'cancelled'; b.paymentStatus = 'failed'; b.cancelReason = reason; return { kind: 'released' }; }
    if (b.status !== 'confirmed') throw new AppError('STATE', tr('لا يمكن إلغاء هذا الحجز.', 'This booking can’t be cancelled.'));
    const pol = refundPolicy(b);
    if (pol.amount === 0) {
      b.status = 'cancelled'; b.cancelReason = reason; b.cancelledAt = new Date().toISOString();
      notify(d, 'company:' + b.companyId, { ar: 'إلغاء حجز', en: 'Booking cancelled' }, { ar: `ألغى العميل الحجز ${b.ref} (بدون استرداد).`, en: `Customer cancelled ${b.ref} (no refund).` }, '#/co/bookings');
      return { kind: 'no_refund' };
    }
    b.status = 'refund_pending'; b.cancelReason = reason;
    d.refunds.push({ id: uid('rf'), bookingId: b.id, amount: pol.amount, pct: pol.pct, status: 'pending', reason, createdAt: new Date().toISOString() });
    notify(d, 'admin', { ar: 'طلب استرداد', en: 'Refund request' }, { ar: `${b.ref}: استرداد ${fmtN(pol.amount)} ج.م`, en: `${b.ref}: refund EGP ${fmtN(pol.amount)}` }, '#/admin/bookings');
    notify(d, 'company:' + b.companyId, { ar: 'طلب إلغاء', en: 'Cancellation request' }, { ar: `طلب إلغاء على ${trip.title.ar} – ${b.ref}`, en: `Cancellation request on ${trip.title.en} – ${b.ref}` }, '#/co/bookings');
    logAct(d, `طلب استرداد ${b.ref}`, `Refund requested ${b.ref}`);
    return { kind: 'refund_pending', amount: pol.amount };
  });
}
function processRefund(refundId, approve, note) {
  assertRole('admin');
  return tx((d) => {
    const rf = byId(d.refunds, refundId); const b = rf && byId(d.bookings, rf.bookingId);
    if (!rf || rf.status !== 'pending') throw new AppError('STATE', tr('تمت معالجة هذا الطلب بالفعل.', 'Already processed.'));
    rf.status = approve ? 'approved' : 'rejected'; rf.processedAt = new Date().toISOString(); rf.note = note || '';
    if (approve) {
      b.refunded = (b.refunded || 0) + rf.amount; b.status = 'refunded';
      b.paymentStatus = b.refunded >= b.total ? 'refunded' : 'partially_refunded';
      b.commission = Math.round(retained(b) * b.commissionRate / 100);
      d.payments.push({ id: uid('p'), bookingId: b.id, method: (d.payments.find((p) => p.bookingId === b.id && p.status === 'paid') || {}).method || 'card', amount: -rf.amount, status: 'refund', idemKey: 'refund_' + rf.id, txn: 'RF' + Math.floor(1e6 + Math.random() * 9e6), createdAt: rf.processedAt });
      notify(d, b.customerId, { ar: 'تم رد المبلغ', en: 'Refund processed' }, { ar: `تم رد ${fmtN(rf.amount)} ج.م عن الحجز ${b.ref}. يظهر خلال ٥–٧ أيام عمل.`, en: `EGP ${fmtN(rf.amount)} refunded for ${b.ref}. Allow 5–7 business days.` }, '#/me/payments');
      logAct(d, `تمت الموافقة على استرداد ${b.ref}`, `Refund approved ${b.ref}`);
    } else {
      b.status = 'confirmed';
      notify(d, b.customerId, { ar: 'طلب الاسترداد مرفوض', en: 'Refund declined' }, { ar: `لم تتم الموافقة على استرداد ${b.ref}. ${note || ''}`, en: `Refund for ${b.ref} was declined. ${note || ''}` }, '#/me/booking/' + b.ref);
    }
  });
}
function addReview(bookingId, ratings, text) {
  return tx((d) => {
    const b = byId(d.bookings, bookingId); const u = me();
    if (!b || b.customerId !== u.id) throw new AppError('FORBIDDEN', tr('غير مسموح.', 'Not allowed.'));
    if (b.status !== 'completed') throw new AppError('NOT_COMPLETED', tr('التقييم متاح بعد انتهاء الرحلة فقط.', 'You can review only after the trip ends.'));
    if (d.reviews.some((r) => r.bookingId === b.id)) throw new AppError('DUP_REVIEW', tr('قيّمت هذا الحجز من قبل.', 'You already reviewed this booking.'));
    d.reviews.push({ id: uid('r'), bookingId: b.id, tripId: b.tripId, companyId: b.companyId, customerId: u.id, ratings, text, reply: null, createdAt: new Date().toISOString() });
    const trip = byId(d.trips, b.tripId);
    notify(d, 'company:' + b.companyId, { ar: 'تقييم جديد', en: 'New review' }, { ar: `${u.name} قيّم ${trip.title.ar} بـ ${ratings.overall} نجوم.`, en: `${u.name} rated ${trip.title.en} ${ratings.overall} stars.` }, '#/co/reviews');
  });
}
function toggleFav(tripId) {
  const u = me(); if (!u || u.role !== 'customer') return null;
  return tx((d) => { const x = byId(d.users, u.id); x.favorites = x.favorites || []; const i = x.favorites.indexOf(tripId); i >= 0 ? x.favorites.splice(i, 1) : x.favorites.push(tripId); return i < 0; });
}

/* ---------- finance ---------- */
function companyFinance(cid) {
  const bs = db.bookings.filter((b) => b.companyId === cid && (SEAT_STATUSES.includes(b.status) || b.status === 'refunded' && retained(b) > 0 || b.status === 'cancelled' && b.paymentStatus === 'paid'));
  const gross = sum(bs, retained), commission = sum(bs, (b) => b.commission), net = gross - commission;
  const earned = bs.filter((b) => b.status === 'completed' || (b.status === 'refunded' || b.status === 'cancelled') && new Date((depById(b.departureId) || {}).end) < TODAY);
  const earnedNet = sum(earned, (b) => retained(b) - b.commission);
  const escrow = net - earnedNet;
  const settled = sum(db.settlements.filter((s) => s.companyId === cid), (s) => s.amount);
  return { gross, commission, net, earnedNet, escrow, settled, payable: Math.max(0, earnedNet - settled), count: bs.length };
}
function platformFinance() {
  const bs = db.bookings.filter((b) => b.paymentStatus === 'paid' || b.paymentStatus === 'partially_refunded' || b.paymentStatus === 'refunded');
  const gmv = sum(bs, (b) => b.total), refunds = sum(bs, (b) => b.refunded || 0);
  const commission = sum(bs, (b) => b.commission);
  return { gmv, refunds, commission, settled: sum(db.settlements, (s) => s.amount) };
}
function monthly(bookings, months, valFn) {
  const out = []; const base = new Date(TODAY.getFullYear(), TODAY.getMonth() - months + 1, 1);
  for (let i = 0; i < months; i++) { const m = new Date(base.getFullYear(), base.getMonth() + i, 1); out.push({ key: m.getFullYear() + '-' + String(m.getMonth() + 1).padStart(2, '0'), label: fmtD(m, { month: 'short' }), v: 0 }); }
  bookings.forEach((b) => { const k = (b.paidAt || b.createdAt).slice(0, 7); const o = out.find((x) => x.key === k); if (o) o.v += valFn(b); });
  return out;
}

/* ---------- status vocab ---------- */
const BSTAT = {
  pending_payment: { c: 'b-warn', l: { ar: 'في انتظار الدفع', en: 'Pending payment' } },
  confirmed: { c: 'b-ok', l: { ar: 'مؤكد', en: 'Confirmed' } },
  cancelled: { c: 'b-mute', l: { ar: 'ملغي', en: 'Cancelled' } },
  completed: { c: 'b-info', l: { ar: 'مكتمل', en: 'Completed' } },
  refund_pending: { c: 'b-warn', l: { ar: 'استرداد قيد المراجعة', en: 'Refund pending' } },
  refunded: { c: 'b-teal', l: { ar: 'تم الاسترداد', en: 'Refunded' } }
};
const PSTAT = {
  pending: { c: 'b-warn', l: { ar: 'معلق', en: 'Pending' } },
  paid: { c: 'b-ok', l: { ar: 'مدفوع', en: 'Paid' } },
  failed: { c: 'b-bad', l: { ar: 'فشل', en: 'Failed' } },
  partially_refunded: { c: 'b-teal', l: { ar: 'مسترد جزئيًا', en: 'Partially refunded' } },
  refunded: { c: 'b-teal', l: { ar: 'مسترد', en: 'Refunded' } },
  refund: { c: 'b-teal', l: { ar: 'استرداد', en: 'Refund' } }
};
const CSTAT = { approved: { c: 'b-ok', l: { ar: 'معتمدة', en: 'Approved' } }, pending: { c: 'b-warn', l: { ar: 'قيد المراجعة', en: 'Under review' } }, rejected: { c: 'b-bad', l: { ar: 'مرفوضة', en: 'Rejected' } }, suspended: { c: 'b-mute', l: { ar: 'موقوفة', en: 'Suspended' } } };
const TSTAT = { active: { c: 'b-ok', l: { ar: 'منشورة', en: 'Live' } }, private: { c: 'b-teal', l: { ar: 'مخصصة لعميل', en: 'Private (custom)' } }, pending: { c: 'b-warn', l: { ar: 'بانتظار الاعتماد', en: 'Awaiting approval' } }, inactive: { c: 'b-mute', l: { ar: 'متوقفة', en: 'Paused' } }, rejected: { c: 'b-bad', l: { ar: 'مرفوضة', en: 'Rejected' } }, hidden: { c: 'b-mute', l: { ar: 'مخفية', en: 'Hidden' } } };
const DSTAT = { open: { c: 'b-ok', l: { ar: 'متاح للحجز', en: 'Open' } }, closed: { c: 'b-mute', l: { ar: 'مغلق', en: 'Closed' } }, cancelled: { c: 'b-bad', l: { ar: 'ملغي', en: 'Cancelled' } }, full: { c: 'b-bad', l: { ar: 'مكتمل', en: 'Sold out' } } };
const badge = (map, k) => { const s = map[k] || { c: 'b-mute', l: { ar: k, en: k } }; return `<span class="badge ${s.c}">${L(s.l)}</span>`; };

const isMyPrivate = (t) => !!t && t.status === 'private' && t.requestCustomer === (me() || {}).id;
const privSeats = (t) => { const d = db.departures.find((x) => x.tripId === t.id); return d ? +d.seats : 1; };

/* Egyptian mobile → digits in international form without '+': 01xxxxxxxxx → 201xxxxxxxxx (null if not a mobile). Mirrors _norm_phone() on the server. */
function normPhone(p) { const d = String(p || '').replace(/\D/g, ''); if (/^01[0125]\d{8}$/.test(d)) return '2' + d; if (/^201[0125]\d{8}$/.test(d)) return d; if (/^00201[0125]\d{8}$/.test(d)) return d.slice(2); return null; }
