
/* ---------- 9. Company dashboard (every read goes through the company scope) ---------- */
const coTrips = () => db.trips.filter((t) => t.companyId === me().companyId && t.status !== 'private');
const coBookings = () => db.bookings.filter((b) => b.companyId === me().companyId);
function coGate(content, title) {
  const c = myCompany();
  if (c.status === 'approved') return null;
  const msg = { pending: [tr('طلبك قيد المراجعة', 'Your application is under review'), tr('فريق رحلاتي بيراجع مستنداتك. هنبلغك هنا وعلى البريد أول ما الطلب يتعتمد، وبعدها تقدر تضيف رحلاتك.', 'The Rehlati team is reviewing your documents. We’ll notify you here and by email once approved; then you can add trips.'), 'clock'], rejected: [tr('تم رفض الطلب', 'Application declined'), (c.rejectReason ? c.rejectReason + ' — ' : '') + tr('تواصل معنا لو عايز تعيد التقديم.', 'Contact us to reapply.'), 'alert'], suspended: [tr('الحساب موقوف مؤقتًا', 'Account temporarily suspended'), tr('رحلاتك مش ظاهرة للعملاء حاليًا. تواصل مع إدارة المنصة.', 'Your trips are hidden from customers. Contact platform support.'), 'ban'] }[c.status];
  return dashLayout('co', title || tr('لوحة الشركة', 'Company dashboard'), `<div class="card">${empty(msg[2], msg[0], msg[1], `<a class="btn btn-ghost" href="#/co/profile">${tr('راجع ملف الشركة', 'Review company profile')}</a>`)}<div class="card-pad" style="border-top:1px solid var(--line-2)"><h3 style="font-size:15px;margin-bottom:8px">${tr('المستندات المرسلة', 'Submitted documents')}</h3>${(c.docs || []).map((d) => `<div class="row small" style="padding:4px 0">${ic('doc')}${esc(d.name)}</div>`).join('')}</div></div>`);
}
function viewCo() {
  const g = coGate(); if (g) return g;
  const c = myCompany(), trips = coTrips(), bs = coBookings(), fin = companyFinance(c.id);
  const paid = bs.filter((b) => ['paid', 'partially_refunded'].includes(b.paymentStatus));
  const upDeps = db.departures.filter((d) => trips.some((t) => t.id === d.tripId) && isBookable(d)).sort((a, b) => a.start.localeCompare(b.start));
  const seatsLeft = sum(upDeps, (d) => seatInfo(d).remaining);
  const m = monthly(paid, 6, retained), mNet = monthly(paid, 6, (b) => retained(b) - b.commission), mCount = monthly(bs.filter((b) => b.status !== 'cancelled'), 6, (b) => b.count);
  const rec = bs.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  const myCamps = campaigns().filter((x) => x.companyId === c.id && ['live', 'upcoming'].includes(campaignState(x)));
  return dashLayout('co', tr('نظرة عامة', 'Overview'), `
    ${coRequestsBanner() ? `<div style="margin-bottom:16px">${coRequestsBanner()}</div>` : ''}
    ${c.platformRating || myCamps.length ? `<div class="card card-pad row wrapx" style="margin-bottom:16px;gap:18px">${c.platformRating ? `<div><small class="muted">${tr('تقييم رحلاتي لشركتك', 'Your Rehlati rating')}</small><div>${pStars(c.platformRating)} <b class="num">${c.platformRating}/5</b></div></div>` : ''}${myCamps.map((x) => `<div class="row" style="gap:8px">${seasonChip(x)}<span class="small"><b style="color:var(--navy)">${esc(L(x.title))}</b> · ${tr(`خصم ${x.percent}٪ على ${x.tripIds.length} رحلة`, `${x.percent}% off ${x.tripIds.length} trips`)} · ${badge(CSTATE, campaignState(x))}</span></div>`).join('')}</div>` : ''}
    <div class="kpis">${kpi(tr('إيراد الحجوزات', 'Booking revenue'), money(fin.gross), tr(`صافي لك ${money(fin.net)} بعد عمولة ${effectiveRate(c)}٪`, `Net ${money(fin.net)} after ${effectiveRate(c)}% commission`), 'money', true)}${kpi(tr('إجمالي الحجوزات', 'Total bookings'), bs.filter((b) => b.status !== 'cancelled').length, tr(`${bs.filter((b) => b.status === 'completed').length} مكتمل · ${bs.filter((b) => b.status === 'confirmed').length} مؤكد`, `${bs.filter((b) => b.status === 'completed').length} completed · ${bs.filter((b) => b.status === 'confirmed').length} confirmed`), 'ticket')}${kpi(tr('بانتظار إجراء', 'Pending'), bs.filter((b) => ['pending_payment', 'refund_pending'].includes(b.status)).length, tr('دفع معلق أو طلب استرداد', 'Unpaid or refund requested'), 'clock')}${kpi(tr('الرحلات', 'Trips'), `${trips.filter((t) => t.status === 'active').length} / ${trips.length}`, tr(`نشطة من الإجمالي · ${fmtN(seatsLeft)} مقعد متاح`, `active of total · ${fmtN(seatsLeft)} seats available`), 'map')}</div>
    <div class="grid" style="grid-template-columns:1.6fr 1fr;margin-top:20px;align-items:start" id="co-grid">
      <div class="card"><div class="card-h"><h3>${tr('الإيراد آخر ٦ شهور', 'Revenue, last 6 months')}</h3><span class="small muted">${tr('ج.م', 'EGP')}</span></div><div class="card-pad">${barChart({ labels: m.map((x) => x.label), series: [{ name: tr('إجمالي الحجوزات', 'Gross'), color: '#16324F', values: m.map((x) => x.v) }, { name: tr('صافي بعد العمولة', 'Net after commission'), color: '#20A6A6', values: mNet.map((x) => x.v) }] })}</div></div>
      <div class="card"><div class="card-h"><h3>${tr('المسافرون شهريًا', 'Travellers per month')}</h3></div><div class="card-pad">${lineChart({ labels: mCount.map((x) => x.label), values: mCount.map((x) => x.v), color: '#E9B872' })}</div></div>
    </div>
    <div class="grid" style="grid-template-columns:1.6fr 1fr;margin-top:20px;align-items:start" id="co-grid2">
      <div class="card"><div class="card-h"><h3>${tr('أحدث الحجوزات', 'Recent bookings')}</h3><a class="btn-link small" href="#/co/bookings">${tr('كل الحجوزات', 'All bookings')}</a></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>${tr('الحجز', 'Ref')}</th><th>${tr('العميل', 'Customer')}</th><th>${tr('الرحلة', 'Trip')}</th><th>${tr('الإجمالي', 'Total')}</th><th>${tr('الحالة', 'Status')}</th></tr></thead><tbody>${rec.map((b) => `<tr><td><button class="btn-link ref" data-a="co-bk" data-id="${b.id}">${b.ref}</button></td><td>${esc(userById(b.customerId).name)}</td><td class="small">${esc(L(tripById(b.tripId).title)).slice(0, 34)}…</td><td class="num">${money(b.total)}</td><td>${badge(BSTAT, b.status)}</td></tr>`).join('')}</tbody></table></div></div>
      <div class="card"><div class="card-h"><h3>${tr('المواعيد القادمة', 'Upcoming departures')}</h3></div><div class="card-pad stack">${upDeps.slice(0, 6).map((d) => { const si = seatInfo(d), t = tripById(d.tripId), pct = Math.round((si.booked / si.seats) * 100); return `<a href="#/co/trip/${t.id}/departures" style="display:block"><div class="row between small"><b style="color:var(--navy);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:70%">${esc(L(t.title)).slice(0, 36)}</b><span class="muted">${fmtDS(d.start)}</span></div><div class="progress ${pct >= 90 ? 'hot' : ''}" style="margin-top:6px"><b style="width:${pct}%"></b></div><div class="xs muted" style="margin-top:3px">${tr(`${si.booked} من ${si.seats} مقعد · متبقي ${si.remaining}`, `${si.booked}/${si.seats} sold · ${si.remaining} left`)}</div></a>`; }).join('') || `<p class="muted">${tr('لا توجد مواعيد قادمة. أضف موعدًا لرحلاتك.', 'No upcoming dates. Add one to your trips.')}</p>`}</div></div>
    </div><style>@media(max-width:1100px){#co-grid,#co-grid2{grid-template-columns:1fr!important}}</style>`, `<a class="btn btn-primary btn-sm" href="#/co/trip/new">${ic('plus')}${tr('رحلة جديدة', 'New trip')}</a>`);
}
function viewCoTrips() {
  const g = coGate(); if (g) return g;
  const rows = coTrips().map((t) => { const deps = db.departures.filter((d) => d.tripId === t.id); const up = deps.filter(isBookable); return { ...t, _t: t, up: up.length, next: up.sort((a, b) => a.start.localeCompare(b.start))[0], sold: sum(up, (d) => seatInfo(d).booked), cap: sum(up, (d) => d.seats) }; });
  return dashLayout('co', tr('الرحلات والمواعيد', 'Trips & departures'), `<div class="callout" style="margin-bottom:16px">${ic('info')}<div>${tr('الرحلة هي البرنامج والوصف والصور. المواعيد منفصلة: كل موعد له سعره وعدد مقاعده. الرحلة الجديدة بتتنشر بعد اعتماد إدارة رحلاتي.', 'A trip is the programme, description and photos. Departures are separate, each with its own price and seats. New trips go live after Rehlati approves them.')}</div></div>` + dataTable({ id: 'cotrips', rows, defaultSort: 'createdAt', searchText: (r) => L(r.title) + ' ' + L(destById(r.destId).name), emptyIcon: 'map', emptyTitle: tr('لسه ما ضفتش رحلات', 'No trips yet'), emptyText: tr('ابدأ بإضافة أول رحلة وبعدين ضيف مواعيدها.', 'Add your first trip, then its departure dates.'),
    filters: [{ key: 'status', label: tr('كل الحالات', 'All statuses'), options: Object.entries(TSTAT).map(([k, v]) => [k, L(v.l)]), test: (r, v) => r.status === v }],
    cols: [{ key: 'title', label: tr('الرحلة', 'Trip'), sortVal: (r) => L(r.title), render: (r) => `<div class="row"><img src="${imgSrc(r.images[0])}" alt="" style="width:64px;height:44px;object-fit:cover;border-radius:8px;flex:none"><div style="min-width:0"><b style="color:var(--navy)">${esc(L(r.title)).slice(0, 44)}</b><div class="xs muted">${esc(L(destById(r.destId).name))} · ${nightsLabel(r.days)}</div></div></div>` },
      { key: 'status', label: tr('الحالة', 'Status'), render: (r) => badge(TSTAT, r.status) },
      { key: 'up', label: tr('مواعيد قادمة', 'Upcoming dates'), render: (r) => `<span class="num">${r.up}</span>${r.next ? `<div class="xs muted">${tr('أقربها', 'next')} ${fmtDS(r.next.start)}</div>` : ''}` },
      { key: 'sold', label: tr('المقاعد المباعة', 'Seats sold'), sortVal: (r) => r.cap ? r.sold / r.cap : 0, render: (r) => r.cap ? `<span class="num">${r.sold} / ${r.cap}</span><div class="progress" style="width:90px;margin-top:4px"><b style="width:${(r.sold / r.cap) * 100}%"></b></div>` : '—' },
      { key: '', label: '', sort: false, render: (r) => `<div class="row" style="gap:6px;justify-content:flex-end"><a class="btn btn-soft btn-sm" href="#/co/trip/${r.id}/departures">${ic('cal')}${tr('المواعيد', 'Dates')}</a><a class="icon-btn" href="#/co/trip/${r.id}/edit" aria-label="${tr('تعديل', 'Edit')}" title="${tr('تعديل', 'Edit')}">${ic('edit')}</a><a class="icon-btn" href="#/trip/${r.id}" aria-label="${tr('معاينة', 'Preview')}" title="${tr('معاينة', 'Preview')}">${ic('eye')}</a>${['active', 'inactive'].includes(r.status) ? `<button class="icon-btn" data-a="co-trip-toggle" data-id="${r.id}" title="${r.status === 'active' ? tr('إيقاف', 'Pause') : tr('تفعيل', 'Resume')}" aria-label="${r.status === 'active' ? tr('إيقاف', 'Pause') : tr('تفعيل', 'Resume')}">${ic(r.status === 'active' ? 'eyeoff' : 'play')}</button>` : ''}<button class="icon-btn" data-a="co-trip-del" data-id="${r.id}" aria-label="${tr('حذف', 'Delete')}" title="${tr('حذف', 'Delete')}" style="color:var(--bad)">${ic('trash')}</button></div>` }] }),
    `<a class="btn btn-primary btn-sm" href="#/co/trip/new">${ic('plus')}${tr('رحلة جديدة', 'New trip')}</a>`);
}
ACTIONS['co-trip-toggle'] = (el) => { tx((d) => { const t = byId(d.trips, el.dataset.id); assertCompanyOwns(d, t); t.status = t.status === 'active' ? 'inactive' : 'active'; }); toast(tripById(el.dataset.id).status === 'active' ? tr('الرحلة ظاهرة للعملاء الآن.', 'Trip is live again.') : tr('تم إيقاف الرحلة. مش هتظهر للعملاء.', 'Trip paused and hidden from customers.')); render(); };
ACTIONS['co-trip-del'] = async (el) => {
  const t = tripById(el.dataset.id); const hasB = db.bookings.some((b) => b.tripId === t.id && b.status !== 'cancelled');
  if (hasB) { if (await confirmDialog({ title: tr('الرحلة عليها حجوزات', 'This trip has bookings'), text: tr('مينفعش تتحذف لأن عليها حجوزات. تقدر توقفها بدل الحذف فتختفي من الموقع وتفضل حجوزاتها كما هي.', 'It can’t be deleted because it has bookings. You can pause it instead — it disappears from the site and its bookings stay intact.'), ok: tr('إيقاف الرحلة', 'Pause trip') })) { tx((d) => { const x = byId(d.trips, t.id); assertCompanyOwns(d, x); x.status = 'inactive'; }); toast(tr('تم إيقاف الرحلة.', 'Trip paused.')); render(); } return; }
  if (!(await confirmDialog({ title: tr('حذف الرحلة نهائيًا؟', 'Delete trip permanently?'), text: tr(`"${esc(L(t.title))}" ومواعيدها هتتحذف ومش هتقدر ترجعها.`, `“${esc(L(t.title))}” and its dates will be deleted. This can’t be undone.`), ok: tr('حذف نهائي', 'Delete'), danger: true }))) return;
  tx((d) => { const x = byId(d.trips, t.id); assertCompanyOwns(d, x); d.trips = d.trips.filter((y) => y.id !== t.id); d.departures = d.departures.filter((y) => y.tripId !== t.id); });
  toast(tr('تم حذف الرحلة.', 'Trip deleted.')); render();
};

