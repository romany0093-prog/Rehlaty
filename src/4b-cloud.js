
/* ---------- 4b. Cloud backend (Supabase) ----------
   When SUPA_CFG is set and the Supabase library loaded, the app runs on the
   shared database: real accounts (username or email + password), Row Level
   Security on every table, and booking / payment / refund logic inside
   Postgres functions. Open the site with ?demo=1 to use the offline demo. */
const SUPA_CFG = { url: 'https://soysfbirinxmkivenvnp.supabase.co', key: 'sb_publishable_s8gZKounghBOLKBAFgxe0g_EP-aQ6f7' };
const WANT_DEMO = /[?&]demo=1/.test(location.search);
const CLOUD = !WANT_DEMO && !!SUPA_CFG.url && typeof window.supabase !== 'undefined' && !!window.supabase.createClient;
const CLOUD_MISSING = !WANT_DEMO && !!SUPA_CFG.url && !CLOUD;
// A password-reset email link lands here as #access_token=…&type=recovery (or #error=… if it expired).
// Read it before the client consumes it, so the router can show the right page.
const URL_HASH = location.hash || '';
const RECOVERY_IN_URL = /[#&]type=recovery/.test(URL_HASH) && /access_token=/.test(URL_HASH);
const RECOVERY_ERROR_IN_URL = /[#&](error=|error_code=)/.test(URL_HASH);
const sb = CLOUD ? window.supabase.createClient(SUPA_CFG.url, SUPA_CFG.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' } }) : null;
let AUTH_UID = null, SEATS = null, CO_STATS = {};

/* object <-> row mapping: listed fields are real columns, everything else lives in `data` */
const MAP = {
  companies: { t: 'companies', c: { id: 'id', status: 'status', commission: 'commission', platformRating: 'platform_rating', owner: 'owner', createdAt: 'created_at' } },
  users: { t: 'profiles', c: { id: 'id', username: 'username', email: 'email', role: 'role', name: 'name', phone: 'phone', city: 'city', status: 'status', companyId: 'company_id', favorites: 'favorites', createdAt: 'created_at' } },
  destinations: { t: 'destinations', c: { id: 'id' } },
  categories: { t: 'categories', c: { id: 'id' } },
  trips: { t: 'trips', c: { id: 'id', companyId: 'company_id', status: 'status', createdAt: 'created_at' } },
  departures: { t: 'departures', c: { id: 'id', tripId: 'trip_id', companyId: 'company_id', start: 'start_date', end: 'end_date', price: 'price', seats: 'seats', status: 'status' } },
  bookings: { t: 'bookings', ro: true, c: { id: 'id', ref: 'ref', customerId: 'customer_id', companyId: 'company_id', tripId: 'trip_id', departureId: 'departure_id', count: 'count', status: 'status', paymentStatus: 'payment_status', total: 'total', commission: 'commission', commissionRate: 'commission_rate', refunded: 'refunded', holdUntil: 'hold_until', createdAt: 'created_at', paidAt: 'paid_at' } },
  payments: { t: 'payments', ro: true, c: { id: 'id', bookingId: 'booking_id', customerId: 'customer_id', companyId: 'company_id', method: 'method', amount: 'amount', status: 'status', idemKey: 'idem_key', txn: 'txn', createdAt: 'created_at' } },
  refunds: { t: 'refunds', ro: true, c: { id: 'id', bookingId: 'booking_id', customerId: 'customer_id', companyId: 'company_id', amount: 'amount', pct: 'pct', status: 'status', reason: 'reason', createdAt: 'created_at', processedAt: 'processed_at' } },
  reviews: { t: 'reviews', c: { id: 'id', bookingId: 'booking_id', tripId: 'trip_id', companyId: 'company_id', customerId: 'customer_id', customerName: 'customer_name', ratings: 'ratings', text: 'text', reply: 'reply', createdAt: 'created_at' } },
  notifications: { t: 'notifications', c: { id: 'id', to: 'to_user', title: 'title', body: 'body', link: 'link', read: 'read', createdAt: 'created_at' } },
  settlements: { t: 'settlements', c: { id: 'id', companyId: 'company_id', amount: 'amount', method: 'method', note: 'note', createdAt: 'created_at' } },
  disputes: { t: 'disputes', c: { id: 'id', bookingId: 'booking_id', companyId: 'company_id', customerId: 'customer_id', subject: 'subject', status: 'status', resolution: 'resolution', createdAt: 'created_at' } },
  activity: { t: 'activity', c: { id: 'id', at: 'at', text: 'text' } },
  tripRequests: { t: 'trip_requests', ro: true, auth: true, c: { id: 'id', customerId: 'customer_id', status: 'status', expiresAt: 'expires_at', acceptedOfferId: 'accepted_offer_id', acceptedAt: 'accepted_at', createdAt: 'created_at' } },
  requestOffers: { t: 'request_offers', ro: true, auth: true, c: { id: 'id', requestId: 'request_id', companyId: 'company_id', status: 'status', price: 'price', total: 'total', tripId: 'trip_id', departureId: 'departure_id', createdAt: 'created_at', updatedAt: 'updated_at' } },
  requestMessages: { t: 'request_messages', ro: true, auth: true, c: { id: 'id', requestId: 'request_id', companyId: 'company_id', sender: 'sender', text: 'text', createdAt: 'created_at' } }
};
const ORDER = ['companies', 'users', 'destinations', 'categories', 'trips', 'departures', 'bookings', 'payments', 'refunds', 'reviews', 'notifications', 'settlements', 'disputes', 'activity', 'tripRequests', 'requestOffers', 'requestMessages'];
function fromRow(m, r) {
  const o = Object.assign({}, r.data || {});
  Object.entries(m.c).forEach(([k, col]) => { if (r[col] !== undefined) o[k] = r[col]; });
  ['price', 'seats', 'total', 'commission', 'commissionRate', 'refunded', 'amount', 'pct', 'count'].forEach((k) => { if (o[k] != null && typeof o[k] === 'string') o[k] = +o[k]; });
  if (o.commission === undefined) o.commission = null;
  return o;
}
function toRow(m, o) {
  const r = { data: {} }; const cols = m.c;
  Object.keys(o).forEach((k) => { if (o[k] === undefined) return; if (cols[k]) r[cols[k]] = o[k]; else r.data[k] = o[k]; });
  if (m.t === 'departures') delete r.company_id; // filled by trigger from the trip
  return r;
}
async function fetchAll(table) {
  const out = []; const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await sb.from(table).select('*').range(from, from + page - 1);
    if (error) throw error;
    out.push(...data); if (data.length < page) break;
  }
  return out;
}
async function loadCloud() {
  const { data: s } = await sb.auth.getSession();
  AUTH_UID = s && s.session ? s.session.user.id : null;
  await sb.rpc('housekeeping').then(() => {}, () => {});
  const [settingsRows, seats, cstats, ...lists] = await Promise.all([
    fetchAll('settings'), sb.rpc('seat_counts').then((r) => r.data || []), sb.rpc('company_travellers').then((r) => r.data || []),
    ...ORDER.map((k) => (MAP[k].auth && !AUTH_UID ? Promise.resolve([]) : fetchAll(MAP[k].t)))
  ]);
  const d = { version: DB_VERSION, settings: (settingsRows.find((r) => r.id === 'main') || { data: {} }).data };
  ORDER.forEach((k, i) => { d[k] = lists[i].map((r) => fromRow(MAP[k], r)); });
  d.activity.sort((a, b) => b.at.localeCompare(a.at));
  SEATS = {}; seats.forEach((r) => { SEATS[r.departure_id] = { booked: r.booked, held: r.held }; });
  CO_STATS = {}; cstats.forEach((r) => { CO_STATS[r.company_id] = r; });
  db = d;
  if (AUTH_UID) { const u = me(); if (u && u.status === 'suspended') { await sb.auth.signOut(); AUTH_UID = null; toast(tr('هذا الحساب موقوف. تواصل مع خدمة العملاء.', 'This account is suspended. Contact support.'), 'bad'); return loadCloud(); } }
}
const reloadCloud = () => loadCloud().then(() => render(), handleErr);

/* push the difference between two snapshots; RLS + triggers on the server decide what sticks */
async function pushDiff(before, after) {
  const jobs = [];
  for (const k of ORDER) {
    const m = MAP[k]; if (m.ro) continue;
    const old = new Map((before[k] || []).map((x) => [x.id, x])), nw = new Map((after[k] || []).map((x) => [x.id, x]));
    const ins = [], upd = [], del = [];
    nw.forEach((o, id) => { const p = old.get(id); if (!p) ins.push(o); else if (JSON.stringify(p) !== JSON.stringify(o)) upd.push(o); });
    old.forEach((o, id) => { if (!nw.has(id)) del.push(id); });
    jobs.push({ k, m, ins, upd, del });
  }
  for (const j of jobs) {
    if (j.ins.length) { const { error } = await sb.from(j.m.t).insert(j.ins.map((o) => toRow(j.m, o))); if (error) throw error; }
    for (const o of j.upd) { const r = toRow(j.m, o); delete r.id; const { error } = await sb.from(j.m.t).update(r).eq('id', o.id); if (error) throw error; }
  }
  for (const j of jobs.slice().reverse()) if (j.del.length) { const { error } = await sb.from(j.m.t).delete().in('id', j.del); if (error) throw error; }
  if (JSON.stringify(before.settings) !== JSON.stringify(after.settings)) { const { error } = await sb.from('settings').update({ data: after.settings }).eq('id', 'main'); if (error) throw error; }
}
let SYNCING = Promise.resolve();
function cloudTx(fn) {
  const before = db; const draft = JSON.parse(JSON.stringify(db));
  const result = fn(draft);
  db = draft;
  SYNCING = SYNCING.then(() => pushDiff(before, draft)).catch((e) => { toast(cloudMsg(e), 'bad'); return reloadCloud(); });
  return result;
}
function cloudMsg(e) {
  const m = String((e && (e.message || e.error_description)) || e || '');
  const code = m.split(':')[0].trim(), n = m.split(':')[1];
  const M = {
    DUPLICATE: tr(`لديك حجز على نفس الموعد بالفعل (${n || ''}).`, `You already have a booking on this date (${n || ''}).`),
    NO_SEATS: +n ? tr(`المتاح الآن ${n} مقاعد فقط.`, `Only ${n} seats are left.`) : tr('اكتملت المقاعد في هذا الموعد.', 'This date is fully booked.'),
    DEP_CLOSED: tr('هذا الموعد لم يعد متاحًا. اختر موعدًا آخر.', 'This date is no longer available.'), UNAVAILABLE: tr('هذه الرحلة غير متاحة للحجز حاليًا.', 'This trip is not available right now.'),
    SUSPENDED: tr('حسابك موقوف.', 'Your account is suspended.'), AUTH: tr('سجّل الدخول كعميل لإتمام الحجز.', 'Log in as a customer to book.'), FORBIDDEN: tr('غير مسموح.', 'Not allowed.'),
    NOT_COMPLETED: tr('التقييم متاح بعد انتهاء الرحلة فقط.', 'You can review only after the trip ends.'), DUP_REVIEW: tr('قيّمت هذا الحجز من قبل.', 'You already reviewed this booking.'),
    EXPIRED: tr('انتهت مهلة حجز المقاعد. ابدأ الحجز من جديد.', 'The seat hold expired. Please start again.'), STATE: tr('تمت معالجة هذا الطلب بالفعل.', 'Already processed.'),
    USERNAME_TAKEN: tr('اسم المستخدم محجوز. اختر اسمًا آخر.', 'That username is taken. Choose another.'), EMAIL_TAKEN: tr('البريد مسجل بالفعل. سجّل الدخول بدلًا من ذلك.', 'This email is already registered. Log in instead.'),
    BAD_USERNAME: tr('اسم المستخدم من ٣ إلى ٢٤ حرف إنجليزي صغير أو أرقام أو _ .', 'Username: 3–24 lowercase letters, numbers, _ or .'), WEAK_PASSWORD: tr('كلمة المرور ٨ أحرف على الأقل.', 'Password must be at least 8 characters.'),
    SEATS_BELOW_BOOKED: tr('مينفعش تقلل المقاعد عن المحجوز.', 'Seats can’t go below seats booked.'), DATE_IN_PAST: tr('اختر تاريخًا بعد اليوم.', 'Pick a date after today.'),
    ...Object.fromEntries(Object.keys(REQ_ERR).map((k) => [k, REQ_ERR[k]()])), NOT_FOUND: tr('غير موجود أو مبقاش متاح.', 'Not found or no longer available.'),
    PHONE_TAKEN: tr('رقم الموبايل ده مسجل بحساب تاني. سجّل الدخول بيه أو استرجع كلمة المرور.', 'This mobile number is already registered. Log in or recover your password.'),
    LOCKED: tr('محاولات دخول كتير غلط. استنى ربع ساعة أو استرجع كلمة المرور.', 'Too many failed attempts. Wait 15 minutes or reset your password.'),
    RATE_LIMIT: tr('اتعمل حسابات كتير من نفس الشبكة. حاول تاني بعد ساعة.', 'Too many sign-ups from this network. Try again in an hour.'),
    BAD_IMAGE: tr('الصورة لازم تكون JPG أو PNG أو WebP.', 'Images must be JPG, PNG or WebP.'), BAD_ID: tr('بيانات غير صالحة.', 'Invalid data.'), BAD_COLOR: tr('لون غير صالح.', 'Invalid colour.'),
    TOO_LONG: tr('النص أطول من المسموح.', 'Text is too long.'), TOO_LARGE: tr('حجم البيانات أو الصور أكبر من المسموح.', 'Data or images are too large.'),
    BAD_PHONE: tr('رقم الموبايل غير صحيح.', 'Invalid phone number.'), BAD_NAME: tr('الاسم من ٢ إلى ٨٠ حرف.', 'Name must be 2–80 characters.'), BAD_EMAIL: tr('اكتب بريدًا صحيحًا.', 'Enter a valid email.'),
    BAD_TRAVELER: tr('بيانات المسافرين غير مكتملة أو طويلة جدًا.', 'Traveller details are incomplete or too long.'), BAD_FAVORITES: tr('بيانات غير صالحة.', 'Invalid data.'),
    GATEWAY_REQUIRED: tr('الدفع الإلكتروني متاح من بوابة الدفع فقط.', 'Payment is only available through the payment gateway.'), BAD_IDEM: tr('حدث خطأ في الدفع. حدّث الصفحة.', 'Payment error. Refresh the page.'),
    OVER_SETTLEMENT: tr('المبلغ أكبر من مستحقات الشركة.', 'The amount exceeds the company balance.'), DATE_IN_PAST: tr('اختر تاريخًا بعد اليوم.', 'Pick a date after today.'),
    COMPANY_NOT_APPROVED: tr('شركتك لسه ما اتعتمدتش.', 'Your company isn’t approved yet.'), SHORT_TEXT: tr('اكتب ٢٠ حرف على الأقل.', 'Write at least 20 characters.')
  };
  if (M[code]) return M[code];
  if (/Invalid login credentials/i.test(m)) return tr('اسم المستخدم أو كلمة المرور غير صحيحة.', 'Username or password is incorrect.');
  if (/foreign key|violates.*constraint.*fkey/i.test(m)) return tr('مينفعش تحذفه لأنه مرتبط ببيانات تانية (حجوزات مثلًا).', 'It can’t be deleted because other data (e.g. bookings) uses it.');
  if (/row-level security|permission denied/i.test(m)) return tr('مش مسموح لحسابك بالتعديل ده.', 'Your account isn’t allowed to make this change.');
  if (/Failed to fetch|NetworkError|network/i.test(m)) return tr('مفيش اتصال بالسيرفر. اتأكد من الإنترنت وحاول تاني.', 'Can’t reach the server. Check your connection and try again.');
  return m || tr('حدث خطأ غير متوقع.', 'Something went wrong.');
}
async function rpc(name, args) {
  const { data, error } = await sb.rpc(name, args);
  if (error) { const e = new AppError((error.message || '').split(':')[0], cloudMsg(error)); throw e; }
  return data;
}

/* ---------- swap the data layer when running on Supabase ---------- */
if (CLOUD) {
  tx = cloudTx;
  sweep = () => {};
  initDB = () => {};
  resetDB = () => toast(tr('إعادة الضبط متاحة في وضع العرض التجريبي فقط.', 'Reset is only available in demo mode.'), 'info');
  me = () => (AUTH_UID ? byId(db.users, AUTH_UID) : null);
  setSession = () => {};
  seatInfo = function (dep) { const s = (SEATS && SEATS[dep.id]) || { booked: 0, held: 0 }; return { seats: dep.seats, booked: s.booked, held: s.held, remaining: Math.max(0, dep.seats - s.booked - s.held) }; };
  login = async function (ident, pw) {
    const email = await rpc('resolve_login', { p_ident: ident, p_password: pw });
    if (!email) throw new AppError('BAD_LOGIN', tr('اسم المستخدم أو كلمة المرور غير صحيحة.', 'Username or password is incorrect.'));
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pw });
    if (error) throw new AppError('BAD_LOGIN', cloudMsg(error));
    AUTH_UID = data.user.id; await loadCloud();
    const u = me(); if (!u) throw new AppError('BAD_LOGIN', tr('تعذر تحميل الحساب.', 'Couldn’t load the account.'));
    return u;
  };
  logout = async function () { await sb.auth.signOut(); AUTH_UID = null; await loadCloud(); };
  registerCustomer = async function (f) { await rpc('register_account', { p_username: f.username, p_email: f.email, p_password: f.password, p_name: f.name, p_phone: f.phone || null, p_role: 'customer', p_company: null, p_via: f.via === 'phone' ? 'phone' : 'email' }); return login(f.username, f.password); };
  registerCompany = async function (f) {
    const palette = ['#2E6F6F', '#8C5A2B', '#5E4B8B', '#2F5D8A', '#9A3B3B', '#4E7A3A'];
    const company = { name: { ar: f.company, en: f.companyEn || f.company }, color: palette[Math.floor(Math.random() * palette.length)], city: { ar: f.city, en: f.city }, phone: f.phone, website: '', license: f.license, founded: +f.founded || new Date().getFullYear(), desc: { ar: f.desc || '', en: '' }, logo: null, cover: 'art:sea:0', docs: (f.docs || []).map((n) => ({ name: n })) };
    await rpc('register_account', { p_username: f.username, p_email: f.email, p_password: f.password, p_name: f.name, p_phone: f.phone, p_role: 'company', p_company: company });
    return login(f.username, f.password);
  };
  changePassword = async function (oldPw, newPw) {
    const { error } = await sb.auth.signInWithPassword({ email: me().email, password: oldPw });
    if (error) throw new AppError('BAD_PW', tr('كلمة المرور الحالية غير صحيحة.', 'Current password is wrong.'));
    const r = await sb.auth.updateUser({ password: newPw }); if (r.error) throw new AppError('PW', cloudMsg(r.error));
  };
  const afterRpc = async (p) => { try { return await p; } finally { await SYNCING; await loadCloud(); } };
  createBooking = ({ depId, travelers, code }) => afterRpc(rpc('create_booking', { p_dep: depId, p_travelers: travelers, p_code: code || null }).then((r) => fromRow(MAP.bookings, r)));
  payBooking = ({ bookingId, method, idemKey, details }) => afterRpc(rpc('pay_booking', { p_booking: bookingId, p_method: method, p_idem: idemKey, p_details: details || {} }).then((r) => {
    if (r.error) throw new AppError(r.error, cloudMsg(r.error));
    return { payment: r.payment ? fromRow(MAP.payments, r.payment) : null, booking: fromRow(MAP.bookings, r.booking), failed: !!r.failed, replay: !!r.replay };
  }));
  requestCancel = (bookingId, reason) => afterRpc(rpc('request_cancel', { p_booking: bookingId, p_reason: reason || '' }));
  processRefund = (refundId, approve, note) => afterRpc(rpc('process_refund', { p_refund: refundId, p_approve: !!approve, p_note: note || '' }));
  addReview = (bookingId, ratings, text) => afterRpc(rpc('add_review', { p_booking: bookingId, p_ratings: ratings, p_text: text }));
  cancelDeparture = (depId) => afterRpc(rpc('cancel_departure', { p_dep: depId }));
  createTripRequest = (p) => afterRpc(rpc('create_trip_request', { p }));
  cancelTripRequest = (id) => afterRpc(rpc('cancel_trip_request', { p_id: id }));
  declineOffer = (id) => afterRpc(rpc('decline_offer', { p_offer: id }));
  acceptOffer = (id) => afterRpc(rpc('accept_offer', { p_offer: id }));
  sendOffer = (rid, p) => afterRpc(rpc('send_offer', { p_request: rid, p }));
  withdrawOffer = (id) => afterRpc(rpc('withdraw_offer', { p_offer: id }));
  sendRequestMessage = (rid, cid, text) => afterRpc(rpc('send_request_message', { p_request: rid, p_company: cid, p_text: text }));
  sb.auth.onAuthStateChange((ev, s) => { const id = s && s.user ? s.user.id : null; if (ev === 'PASSWORD_RECOVERY' && id) { AUTH_UID = id; RESET.recovering = id; } if (ev === 'SIGNED_OUT' && AUTH_UID) { AUTH_UID = null; reloadCloud(); } else if (id) AUTH_UID = id; });
}
