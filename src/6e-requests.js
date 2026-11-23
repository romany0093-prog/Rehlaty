
/* ---------- 6e. Custom trip requests ("خطط رحلتك") ----------
   Customer posts a request → every approved company is notified → companies send
   offers (or ask questions) → the customer compares, accepts one → a private trip
   is created for them only → normal checkout and payment → request closes and the
   other companies are told. The functions below are the offline-demo versions;
   on Supabase they are replaced by the server functions in 004_custom_trip_requests.sql. */
const REQ_MAX_OPEN = 3;
const STAYS = { any: { ar: 'أي مستوى', en: 'Any' }, camp: { ar: 'كامب / بيت بدوي', en: 'Camp / eco‑lodge' }, '3': { ar: 'فندق ٣ نجوم', en: '3‑star hotel' }, '4': { ar: 'فندق ٤ نجوم', en: '4‑star hotel' }, '5': { ar: 'فندق ٥ نجوم', en: '5‑star hotel' }, apt: { ar: 'شقة فندقية', en: 'Serviced apartment' } };
const MEALS = { none: { ar: 'بدون وجبات', en: 'No meals' }, breakfast: { ar: 'إفطار', en: 'Breakfast' }, half: { ar: 'نصف إقامة', en: 'Half board' }, full: { ar: 'إقامة كاملة', en: 'Full board' }, all: { ar: 'شامل كل شيء', en: 'All inclusive' } };
const TRANSPORTS = { bus: { ar: 'أتوبيس سياحي', en: 'Coach' }, flight: { ar: 'طيران داخلي', en: 'Domestic flight' }, car: { ar: 'عربية خاصة بسواق', en: 'Private car & driver' }, train: { ar: 'قطار', en: 'Train' }, own: { ar: 'هوصل بنفسي', en: 'I’ll get there myself' } };
const RSTAT = { open: { c: 'b-info', l: { ar: 'بتستقبل عروض', en: 'Receiving offers' } }, accepted: { c: 'b-warn', l: { ar: 'في انتظار الدفع', en: 'Awaiting payment' } }, booked: { c: 'b-ok', l: { ar: 'تم الحجز', en: 'Booked' } }, cancelled: { c: 'b-mute', l: { ar: 'ملغي', en: 'Cancelled' } }, expired: { c: 'b-mute', l: { ar: 'انتهت بدون عروض', en: 'Expired' } } };
const OSTAT = { sent: { c: 'b-teal', l: { ar: 'عرض قائم', en: 'Active offer' } }, withdrawn: { c: 'b-mute', l: { ar: 'مسحوب', en: 'Withdrawn' } }, declined: { c: 'b-bad', l: { ar: 'اتعمله اعتذار', en: 'Declined' } }, accepted: { c: 'b-ok', l: { ar: 'مقبول', en: 'Accepted' } }, lost: { c: 'b-mute', l: { ar: 'اتختار عرض تاني', en: 'Not chosen' } } };
const REQ_ERR = {
  MAX_REQUESTS: () => tr(`عندك ${REQ_MAX_OPEN} طلبات مفتوحة. اقفل أو ألغِ طلب قبل ما تعمل جديد.`, `You already have ${REQ_MAX_OPEN} open requests. Close or cancel one first.`),
  REQ_DEST: () => tr('اختار وجهة واحدة على الأقل، أو "اقترحوا عليّا".', 'Pick at least one destination, or “Suggest one”.'),
  REQ_DATES: () => tr('التواريخ مش مظبوطة: لازم تبدأ بعد النهارده والنهاية بعد البداية.', 'Dates must start after today and end after they start.'),
  REQ_PAX: () => tr('فرد بالغ واحد على الأقل، وبحد أقصى ٤٠ مسافر.', 'At least one adult, 40 travellers max.'),
  REQ_CLOSED: () => tr('الطلب ده مبقاش بيستقبل عروض.', 'This request is no longer receiving offers.'),
  OFFER_PRICE: () => tr('اكتب سعر صحيح للفرد.', 'Enter a valid price per person.'),
  OFFER_VALID: () => tr('تاريخ صلاحية العرض لازم يكون النهارده أو بعده.', 'The offer must be valid until today or later.'),
  OFFER_FIELDS: () => tr('العنوان والوجهة مطلوبين.', 'Title and destination are required.'),
  OFFER_STATE: () => tr('العرض ده مبقاش متاح.', 'This offer is no longer available.'),
  OFFER_EXPIRED: () => tr('صلاحية العرض ده انتهت. اطلب من الشركة تحدّثه.', 'This offer has expired. Ask the company to update it.'),
  MSG_TEXT: () => tr('اكتب رسالة (لحد ١٠٠٠ حرف).', 'Write a message (up to 1000 characters).'),
  PRIVATE_LOCKED: () => tr('الرحلة دي اتعملت لعميل وقبلها، فمينفعش تتعدل.', 'This trip was made for a customer who accepted it, so it can’t be edited.')
};
const reqErr = (code) => new AppError(code, REQ_ERR[code] ? REQ_ERR[code]() : code);
const reqPax = (r) => (+r.adults || 0) + (+r.children || 0);
const reqDays = (r) => daysBetween(r.from, r.to) + 1;
const reqTitle = (r) => (r.dests && r.dests.length ? r.dests.map((id) => L((destById(id) || { name: id }).name)).join('، ') : tr('وجهة تقترحها الشركات', 'Destination open to suggestions'));
const reqOffers = (rid) => (db.requestOffers || []).filter((o) => o.requestId === rid);
const reqMsgs = (rid, cid) => (db.requestMessages || []).filter((m) => m.requestId === rid && (!cid || m.companyId === cid)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
const myRequests = () => (db.tripRequests || []).filter((r) => r.customerId === (me() || {}).id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
const openOfMine = () => myRequests().filter((r) => ['open', 'accepted'].includes(r.status));
const receivingOffers = (r) => r.status === 'open' && new Date(r.expiresAt) > new Date();
const leftText = (iso) => { const ms = new Date(iso) - Date.now(); if (ms <= 0) return tr('انتهت', 'ended'); const h = Math.floor(ms / 36e5); return h >= 24 ? tr(`باقي ${Math.floor(h / 24)} يوم`, `${Math.floor(h / 24)} days left`) : tr(`باقي ${Math.max(1, h)} ساعة`, `${Math.max(1, h)} h left`); };

/* "seen" markers per account on this device: new offers / requests / unread messages */
const seenKey = () => 'rehlati_seen:' + ((me() || {}).id || 'guest');
function seenAll() { try { return JSON.parse(localStorage.getItem(seenKey()) || '{}'); } catch (e) { return UI.seen || (UI.seen = {}); } }
function seenMark(k) { const s = seenAll(); s[k] = new Date().toISOString(); UI.seen = s; try { localStorage.setItem(seenKey(), JSON.stringify(s)); } catch (e) { } }
const seenAt = (k) => seenAll()[k] || '';
function customerNews(r) { const s = seenAt('r:' + r.id); const offers = reqOffers(r.id).filter((o) => o.status === 'sent' && (o.updatedAt || o.createdAt) > s).length; const msgs = reqMsgs(r.id).filter((m) => m.sender === 'company' && m.createdAt > s).length; return { offers, msgs, total: offers + msgs }; }
const customerNewsTotal = () => myRequests().reduce((a, r) => a + customerNews(r).total, 0);
function companyNews(r) { const s = seenAt('r:' + r.id), cid = me().companyId; return { isNew: !s && receivingOffers(r) && !reqOffers(r.id).some((o) => o.companyId === cid), msgs: reqMsgs(r.id, cid).filter((m) => m.sender === 'customer' && m.createdAt > s).length }; }
const coRequests = () => (db.tripRequests || []).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
const companyNewsTotal = () => (role() === 'company' && (myCompany() || {}).status === 'approved' ? coRequests().reduce((a, r) => { const n = companyNews(r); return a + (n.isNew ? 1 : 0) + n.msgs; }, 0) : 0);

/* ---------- offline-demo services (replaced by server functions on Supabase) ---------- */
function createTripRequest(p) {
  const u = me(); if (!u || u.role !== 'customer') throw new AppError('AUTH', tr('سجّل الدخول كعميل.', 'Log in as a customer.'));
  if (openOfMine().length >= REQ_MAX_OPEN) throw reqErr('MAX_REQUESTS');
  if (!(p.dests || []).length && !p.anyDest) throw reqErr('REQ_DEST');
  if (!(p.from > iso(TODAY)) || p.to < p.from) throw reqErr('REQ_DATES');
  if ((+p.adults || 0) < 1 || reqPax(p) > 40) throw reqErr('REQ_PAX');
  const win = [3, 5, 7].includes(+p.window) ? +p.window : 5;
  return tx((d) => {
    d.tripRequests = d.tripRequests || [];
    const r = { ...p, id: uid('rq'), customerId: u.id, status: 'open', createdAt: new Date().toISOString(), expiresAt: addDays(new Date(), win).toISOString(), initials: u.name.split(/\s+/).map((w) => w[0]).join('. ') + '.', city: u.city || '' };
    d.tripRequests.push(r);
    d.companies.filter((c) => c.status === 'approved').forEach((c) => notify(d, 'company:' + c.id, { ar: 'طلب رحلة مخصصة جديد', en: 'New custom trip request' }, { ar: `عميل طلب رحلة ${reqTitle(r)} من ${r.from} لـ ${reqPax(r)} أفراد. ابعت عرضك قبل ${r.expiresAt.slice(0, 10)}.`, en: `A customer requested a custom trip (${reqPax(r)} people, from ${r.from}). Send your offer.` }, '#/co/request/' + r.id));
    logAct(d, `طلب رحلة مخصصة جديد من ${u.name}`, `New custom trip request from ${u.name}`);
    return r.id;
  });
}
function cancelTripRequest(id) {
  return tx((d) => {
    const r = byId(d.tripRequests || [], id); if (!r || r.customerId !== me().id) throw new AppError('FORBIDDEN', tr('غير مسموح.', 'Not allowed.'));
    if (!['open', 'accepted'].includes(r.status) || d.bookings.some((b) => b.requestId === r.id && ['confirmed', 'completed', 'refund_pending'].includes(b.status))) throw new AppError('STATE', tr('مينفعش تلغي الطلب ده.', 'This request can’t be cancelled.'));
    r.status = 'cancelled';
    (d.requestOffers || []).filter((o) => o.requestId === id && ['sent', 'accepted'].includes(o.status)).forEach((o) => { o.status = 'lost'; notify(d, 'company:' + o.companyId, { ar: 'العميل ألغى طلب الرحلة', en: 'Request cancelled' }, { ar: 'العميل ألغى طلب الرحلة المخصصة اللي بعتّ عليه عرض.', en: 'The customer cancelled a request you offered on.' }, '#/co/request/' + id); });
  });
}
function sendOffer(rid, p) {
  const u = me(), c = myCompany(); if (!c || c.status !== 'approved') throw new AppError('FORBIDDEN', tr('غير مسموح.', 'Not allowed.'));
  return tx((d) => {
    const r = byId(d.tripRequests || [], rid); if (!r) throw new AppError('NOT_FOUND', tr('الطلب غير موجود.', 'Request not found.'));
    if (r.status !== 'open' || new Date(r.expiresAt) < new Date()) throw reqErr('REQ_CLOSED');
    if (!(+p.price > 0)) throw reqErr('OFFER_PRICE');
    if (!(p.start > iso(TODAY)) || p.end < p.start) throw reqErr('REQ_DATES');
    if (!p.validUntil || p.validUntil < iso(TODAY)) throw reqErr('OFFER_VALID');
    if (!p.destId || !p.title) throw reqErr('OFFER_FIELDS');
    d.requestOffers = d.requestOffers || [];
    let o = d.requestOffers.find((x) => x.requestId === rid && x.companyId === c.id);
    const isNew = !o || ['withdrawn', 'declined'].includes(o.status);
    if (o && !['sent', 'withdrawn', 'declined'].includes(o.status)) throw reqErr('OFFER_STATE');
    const now = new Date().toISOString(), base = { price: +p.price, total: +p.price * reqPax(r), status: 'sent', updatedAt: now, tripId: null, departureId: null };
    if (o) Object.keys(o).forEach((k) => { if (!['id', 'requestId', 'companyId', 'createdAt'].includes(k)) delete o[k]; });
    if (o) Object.assign(o, p, base); else { o = { id: uid('of'), requestId: rid, companyId: c.id, createdAt: now, ...p, ...base }; d.requestOffers.push(o); }
    notify(d, r.customerId, { ar: isNew ? 'وصلك عرض جديد على رحلتك' : 'تحديث على عرض رحلتك', en: isNew ? 'New offer for your trip' : 'Offer updated' }, { ar: `${c.name.ar} ${isNew ? 'بعتت' : 'عدّلت'} عرض بسعر ${fmtN(p.price)} ج.م للفرد.`, en: `${c.name.en} ${isNew ? 'sent' : 'updated'} an offer: EGP ${fmtN(p.price)} per person.` }, '#/me/request/' + rid);
    return o.id;
  });
}
function withdrawOffer(id) {
  return tx((d) => {
    const o = byId(d.requestOffers || [], id); if (!o || o.companyId !== me().companyId) throw new AppError('FORBIDDEN', tr('غير مسموح.', 'Not allowed.'));
    if (o.status !== 'sent') throw reqErr('OFFER_STATE');
    o.status = 'withdrawn'; o.updatedAt = new Date().toISOString();
    notify(d, byId(d.tripRequests, o.requestId).customerId, { ar: 'شركة سحبت عرضها', en: 'An offer was withdrawn' }, { ar: 'شركة سحبت عرضها على طلب رحلتك المخصصة.', en: 'A company withdrew its offer on your request.' }, '#/me/request/' + o.requestId);
  });
}
function declineOffer(id) {
  return tx((d) => {
    const o = byId(d.requestOffers || [], id), r = o && byId(d.tripRequests, o.requestId); if (!o || r.customerId !== me().id) throw new AppError('FORBIDDEN', tr('غير مسموح.', 'Not allowed.'));
    if (o.status !== 'sent') throw reqErr('OFFER_STATE');
    o.status = 'declined'; o.updatedAt = new Date().toISOString();
    notify(d, 'company:' + o.companyId, { ar: 'العميل اعتذر عن عرضك', en: 'Offer declined' }, { ar: 'العميل اعتذر عن عرضك على طلب الرحلة المخصصة. تقدر تبعت عرض معدّل لو الطلب لسه مفتوح.', en: 'The customer declined your offer. You can send a revised one while the request is open.' }, '#/co/request/' + r.id);
  });
}
function acceptOffer(id) {
  return tx((d) => {
    const o = byId(d.requestOffers || [], id), r = o && byId(d.tripRequests, o.requestId);
    if (!o || r.customerId !== me().id) throw new AppError('FORBIDDEN', tr('غير مسموح.', 'Not allowed.'));
    if (r.status === 'accepted' && r.acceptedOfferId === o.id && o.tripId) return { tripId: o.tripId, depId: o.departureId, n: reqPax(r) };
    if (r.status !== 'open') throw new AppError('STATE', tr('الطلب ده مبقاش مفتوح.', 'This request is no longer open.'));
    if (o.status !== 'sent') throw reqErr('OFFER_STATE');
    if (o.validUntil < iso(TODAY)) throw reqErr('OFFER_EXPIRED');
    const co = byId(d.companies, o.companyId); if (!co || co.status !== 'approved') throw new AppError('UNAVAILABLE', tr('الشركة دي مش متاحة حاليًا.', 'This company isn’t available right now.'));
    const n = reqPax(r), dest = byId(d.destinations, o.destId) || { art: 'sea' };
    const t = { id: uid('tp'), companyId: o.companyId, status: 'private', createdAt: new Date().toISOString(), title: { ar: o.title, en: o.title }, summary: { ar: o.notes || '', en: '' }, desc: { ar: o.notes || '', en: '' }, destId: o.destId, catId: o.catId || 'family', days: daysBetween(o.start, o.end) + 1, basePrice: o.price, itinerary: o.program || [], accommodation: { ar: o.stay || '', en: '' }, transport: { ar: o.transport || '', en: '' }, included: o.included || [], excluded: o.excluded || [], policy: { ar: 'نفس سياسة الإلغاء على UTravel: استرداد كامل قبل ١٤ يومًا، ٥٠٪ من ١٤ إلى ٧ أيام، ولا استرداد خلال ٧ أيام.', en: '' }, images: ['art:' + dest.art + ':0'], seats: n, requestId: r.id, offerId: o.id, requestCustomer: r.customerId, custom: true };
    const dep = { id: uid('dp'), tripId: t.id, start: o.start, end: o.end, price: o.price, seats: n, status: 'open' };
    d.trips.push(t); d.departures.push(dep);
    Object.assign(o, { status: 'accepted', tripId: t.id, departureId: dep.id, updatedAt: new Date().toISOString() });
    Object.assign(r, { status: 'accepted', acceptedOfferId: o.id, acceptedAt: new Date().toISOString() });
    notify(d, 'company:' + o.companyId, { ar: 'العميل قبل عرضك', en: 'Your offer was accepted' }, { ar: 'العميل قبل عرضك على الرحلة المخصصة وبيكمل الدفع دلوقتي.', en: 'The customer accepted your offer and is completing payment.' }, '#/co/request/' + r.id);
    return { tripId: t.id, depId: dep.id, n };
  });
}
function sendRequestMessage(rid, cid, text) {
  const t = String(text || '').trim(); if (!t || t.length > 1000) throw reqErr('MSG_TEXT');
  return tx((d) => {
    const r = byId(d.tripRequests || [], rid); if (!r) throw new AppError('NOT_FOUND', tr('الطلب غير موجود.', 'Request not found.'));
    if (r.status === 'cancelled') throw reqErr('REQ_CLOSED');
    const u = me(); let sender;
    if (r.customerId === u.id) sender = 'customer';
    else if (u.role === 'company' && u.companyId === cid && (r.status === 'open' || (d.requestOffers || []).some((o) => o.requestId === rid && o.companyId === cid))) sender = 'company';
    else throw new AppError('FORBIDDEN', tr('غير مسموح.', 'Not allowed.'));
    d.requestMessages = d.requestMessages || [];
    d.requestMessages.push({ id: uid('m'), requestId: rid, companyId: cid, sender, text: t, createdAt: new Date().toISOString() });
    const co = byId(d.companies, cid);
    if (sender === 'company') notify(d, r.customerId, { ar: 'رسالة من ' + co.name.ar, en: 'Message from ' + co.name.en }, { ar: t.slice(0, 120), en: t.slice(0, 120) }, '#/me/request/' + rid);
    else notify(d, 'company:' + cid, { ar: 'رسالة من عميل على طلب رحلة', en: 'Message from a customer' }, { ar: t.slice(0, 120), en: t.slice(0, 120) }, '#/co/request/' + rid);
  });
}
/* called by the local payBooking / sweep (the server does this with a trigger + housekeeping) */
function requestPaid(d, b) {
  const r = b.requestId && byId(d.tripRequests || [], b.requestId); if (!r) return;
  r.status = 'booked';
  (d.requestOffers || []).filter((o) => o.requestId === r.id && o.status === 'sent').forEach((o) => { o.status = 'lost'; notify(d, 'company:' + o.companyId, { ar: 'العميل اختار عرض تاني', en: 'Customer chose another offer' }, { ar: 'العميل حجز عرض شركة تانية على طلب الرحلة المخصصة. شكرًا على عرضك.', en: 'The customer booked another company’s offer. Thanks for your offer.' }, '#/co/request/' + r.id); });
}
function requestSweep(d) {
  let ch = false; const live = (rid) => d.bookings.some((b) => b.requestId === rid && (['confirmed', 'completed', 'refund_pending'].includes(b.status) || (b.status === 'pending_payment' && new Date(b.holdUntil) > new Date())));
  (d.tripRequests || []).forEach((r) => {
    if (r.status === 'accepted' && Date.now() - new Date(r.acceptedAt) > 30 * 6e4 && !live(r.id)) { const o = byId(d.requestOffers, r.acceptedOfferId); if (o) o.status = 'sent'; r.status = 'open'; r.acceptedOfferId = null; ch = true; }
    if (r.status === 'open' && new Date(r.expiresAt) < new Date() && !(d.requestOffers || []).some((o) => o.requestId === r.id && o.status === 'sent' && o.validUntil >= iso(TODAY))) { r.status = 'expired'; ch = true; }
  });
  return ch;
}

/* ---------- shared pieces ---------- */
const chipList = (arr) => arr.filter(Boolean).map((x) => `<span class="chip" style="cursor:default;height:26px;font-size:12.5px">${esc(x)}</span>`).join(' ');
function reqSummary(r, forCompany) {
  return `<div class="card card-pad"><div class="grid g4" style="gap:14px">
    <div><small class="muted">${tr('الوجهة', 'Destination')}</small><div><b style="color:var(--navy)">${esc(reqTitle(r))}</b></div></div>
    <div><small class="muted">${tr('التاريخ', 'Dates')}</small><div><b style="color:var(--navy)">${fmtDS(r.from)} – ${fmtD(r.to)}</b>${+r.flex ? `<div class="xs muted">${tr(`مرونة ±${r.flex} يوم`, `±${r.flex} days flexible`)}</div>` : ''}</div></div>
    <div><small class="muted">${tr('المسافرون', 'Travellers')}</small><div><b style="color:var(--navy)">${tr(`${r.adults} كبار`, `${r.adults} adults`)}${+r.children ? tr(` + ${r.children} أطفال`, ` + ${r.children} children`) : ''}</b></div></div>
    <div><small class="muted">${tr('الميزانية للفرد', 'Budget per person')}</small><div><b class="num" style="color:var(--navy)">${r.budgetMin && r.budgetMax ? `${money(r.budgetMin)} – ${money(r.budgetMax)}` : r.budgetMax ? tr('حتى ', 'up to ') + money(r.budgetMax) : r.budgetMin ? tr('من ', 'from ') + money(r.budgetMin) : tr('مفتوحة', 'Open')}</b></div></div>
  </div>
  <div class="row wrapx" style="gap:6px;margin-top:14px">${chipList([L(STAYS[r.stay] || STAYS.any), r.meals ? L(MEALS[r.meals]) : '', ...(r.transport || []).map((x) => L(TRANSPORTS[x])), ...(r.types || []).map((x) => L((catById(x) || { name: x }).name))])}</div>
  ${r.special ? `<p class="small" style="margin-top:12px"><b>${tr('طلبات خاصة:', 'Special requests:')}</b> ${esc(r.special)}</p>` : ''}
  ${(r.program || []).some((p) => p.text) ? `<details style="margin-top:12px"><summary class="btn-link small" style="cursor:pointer">${tr('البرنامج اللي العميل عايزه', 'Requested programme')}</summary><div class="itin" style="margin-top:10px">${r.program.filter((p) => p.text).map((p) => `<div class="itin-day"><h4><small>${tr('اليوم', 'Day')} ${p.day}</small></h4><p class="small muted">${esc(p.text)}</p></div>`).join('')}</div></details>` : ''}
  ${forCompany ? `<p class="xs faint" style="margin-top:12px">${tr(`العميل: ${esc(r.initials || '')}${r.city ? ' من ' + esc(r.city) : ''}. بيانات التواصل بتظهر بعد ما يحجز عرضك.`, `Customer: ${esc(r.initials || '')}${r.city ? ' from ' + esc(r.city) : ''}. Contact details appear once they book your offer.`)}</p>` : ''}</div>`;
}
function thread(r, cid, viewer) {
  const msgs = reqMsgs(r.id, cid), co = compById(cid) || { name: '' };
  const canWrite = r.status !== 'cancelled';
  return `<div class="thread"><div class="msgs">${msgs.length ? msgs.map((m) => `<div class="msg ${m.sender === viewer ? 'mine' : ''}"><div class="mb">${esc(m.text)}</div><div class="xs faint">${m.sender === 'company' ? esc(L(co.name)) : (viewer === 'customer' ? tr('إنت', 'You') : tr('العميل', 'Customer'))} · ${ago(m.createdAt)}</div></div>`).join('') : `<p class="small muted">${viewer === 'customer' ? tr('اسأل الشركة عن أي تفصيلة قبل ما تقرر.', 'Ask the company anything before you decide.') : tr('اسأل العميل لو محتاج توضيح قبل ما تبعت السعر.', 'Ask the customer anything before you price it.')}</p>`}</div>
    ${canWrite ? `<form data-f="req-msg" data-r="${r.id}" data-c="${cid}" class="row" style="align-items:flex-start;margin-top:10px" novalidate><div class="field grow"><textarea class="textarea" name="text" rows="1" style="min-height:42px" maxlength="1000" placeholder="${tr('اكتب رسالتك…', 'Write a message…')}" aria-label="${tr('رسالة', 'Message')}"></textarea><span class="err-msg"></span></div><button class="btn btn-soft" type="submit">${tr('إرسال', 'Send')}</button></form><p class="xs faint" style="margin-top:4px">${tr('للحفاظ على حقك، خلّي الاتفاق والدفع على UTravel.', 'To stay protected, keep the agreement and payment on UTravel.')}</p>` : ''}</div>`;
}
FORMS['req-msg'] = async (f) => {
  const d = validate(f, { text: ['req'] }); if (!d) return;
  const btn = $('button[type=submit]', f); busy(btn, true);
  try { await sendRequestMessage(f.dataset.r, f.dataset.c, d.text); seenMark('r:' + f.dataset.r); render(); }
  catch (e) { busy(btn, false); toast(e.message, 'bad'); }
};

/* ---------- customer: plan a trip (3 steps) ---------- */
function planDefaults() { return { step: 1, dests: [], anyDest: false, from: iso(addDays(TODAY, 21)), to: iso(addDays(TODAY, 24)), flex: 0, adults: 2, children: 0, budgetMin: '', budgetMax: '', stay: '4', meals: 'half', transport: ['bus'], types: [], special: '', program: [], window: 5 }; }
function viewPlan() {
  const P = UI.plan = UI.plan || planDefaults();
  if (openOfMine().length >= REQ_MAX_OPEN) return dashLayout('me', tr('خطط رحلتك', 'Plan your trip'), `<div class="card">${empty('compass', tr(`عندك ${REQ_MAX_OPEN} طلبات مفتوحة`, `You have ${REQ_MAX_OPEN} open requests`), tr('اقفل أو ألغِ طلب من طلباتك قبل ما تعمل طلب جديد.', 'Close or cancel one of them before making a new request.'), `<a class="btn btn-primary" href="#/me/requests">${tr('طلباتي', 'My requests')}</a>`)}</div>`);
  const days = Math.max(1, Math.min(14, daysBetween(P.from, P.to) + 1));
  while (P.program.length < days) P.program.push({ day: P.program.length + 1, text: '' }); P.program.length = days;
  const steps = [tr('الأساسيات', 'Basics'), tr('المواصفات', 'Preferences'), tr('البرنامج والإرسال', 'Programme & send')];
  let body = '';
  if (P.step === 1) body = `
    <div class="field"><span class="lbl">${tr('رايح فين؟ (اختار واحدة أو أكتر)', 'Where to? (one or more)')}</span><div class="row wrapx" style="gap:8px;margin-top:4px">${db.destinations.map((d) => `<button type="button" class="chip ${P.dests.includes(d.id) ? 'on' : ''}" data-a="plan-dest" data-id="${d.id}" aria-pressed="${P.dests.includes(d.id)}">${esc(L(d.name))}</button>`).join('')}<button type="button" class="chip ${P.anyDest ? 'on' : ''}" data-a="plan-any" aria-pressed="${P.anyDest}">${ic('sparkle')}${tr('اقترحوا عليّا', 'Suggest one')}</button></div><span class="err-msg"></span></div>
    <div class="form-grid" style="margin-top:16px">${inp('from', tr('من تاريخ', 'From'), P.from, { type: 'date', attrs: `min="${iso(addDays(TODAY, 1))}" data-on="plan-from"` })}${inp('to', tr('إلى تاريخ', 'To'), P.to, { type: 'date', attrs: `min="${iso(addDays(TODAY, 1))}"` })}
    ${sel('flex', tr('مرونة التاريخ', 'Date flexibility'), [[0, tr('التاريخ ثابت', 'Fixed dates')], [1, '± ' + tr('يوم', '1 day')], [3, '± ' + tr('٣ أيام', '3 days')], [7, '± ' + tr('أسبوع', '1 week')]], P.flex)}
    <div class="form-grid" style="gap:10px">${inp('adults', tr('الكبار', 'Adults'), P.adults, { type: 'number', attrs: 'min="1" max="40"' })}${inp('children', tr('الأطفال (تحت ١٢)', 'Children (<12)'), P.children, { type: 'number', attrs: 'min="0" max="30"' })}</div>
    ${inp('budgetMin', tr('الميزانية للفرد: من (ج.م)', 'Budget per person: from (EGP)'), P.budgetMin, { type: 'number', attrs: 'min="0" step="500"', hint: tr('اختياري، بيساعد الشركات تظبط العرض', 'Optional — helps companies price it') })}${inp('budgetMax', tr('إلى (ج.م)', 'to (EGP)'), P.budgetMax, { type: 'number', attrs: 'min="0" step="500"' })}</div>`;
  else if (P.step === 2) body = `
    <div class="field"><span class="lbl">${tr('مستوى الإقامة', 'Accommodation')}</span><div class="row wrapx" style="gap:8px;margin-top:4px">${Object.entries(STAYS).map(([k, v]) => `<label class="chip ${P.stay === k ? 'on' : ''}"><input type="radio" name="stay" value="${k}" class="sr" ${P.stay === k ? 'checked' : ''} data-ch="plan-radio">${esc(L(v))}</label>`).join('')}</div></div>
    <div class="form-grid" style="margin-top:16px">${sel('meals', tr('الوجبات', 'Meals'), Object.entries(MEALS).map(([k, v]) => [k, L(v)]), P.meals)}
    <div class="field"><span class="lbl">${tr('المواصلات', 'Transport')}</span><div class="row wrapx" style="gap:4px 14px">${Object.entries(TRANSPORTS).map(([k, v]) => `<label class="opt"><input type="checkbox" name="transport" value="${k}" ${P.transport.includes(k) ? 'checked' : ''}>${esc(L(v))}</label>`).join('')}</div></div>
    <div class="field full"><span class="lbl">${tr('نوع الرحلة', 'Trip type')}</span><div class="row wrapx" style="gap:4px 14px">${db.categories.map((c) => `<label class="opt"><input type="checkbox" name="types" value="${c.id}" ${P.types.includes(c.id) ? 'checked' : ''}>${esc(L(c.name))}</label>`).join('')}</div></div>
    ${txa('special', tr('طلبات خاصة (اختياري)', 'Special requests (optional)'), P.special, { full: true, rows: 3, hint: tr('مثال: غرفة مطلة على البحر، كرسي متحرك، أكل نباتي، مرشد بيتكلم إنجليزي…', 'e.g. sea view, wheelchair access, vegetarian food, English‑speaking guide…') })}</div>`;
  else body = `
    <p class="small muted" style="margin-bottom:12px">${tr(`اكتب اللي نفسك تعمله كل يوم (${days} أيام). ممكن تسيبه فاضي والشركة تقترح البرنامج.`, `Describe what you’d like each day (${days} days). Leave it empty and companies will propose one.`)}</p>
    <div class="stack">${P.program.map((p, i) => `<div class="rep-row" style="grid-template-columns:80px 1fr"><b style="color:var(--teal-700);padding-top:10px">${tr('اليوم', 'Day')} ${i + 1}</b><textarea class="textarea" name="day_${i}" rows="1" style="min-height:44px" placeholder="${tr('مثال: غطس الصبح وسهرة على البحر', 'e.g. morning dive, evening by the sea')}" aria-label="${tr('اليوم', 'Day')} ${i + 1}">${esc(p.text)}</textarea></div>`).join('')}</div>
    <div class="field" style="margin-top:16px"><span class="lbl">${tr('الشركات تبعت عروض لحد إمتى؟', 'Receive offers for')}</span><div class="seg" role="radiogroup">${[3, 5, 7].map((n) => `<button type="button" class="${+P.window === n ? 'on' : ''}" data-a="plan-win" data-v="${n}" role="radio" aria-checked="${+P.window === n}">${tr(`${n} أيام`, `${n} days`)}</button>`).join('')}</div></div>
    <div class="callout" style="margin-top:16px">${ic('info')}<div>${tr(`الطلب هيوصل لكل الشركات المعتمدة (${db.companies.filter((c) => c.status === 'approved').length}). هيشوفوا مواصفاتك وحروف اسمك الأولى بس، وبيانات التواصل بتظهر للشركة اللي هتحجز عرضها.`, `It goes to every approved company (${db.companies.filter((c) => c.status === 'approved').length}). They see your preferences and initials only; contact details go to the company whose offer you book.`)}</div></div>`;
  return dashLayout('me', tr('خطط رحلتك', 'Plan your trip'), `<div class="co-layout"><div>
    <ol class="steps">${steps.map((s, i) => `<li class="${i + 1 === P.step ? 'on' : i + 1 < P.step ? 'done' : ''}">${s}</li>`).join('')}</ol>
    <form class="card card-pad" data-f="plan" novalidate>${body}
    <div class="row between" style="margin-top:20px">${P.step > 1 ? `<button type="button" class="btn btn-ghost" data-a="plan-back">${tr('رجوع', 'Back')}</button>` : '<span></span>'}<button class="btn btn-primary btn-lg" type="submit">${P.step < 3 ? tr('التالي', 'Next') : tr('ابعت الطلب للشركات', 'Send to companies')}</button></div></form></div>
    <aside class="card card-pad stack" style="position:sticky;top:88px"><h3>${tr('ملخص طلبك', 'Your request')}</h3><dl class="dl" style="grid-template-columns:100px 1fr;font-size:14px">
      <dt>${tr('الوجهة', 'Where')}</dt><dd>${P.dests.length ? esc(P.dests.map((x) => L(destById(x).name)).join('، ')) : P.anyDest ? tr('مقترحة', 'Suggested') : '—'}</dd>
      <dt>${tr('التاريخ', 'When')}</dt><dd>${fmtDS(P.from)} – ${fmtDS(P.to)}</dd><dt>${tr('المسافرون', 'Who')}</dt><dd>${P.adults}${+P.children ? ' + ' + P.children : ''}</dd>
      <dt>${tr('الميزانية', 'Budget')}</dt><dd class="num">${P.budgetMax ? money(P.budgetMax) : '—'}</dd><dt>${tr('الإقامة', 'Stay')}</dt><dd>${esc(L(STAYS[P.stay]))}</dd></dl>
      <p class="xs faint">${tr(`تقدر يكون عندك لحد ${REQ_MAX_OPEN} طلبات مفتوحة في نفس الوقت.`, `Up to ${REQ_MAX_OPEN} open requests at a time.`)}</p></aside></div>`);
}
function planCapture(f) {
  const P = UI.plan, d = formData(f);
  if (P.step === 1) Object.assign(P, { from: d.from, to: d.to, flex: +d.flex || 0, adults: +d.adults || 0, children: +d.children || 0, budgetMin: d.budgetMin ? +d.budgetMin : '', budgetMax: d.budgetMax ? +d.budgetMax : '' });
  if (P.step === 2) Object.assign(P, { stay: d.stay || 'any', meals: d.meals, transport: [].concat(d.transport || []), types: [].concat(d.types || []), special: d.special || '' });
  if (P.step === 3) P.program = P.program.map((p, i) => ({ day: i + 1, text: (f.elements['day_' + i] || {}).value || '' }));
}
ACTIONS['plan-dest'] = (el) => { const f = el.closest('form'); planCapture(f); const P = UI.plan, i = P.dests.indexOf(el.dataset.id); i >= 0 ? P.dests.splice(i, 1) : P.dests.push(el.dataset.id); if (P.dests.length) P.anyDest = false; render(); };
ACTIONS['plan-any'] = (el) => { planCapture(el.closest('form')); UI.plan.anyDest = !UI.plan.anyDest; if (UI.plan.anyDest) UI.plan.dests = []; render(); };
ACTIONS['plan-win'] = (el) => { planCapture(el.closest('form')); UI.plan.window = +el.dataset.v; render(); };
ACTIONS['plan-back'] = (el) => { planCapture(el.closest('form')); UI.plan.step--; render(); scrollTo(0, 0); };
CHANGES['plan-radio'] = (el) => { planCapture(el.closest('form')); render(); };
CHANGES['plan-from'] = (el) => { const to = $('#f-to'); if (to && el.value) { to.min = el.value; if (to.value < el.value) to.value = iso(addDays(el.value, 3)); } };
FORMS.plan = async (f) => {
  const P = UI.plan;
  if (P.step === 1) {
    const d = validate(f, { from: ['req', 'future'], to: ['req', (v, a) => v >= a.from || tr('النهاية لازم تكون بعد البداية.', 'End must be after start.'), (v, a) => daysBetween(a.from, v) < 30 || tr('أقصى مدة ٣٠ يوم.', '30 days max.')], adults: ['req', 'int', (v) => +v >= 1 || tr('فرد بالغ واحد على الأقل.', 'At least one adult.')], children: ['int', (v) => +v >= 0 || tr('رقم غير صحيح.', 'Invalid.'), (v, a) => (+a.adults || 0) + (+v || 0) <= 40 || tr('أقصى عدد ٤٠ مسافر.', '40 travellers max.')], budgetMax: [(v, a) => !v || !a.budgetMin || +v >= +a.budgetMin || tr('أعلى من البداية.', 'Must be above the minimum.')] });
    if (!d) return;
    if (!P.dests.length && !P.anyDest) { const fe = $('.field', f); fe.classList.add('err'); $('.err-msg', fe).textContent = REQ_ERR.REQ_DEST(); return; }
  }
  planCapture(f);
  if (P.step < 3) { P.step++; render(); scrollTo(0, 0); return; }
  const btn = $('button[type=submit]', f); busy(btn, true, tr('جاري الإرسال…', 'Sending…'));
  try {
    const payload = { dests: P.dests, anyDest: P.anyDest, from: P.from, to: P.to, flex: P.flex, adults: P.adults, children: P.children, budgetMin: P.budgetMin, budgetMax: P.budgetMax, stay: P.stay, meals: P.meals, transport: P.transport, types: P.types, special: P.special, program: P.program, window: P.window };
    const id = await createTripRequest(payload);
    UI.plan = null; seenMark('r:' + id);
    toast(tr('طلبك وصل لكل الشركات. هنبلغك أول ما توصلك عروض.', 'Your request went to every company. We’ll tell you as offers arrive.'));
    go('#/me/request/' + id);
  } catch (e) { busy(btn, false); toast(e.message, 'bad'); }
};

/* ---------- customer: requests list + request page ---------- */
function reqCard(r, href, extra) {
  const offers = reqOffers(r.id).filter((o) => ['sent', 'accepted'].includes(o.status));
  return `<a class="card card-pad" href="${href}" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><span class="ib-ic" style="width:48px;height:48px;border-radius:14px">${ic('compass', 'lg')}</span><div class="grow" style="min-width:0"><div class="row wrapx" style="gap:8px">${badge(RSTAT, r.status)}${extra || ''}</div><h3 style="font-size:16px;margin-top:4px">${tr('رحلة إلى ', 'Trip to ')}${esc(reqTitle(r))}</h3><div class="small muted row wrapx" style="gap:12px"><span>${ic('cal')} ${fmtDS(r.from)} – ${fmtDS(r.to)}</span><span>${ic('users')} ${reqPax(r)}</span>${r.budgetMax ? `<span>${tr('حتى', 'up to')} ${money(r.budgetMax)}</span>` : ''}${receivingOffers(r) ? `<span>${ic('clock')} ${leftText(r.expiresAt)}</span>` : ''}</div></div><div style="text-align:center"><b class="price num">${offers.length}</b><div class="xs muted">${tr('عروض', 'offers')}</div></div></a>`;
}
function viewMyRequests() {
  const list = myRequests();
  return dashLayout('me', tr('رحلاتي المخصصة', 'My custom trips'), `<div class="card card-pad row wrapx between" style="margin-bottom:16px;gap:14px"><div><h3>${tr('مش لاقي الرحلة اللي في دماغك؟', 'Can’t find the trip you have in mind?')}</h3><p class="small muted">${tr('اكتب مواصفاتك والشركات تبعتلك عروض تختار منها.', 'Describe it and companies send you offers to choose from.')}</p></div><a class="btn btn-sand" href="#/plan">${ic('plus')}${tr('خطط رحلة جديدة', 'Plan a new trip')}</a></div>
  <div class="stack">${list.length ? list.map((r) => { const n = customerNews(r); return reqCard(r, '#/me/request/' + r.id, n.offers ? `<span class="badge b-warn">${tr(`${n.offers} عرض جديد`, `${n.offers} new`)}</span>` : n.msgs ? `<span class="badge b-info">${tr(`${n.msgs} رسالة`, `${n.msgs} msg`)}</span>` : ''); }).join('') : `<div class="card">${empty('compass', tr('لسه ما طلبتش رحلة مخصصة', 'No custom trips yet'), tr('حدد الوجهة والتاريخ والميزانية والبرنامج، وسيب الشركات تتنافس على رحلتك.', 'Set destination, dates, budget and programme, and let companies compete for your trip.'), `<a class="btn btn-primary" href="#/plan">${tr('خطط رحلتك', 'Plan your trip')}</a>`)}</div>`}</div>`);
}
function offerMatch(r, o) {
  const flex = +r.flex || 0, okDate = Math.abs(daysBetween(r.from, o.start)) <= flex && Math.abs((daysBetween(o.start, o.end) + 1) - reqDays(r)) <= Math.max(1, flex);
  const okDest = r.anyDest || (r.dests || []).includes(o.destId);
  const okStay = !r.stay || r.stay === 'any' || r.stay === o.stayLevel;
  const okTr = !(r.transport || []).length || (r.transport || []).includes(o.transportType);
  const m = (ok, l) => `<span class="badge ${ok ? 'b-ok' : 'b-warn'}" style="font-weight:600">${ok ? '✓' : '≠'} ${l}</span>`;
  return [m(okDest, tr('الوجهة', 'Destination')), m(okDate, tr('التاريخ', 'Dates')), m(okStay, tr('الإقامة', 'Stay')), m(okTr, tr('المواصلات', 'Transport'))].join(' ');
}
function budgetBadge(r, o) { if (!r.budgetMax) return ''; if (o.price <= r.budgetMax) return `<span class="badge b-ok">${tr('في حدود ميزانيتك', 'Within your budget')}</span>`; return `<span class="badge b-warn">${tr(`أعلى من ميزانيتك بـ ${Math.round((o.price / r.budgetMax - 1) * 100)}٪`, `${Math.round((o.price / r.budgetMax - 1) * 100)}% over budget`)}</span>`; }
function offerCard(r, o) {
  const c = compById(o.companyId) || { name: '', color: '#888' }, cr = companyRating(o.companyId), msgs = reqMsgs(r.id, o.companyId);
  const s = seenAt('r:' + r.id), isNew = o.status === 'sent' && (o.updatedAt || o.createdAt) > s, unread = msgs.filter((m) => m.sender === 'company' && m.createdAt > s).length;
  const canAct = r.status === 'open' && o.status === 'sent';
  const payPending = r.status === 'accepted' && r.acceptedOfferId === o.id;
  return `<article class="card offer ${o.status !== 'sent' && o.status !== 'accepted' ? 'dim' : ''}" id="of-${o.id}">
    <div class="card-pad"><div class="row between wrapx" style="gap:10px"><div class="row">${coLogo(c, 'md')}<div><b style="color:var(--navy)">${esc(L(c.name))}</b><div class="row wrapx xs" style="gap:8px">${prate(c)}${starsHTML(cr.avg, cr.count)}</div></div></div>
      <div style="text-align:end"><div class="price num">${money(o.price)}<small>${tr('للفرد', 'per person')} · ${tr('الإجمالي', 'total')} ${money(o.total)}</small></div></div></div>
    <div class="row wrapx" style="gap:6px;margin-top:10px">${isNew ? `<span class="badge b-warn">${tr('جديد', 'New')}</span>` : ''}${o.status !== 'sent' ? badge(OSTAT, o.status) : ''}${budgetBadge(r, o)}</div>
    <h3 style="font-size:16.5px;margin-top:10px">${esc(o.title)}</h3>
    <div class="small muted row wrapx" style="gap:12px;margin-top:4px"><span>${ic('pin')} ${esc(L((destById(o.destId) || { name: o.destId }).name))}</span><span>${ic('cal')} ${fmtDS(o.start)} – ${fmtD(o.end)}</span><span>${ic('bed')} ${esc(o.stay || L(STAYS[o.stayLevel] || STAYS.any))}</span><span>${ic('bus')} ${esc(o.transport || L(TRANSPORTS[o.transportType] || {}))}</span></div>
    <div class="row wrapx" style="gap:6px;margin-top:10px">${offerMatch(r, o)}</div>
    ${o.notes ? `<p class="small" style="margin-top:10px">${esc(o.notes)}</p>` : ''}
    <details style="margin-top:10px"><summary class="btn-link small" style="cursor:pointer">${tr('البرنامج والخدمات', 'Programme & services')}</summary>
      ${(o.program || []).length ? `<div class="itin" style="margin-top:10px">${o.program.map((p) => `<div class="itin-day"><h4><small>${tr('اليوم', 'Day')} ${p.day}</small>${esc(L(p.title))}</h4>${L(p.text) ? `<p class="small muted">${esc(L(p.text))}</p>` : ''}</div>`).join('')}</div>` : ''}
      <div class="grid g2" style="margin-top:8px">${(o.included || []).length ? `<ul class="ticklist tick-ok small">${o.included.map((x) => `<li>${ic('check')}${esc(L(x))}</li>`).join('')}</ul>` : ''}${(o.excluded || []).length ? `<ul class="ticklist tick-no small">${o.excluded.map((x) => `<li>${ic('x')}${esc(L(x))}</li>`).join('')}</ul>` : ''}</div></details>
    <p class="xs faint" style="margin-top:8px">${tr('العرض صالح حتى', 'Valid until')} ${fmtD(o.validUntil)}</p></div>
    <div class="offer-foot">${canAct ? `<button class="btn btn-teal" data-a="offer-accept" data-id="${o.id}">${tr('قبول وحجز', 'Accept & book')}</button><button class="btn btn-ghost" data-a="offer-decline" data-id="${o.id}">${tr('اعتذار', 'Decline')}</button>` : payPending ? `<button class="btn btn-teal" data-a="offer-accept" data-id="${o.id}">${tr('أكمل الدفع', 'Complete payment')}</button>` : ''}
      <button class="btn btn-soft" data-a="offer-chat" data-id="${o.id}" style="margin-inline-start:auto">${ic('mail')}${tr('رسائل', 'Messages')}${msgs.length ? ` (${msgs.length})` : ''}${unread ? ` <span class="badge b-warn" style="padding:0 6px">${unread}</span>` : ''}</button></div>
    <div class="chat-wrap" ${UI.chatOpen === o.companyId ? '' : 'hidden'}>${thread(r, o.companyId, 'customer')}</div></article>`;
}
function viewMyRequest(id) {
  const r = byId(db.tripRequests || [], id);
  if (!r || r.customerId !== me().id) return dashLayout('me', tr('الطلب', 'Request'), `<div class="card">${empty('compass', tr('الطلب غير موجود', 'Request not found'), '', `<a class="btn btn-primary" href="#/me/requests">${tr('طلباتي', 'My requests')}</a>`)}</div>`);
  const sort = UI.offerSort || 'price';
  const offers = reqOffers(r.id).slice().sort((a, b) => { const live = (o) => (['sent', 'accepted'].includes(o.status) ? 0 : 1); return (live(a) - live(b)) || (sort === 'rating' ? ((+(compById(b.companyId) || {}).platformRating || 0) - (+(compById(a.companyId) || {}).platformRating || 0)) || (companyRating(b.companyId).avg - companyRating(a.companyId).avg) : a.price - b.price); });
  const liveOffers = offers.filter((o) => o.status === 'sent');
  const askers = [...new Set(reqMsgs(r.id).map((m) => m.companyId))].filter((cid) => !offers.some((o) => o.companyId === cid));
  const booking = db.bookings.find((b) => b.requestId === r.id && ['confirmed', 'completed', 'refund_pending', 'pending_payment'].includes(b.status));
  const html = `
    <div class="row between wrapx" style="margin-bottom:14px;gap:10px"><div><div class="row wrapx" style="gap:8px">${badge(RSTAT, r.status)}${receivingOffers(r) ? `<span class="small muted">${ic('clock')} ${tr('الشركات تقدر تبعت عروض لحد', 'Offers accepted until')} ${fmtDT(r.expiresAt)}</span>` : ''}</div><h2 style="font-size:22px;margin-top:6px">${tr('رحلة إلى ', 'Trip to ')}${esc(reqTitle(r))}</h2></div>
      <div class="row">${liveOffers.length >= 2 ? `<button class="btn btn-ghost btn-sm" data-a="offers-compare" data-id="${r.id}">${ic('layers')}${tr('قارن العروض', 'Compare offers')}</button>` : ''}${['open', 'accepted'].includes(r.status) && !(booking && booking.paymentStatus === 'paid') ? `<button class="btn btn-danger-soft btn-sm" data-a="req-cancel" data-id="${r.id}">${tr('إلغاء الطلب', 'Cancel request')}</button>` : ''}</div></div>
    ${r.status === 'booked' && booking ? `<div class="callout ok" style="margin-bottom:14px">${ic('check')}<div class="grow"><b>${tr('تم حجز رحلتك المخصصة.', 'Your custom trip is booked.')}</b> ${tr('بيانات التواصل بتاعتك وصلت للشركة.', 'The company now has your contact details.')}</div><a class="btn btn-sm btn-primary" href="#/me/booking/${booking.ref}">${tr('تفاصيل الحجز', 'Booking details')}</a></div>` : ''}
    ${r.status === 'accepted' ? `<div class="callout warn" style="margin-bottom:14px">${ic('clock')}<div>${tr('قبلت عرض ولسه الدفع ما اكتملش. لو ما دفعتش خلال ٣٠ دقيقة الطلب بيرجع مفتوح والعروض التانية ترجع متاحة.', 'You accepted an offer but haven’t paid yet. If unpaid within 30 minutes, the request reopens and other offers become available again.')}</div></div>` : ''}
    ${reqSummary(r, false)}
    <div class="row between wrapx" style="margin:22px 0 12px"><h3>${tr(`العروض (${offers.length})`, `Offers (${offers.length})`)}</h3>${offers.length > 1 ? `<label class="row small"><span class="muted">${tr('رتب حسب', 'Sort by')}</span><select class="select" style="width:auto;height:36px" data-ch="offer-sort">${[['price', tr('السعر', 'Price')], ['rating', tr('تقييم الشركة', 'Company rating')]].map(([v, l]) => `<option value="${v}" ${sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>` : ''}</div>
    ${offers.length ? `<div class="grid g2" style="align-items:start">${offers.map((o) => offerCard(r, o)).join('')}</div>` : `<div class="card">${empty('mail', receivingOffers(r) ? tr('لسه مفيش عروض', 'No offers yet') : tr('ما وصلتش عروض', 'No offers arrived'), receivingOffers(r) ? tr(`طلبك وصل لـ ${db.companies.filter((c) => c.status === 'approved').length || tr('كل', 'all')} شركات. هنبلغك أول ما يوصل عرض.`, 'Your request went out to every company. We’ll tell you when an offer arrives.') : tr('تقدر تعمل طلب جديد بمواصفات مختلفة.', 'You can make a new request with different preferences.'), receivingOffers(r) ? '' : `<a class="btn btn-primary" href="#/plan">${tr('طلب جديد', 'New request')}</a>`)}</div>`}
    ${askers.length ? `<h3 style="margin:22px 0 12px">${tr('أسئلة من شركات', 'Questions from companies')}</h3>${askers.map((cid) => `<div class="card card-pad" style="margin-bottom:12px"><div class="row" style="margin-bottom:10px">${coLogo(compById(cid) || {}, '')}<b style="color:var(--navy)">${esc(L((compById(cid) || { name: '' }).name))}</b></div>${thread(r, cid, 'customer')}</div>`).join('')}` : ''}`;
  setTimeout(() => seenMark('r:' + r.id), 1500);
  return dashLayout('me', tr('رحلتي المخصصة', 'My custom trip'), html, `<a class="btn btn-ghost btn-sm" href="#/me/requests">${tr('كل طلباتي', 'All requests')}</a>`);
}
CHANGES['offer-sort'] = (el) => { UI.offerSort = el.value; render(); };
ACTIONS['offer-chat'] = (el) => { const o = byId(db.requestOffers, el.dataset.id); UI.chatOpen = UI.chatOpen === o.companyId ? null : o.companyId; const y = scrollY; render(); scrollTo(0, y); seenMark('r:' + o.requestId); };
ACTIONS['offer-decline'] = async (el) => { const o = byId(db.requestOffers, el.dataset.id); if (!(await confirmDialog({ title: tr('اعتذار عن العرض؟', 'Decline this offer?'), text: tr(`هنبلغ ${esc(L(compById(o.companyId).name))} إنك مش مهتم بالعرض ده. الشركة تقدر تبعتلك عرض معدّل طول ما الطلب مفتوح.`, `We’ll tell ${esc(L(compById(o.companyId).name))} you’re not interested. They can send a revised offer while the request is open.`), ok: tr('اعتذار', 'Decline'), danger: true }))) return; await declineOffer(o.id); toast(tr('تم الاعتذار عن العرض.', 'Offer declined.')); render(); };
ACTIONS['offer-accept'] = async (el) => {
  const o = byId(db.requestOffers, el.dataset.id), r = byId(db.tripRequests, o.requestId), c = compById(o.companyId);
  if (o.status === 'sent' && !(await confirmDialog({ title: tr('قبول العرض والحجز', 'Accept and book'), text: tr(`هتقبل عرض ${esc(L(c.name))}: ${money(o.price)} للفرد × ${reqPax(r)} = ${money(o.total)}. بعدها هتكتب بيانات المسافرين وتدفع. العروض التانية بتتقفل بعد ما الدفع يتم.`, `You’re accepting ${esc(L(c.name))}: ${money(o.price)} per person × ${reqPax(r)} = ${money(o.total)}. Next you’ll enter traveller details and pay. Other offers close once payment completes.`), ok: tr('قبول ومتابعة الدفع', 'Accept & pay') }))) return;
  busy(el, true);
  try {
    const res = await acceptOffer(o.id);
    const pending = db.bookings.find((b) => b.requestId === r.id && b.status === 'pending_payment' && new Date(b.holdUntil) > new Date());
    if (pending) return resumeCheckout(pending);
    UI.co = null; go(`#/book/${res.tripId}?dep=${res.depId}&n=${res.n}`);
  } catch (e) { busy(el, false); toast(e.message, 'bad'); }
};
ACTIONS['req-cancel'] = async (el) => { if (!(await confirmDialog({ title: tr('إلغاء طلب الرحلة؟', 'Cancel this request?'), text: tr('الطلب هيتقفل والشركات اللي بعتت عروض هيوصلها إشعار.', 'The request closes and companies that offered will be notified.'), ok: tr('إلغاء الطلب', 'Cancel request'), danger: true }))) return; await cancelTripRequest(el.dataset.id); toast(tr('تم إلغاء الطلب.', 'Request cancelled.')); render(); };
ACTIONS['offers-compare'] = (el) => {
  const r = byId(db.tripRequests, el.dataset.id), os = reqOffers(r.id).filter((o) => o.status === 'sent');
  const rows = os.map((o) => ({ o, c: compById(o.companyId), cr: companyRating(o.companyId) }));
  const best = (vals, dir) => (dir === 'min' ? Math.min(...vals) : Math.max(...vals));
  const bP = best(rows.map((x) => x.o.price), 'min'), bR = best(rows.map((x) => +x.c.platformRating || 0), 'max'), bC = best(rows.map((x) => x.cr.avg), 'max');
  const cell = (v, b, h) => `<td class="${v === b && v > 0 ? 'best' : ''}">${h}${v === b && v > 0 ? `<span class="best-tag">${tr('الأفضل', 'Best')}</span>` : ''}</td>`;
  const R = (l, f) => `<tr><th scope="row">${l}</th>${rows.map(f).join('')}</tr>`;
  modal({ wide: true, title: tr('قارن العروض', 'Compare offers'), body: `<div class="cmp-wrap"><table class="cmp" style="min-width:${180 + rows.length * 190}px"><thead><tr><th scope="row"></th>${rows.map((x) => `<td><div class="row">${coLogo(x.c)}<b style="color:var(--navy)">${esc(L(x.c.name))}</b></div></td>`).join('')}</tr></thead><tbody>
    ${R(tr('السعر للفرد', 'Per person'), (x) => cell(x.o.price, bP, `<b class="num">${money(x.o.price)}</b>`))}
    ${R(tr('الإجمالي', 'Total'), (x) => `<td class="num">${money(x.o.total)}</td>`)}
    ${R(tr('الميزانية', 'Budget'), (x) => `<td>${budgetBadge(r, x.o) || '—'}</td>`)}
    ${R(tr('تقييم UTravel', 'UTravel rating'), (x) => cell(+x.c.platformRating || 0, bR, x.c.platformRating ? pStars(x.c.platformRating) : '—'))}
    ${R(tr('تقييم العملاء', 'Customer rating'), (x) => cell(x.cr.avg, bC, starsHTML(x.cr.avg, x.cr.count)))}
    ${R(tr('الوجهة', 'Destination'), (x) => `<td>${esc(L((destById(x.o.destId) || { name: '' }).name))}</td>`)}
    ${R(tr('التاريخ', 'Dates'), (x) => `<td>${fmtDS(x.o.start)} – ${fmtDS(x.o.end)}</td>`)}
    ${R(tr('الإقامة', 'Stay'), (x) => `<td class="small">${esc(x.o.stay || '')}</td>`)}
    ${R(tr('المواصلات', 'Transport'), (x) => `<td class="small">${esc(x.o.transport || '')}</td>`)}
    ${R(tr('يشمل', 'Included'), (x) => `<td><ul class="ticklist tick-ok small">${(x.o.included || []).map((i) => `<li>${ic('check')}${esc(L(i))}</li>`).join('')}</ul></td>`)}
    ${R(tr('صالح حتى', 'Valid until'), (x) => `<td>${fmtD(x.o.validUntil)}</td>`)}
    ${R('', (x) => `<td><button class="btn btn-teal btn-sm btn-block" data-a="offer-accept" data-id="${x.o.id}">${tr('قبول وحجز', 'Accept & book')}</button></td>`)}
  </tbody></table></div>` });
};

/* ---------- company: incoming requests + offer form ---------- */
function viewCoRequests() {
  const g = coGate(); if (g) return g;
  const cid = me().companyId, all = coRequests();
  const mine = (r) => reqOffers(r.id).find((o) => o.companyId === cid);
  const groups = { open: all.filter((r) => receivingOffers(r) && (!mine(r) || ['withdrawn', 'declined'].includes(mine(r).status))), offered: all.filter((r) => mine(r) && ['sent', 'accepted'].includes(mine(r).status) && ['open', 'accepted'].includes(r.status)), closed: all.filter((r) => mine(r) && (!['open', 'accepted'].includes(r.status) || ['lost'].includes(mine(r).status))) };
  const tab = UI.coReqTab || 'open', labels = { open: tr('مستنية عرضك', 'Awaiting your offer'), offered: tr('عروضي المرسلة', 'My offers'), closed: tr('مقفولة', 'Closed') };
  const list = groups[tab];
  return dashLayout('co', tr('طلبات الرحلات المخصصة', 'Custom trip requests'), `<div class="callout" style="margin-bottom:16px">${ic('info')}<div>${tr('عملاء طلبوا رحلات بمواصفات حددوها. ابعت عرضك حتى لو مختلف أو قريب من رحلاتك المنشورة. العميل بيقارن العروض ويختار، والحجز والدفع بيتم على المنصة بنفس العمولة.', 'Customers describe the trip they want. Send an offer even if it differs from your published trips. They compare and choose; booking and payment happen on the platform at the usual commission.')}</div></div>
  <div class="tabs" role="tablist">${Object.keys(groups).map((k) => `<button role="tab" aria-selected="${k === tab}" class="${k === tab ? 'on' : ''}" data-a="coreq-tab" data-k="${k}">${labels[k]} <span class="faint">(${groups[k].length})</span></button>`).join('')}</div>
  <div class="stack">${list.length ? list.map((r) => { const n = companyNews(r), o = mine(r); return reqCard(r, '#/co/request/' + r.id, `${n.isNew ? `<span class="badge b-warn">${tr('جديد', 'New')}</span>` : ''}${n.msgs ? `<span class="badge b-info">${tr(`${n.msgs} رسالة`, `${n.msgs} msg`)}</span>` : ''}${o ? badge(OSTAT, o.status) : ''}`); }).join('') : `<div class="card">${empty('compass', tab === 'open' ? tr('مفيش طلبات جديدة دلوقتي', 'No new requests right now') : tr('مفيش طلبات هنا', 'Nothing here'), tab === 'open' ? tr('أول ما عميل يطلب رحلة هيوصلك إشعار وتظهر هنا.', 'You’ll be notified as soon as a customer requests a trip.') : '')}</div>`}</div>`);
}
ACTIONS['coreq-tab'] = (el) => { UI.coReqTab = el.dataset.k; render(); };
const progToText = (prog) => (prog || []).map((p) => (L(p.title) + (L(p.text) ? ': ' + L(p.text) : ''))).join('\n');
const textToProg = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean).map((line, i) => { const k = line.indexOf(':'); return { day: i + 1, title: { ar: k > 0 ? line.slice(0, k).trim() : line, en: '' }, text: { ar: k > 0 ? line.slice(k + 1).trim() : '', en: '' } }; });
function viewCoRequest(id) {
  const g = coGate(); if (g) return g;
  const r = byId(db.tripRequests || [], id), cid = me().companyId;
  if (!r) return dashLayout('co', tr('الطلب', 'Request'), `<div class="card">${empty('compass', tr('الطلب مش متاح', 'Request not available'), tr('ممكن يكون اتقفل أو العميل ألغاه.', 'It may have closed or been cancelled.'), `<a class="btn btn-primary" href="#/co/requests">${tr('كل الطلبات', 'All requests')}</a>`)}</div>`);
  const o = reqOffers(r.id).find((x) => x.companyId === cid), editing = UI.offerEdit === r.id;
  const canOffer = receivingOffers(r) && (!o || ['sent', 'withdrawn', 'declined'].includes(o.status));
  const myTrips = db.trips.filter((t) => t.companyId === cid && t.status === 'active');
  const P = UI.offerDraft && UI.offerDraft.rid === r.id ? UI.offerDraft : (UI.offerDraft = { rid: r.id, ...(o && editing ? o : { title: tr('رحلة مخصصة إلى ', 'Custom trip to ') + reqTitle(r), destId: (r.dests || [])[0] || '', catId: (r.types || [])[0] || 'family', start: r.from, end: r.to, price: '', stayLevel: r.stay && r.stay !== 'any' ? r.stay : '4', stay: '', transportType: (r.transport || [])[0] || 'bus', transport: '', program: [], included: [], excluded: [], validUntil: iso(addDays(TODAY, 7)) < r.from ? iso(addDays(TODAY, 7)) : iso(addDays(r.from, -1)), notes: '' }) });
  const showForm = canOffer && (!o || o.status !== 'sent' || editing);
  const destOpts = [...(r.dests || []).map((x) => destById(x)).filter(Boolean), ...db.destinations.filter((x) => !(r.dests || []).includes(x.id))];
  const form = `<form class="card card-pad" data-f="offer" data-r="${r.id}" novalidate>
    <div class="row between wrapx" style="margin-bottom:14px"><h3>${o && o.status === 'sent' ? tr('تعديل عرضك', 'Edit your offer') : tr('ابعت عرضك', 'Send your offer')}</h3>${myTrips.length ? `<label class="row small"><span class="muted">${tr('ابدأ من رحلة منشورة', 'Start from a published trip')}</span><select class="select" style="width:auto;height:36px" data-ch="offer-base"><option value="">${tr('— من الصفر —', '— From scratch —')}</option>${myTrips.map((t) => `<option value="${t.id}" ${P.basedOn === t.id ? 'selected' : ''}>${esc(L(t.title)).slice(0, 50)}</option>`).join('')}</select></label>` : ''}</div>
    <div class="form-grid">${inp('title', tr('عنوان العرض', 'Offer title'), P.title, { full: true })}
      ${sel('destId', tr('الوجهة', 'Destination'), [['', tr('اختر', 'Choose')], ...destOpts.map((x) => [x.id, L(x.name) + ((r.dests || []).includes(x.id) ? ' ✓' : '')])], P.destId)}${sel('catId', tr('نوع الرحلة', 'Trip type'), db.categories.map((c) => [c.id, L(c.name)]), P.catId)}
      ${inp('start', tr('السفر', 'Departs'), P.start, { type: 'date', attrs: `min="${iso(addDays(TODAY, 1))}"`, hint: tr(`العميل طالب ${fmtDS(r.from)}${+r.flex ? ` ±${r.flex}` : ''}`, `Requested ${fmtDS(r.from)}${+r.flex ? ` ±${r.flex}` : ''}`) })}${inp('end', tr('العودة', 'Returns'), P.end, { type: 'date', attrs: `min="${iso(addDays(TODAY, 1))}"` })}
      ${inp('price', tr('السعر للفرد (ج.م)', 'Price per person (EGP)'), P.price, { type: 'number', attrs: `min="1" step="50" data-on="offer-price" data-pax="${reqPax(r)}"`, hint: (r.budgetMax ? tr(`ميزانية العميل ${r.budgetMin ? money(r.budgetMin) + ' – ' : 'حتى '}${money(r.budgetMax)}`, `Customer budget ${r.budgetMin ? money(r.budgetMin) + ' – ' : 'up to '}${money(r.budgetMax)}`) + ' · ' : '') + tr(`الإجمالي لـ ${reqPax(r)} أفراد: `, `Total for ${reqPax(r)}: `) + `<b id="offer-total">${P.price ? money(P.price * reqPax(r)) : '—'}</b>` })}${inp('validUntil', tr('العرض صالح حتى', 'Valid until'), P.validUntil, { type: 'date', attrs: `min="${iso(TODAY)}"` })}
      ${sel('stayLevel', tr('مستوى الإقامة', 'Accommodation level'), Object.entries(STAYS).filter(([k]) => k !== 'any').map(([k, v]) => [k, L(v)]), P.stayLevel)}${inp('stay', tr('تفاصيل الإقامة', 'Accommodation details'), P.stay, { ph: tr('مثال: فندق … على البحر، غرف مزدوجة', 'e.g. … hotel on the beach, double rooms') })}
      ${sel('transportType', tr('المواصلات', 'Transport'), Object.entries(TRANSPORTS).map(([k, v]) => [k, L(v)]), P.transportType)}${inp('transport', tr('تفاصيل المواصلات', 'Transport details'), P.transport, { ph: tr('مثال: أتوبيس من القاهرة ٦ الصبح', 'e.g. coach from Cairo at 6 am') })}
      ${txa('program', tr('البرنامج يوم بيوم (كل يوم في سطر: العنوان: التفاصيل)', 'Day by day (one line per day — title: details)'), progToText(P.program), { full: true, rows: 5 })}
      ${txa('included', tr('يشمل (كل بند في سطر)', 'Included (one per line)'), (P.included || []).map((x) => L(x)).join('\n'), { rows: 4 })}${txa('excluded', tr('لا يشمل (كل بند في سطر)', 'Not included (one per line)'), (P.excluded || []).map((x) => L(x)).join('\n'), { rows: 4 })}
      ${txa('notes', tr('رسالة للعميل (اختياري)', 'Note to the customer (optional)'), P.notes, { full: true, rows: 2 })}
    </div><div class="row" style="justify-content:flex-end;margin-top:16px">${editing ? `<button type="button" class="btn btn-ghost" data-a="offer-edit-cancel">${tr('إلغاء', 'Cancel')}</button>` : ''}<button class="btn btn-primary btn-lg" type="submit">${o && o.status === 'sent' ? tr('حفظ وإرسال التعديل', 'Save & send update') : tr('إرسال العرض للعميل', 'Send offer to customer')}</button></div></form>`;
  const myOffer = o && !showForm ? `<div class="card card-pad"><div class="row between wrapx"><h3>${tr('عرضك', 'Your offer')}</h3>${badge(OSTAT, o.status)}</div><div class="row wrapx" style="gap:18px;margin-top:10px"><div><small class="muted">${tr('السعر للفرد', 'Per person')}</small><div class="price num">${money(o.price)}</div></div><div><small class="muted">${tr('الإجمالي', 'Total')}</small><div class="price num">${money(o.total)}</div></div><div><small class="muted">${tr('التاريخ', 'Dates')}</small><div><b>${fmtDS(o.start)} – ${fmtDS(o.end)}</b></div></div><div><small class="muted">${tr('صالح حتى', 'Valid until')}</small><div><b>${fmtD(o.validUntil)}</b></div></div></div><p class="small" style="margin-top:8px"><b>${esc(o.title)}</b></p>
    ${o.status === 'sent' && receivingOffers(r) ? `<div class="row" style="margin-top:12px"><button class="btn btn-soft btn-sm" data-a="offer-edit" data-r="${r.id}">${ic('edit')}${tr('تعديل العرض', 'Edit offer')}</button><button class="btn btn-danger-soft btn-sm" data-a="offer-withdraw" data-id="${o.id}">${tr('سحب العرض', 'Withdraw')}</button></div>` : ''}
    ${o.status === 'accepted' && r.status === 'booked' ? `<div class="callout ok" style="margin-top:12px">${ic('check')}<div>${tr('العميل حجز ودفع. هتلاقي الحجز وبيانات العميل في صفحة الحجوزات.', 'The customer booked and paid. Find the booking and their details under Bookings.')}</div></div>` : ''}</div>` : '';
  setTimeout(() => seenMark('r:' + r.id), 1500);
  return dashLayout('co', tr('طلب رحلة مخصصة', 'Custom trip request'), `<div class="row wrapx" style="gap:8px;margin-bottom:12px">${badge(RSTAT, r.status)}${receivingOffers(r) ? `<span class="small muted">${ic('clock')} ${tr('آخر موعد للعروض', 'Offers close')} ${fmtDT(r.expiresAt)} (${leftText(r.expiresAt)})</span>` : ''}</div>
    <h2 style="font-size:22px;margin-bottom:12px">${tr('رحلة إلى ', 'Trip to ')}${esc(reqTitle(r))}</h2>${reqSummary(r, true)}
    <div class="grid" style="grid-template-columns:1.5fr 1fr;gap:20px;margin-top:20px;align-items:start" id="coreq-grid"><div>${showForm ? form : myOffer || `<div class="card">${empty('clock', tr('الطلب مبقاش بيستقبل عروض', 'This request no longer takes offers'), '')}</div>`}</div>
    <div class="card card-pad"><h3 style="margin-bottom:10px">${tr('محادثة مع العميل', 'Chat with the customer')}</h3>${thread(r, cid, 'company')}</div></div>
    <style>@media(max-width:1000px){#coreq-grid{grid-template-columns:1fr!important}}</style>`, `<a class="btn btn-ghost btn-sm" href="#/co/requests">${tr('كل الطلبات', 'All requests')}</a>`);
}
CHANGES['offer-price'] = (el) => { const t = $('#offer-total'); if (t) t.textContent = el.value ? money(+el.value * +el.dataset.pax) : '—'; };
function offerCapture(f) { const d = formData(f); Object.assign(UI.offerDraft, { title: d.title, destId: d.destId, catId: d.catId, start: d.start, end: d.end, price: d.price, validUntil: d.validUntil, stayLevel: d.stayLevel, stay: d.stay, transportType: d.transportType, transport: d.transport, program: textToProg(d.program), included: (d.included || '').split('\n').map((x) => x.trim()).filter(Boolean).map((x) => ({ ar: x, en: '' })), excluded: (d.excluded || '').split('\n').map((x) => x.trim()).filter(Boolean).map((x) => ({ ar: x, en: '' })), notes: d.notes }); }
CHANGES['offer-base'] = (el) => {
  const f = el.closest('form'); offerCapture(f); const t = tripById(el.value), P = UI.offerDraft; P.basedOn = el.value;
  if (t) { const dep = upcomingDeps(t.id).find((x) => x.start >= P.start) || upcomingDeps(t.id)[0]; Object.assign(P, { title: L(t.title), destId: t.destId, catId: t.catId, stay: L(t.accommodation), transport: L(t.transport), program: t.itinerary, included: t.included, excluded: t.excluded, price: P.price || (dep ? dep.price : t.basePrice), end: iso(addDays(P.start, t.days - 1)) }); toast(tr('اتملى العرض من رحلتك. عدّل اللي محتاجه.', 'Filled from your trip — adjust as needed.'), 'info'); }
  render();
};
ACTIONS['offer-edit'] = (el) => { UI.offerEdit = el.dataset.r; UI.offerDraft = null; render(); };
ACTIONS['offer-edit-cancel'] = () => { UI.offerEdit = null; UI.offerDraft = null; render(); };
ACTIONS['offer-withdraw'] = async (el) => { if (!(await confirmDialog({ title: tr('سحب العرض؟', 'Withdraw offer?'), text: tr('العميل هيوصله إن عرضك اتسحب. تقدر تبعت عرض جديد طول ما الطلب مفتوح.', 'The customer will be told. You can send a new one while the request is open.'), ok: tr('سحب', 'Withdraw'), danger: true }))) return; await withdrawOffer(el.dataset.id); UI.offerDraft = null; toast(tr('تم سحب العرض.', 'Offer withdrawn.')); render(); };
FORMS.offer = async (f) => {
  offerCapture(f);
  const r = byId(db.tripRequests, f.dataset.r);
  const d = validate(f, { title: ['req'], destId: ['req'], start: ['req', 'future'], end: ['req', (v, a) => v >= a.start || tr('العودة بعد السفر.', 'Return after departure.')], price: ['req', 'pos'], validUntil: ['req', (v) => v >= iso(TODAY) || tr('اختار النهارده أو بعده.', 'Today or later.'), (v, a) => v < a.start || tr('لازم قبل تاريخ السفر.', 'Must be before departure.')], stay: ['req'], program: ['req'], included: ['req'] }); if (!d) return;
  const P = UI.offerDraft, btn = $('button[type=submit]', f); busy(btn, true);
  try {
    const payload = { title: P.title, destId: P.destId, catId: P.catId, start: P.start, end: P.end, price: +P.price, validUntil: P.validUntil, stayLevel: P.stayLevel, stay: P.stay, transportType: P.transportType, transport: P.transport || L(TRANSPORTS[P.transportType]), program: P.program, included: P.included, excluded: P.excluded, notes: P.notes, basedOn: P.basedOn || null };
    const wasEdit = UI.offerEdit === r.id; await sendOffer(r.id, payload);
    UI.offerEdit = null; UI.offerDraft = null; toast(wasEdit ? tr('اتبعت التعديل للعميل.', 'Update sent to the customer.') : tr('اتبعت عرضك للعميل.', 'Offer sent to the customer.')); render();
  } catch (e) { busy(btn, false); toast(e.message, 'bad'); }
};

/* ---------- admin: overview of all requests ---------- */
function viewAdRequests() {
  const rows = coRequests().map((r) => ({ ...r, _t: reqTitle(r), _c: (userById(r.customerId) || {}).name, _o: reqOffers(r.id).filter((o) => o.status !== 'withdrawn').length, _pax: reqPax(r) }));
  return dashLayout('admin', tr('الرحلات المخصصة', 'Custom trips'), `<div class="kpis" style="margin-bottom:20px">${kpi(tr('طلبات مفتوحة', 'Open requests'), rows.filter((r) => r.status === 'open').length, '', 'compass', true)}${kpi(tr('عروض مرسلة', 'Offers sent'), (db.requestOffers || []).length, '', 'mail')}${kpi(tr('اتحجزت', 'Booked'), rows.filter((r) => r.status === 'booked').length, '', 'check')}${kpi(tr('متوسط العروض لكل طلب', 'Offers per request'), rows.length ? r1(sum(rows, (r) => r._o) / rows.length) : '0', '', 'chart')}</div>` +
    dataTable({ id: 'adreq', rows, defaultSort: 'createdAt', searchText: (r) => r._t + ' ' + r._c, emptyIcon: 'compass', emptyTitle: tr('مفيش طلبات لسه', 'No requests yet'), emptyText: '',
      filters: [{ key: 'st', label: tr('كل الحالات', 'All statuses'), options: Object.entries(RSTAT).map(([k, v]) => [k, L(v.l)]), test: (r, v) => r.status === v }],
      cols: [{ key: '_t', label: tr('الوجهة', 'Destination'), render: (r) => `<b style="color:var(--navy)">${esc(r._t)}</b>` }, { key: '_c', label: tr('العميل', 'Customer') }, { key: 'from', label: tr('التاريخ', 'Dates'), render: (r) => `<span class="small">${fmtDS(r.from)} – ${fmtDS(r.to)}</span>` }, { key: '_pax', label: tr('أفراد', 'Pax'), render: (r) => `<span class="num">${r._pax}</span>` }, { key: 'budgetMax', label: tr('الميزانية', 'Budget'), render: (r) => (r.budgetMax ? `<span class="num">${money(r.budgetMax)}</span>` : '—') }, { key: '_o', label: tr('العروض', 'Offers'), render: (r) => `<span class="num">${r._o}</span>` }, { key: 'status', label: tr('الحالة', 'Status'), render: (r) => badge(RSTAT, r.status) }, { key: 'createdAt', label: tr('التاريخ', 'Created'), render: (r) => `<span class="small">${fmtD(r.createdAt)}</span>` }] }));
}

/* ---------- entry points ---------- */
const planCta = (cls) => `<a class="btn ${cls || 'btn-sand'}" href="#/plan">${ic('compass')}${tr('خطط رحلتك بنفسك', 'Plan your own trip')}</a>`;
function homePlanBand() {
  return `<section class="sec" style="padding-top:8px"><div class="wrap"><div class="plan-band"><div class="grow"><h2>${tr('مش لاقي الرحلة اللي في دماغك؟', 'Can’t find the trip you have in mind?')}</h2><p>${tr('اكتب الوجهة والتاريخ والميزانية والبرنامج اللي نفسك فيه، وشركات السياحة على UTravel تبعتلك عروضها وانت تختار.', 'Describe the destination, dates, budget and programme you want — UTravel’s tour operators send you offers and you choose.')}</p>
    <ol class="plan-steps"><li><b>${tr('اكتب طلبك', 'Describe it')}</b><span>${tr('في ٣ خطوات', 'in 3 steps')}</span></li><li><b>${tr('استقبل العروض', 'Get offers')}</b><span>${tr('من الشركات المعتمدة', 'from approved operators')}</span></li><li><b>${tr('قارن واحجز', 'Compare & book')}</b><span>${tr('وادفع على المنصة', 'and pay on UTravel')}</span></li></ol></div>${planCta('btn-sand btn-lg')}</div></div></section>`;
}
function meRequestsCard() {
  const reqs = openOfMine(), news = customerNewsTotal(), withOffers = myRequests().find((r) => customerNews(r).total);
  if (news && withOffers) { const n = customerNews(withOffers); return `<a class="card card-pad plan-alert" href="#/me/request/${withOffers.id}"><span class="ib-ic">${ic('mail')}</span><div class="grow"><b>${n.offers ? tr(`وصلك ${n.offers} عرض جديد على طلب رحلتك لـ${esc(reqTitle(withOffers))}`, `${n.offers} new offer(s) on your ${esc(reqTitle(withOffers))} trip`) : tr(`عندك ${n.msgs} رسالة جديدة على طلب رحلتك`, `${n.msgs} new message(s) on your request`)}</b><div class="small muted">${tr('قارن العروض واختار الأنسب.', 'Compare offers and pick the best.')}</div></div><span class="btn btn-teal btn-sm">${tr('شوف العروض', 'See offers')}</span></a>`; }
  if (reqs.length) return `<a class="card card-pad plan-alert" href="#/me/requests"><span class="ib-ic">${ic('compass')}</span><div class="grow"><b>${tr(`عندك ${reqs.length} طلب رحلة مخصصة مفتوح`, `${reqs.length} open custom trip request(s)`)}</b><div class="small muted">${tr('هنبلغك أول ما توصل عروض.', 'We’ll tell you when offers arrive.')}</div></div><span class="btn btn-ghost btn-sm">${tr('طلباتي', 'My requests')}</span></a>`;
  return `<div class="card card-pad plan-alert"><span class="ib-ic">${ic('compass')}</span><div class="grow"><b>${tr('مش لاقي الرحلة اللي في دماغك؟', 'Can’t find the trip you have in mind?')}</b><div class="small muted">${tr('اطلبها بمواصفاتك والشركات تبعتلك عروض.', 'Request it your way and companies send you offers.')}</div></div>${planCta('btn-sand btn-sm')}</div>`;
}
function coRequestsBanner() {
  if ((myCompany() || {}).status !== 'approved') return '';
  const fresh = coRequests().filter((r) => companyNews(r).isNew), msgs = coRequests().reduce((a, r) => a + companyNews(r).msgs, 0), open = coRequests().filter((r) => receivingOffers(r) && !reqOffers(r.id).some((o) => o.companyId === me().companyId)).length;
  if (!fresh.length && !msgs && !open) return '';
  return `<a class="card card-pad plan-alert co" href="#/co/requests"><span class="ib-ic">${ic('compass')}</span><div class="grow"><b>${fresh.length ? tr(`${fresh.length} طلب رحلة مخصصة جديد`, `${fresh.length} new custom trip request(s)`) : msgs ? tr(`${msgs} رسالة جديدة من عملاء`, `${msgs} new customer message(s)`) : tr(`${open} طلب مستني عرضك`, `${open} request(s) awaiting your offer`)}</b><div class="small muted">${tr('عملاء حددوا مواصفات رحلتهم. ابعت عرضك قبل ما الطلب يتقفل.', 'Customers described their trip. Send your offer before it closes.')}</div></div><span class="btn btn-teal btn-sm">${tr('شوف الطلبات', 'See requests')}</span></a>`;
}