/* trip form */
function viewCoTripForm(id) {
  const g = coGate(); if (g) return g;
  const t = id ? tripById(id) : null;
  if (id && (!t || t.companyId !== me().companyId)) return dashLayout('co', tr('غير مسموح', 'Not allowed'), `<div class="card">${empty('lock', tr('الرحلة دي مش تبع شركتك', 'This trip doesn’t belong to your company'), '')}</div>`);
  UI.tf = UI.tf && UI.tf.id === (id || 'new') ? UI.tf : { id: id || 'new', images: t ? t.images.slice() : [], itinerary: t ? t.itinerary.map((x) => ({ ...x })) : [{ day: 1, title: { ar: '', en: '' }, text: { ar: '', en: '' } }] };
  const f = UI.tf, lines = (arr) => (arr || []).map((x) => L(x)).join('\n');
  return dashLayout('co', t ? tr('تعديل الرحلة', 'Edit trip') : tr('رحلة جديدة', 'New trip'), `<form data-f="co-trip" novalidate class="stack" data-id="${id || ''}">
    <div class="card card-pad"><h3 style="margin-bottom:14px">${tr('المعلومات الأساسية', 'Basics')}</h3><div class="form-grid">
      ${inp('title_ar', tr('عنوان الرحلة (عربي)', 'Title (Arabic)'), t ? t.title.ar : '', { full: true, ph: tr('مثال: الغردقة ٤ أيام في منتجع شامل', 'e.g. Hurghada 4 days all‑inclusive') })}${inp('title_en', tr('عنوان الرحلة (إنجليزي – اختياري)', 'Title (English – optional)'), t ? t.title.en : '', { full: true, attrs: 'dir="ltr"' })}
      ${sel('destId', tr('الوجهة', 'Destination'), [['', tr('اختر', 'Choose')], ...db.destinations.map((d) => [d.id, L(d.name)])], t ? t.destId : '')}${sel('catId', tr('نوع الرحلة', 'Trip type'), [['', tr('اختر', 'Choose')], ...db.categories.map((c) => [c.id, L(c.name)])], t ? t.catId : '')}
      ${inp('days', tr('عدد الأيام', 'Number of days'), t ? t.days : '', { type: 'number', attrs: 'min="1" max="21"' })}${inp('basePrice', tr('السعر الاسترشادي للفرد (ج.م)', 'Reference price per person (EGP)'), t ? t.basePrice : '', { type: 'number', attrs: 'min="0" step="50"', hint: tr('السعر الفعلي بيتحدد في كل موعد', 'The real price is set per departure') })}
      ${txa('summary', tr('ملخص قصير (يظهر في كارت الرحلة)', 'Short summary (shown on the trip card)'), t ? L(t.summary) : '', { full: true, rows: 2 })}${txa('desc', tr('الوصف التفصيلي', 'Full description'), t ? L(t.desc) : '', { full: true, rows: 5 })}
    </div></div>
    <div class="card card-pad"><div class="row between"><h3>${tr('صور الرحلة', 'Trip photos')}</h3><span class="hint">${tr('الصورة الأولى هي الغلاف', 'The first photo is the cover')}</span></div>
      <label class="upload" style="margin-top:12px">${ic('upload', 'lg')}<div style="margin-top:6px">${tr('اسحب الصور هنا أو اضغط للاختيار (JPG/PNG، أكثر من صورة)', 'Drop photos here or click to choose (JPG/PNG, multiple)')}</div><input type="file" accept="image/*" multiple class="sr" data-ch="tf-img"></label>
      <div class="thumbs" id="tf-thumbs">${f.images.map((im, i) => `<div class="th"><img src="${imgSrc(im)}" alt=""><button type="button" data-a="tf-img-del" data-i="${i}" aria-label="${tr('حذف الصورة', 'Remove photo')}">×</button></div>`).join('')}</div>
      <span class="hint" style="display:block;margin-top:6px">${tr('لو ما رفعتش صور هنستخدم الرسم الخاص بالوجهة.', 'If you don’t upload photos, the destination artwork is used.')}</span></div>
    <div class="card card-pad"><div class="row between"><h3>${tr('البرنامج اليومي', 'Daily itinerary')}</h3><button type="button" class="btn btn-soft btn-sm" data-a="tf-day-add">${ic('plus')}${tr('إضافة يوم', 'Add day')}</button></div><div style="margin-top:12px" id="tf-days">${f.itinerary.map((x, i) => `<div class="rep-row"><b style="color:var(--teal-700);padding-top:10px">${tr('اليوم', 'Day')} ${i + 1}</b><input class="input" name="it_title_${i}" value="${esc(L(x.title))}" placeholder="${tr('عنوان اليوم', 'Day title')}" aria-label="${tr('عنوان اليوم', 'Day title')}"><textarea class="textarea" name="it_text_${i}" rows="2" style="min-height:44px" placeholder="${tr('تفاصيل اليوم', 'What happens')}" aria-label="${tr('تفاصيل اليوم', 'Details')}">${esc(L(x.text))}</textarea><button type="button" class="icon-btn" data-a="tf-day-del" data-i="${i}" aria-label="${tr('حذف اليوم', 'Remove day')}" ${f.itinerary.length < 2 ? 'disabled' : ''}>${ic('trash')}</button></div>`).join('')}</div></div>
    <div class="card card-pad"><h3 style="margin-bottom:14px">${tr('الإقامة والخدمات والسياسة', 'Stay, services & policy')}</h3><div class="form-grid">
      ${inp('accommodation', tr('تفاصيل الإقامة', 'Accommodation'), t ? L(t.accommodation) : '', { full: true })}${inp('transport', tr('تفاصيل الانتقالات', 'Transport'), t ? L(t.transport) : '', { full: true })}
      ${txa('included', tr('يشمل (كل بند في سطر)', 'Included (one per line)'), t ? lines(t.included) : '', { rows: 5 })}${txa('excluded', tr('لا يشمل (كل بند في سطر)', 'Not included (one per line)'), t ? lines(t.excluded) : '', { rows: 5 })}
      ${txa('policy', tr('سياسة الحجز والإلغاء', 'Booking & cancellation policy'), t ? L(t.policy) : tr('إلغاء مجاني حتى ١٤ يومًا قبل السفر واسترداد كامل المبلغ. من ١٤ إلى ٧ أيام يُسترد ٥٠٪. أقل من ٧ أيام لا يوجد استرداد.', 'Free cancellation up to 14 days before with a full refund. 50% between 14 and 7 days. No refund within 7 days.'), { full: true, rows: 3 })}
    </div></div>
    <div class="row" style="justify-content:flex-end;position:sticky;bottom:0;background:var(--bg);padding:12px 0"><a class="btn btn-ghost" href="#/co/trips">${tr('إلغاء', 'Cancel')}</a><button class="btn btn-primary btn-lg" type="submit">${t ? tr('حفظ التعديلات', 'Save changes') : tr('حفظ وإرسال للاعتماد', 'Save & submit for approval')}</button></div>
  </form>`);
}
function captureDays(form) { UI.tf.itinerary = UI.tf.itinerary.map((x, i) => ({ day: i + 1, title: { ar: form.elements['it_title_' + i].value, en: LANG === 'en' ? form.elements['it_title_' + i].value : (x.title.en || '') }, text: { ar: form.elements['it_text_' + i].value, en: LANG === 'en' ? form.elements['it_text_' + i].value : (x.text.en || '') } })); }
const keepForm = (fn) => { const f = $('form[data-f="co-trip"]'); const vals = formData(f); captureDays(f); fn(); render(); const nf = $('form[data-f="co-trip"]'); Object.entries(vals).forEach(([k, v]) => { if (nf.elements[k] && !/^it_/.test(k) && typeof v === 'string') nf.elements[k].value = v; }); };
ACTIONS['tf-day-add'] = () => keepForm(() => UI.tf.itinerary.push({ day: UI.tf.itinerary.length + 1, title: { ar: '', en: '' }, text: { ar: '', en: '' } }));
ACTIONS['tf-day-del'] = (el) => keepForm(() => UI.tf.itinerary.splice(+el.dataset.i, 1));
ACTIONS['tf-img-del'] = (el) => keepForm(() => UI.tf.images.splice(+el.dataset.i, 1));
CHANGES['tf-img'] = async (el) => { const files = Array.from(el.files).slice(0, 6); try { const imgs = []; for (const fl of files) imgs.push(await readImage(fl, 1280)); keepForm(() => UI.tf.images.push(...imgs)); toast(tr(`تمت إضافة ${imgs.length} صورة.`, `${imgs.length} photo(s) added.`)); } catch (e) { handleErr(e); } };
FORMS['co-trip'] = (f) => {
  captureDays(f);
  const d = validate(f, { title_ar: ['req', (v) => v.length >= 10 || tr('العنوان قصير جدًا.', 'Title is too short.')], destId: ['req'], catId: ['req'], days: ['req', 'int', (v) => (+v >= 1 && +v <= 21) || tr('من ١ إلى ٢١ يوم.', '1 to 21 days.')], basePrice: ['req', 'pos'], summary: ['req'], desc: ['req', (v) => v.length >= 40 || tr('اكتب وصفًا أوضح (٤٠ حرف على الأقل).', 'Write a fuller description (40+ characters).')], accommodation: ['req'], transport: ['req'], included: ['req'], policy: ['req'] }); if (!d) return;
  if (UI.tf.itinerary.some((x) => !x.title.ar.trim())) return toast(tr('اكتب عنوان لكل يوم في البرنامج.', 'Give every itinerary day a title.'), 'bad');
  const P2 = (v, old) => (LANG === 'en' ? { ar: (old && old.ar) || v, en: v } : { ar: v, en: (old && old.en) || '' });
  const split = (s) => s.split('\n').map((x) => x.trim()).filter(Boolean).map((x) => ({ ar: x, en: LANG === 'en' ? x : '' }));
  const id = f.dataset.id; const destArt = destById(d.destId).art;
  const saved = tx((x) => {
    let t = id && byId(x.trips, id);
    if (t) assertCompanyOwns(x, t);
    const data = { title: { ar: d.title_ar, en: d.title_en }, destId: d.destId, catId: d.catId, days: +d.days, basePrice: +d.basePrice, summary: P2(d.summary, t && t.summary), desc: P2(d.desc, t && t.desc), accommodation: P2(d.accommodation, t && t.accommodation), transport: P2(d.transport, t && t.transport), included: split(d.included), excluded: split(d.excluded || ''), policy: P2(d.policy, t && t.policy), itinerary: UI.tf.itinerary, images: UI.tf.images.length ? UI.tf.images : ['art:' + destArt + ':0', 'art:' + destArt + ':1', 'art:' + destArt + ':2'] };
    if (t) { Object.assign(t, data); if (t.status === 'rejected') t.status = 'pending'; return t; }
    t = { id: uid('t'), companyId: me().companyId, status: 'pending', createdAt: new Date().toISOString(), popular: 0, seats: 30, ...data };
    x.trips.push(t);
    notify(x, 'admin', { ar: 'رحلة تنتظر الاعتماد', en: 'Trip awaiting approval' }, { ar: `${L(myCompany().name)} أضافت "${t.title.ar}".`, en: `${L(myCompany().name)} added “${t.title.en || t.title.ar}”.` }, '#/admin/trips');
    logAct(x, `${myCompany().name.ar} أضافت رحلة للمراجعة`, `${myCompany().name.en} submitted a trip`);
    return t;
  });
  UI.tf = null;
  toast(id ? tr('تم حفظ التعديلات.', 'Changes saved.') : tr('تم حفظ الرحلة وإرسالها للاعتماد. ضيف مواعيدها دلوقتي.', 'Trip saved and sent for approval. Add its dates now.'));
  go(`#/co/trip/${saved.id}/departures`);
};

/* departures */
function viewCoDepartures(id) {
  const g = coGate(); if (g) return g;
  const t = tripById(id);
  if (!t || t.companyId !== me().companyId) return dashLayout('co', tr('غير مسموح', 'Not allowed'), `<div class="card">${empty('lock', tr('الرحلة دي مش تبع شركتك', 'This trip doesn’t belong to your company'), '')}</div>`);
  const rows = db.departures.filter((d) => d.tripId === id).map((d) => ({ ...d, si: seatInfo(d) }));
  return dashLayout('co', tr('مواعيد الرحلة', 'Trip departures'), `
    <div class="card card-pad row wrapx between" style="margin-bottom:16px"><div class="row"><img src="${imgSrc(t.images[0])}" alt="" style="width:84px;height:58px;object-fit:cover;border-radius:10px"><div><h3>${esc(L(t.title))}</h3><div class="small muted row" style="gap:10px">${badge(TSTAT, t.status)} ${nightsLabel(t.days)}</div></div></div><div class="row"><a class="btn btn-ghost btn-sm" href="#/co/trip/${t.id}/edit">${ic('edit')}${tr('تعديل الرحلة', 'Edit trip')}</a><button class="btn btn-primary btn-sm" data-a="dep-open" data-trip="${t.id}">${ic('plus')}${tr('موعد جديد', 'New departure')}</button></div></div>
    ${t.status === 'pending' ? `<div class="callout warn" style="margin-bottom:16px">${ic('clock')}<div>${tr('الرحلة بانتظار اعتماد الإدارة. تقدر تضيف مواعيدها دلوقتي، وهتظهر للعملاء أول ما تتعتمد.', 'This trip is awaiting approval. Add its dates now — they’ll be visible once it’s approved.')}</div></div>` : ''}
    ${dataTable({ id: 'codeps-' + id, rows, defaultSort: 'start', defaultDir: 'asc', search: false, emptyIcon: 'cal', emptyTitle: tr('مفيش مواعيد لسه', 'No departures yet'), emptyText: tr('أضف أول موعد بسعره وعدد مقاعده علشان العملاء يقدروا يحجزوا.', 'Add the first date with its price and seats so customers can book.'),
      filters: [{ key: 'when', label: tr('كل المواعيد', 'All dates'), options: [['up', tr('القادمة', 'Upcoming')], ['past', tr('السابقة', 'Past')]], test: (r, v) => (v === 'up' ? new Date(r.start) > TODAY : new Date(r.start) <= TODAY) }],
      cols: [{ key: 'start', label: tr('السفر', 'Departs'), render: (r) => `<b style="color:var(--navy)">${fmtD(r.start, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</b>` }, { key: 'end', label: tr('العودة', 'Returns'), render: (r) => fmtD(r.end) }, { key: 'price', label: tr('السعر للفرد', 'Per person'), render: (r) => `<span class="num">${money(r.price)}</span>` }, { key: 'seats', label: tr('الإجمالي', 'Total seats'), render: (r) => `<span class="num">${r.seats}</span>` }, { key: 'booked', label: tr('محجوز', 'Booked'), sortVal: (r) => r.si.booked, render: (r) => `<span class="num">${r.si.booked}</span>${r.si.held ? `<div class="xs" style="color:var(--warn)">+${r.si.held} ${tr('معلق', 'on hold')}</div>` : ''}` }, { key: 'remaining', label: tr('متبقي', 'Left'), sortVal: (r) => r.si.remaining, render: (r) => `<b class="num" style="color:${r.si.remaining <= 3 ? 'var(--bad)' : 'var(--teal-700)'}">${r.si.remaining}</b>` }, { key: 'status', label: tr('حالة الحجز', 'Booking status'), render: (r) => badge(DSTAT, r.status === 'open' && r.si.remaining === 0 ? 'full' : r.status) },
        { key: '', label: '', sort: false, render: (r) => r.status === 'open' ? `<div class="row" style="gap:6px;justify-content:flex-end"><button class="icon-btn" data-a="dep-open" data-trip="${t.id}" data-id="${r.id}" aria-label="${tr('تعديل', 'Edit')}">${ic('edit')}</button><button class="icon-btn" style="color:var(--bad)" data-a="dep-cancel" data-id="${r.id}" aria-label="${tr('إلغاء الموعد', 'Cancel departure')}">${ic(r.si.booked ? 'ban' : 'trash')}</button></div>` : '' }] })}`,
    `<a class="btn btn-ghost btn-sm" href="#/co/trips">${tr('كل الرحلات', 'All trips')}</a>`);
}
ACTIONS['dep-open'] = (el) => {
  const t = tripById(el.dataset.trip), d = el.dataset.id ? depById(el.dataset.id) : null, si = d ? seatInfo(d) : null;
  modal({ title: d ? tr('تعديل الموعد', 'Edit departure') : tr('موعد جديد', 'New departure'), body: `<form data-f="dep" id="dep-form" data-trip="${t.id}" data-id="${d ? d.id : ''}" novalidate class="form-grid">
    ${inp('start', tr('تاريخ السفر', 'Departure date'), d ? d.start : '', { type: 'date', attrs: `min="${iso(addDays(TODAY, 1))}" data-on="dep-start" data-days="${t.days}"` })}${inp('end', tr('تاريخ العودة', 'Return date'), d ? d.end : '', { type: 'date', hint: tr(`بيتحسب تلقائيًا (${t.days} أيام)`, `Auto‑filled (${t.days} days)`) })}
    ${inp('price', tr('السعر للفرد (ج.م)', 'Price per person (EGP)'), d ? d.price : t.basePrice, { type: 'number', attrs: 'min="0" step="50"' })}${inp('seats', tr('إجمالي المقاعد', 'Total seats'), d ? d.seats : (t.seats || 30), { type: 'number', attrs: 'min="1" max="500"', hint: si ? tr(`محجوز حاليًا ${si.booked + si.held}`, `${si.booked + si.held} currently booked`) : '' })}
    ${d && si.booked ? `<div class="full callout warn">${ic('info')}<div>${tr(`على الموعد ده ${si.booked} مقعد محجوز. لو غيّرت التاريخ هنبعت إشعار لكل العملاء.`, `${si.booked} seats are booked. If you change the date, every customer will be notified.`)}</div></div>` : ''}</form>`,
    foot: `<button class="btn btn-ghost" data-a="close-modal">${tr('إلغاء', 'Cancel')}</button><button class="btn btn-primary" data-a="dep-save">${tr('حفظ الموعد', 'Save departure')}</button>` });
};
CHANGES['dep-start'] = (el) => { if (el.value) $('#f-end').value = iso(addDays(el.value, +el.dataset.days - 1)); };
ACTIONS['dep-save'] = () => $('#dep-form').requestSubmit();
FORMS.dep = (f) => {
  const id = f.dataset.id, old = id ? depById(id) : null, si = old ? seatInfo(old) : { booked: 0, held: 0 };
  const d = validate(f, { start: ['req', 'future'], end: ['req', (v, a) => v >= a.start || tr('العودة لازم تكون بعد السفر.', 'Return must be after departure.')], price: ['req', 'pos'], seats: ['req', 'int', 'pos', (v) => +v >= si.booked + si.held || tr(`مينفعش أقل من المحجوز (${si.booked + si.held}).`, `Can’t be below seats booked (${si.booked + si.held}).`)] }); if (!d) return;
  const t = tripById(f.dataset.trip);
  tx((x) => {
    const tt = byId(x.trips, t.id); assertCompanyOwns(x, tt);
    if (x.departures.some((y) => y.tripId === t.id && y.start === d.start && y.id !== id && y.status !== 'cancelled')) throw new AppError('DUP_DATE', tr('فيه موعد بنفس التاريخ بالفعل.', 'A departure on this date already exists.'));
    if (old) {
      const dep = byId(x.departures, id); const moved = dep.start !== d.start;
      Object.assign(dep, { start: d.start, end: d.end, price: +d.price, seats: +d.seats });
      if (moved) x.bookings.filter((b) => b.departureId === id && b.status === 'confirmed').forEach((b) => notify(x, b.customerId, { ar: 'تغيير موعد الرحلة', en: 'Trip date changed' }, { ar: `موعد ${tt.title.ar} اتغير إلى ${d.start}. لو الموعد الجديد مش مناسب تقدر تطلب إلغاء.`, en: `${tt.title.en || tt.title.ar} moved to ${d.start}. You can request cancellation if it doesn’t suit you.` }, '#/me/booking/' + b.ref));
    } else x.departures.push({ id: uid('d'), tripId: t.id, start: d.start, end: d.end, price: +d.price, seats: +d.seats, status: 'open' });
  });
  closeModal(); toast(old ? tr('تم تحديث الموعد.', 'Departure updated.') : tr('تمت إضافة الموعد.', 'Departure added.')); render();
};
ACTIONS['dep-cancel'] = async (el) => {
  const dep = depById(el.dataset.id), si = seatInfo(dep), t = tripById(dep.tripId);
  if (!si.booked && !si.held) { if (!(await confirmDialog({ title: tr('حذف الموعد؟', 'Delete departure?'), text: tr(`موعد ${fmtD(dep.start)} مفيش عليه حجوزات وهيتحذف.`, `${fmtD(dep.start)} has no bookings and will be deleted.`), ok: tr('حذف', 'Delete'), danger: true }))) return; tx((x) => { assertCompanyOwns(x, byId(x.trips, t.id)); x.departures = x.departures.filter((y) => y.id !== dep.id); }); toast(tr('تم حذف الموعد.', 'Departure deleted.')); return render(); }
  if (!(await confirmDialog({ title: tr('إلغاء موعد عليه حجوزات', 'Cancel a booked departure'), text: tr(`فيه ${si.booked} مقعد محجوز. الإلغاء هيرجّع للعملاء فلوسهم كاملة ويبعتلهم إشعار. الإجراء ده مينفعش يترجع.`, `${si.booked} seats are booked. Cancelling refunds every customer in full and notifies them. This can’t be undone.`), ok: tr('إلغاء الموعد ورد المبالغ', 'Cancel & refund everyone'), danger: true }))) return;
  await cancelDeparture(dep.id);
  toast(tr('تم إلغاء الموعد ورد المبالغ للعملاء.', 'Departure cancelled and customers refunded.')); render();
};

function cancelDeparture(depId) {
  const dep = depById(depId), t = tripById(dep.tripId);
  tx((x) => {
    assertCompanyOwns(x, byId(x.trips, t.id));
    const d = byId(x.departures, dep.id); d.status = 'cancelled';
    x.bookings.filter((b) => b.departureId === dep.id).forEach((b) => {
      if (b.status === 'pending_payment') { b.status = 'cancelled'; b.paymentStatus = 'failed'; return; }
      if (!['confirmed', 'refund_pending'].includes(b.status)) return;
      x.refunds.filter((r) => r.bookingId === b.id && r.status === 'pending').forEach((r) => { r.status = 'approved'; r.amount = retained(b); r.processedAt = new Date().toISOString(); });
      const amt = retained(b); x.refunds.push({ id: uid('rf'), bookingId: b.id, amount: amt, pct: 100, status: 'approved', reason: 'departure_cancelled_by_company', createdAt: new Date().toISOString(), processedAt: new Date().toISOString() });
      b.refunded = b.total; b.status = 'refunded'; b.paymentStatus = 'refunded'; b.commission = 0;
      x.payments.push({ id: uid('p'), bookingId: b.id, method: (x.payments.find((p) => p.bookingId === b.id && p.status === 'paid') || {}).method || 'card', amount: -amt, status: 'refund', idemKey: 'cxl_' + b.id, txn: 'RF' + Math.floor(1e6 + Math.random() * 9e6), createdAt: new Date().toISOString() });
      notify(x, b.customerId, { ar: 'تم إلغاء الرحلة', en: 'Trip cancelled' }, { ar: `الشركة ألغت موعد ${t.title.ar} يوم ${dep.start}. هيرجعلك ${fmtN(amt)} ج.م بالكامل.`, en: `The operator cancelled ${t.title.en} on ${dep.start}. EGP ${fmtN(amt)} will be refunded in full.` }, '#/me/booking/' + b.ref);
    });
    notify(x, 'admin', { ar: 'إلغاء موعد', en: 'Departure cancelled' }, { ar: `${myCompany().name.ar} ألغت موعد ${dep.start} لرحلة ${t.title.ar}.`, en: `${myCompany().name.en} cancelled ${dep.start} of ${t.title.en}.` }, '#/admin/bookings');
  });
}

/* company bookings */
function viewCoBookings() {
  const g = coGate(); if (g) return g;
  const rows = coBookings().map((b) => ({ ...b, cust: userById(b.customerId).name, trip: L(tripById(b.tripId).title), dep: depById(b.departureId).start }));
  return dashLayout('co', tr('الحجوزات', 'Bookings'), dataTable({ id: 'cobk', rows, defaultSort: 'createdAt', export: true, exportName: 'bookings', searchPh: tr('ابحث برقم الحجز أو اسم العميل', 'Search by ref or customer'), searchText: (r) => r.ref + ' ' + r.cust + ' ' + r.trip, emptyIcon: 'ticket', emptyTitle: tr('لا توجد حجوزات', 'No bookings'), emptyText: tr('الحجوزات الجديدة بتظهر هنا فورًا بعد الدفع.', 'New bookings appear here as soon as they’re paid.'),
    filters: [{ key: 'status', label: tr('حالة الحجز', 'Booking status'), options: Object.entries(BSTAT).map(([k, v]) => [k, L(v.l)]), test: (r, v) => r.status === v }, { key: 'pay', label: tr('حالة الدفع', 'Payment'), options: Object.entries(PSTAT).filter(([k]) => k !== 'refund').map(([k, v]) => [k, L(v.l)]), test: (r, v) => r.paymentStatus === v }, { key: 'trip', label: tr('كل الرحلات', 'All trips'), options: coTrips().map((t) => [t.id, L(t.title).slice(0, 40)]), test: (r, v) => r.tripId === v }],
    csvCols: [{ label: 'Ref', csv: (r) => r.ref }, { label: tr('العميل', 'Customer'), csv: (r) => r.cust }, { label: tr('الرحلة', 'Trip'), csv: (r) => r.trip }, { label: tr('الموعد', 'Departure'), csv: (r) => r.dep }, { label: tr('المسافرون', 'Travellers'), csv: (r) => r.count }, { label: tr('الإجمالي', 'Total'), csv: (r) => r.total }, { label: tr('العمولة', 'Commission'), csv: (r) => r.commission }, { label: tr('حالة الدفع', 'Payment'), csv: (r) => L(PSTAT[r.paymentStatus].l) }, { label: tr('حالة الحجز', 'Status'), csv: (r) => L(BSTAT[r.status].l) }, { label: tr('تاريخ الإنشاء', 'Created'), csv: (r) => r.createdAt.slice(0, 10) }],
    cols: [{ key: 'ref', label: tr('رقم الحجز', 'Ref'), render: (r) => `<button class="btn-link ref" data-a="co-bk" data-id="${r.id}">${r.ref}</button>` }, { key: 'cust', label: tr('العميل', 'Customer') }, { key: 'trip', label: tr('الرحلة', 'Trip'), render: (r) => `<span class="small">${esc(r.trip).slice(0, 36)}…</span>` }, { key: 'dep', label: tr('الموعد', 'Departure'), render: (r) => fmtD(r.dep) }, { key: 'count', label: tr('مسافرون', 'Pax'), render: (r) => `<span class="num">${r.count}</span>` }, { key: 'total', label: tr('الإجمالي', 'Total'), render: (r) => `<span class="num">${money(r.total)}</span>` }, { key: 'paymentStatus', label: tr('الدفع', 'Payment'), render: (r) => badge(PSTAT, r.paymentStatus) }, { key: 'status', label: tr('الحالة', 'Status'), render: (r) => badge(BSTAT, r.status) }, { key: 'createdAt', label: tr('تاريخ الحجز', 'Booked on'), render: (r) => `<span class="small">${fmtD(r.createdAt)}</span>` }] }));
}
ACTIONS['co-bk'] = (el) => bookingModal(byId(db.bookings, el.dataset.id), role());
function bookingModal(b, as) {
  if (as === 'company' && b.companyId !== me().companyId) return toast(tr('غير مسموح.', 'Not allowed.'), 'bad');
  const t = tripById(b.tripId), d = depById(b.departureId), u = userById(b.customerId), pays = db.payments.filter((p) => p.bookingId === b.id), rf = db.refunds.filter((r) => r.bookingId === b.id);
  modal({ wide: true, title: `${tr('حجز', 'Booking')} <span class="ref" dir="ltr">${b.ref}</span>`, body: `<div class="row wrapx" style="gap:8px;margin-bottom:14px">${badge(BSTAT, b.status)}${badge(PSTAT, b.paymentStatus)}</div>
    <div class="grid g2"><dl class="dl"><dt>${tr('الرحلة', 'Trip')}</dt><dd>${esc(L(t.title))}</dd><dt>${tr('الموعد', 'Departure')}</dt><dd>${fmtD(d.start)} → ${fmtD(d.end)}</dd>${as === 'admin' ? `<dt>${tr('الشركة', 'Company')}</dt><dd>${esc(L(compById(b.companyId).name))}</dd>` : ''}<dt>${tr('العميل', 'Customer')}</dt><dd>${esc(u.name)}<div class="xs muted" dir="ltr" style="text-align:start">${esc(u.phone)} · ${esc(u.email)}</div></dd><dt>${tr('تاريخ الحجز', 'Booked')}</dt><dd>${fmtDT(b.createdAt)}</dd></dl>
    <dl class="dl"><dt>${tr('سعر الفرد', 'Unit price')}</dt><dd class="num">${money(b.unitPrice)}</dd><dt>${tr('الإجمالي', 'Total')}</dt><dd class="num">${money(b.total)}${b.discount ? ` <span class="xs muted">(${tr('خصم', 'disc.')} ${money(b.discount)})</span>` : ''}</dd>${b.refunded ? `<dt>${tr('مسترد', 'Refunded')}</dt><dd class="num">${money(b.refunded)}</dd>` : ''}<dt>${tr('عمولة المنصة', 'Platform commission')}</dt><dd class="num">${money(b.commission)} (${b.commissionRate}٪)</dd><dt>${tr('صافي الشركة', 'Company net')}</dt><dd class="num"><b>${money(retained(b) - b.commission)}</b></dd></dl></div>
    <h4 style="margin:18px 0 8px">${tr('المسافرون', 'Travellers')}</h4><div class="tbl-wrap card"><table class="tbl"><tbody>${b.travelers.map((x, i) => `<tr><td class="faint">${i + 1}</td><td>${esc(x.name)}</td><td class="num">${esc(x.age)}</td><td dir="ltr">${esc(x.phone || '')}</td></tr>`).join('')}</tbody></table></div>
    ${pays.length ? `<h4 style="margin:18px 0 8px">${tr('حركات الدفع', 'Payment activity')}</h4>${pays.map((p) => `<div class="row between small" style="padding:5px 0;border-bottom:1px solid var(--line-2)"><span>${fmtDT(p.createdAt)} · ${esc(L(GATEWAYS[p.method].name))} · <span dir="ltr">${p.txn || '—'}</span></span><span class="row">${badge(PSTAT, p.status)}<b class="num">${money(p.amount)}</b></span></div>`).join('')}` : ''}
    ${rf.length ? `<h4 style="margin:18px 0 8px">${tr('الاسترداد', 'Refunds')}</h4>${rf.map((r) => `<div class="row between small" style="padding:5px 0"><span>${fmtD(r.createdAt)} · ${esc(r.reason || '')}</span><span class="row"><span class="badge ${r.status === 'pending' ? 'b-warn' : r.status === 'approved' ? 'b-ok' : 'b-bad'}">${r.status === 'pending' ? tr('قيد المراجعة', 'Pending') : r.status === 'approved' ? tr('تمت الموافقة', 'Approved') : tr('مرفوض', 'Declined')}</span><b class="num">${money(r.amount)}</b></span></div>`).join('')}` : ''}`,
    foot: `${as === 'admin' && rf.some((r) => r.status === 'pending') ? `<button class="btn btn-danger-soft" data-a="rf-dec" data-id="${rf.find((r) => r.status === 'pending').id}">${tr('رفض الاسترداد', 'Decline refund')}</button><button class="btn btn-ok-soft" data-a="rf-ok" data-id="${rf.find((r) => r.status === 'pending').id}">${tr('الموافقة على الاسترداد', 'Approve refund')}</button>` : ''}<button class="btn btn-ghost" data-a="close-modal">${tr('إغلاق', 'Close')}</button>` });
}

/* company finance */
function viewCoFinance() {
  const g = coGate(); if (g) return g;
  const c = myCompany(), f = companyFinance(c.id), sts = db.settlements.filter((s) => s.companyId === c.id);
  const rows = coBookings().filter((b) => ['paid', 'partially_refunded', 'refunded'].includes(b.paymentStatus) && retained(b) > 0).map((b) => ({ ...b, net: retained(b) - b.commission, dep: depById(b.departureId).start }));
  return dashLayout('co', tr('المستحقات', 'Earnings'), `<div class="kpis">${kpi(tr('مستحق للتحويل', 'Payable to you'), money(f.payable), tr('من رحلات انتهت ولم تُسوَّ بعد', 'From finished trips not yet settled'), 'wallet', true)}${kpi(tr('محجوز لحين السفر', 'Held until travel'), money(f.escrow), tr('صافي حجوزات رحلات لم تتم بعد', 'Net of trips that haven’t happened yet'), 'lock')}${kpi(tr('تم تحويله', 'Paid out'), money(f.settled), tr(`${sts.length} تسوية`, `${sts.length} settlements`), 'check')}${kpi(tr('عمولة المنصة', 'Platform commission'), money(f.commission), tr(`نسبة ${effectiveRate(c)}٪ ${c.commission != null ? '(نسبة خاصة)' : ''}`, `${effectiveRate(c)}% rate ${c.commission != null ? '(custom)' : ''}`), 'money')}</div>
  <div class="grid g2" style="margin-top:20px;align-items:start"><div class="card"><div class="card-h"><h3>${tr('التسويات', 'Settlements')}</h3></div>${sts.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${tr('التاريخ', 'Date')}</th><th>${tr('البيان', 'Note')}</th><th>${tr('الطريقة', 'Method')}</th><th>${tr('المبلغ', 'Amount')}</th></tr></thead><tbody>${sts.map((s) => `<tr><td>${fmtD(s.createdAt)}</td><td>${esc(s.note)}</td><td>${esc(s.method)}</td><td class="num"><b>${money(s.amount)}</b></td></tr>`).join('')}</tbody></table></div>` : `<p class="card-pad muted">${tr('لا توجد تسويات بعد.', 'No settlements yet.')}</p>`}</div>
  <div class="card card-pad"><h3>${tr('إزاي بتتحسب المستحقات؟', 'How earnings work')}</h3><ul class="ticklist tick-ok small" style="margin-top:10px"><li>${ic('check')}${tr('العميل بيدفع للمنصة، والمبلغ بيفضل محجوز لحد انتهاء الرحلة.', 'Customers pay the platform; the money is held until the trip ends.')}</li><li>${ic('check')}${tr(`المنصة بتخصم عمولة ${effectiveRate(c)}٪ من قيمة الحجز بعد أي استرداد.`, `Rehlati deducts ${effectiveRate(c)}% from the booking value after any refund.`)}</li><li>${ic('check')}${tr('الصافي بيتحوّل لحساب الشركة في تسوية دورية.', 'The net amount is paid to you in periodic settlements.')}</li></ul></div></div>
  <div style="margin-top:20px">${dataTable({ id: 'cofin', title: tr('العمولة لكل حجز', 'Commission per booking'), rows, defaultSort: 'createdAt', export: true, exportName: 'earnings', searchText: (r) => r.ref, cols: [{ key: 'ref', label: tr('الحجز', 'Ref'), render: (r) => `<span class="ref">${r.ref}</span>` }, { key: 'dep', label: tr('الموعد', 'Departure'), render: (r) => fmtD(r.dep) }, { key: 'total', label: tr('القيمة', 'Value'), sortVal: retained, render: (r) => `<span class="num">${money(retained(r))}</span>`, csv: retained }, { key: 'commission', label: tr('العمولة', 'Commission'), render: (r) => `<span class="num">${money(r.commission)}</span> <span class="xs faint">${r.commissionRate}٪</span>` }, { key: 'net', label: tr('الصافي', 'Net'), render: (r) => `<b class="num">${money(r.net)}</b>` }, { key: 'status', label: tr('الحالة', 'Status'), render: (r) => badge(BSTAT, r.status) }] })}</div>`);
}

/* company reviews */
function viewCoReviews() {
  const g = coGate(); if (g) return g;
  const revs = companyReviews(me().companyId); const f = UI.revF || 'all';
  const list = f === 'unanswered' ? revs.filter((r) => !r.reply) : f === 'low' ? revs.filter((r) => r.ratings.overall <= 3) : revs;
  const avgs = ['overall', 'organization', 'service', 'punctuality', 'company'].map((k) => avg(revs.map((r) => r.ratings[k])));
  return dashLayout('co', tr('التقييمات', 'Reviews'), `<div class="kpis">${kpi(tr('متوسط التقييم', 'Average rating'), revs.length ? r1(avgs[0]) + ' ★' : '—', tr(`${revs.length} تقييم`, `${revs.length} reviews`), 'star', true)}${kpi(tr('التنظيم', 'Organization'), r1(avgs[1]), '', 'layers')}${kpi(tr('الخدمة', 'Service'), r1(avgs[2]), '', 'sparkle')}${kpi(tr('الالتزام بالمواعيد', 'Punctuality'), r1(avgs[3]), '', 'clock')}</div>
  <div class="card" style="margin-top:20px"><div class="card-h"><div class="seg">${[['all', tr('الكل', 'All')], ['unanswered', tr('بدون رد', 'Unanswered')], ['low', tr('٣ نجوم أو أقل', '3★ or less')]].map(([k, l]) => `<button class="${k === f ? 'on' : ''}" data-a="rev-f" data-k="${k}">${l}</button>`).join('')}</div></div><div class="card-pad">${list.length ? list.map((r) => { const u = userById(r.customerId); return `<div class="rev"><div class="row between wrapx"><div><b style="color:var(--navy)">${esc(u.name)}</b> <span class="xs faint">· ${esc(L(tripById(r.tripId).title)).slice(0, 40)} · ${fmtD(r.createdAt)}</span></div>${starsHTML(r.ratings.overall)}</div><p style="margin-top:6px">${esc(r.text)}</p>${r.reply ? `<div class="reply"><b class="small">${tr('ردك', 'Your reply')}</b><p class="small">${esc(r.reply.text)}</p></div>` : `<form data-f="rev-reply" data-id="${r.id}" class="row" style="margin-top:10px;align-items:flex-start" novalidate><div class="field grow"><textarea class="textarea" name="reply" rows="2" style="min-height:44px" placeholder="${tr('اكتب ردًا مهذبًا يظهر للعملاء…', 'Write a public reply…')}" aria-label="${tr('الرد', 'Reply')}"></textarea><span class="err-msg"></span></div><button class="btn btn-soft" type="submit">${ic('reply')}${tr('رد', 'Reply')}</button></form>`}</div>`; }).join('') : `<p class="muted">${tr('لا توجد تقييمات هنا.', 'No reviews here.')}</p>`}</div></div>`);
}
ACTIONS['rev-f'] = (el) => { UI.revF = el.dataset.k; render(); };
FORMS['rev-reply'] = (f) => { const d = validate(f, { reply: ['req', (v) => v.length >= 5 || tr('الرد قصير جدًا.', 'Reply is too short.')] }); if (!d) return; tx((x) => { const r = byId(x.reviews, f.dataset.id); assertCompanyOwns(x, r); r.reply = { text: d.reply, at: new Date().toISOString() }; notify(x, r.customerId, { ar: 'رد على تقييمك', en: 'Reply to your review' }, { ar: 'الشركة ردت على تقييمك.', en: 'The company replied to your review.' }, '#/me/reviews'); }); toast(tr('تم نشر الرد.', 'Reply published.')); render(); };

/* company profile */
function viewCoProfile() {
  const c = myCompany();
  return dashLayout('co', tr('ملف الشركة', 'Company profile'), `<form data-f="co-profile" novalidate class="stack">
    <div class="card" style="overflow:hidden"><div style="height:160px;position:relative;background:var(--navy)"><img src="${imgSrc(UI.coCover || c.cover)}" alt="" style="width:100%;height:100%;object-fit:cover"><label class="btn btn-sand btn-sm" style="position:absolute;bottom:12px;inset-inline-end:12px">${ic('upload')}${tr('تغيير الغلاف', 'Change cover')}<input type="file" accept="image/*" class="sr" data-ch="co-cover"></label></div>
      <div class="card-pad row wrapx" style="gap:16px">${coLogo({ ...c, logo: UI.coLogo || c.logo }, 'lg')}<div class="grow"><h3>${esc(L(c.name))}</h3><div class="small muted">${badge(CSTAT, c.status)}</div></div><label class="btn btn-ghost btn-sm">${ic('upload')}${tr('رفع الشعار', 'Upload logo')}<input type="file" accept="image/*" class="sr" data-ch="co-logo"></label></div></div>
    <div class="card card-pad"><h3 style="margin-bottom:14px">${tr('المعلومات', 'Information')}</h3><div class="form-grid">
      ${inp('name_ar', tr('اسم الشركة (عربي)', 'Name (Arabic)'), c.name.ar)}${inp('name_en', tr('اسم الشركة (إنجليزي)', 'Name (English)'), c.name.en, { attrs: 'dir="ltr"' })}
      ${inp('phone', tr('الموبايل', 'Mobile'), c.phone, { type: 'tel', attrs: 'dir="ltr"' })}${inp('email', tr('البريد', 'Email'), c.email, { type: 'email', attrs: 'dir="ltr"' })}
      ${inp('website', tr('الموقع الإلكتروني', 'Website'), c.website, { attrs: 'dir="ltr"' })}${inp('city', tr('العنوان', 'Address'), L(c.city))}
      ${inp('license', tr('رقم الترخيص', 'Licence'), c.license)}${inp('founded', tr('سنة التأسيس', 'Founded'), c.founded, { type: 'number' })}
      ${txa('desc', tr('نبذة عن الشركة', 'About the company'), L(c.desc), { full: true, rows: 4 })}
    </div></div><div class="row" style="justify-content:flex-end"><button class="btn btn-primary btn-lg" type="submit">${tr('حفظ الملف', 'Save profile')}</button></div></form>
    <div style="margin-top:20px;max-width:520px">${passwordCard()}</div>`, c.status === 'approved' ? `<a class="btn btn-ghost btn-sm" href="#/company/${c.id}">${ic('eye')}${tr('الصفحة العامة', 'Public page')}</a>` : '');
}
CHANGES['co-logo'] = async (el) => { try { UI.coLogo = await readImage(el.files[0], 300); render(); toast(tr('اضغط "حفظ الملف" لتثبيت الشعار.', 'Press “Save profile” to keep the logo.'), 'info'); } catch (e) { handleErr(e); } };
CHANGES['co-cover'] = async (el) => { try { UI.coCover = await readImage(el.files[0], 1600); render(); toast(tr('اضغط "حفظ الملف" لتثبيت الغلاف.', 'Press “Save profile” to keep the cover.'), 'info'); } catch (e) { handleErr(e); } };
FORMS['co-profile'] = (f) => {
  const d = validate(f, { name_ar: ['req'], phone: ['req', 'phone'], email: ['req', 'email'], city: ['req'], license: ['req'] }); if (!d) return;
  tx((x) => { const c = byId(x.companies, me().companyId); const P2 = (v, o) => (LANG === 'en' ? { ar: o.ar || v, en: v } : { ar: v, en: o.en || '' }); Object.assign(c, { name: { ar: d.name_ar, en: d.name_en || d.name_ar }, phone: d.phone, email: d.email, website: d.website, city: P2(d.city, c.city), license: d.license, founded: +d.founded || c.founded, desc: P2(d.desc, c.desc) }); if (UI.coLogo) c.logo = UI.coLogo; if (UI.coCover) c.cover = UI.coCover; });
  UI.coLogo = UI.coCover = null; toast(tr('تم حفظ ملف الشركة.', 'Company profile saved.')); render();
};
