
/* ---------- 7. Checkout ---------- */
function viewCheckout(tripId) {
  const t = tripById(tripId); const q = readQuery();
  if (!t || t.status !== 'active') return viewNotFound(tr('الرحلة غير متاحة', 'Trip not available'));
  if (!UI.co || UI.co.tripId !== tripId || (q.dep && UI.co.fromDep !== q.dep) || UI.co.done) {
    const n = clamp(+q.n || 1, 1, 10); const u = me();
    UI.co = { tripId, fromDep: q.dep, depId: q.dep, n, step: 1, code: '', method: 'card', travelers: Array.from({ length: n }, (_, i) => ({ name: i === 0 ? u.name : '', age: '', phone: i === 0 ? u.phone : '' })) };
  }
  const co = UI.co, dep = depById(co.depId), c = compById(t.companyId);
  if (!dep) return viewNotFound(tr('اختر موعدًا من صفحة الرحلة', 'Pick a date on the trip page'));
  const b = co.bookingId && byId(db.bookings, co.bookingId);
  const q2 = priceQuote(dep, co.n, co.code, t);
  const steps = [tr('بيانات المسافرين', 'Travellers'), tr('المراجعة والشروط', 'Review & terms'), tr('الدفع', 'Payment'), tr('التأكيد', 'Confirmation')];
  let body = '';
  if (co.step === 1) body = coStep1(t, dep);
  else if (co.step === 2) body = coStep2(t, dep, q2);
  else body = coStep3(t, dep, b);
  return header() + `<main class="route-fade"><div class="wrap sec" style="padding-top:28px">
    <a href="#/trip/${t.id}" class="btn-link small row" style="gap:4px;margin-bottom:14px">${ic(LANG === 'ar' ? 'chevr' : 'chev')}${tr('رجوع لصفحة الرحلة', 'Back to trip')}</a>
    <ol class="steps" aria-label="${tr('خطوات الحجز', 'Booking steps')}">${steps.map((s, i) => `<li class="${i + 1 === co.step ? 'on' : i + 1 < co.step ? 'done' : ''}" ${i + 1 === co.step ? 'aria-current="step"' : ''}>${s}</li>`).join('')}</ol>
    <div class="co-layout"><div>${body}</div>
    <aside class="card" style="position:sticky;top:88px;overflow:hidden"><img src="${imgSrc(t.images[0])}" alt="" style="aspect-ratio:16/8;object-fit:cover;width:100%"><div class="card-pad stack">
      <h3 style="font-size:16px">${esc(L(t.title))}</h3><div class="row small muted">${coLogo(c)}${esc(L(c.name))}</div>
      <dl class="dl" style="grid-template-columns:110px 1fr;font-size:14px"><dt>${tr('السفر', 'Departs')}</dt><dd>${fmtD(dep.start, { weekday: 'long', day: 'numeric', month: 'long' })}</dd><dt>${tr('العودة', 'Returns')}</dt><dd>${fmtD(dep.end, { day: 'numeric', month: 'long' })}</dd><dt>${tr('المسافرون', 'Travellers')}</dt><dd>${co.n}</dd></dl>
      <div class="calc" style="border-top:1px dashed var(--line);padding-top:12px"><div class="row"><span class="muted">${money(dep.price)} × ${co.n}</span><span class="num">${money(b ? b.subtotal : q2.subtotal)}</span></div>${(b ? b.discount : q2.discount) ? `<div class="row" style="color:var(--ok)"><span>${tr('خصم', 'Discount')} ${esc(b ? b.promo : (q2.campaign ? L(q2.campaign.title) : co.code.toUpperCase()))}</span><span class="num">− ${money(b ? b.discount : q2.discount)}</span></div>` : ''}<div class="row"><b>${tr('الإجمالي', 'Total')}</b><span class="total num">${money(b ? b.total : q2.total)}</span></div></div>
      ${b && b.status === 'pending_payment' ? `<div class="callout warn">${ic('clock')}<div>${tr('المقاعد محجوزة لك لمدة', 'Seats held for')} <span class="timer" id="hold-timer" data-until="${b.holdUntil}">--:--</span></div></div>` : ''}
    </div></aside></div></div></main>`;
}
function coStep1(t, dep) {
  const co = UI.co, si = seatInfo(dep);
  return `<form class="card card-pad" data-f="co-1" novalidate><div class="row between wrapx"><h2 style="font-size:20px">${tr('مين اللي مسافر؟', 'Who’s travelling?')}</h2>
    <div class="row"><label class="lbl" for="co-dep">${tr('الموعد', 'Date')}</label><select class="select" id="co-dep" style="width:auto" data-ch="co-dep">${upcomingDeps(t.id).map((d) => { const x = seatInfo(d); return `<option value="${d.id}" ${d.id === co.depId ? 'selected' : ''} ${x.remaining ? '' : 'disabled'}>${fmtDS(d.start)} · ${money(d.price)} · ${x.remaining ? tr(`${x.remaining} متاح`, `${x.remaining} left`) : tr('مكتمل', 'full')}</option>`; }).join('')}</select>
    <div class="qty"><button type="button" data-a="co-n" data-d="-1" ${co.n <= 1 ? 'disabled' : ''} aria-label="${tr('أقل', 'Fewer')}">−</button><span class="num">${co.n}</span><button type="button" data-a="co-n" data-d="1" ${co.n >= Math.min(10, si.remaining) ? 'disabled' : ''} aria-label="${tr('أكثر', 'More')}">+</button></div></div></div>
    <p class="muted small" style="margin:6px 0 18px">${tr('الأسماء زي البطاقة أو جواز السفر. بيانات المسافر الأول هي اللي هنتواصل عليها.', 'Names as on ID or passport. We’ll contact the first traveller.')}</p>
    ${co.travelers.map((x, i) => `<fieldset style="border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin:0 0 12px"><legend class="lbl" style="padding:0 6px">${i === 0 ? tr('المسافر الأساسي', 'Lead traveller') : tr(`مسافر ${i + 1}`, `Traveller ${i + 1}`)}</legend><div class="form-grid" style="grid-template-columns:2fr 1fr ${i === 0 ? '1.4fr' : ''}">${inp('name_' + i, tr('الاسم بالكامل', 'Full name'), x.name)}${inp('age_' + i, tr('السن', 'Age'), x.age, { type: 'number', attrs: 'min="0" max="100" inputmode="numeric"' })}${i === 0 ? inp('phone_0', tr('الموبايل', 'Mobile'), x.phone, { type: 'tel', attrs: 'dir="ltr"' }) : ''}</div></fieldset>`).join('')}
    <div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn btn-primary btn-lg" type="submit">${tr('متابعة للمراجعة', 'Continue to review')}</button></div></form>`;
}
function saveTravelers(f) { UI.co.travelers = UI.co.travelers.map((x, i) => ({ name: (f.elements['name_' + i] || {}).value?.trim() || '', age: (f.elements['age_' + i] || {}).value || '', phone: i === 0 ? (f.elements.phone_0 || {}).value?.trim() : '' })); }
ACTIONS['co-n'] = (el) => { const f = el.closest('form'); saveTravelers(f); const co = UI.co; co.n = clamp(co.n + +el.dataset.d, 1, 10); while (co.travelers.length < co.n) co.travelers.push({ name: '', age: '', phone: '' }); co.travelers.length = co.n; render(); };
CHANGES['co-dep'] = (el) => { saveTravelers(el.closest('form')); UI.co.depId = el.value; UI.co.fromDep = el.value; const si = seatInfo(depById(el.value)); if (UI.co.n > si.remaining) { UI.co.n = Math.max(1, si.remaining); UI.co.travelers.length = UI.co.n; } history.replaceState(null, '', `#/book/${UI.co.tripId}?dep=${el.value}&n=${UI.co.n}`); render(); };
FORMS['co-1'] = (f) => {
  saveTravelers(f);
  const spec = {}; UI.co.travelers.forEach((x, i) => { spec['name_' + i] = ['req', (v) => v.split(/\s+/).length >= 2 || tr('الاسم الأول واسم العائلة على الأقل.', 'First and last name at least.')]; spec['age_' + i] = ['req', (v) => (+v >= 0 && +v <= 100) || tr('سن غير صحيح.', 'Invalid age.')]; });
  spec.phone_0 = ['req', 'phone'];
  if (!validate(f, spec)) return;
  UI.co.step = 2; render(); scrollTo(0, 0);
};
function coStep2(t, dep, q) {
  const co = UI.co;
  return `<form class="card card-pad stack" data-f="co-2" novalidate><h2 style="font-size:20px">${tr('راجع حجزك', 'Review your booking')}</h2>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>${tr('الاسم', 'Name')}</th><th>${tr('السن', 'Age')}</th><th>${tr('الموبايل', 'Mobile')}</th></tr></thead><tbody>${co.travelers.map((x, i) => `<tr><td>${i + 1}</td><td>${esc(x.name)}</td><td class="num">${esc(x.age)}</td><td dir="ltr" style="text-align:start">${esc(x.phone || '—')}</td></tr>`).join('')}</tbody></table></div>
    <button type="button" class="btn-link small" data-a="co-back" data-s="1" style="align-self:flex-start">${tr('تعديل البيانات', 'Edit details')}</button>
    <div class="field" style="max-width:420px"><label for="f-code">${tr('كود خصم (اختياري)', 'Promo code (optional)')}</label><div class="row"><input class="input" id="f-code" name="code" value="${esc(co.code)}" dir="ltr" placeholder="NILE10"><button type="button" class="btn btn-soft" data-a="co-code">${tr('تطبيق', 'Apply')}</button></div><span class="hint">${q.campaign && co.code && q.codeOffer ? tr(`عرض "${L(q.campaign.title)}" (${q.campaign.percent}٪) أكبر من الكود، فطبقنا العرض. الخصومات مش بتتجمع.`, `The “${L(q.campaign.title)}” offer (${q.campaign.percent}%) beats the code, so we applied it. Discounts don’t stack.`) : q.campaign ? tr(`عرض "${L(q.campaign.title)}" متطبق تلقائيًا (${q.campaign.percent}٪). الكود هيتطبق بس لو خصمه أكبر.`, `“${L(q.campaign.title)}” is applied automatically (${q.campaign.percent}%). A code only applies if it’s bigger.`) : co.code ? (q.offer ? tr(`تم تطبيق خصم ${q.offer.percent}٪`, `${q.offer.percent}% off applied`) : tr('الكود غير صالح لهذه الرحلة.', 'This code isn’t valid for this trip.')) : tr('جرّب NILE10 على رحلات الأقصر وأسوان، أو WELCOME5', 'Try NILE10 on Luxor & Aswan trips, or WELCOME5')}</span></div>
    <div class="callout">${ic('info')}<div><b>${tr('سياسة الإلغاء:', 'Cancellation policy:')}</b> ${esc(L(t.policy))}</div></div>
    <label class="check field"><input type="checkbox" name="terms" value="1"><span>${tr('قرأت وأوافق على', 'I have read and accept the')} <a class="btn-link" href="#/page/terms" target="_blank">${tr('الشروط والأحكام', 'terms & conditions')}</a> ${tr('وسياسة الإلغاء الخاصة بالرحلة.', 'and this trip’s cancellation policy.')}</span><span class="err-msg"></span></label>
    <div class="row between wrapx"><button type="button" class="btn btn-ghost" data-a="co-back" data-s="1">${tr('رجوع', 'Back')}</button><button class="btn btn-primary btn-lg" type="submit">${tr('متابعة للدفع', 'Continue to payment')}</button></div></form>`;
}
ACTIONS['co-back'] = (el) => { UI.co.step = +el.dataset.s; render(); };
ACTIONS['co-code'] = () => { UI.co.code = $('#f-code').value.trim(); render(); };
FORMS['co-2'] = async (f) => {
  UI.co.code = f.elements.code.value.trim();
  if (!validate(f, { terms: [(v) => !!v || tr('لازم توافق على الشروط علشان تكمل.', 'You must accept the terms to continue.')] })) return;
  const btn = $('button[type=submit]', f); busy(btn, true, tr('جاري حجز المقاعد…', 'Holding seats…')); await wait(500);
  try {
    const b = await createBooking({ depId: UI.co.depId, travelers: UI.co.travelers, code: UI.co.code });
    UI.co.bookingId = b.id; UI.co.idemKey = uid('idem'); UI.co.step = 3; render(); scrollTo(0, 0);
  } catch (e) {
    busy(btn, false);
    if (e.code === 'DUPLICATE') { const ex = db.bookings.find((b) => b.customerId === me().id && b.departureId === UI.co.depId && ['pending_payment', 'confirmed'].includes(b.status)); toast(e.message, 'bad'); if (ex) go('#/me/booking/' + ex.ref); }
    else toast(e.message, 'bad');
  }
};
/* resume a pending booking from the dashboard */
function resumeCheckout(b) { UI.co = { tripId: b.tripId, depId: b.departureId, fromDep: b.departureId, n: b.count, travelers: b.travelers, code: b.promo, step: 3, bookingId: b.id, idemKey: uid('idem'), method: 'card' }; go(`#/book/${b.tripId}?dep=${b.departureId}&n=${b.count}`); }
function coStep3(t, dep, b) {
  const co = UI.co;
  if (!b || b.status !== 'pending_payment' || new Date(b.holdUntil) < new Date()) {
    return `<div class="card card-pad">${empty('clock', tr('انتهت مهلة حجز المقاعد', 'Your seat hold expired'), tr('المقاعد رجعت متاحة لغيرك. تقدر تبدأ الحجز من جديد لو لسه فيه أماكن.', 'The seats were released. Start again if seats are still available.'), `<button class="btn btn-primary" data-a="co-restart">${tr('ابدأ الحجز من جديد', 'Start again')}</button>`)}</div>`;
  }
  const m = co.method; const pm = Object.entries(GATEWAYS);
  const failed = db.payments.filter((p) => p.bookingId === b.id && p.status === 'failed').slice(-1)[0];
  let form = '';
  if (m === 'card') form = `<div class="form-grid">${inp('card', tr('رقم البطاقة', 'Card number'), '', { full: true, ph: '4242 4242 4242 4242', attrs: 'dir="ltr" inputmode="numeric" autocomplete="off" data-on="card-fmt"' })}${inp('holder', tr('الاسم على البطاقة', 'Name on card'), '', { attrs: 'dir="ltr" autocomplete="off"' })}<div class="form-grid" style="gap:10px">${inp('exp', tr('الانتهاء', 'Expiry'), '', { ph: 'MM/YY', attrs: 'dir="ltr" autocomplete="off"' })}${inp('cvv', 'CVV', '', { attrs: 'dir="ltr" inputmode="numeric" maxlength="4" autocomplete="off"' })}</div></div><p class="hint" style="margin-top:8px">${tr('وضع تجريبي: استخدم 4242 4242 4242 4242 لعملية ناجحة، أو 4000 0000 0000 0002 لتجربة رفض البنك. لا تُدخل بيانات بطاقة حقيقية.', 'Test mode: 4242 4242 4242 4242 succeeds, 4000 0000 0000 0002 is declined. Never enter a real card.')}</p>`;
  else if (m === 'wallet') form = `<div class="form-grid">${sel('provider', tr('المحفظة', 'Wallet'), [['vodafone', 'Vodafone Cash'], ['etisalat', 'e& cash'], ['orange', 'Orange Cash'], ['we', 'WE Pay']], 'vodafone')}${inp('phone', tr('رقم المحفظة', 'Wallet number'), me().phone, { type: 'tel', attrs: 'dir="ltr"' })}${co.otpSent ? inp('otp', tr('كود التأكيد المرسل بالرسالة', 'Code sent by SMS'), '', { attrs: 'dir="ltr" inputmode="numeric" maxlength="6"', hint: tr('وضع تجريبي: الكود هو 123456', 'Test mode: the code is 123456') }) : ''}</div>`;
  else if (m === 'fawry') form = `<div class="callout">${ic('info')}<div>${tr('هيطلعلك كود دفع. ادفع بيه في أي منفذ فوري أو من تطبيق myFawry قبل انتهاء المهلة.', 'You’ll get a payment code. Pay it at any Fawry outlet or in the myFawry app before the hold ends.')}</div></div>${co.fawryCode ? `<div class="card card-pad" style="margin-top:12px;text-align:center"><small class="muted">${tr('كود فوري', 'Fawry reference')}</small><div style="font-family:var(--f-disp);font-size:30px;font-weight:700;color:var(--navy);letter-spacing:.08em" dir="ltr">${co.fawryCode}</div><p class="hint">${tr('وضع تجريبي: اضغط "تم الدفع في فوري" لمحاكاة الدفع.', 'Test mode: press “I paid at Fawry” to simulate payment.')}</p></div>` : ''}`;
  else form = `<div class="card card-pad" style="background:var(--line-2);border:0"><dl class="dl"><dt>${tr('حوّل على عنوان الدفع', 'Send to payment address')}</dt><dd dir="ltr" style="text-align:start">rehlati@instapay</dd><dt>${tr('المبلغ', 'Amount')}</dt><dd class="num">${money(b.total)}</dd><dt>${tr('اكتب في الملاحظات', 'Put in the note')}</dt><dd dir="ltr" style="text-align:start"><b>${b.ref}</b></dd></dl></div><p class="hint" style="margin-top:8px">${tr('وضع تجريبي: اضغط "حوّلت المبلغ" لمحاكاة وصول التحويل.', 'Test mode: press “I’ve sent it” to simulate the transfer arriving.')}</p>`;
  const payLabel = m === 'fawry' ? (co.fawryCode ? tr('تم الدفع في فوري', 'I paid at Fawry') : tr('اطلع كود فوري', 'Get Fawry code')) : m === 'wallet' ? (co.otpSent ? tr(`ادفع ${money(b.total)}`, `Pay ${money(b.total)}`) : tr('ابعت كود التأكيد', 'Send confirmation code')) : m === 'instapay' ? tr('حوّلت المبلغ', 'I’ve sent it') : tr(`ادفع ${money(b.total)}`, `Pay ${money(b.total)}`);
  return `<form class="card card-pad stack" data-f="co-pay" novalidate><div class="row between"><h2 style="font-size:20px">${tr('اختر طريقة الدفع', 'Choose how to pay')}</h2><span class="small muted row" style="gap:6px">${ic('lock')}${tr('رقم الحجز', 'Booking')} <b class="ref" style="color:var(--navy)" dir="ltr">${b.ref}</b></span></div>
    ${failed ? `<div class="callout warn" role="alert">${ic('alert')}<div><b>${tr('فشلت عملية الدفع السابقة.', 'The last payment attempt failed.')}</b> ${esc(L(failed.failReason))} ${tr('لم يتم خصم أي مبلغ. جرّب مرة أخرى أو اختر طريقة دفع أخرى.', 'Nothing was charged. Try again or pick another method.')}</div></div>` : ''}
    <div class="pay-methods" role="radiogroup">${pm.map(([k, g]) => `<button type="button" class="pm ${k === m ? 'on' : ''}" data-a="co-method" data-m="${k}" role="radio" aria-checked="${k === m}"><span class="pm-ic" style="background:${g.color};color:${k === 'fawry' ? '#16324F' : '#fff'}">${g.mark}</span><span><b style="color:var(--navy)">${esc(L(g.name))}</b><div class="xs muted">${esc(L(g.sub))}</div></span></button>`).join('')}</div>
    <div>${form}</div>
    <div class="row between wrapx"><button type="button" class="btn btn-ghost" data-a="co-cancel-hold">${tr('إلغاء الحجز', 'Cancel booking')}</button><button class="btn btn-teal btn-lg" type="submit" id="pay-btn">${ic('lock')}${payLabel}</button></div></form>`;
}
CHANGES['card-fmt'] = (el) => { const v = el.value.replace(/\D/g, '').slice(0, 16); el.value = v.replace(/(.{4})/g, '$1 ').trim(); };
ACTIONS['co-method'] = (el) => { UI.co.method = el.dataset.m; UI.co.otpSent = false; UI.co.fawryCode = null; render(); };
ACTIONS['co-restart'] = () => { const t = UI.co.tripId; UI.co = null; go('#/trip/' + t); };
ACTIONS['co-cancel-hold'] = async () => { if (!(await confirmDialog({ title: tr('إلغاء الحجز؟', 'Cancel this booking?'), text: tr('هنفك حجز المقاعد ومش هيتم خصم أي مبلغ.', 'We’ll release the seats. Nothing will be charged.'), ok: tr('إلغاء الحجز', 'Cancel booking'), danger: true }))) return; await requestCancel(UI.co.bookingId, 'customer_abandoned'); const t = UI.co.tripId; UI.co = null; toast(tr('تم إلغاء الحجز وفك المقاعد.', 'Booking cancelled and seats released.')); go('#/trip/' + t); };
FORMS['co-pay'] = async (f) => {
  const co = UI.co, m = co.method, btn = $('#pay-btn');
  if (btn.disabled) return; // double-submit guard (idempotency key also protects the server side)
  let details = {};
  if (m === 'card') { const d = validate(f, { card: ['req', (v) => v.replace(/\s/g, '').length === 16 || tr('رقم البطاقة ١٦ رقم.', 'Card number must be 16 digits.')], holder: ['req'], exp: ['req', (v) => /^(0[1-9]|1[0-2])\/\d{2}$/.test(v) || tr('بالشكل MM/YY', 'Use MM/YY')], cvv: ['req', (v) => /^\d{3,4}$/.test(v) || tr('٣ أو ٤ أرقام', '3 or 4 digits')] }); if (!d) return; details = { card: d.card }; }
  if (m === 'wallet') { const d = validate(f, { phone: ['req', 'phone'], ...(co.otpSent ? { otp: ['req'] } : {}) }); if (!d) return; if (!co.otpSent) { busy(btn, true); await wait(700); co.otpSent = true; render(); toast(tr('تم إرسال كود التأكيد على رقم المحفظة.', 'Confirmation code sent to the wallet number.'), 'info'); return; } details = { phone: d.phone, otp: d.otp }; }
  if (m === 'fawry' && !co.fawryCode) { busy(btn, true); await wait(600); co.fawryCode = String(Math.floor(1e8 + Math.random() * 9e8)).replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3'); render(); return; }
  busy(btn, true, tr('جاري تأكيد الدفع…', 'Confirming payment…'));
  await wait(1300);
  try {
    const res = await payBooking({ bookingId: co.bookingId, method: m, idemKey: co.idemKey, details });
    if (res.failed) { co.idemKey = uid('idem'); co.otpSent = false; render(); toast(L(res.payment.failReason), 'bad'); return; }
    co.done = true; toast(tr('تم الدفع وتأكيد الحجز.', 'Payment complete — booking confirmed.'));
    go('#/me/booking/' + res.booking.ref + '?new=1');
  } catch (e) { busy(btn, false); toast(e.message, 'bad'); if (e.code === 'EXPIRED') render(); }
};
function tickHold() { const el = $('#hold-timer'); if (!el) return; const ms = new Date(el.dataset.until) - Date.now(); if (ms <= 0) { el.textContent = '00:00'; if (UI.co && UI.co.step === 3 && !UI.co.expiredShown) { UI.co.expiredShown = true; if (CLOUD) reloadCloud(); else { sweep(); render(); } } return; } el.textContent = String(Math.floor(ms / 6e4)).padStart(2, '0') + ':' + String(Math.floor(ms / 1e3) % 60).padStart(2, '0'); }
setInterval(tickHold, 1000);

/* ---------- dashboard shell (shared by customer / company / admin) ---------- */
function dashLayout(kind, title, content, actions) {
  const u = me(), h = location.hash.split('?')[0];
  const navs = {
    me: [['', tr('نظرة عامة', 'Overview'), 'grid'], ['bookings', tr('حجوزاتي', 'My bookings'), 'ticket'], ['payments', tr('المدفوعات والفواتير', 'Payments & invoices'), 'card'], ['cancellations', tr('طلبات الإلغاء', 'Cancellations'), 'refund'], ['favorites', tr('المفضلة', 'Saved trips'), 'heart'], ['reviews', tr('تقييماتي', 'My reviews'), 'star'], ['notifications', tr('الإشعارات', 'Notifications'), 'bell', unread()], ['profile', tr('بياناتي', 'My details'), 'user']],
    co: [['', tr('نظرة عامة', 'Overview'), 'grid'], ['trips', tr('الرحلات والمواعيد', 'Trips & departures'), 'map'], ['bookings', tr('الحجوزات', 'Bookings'), 'ticket', db.bookings.filter((b) => b.companyId === u.companyId && b.status === 'refund_pending').length], ['finance', tr('المستحقات', 'Earnings'), 'money'], ['reviews', tr('التقييمات', 'Reviews'), 'star'], ['notifications', tr('الإشعارات', 'Notifications'), 'bell', unread()], ['profile', tr('ملف الشركة', 'Company profile'), 'building']],
    admin: [['', tr('نظرة عامة', 'Overview'), 'grid'], ['grp', tr('التشغيل', 'Operations')], ['companies', tr('الشركات', 'Companies'), 'building', db.companies.filter((c) => c.status === 'pending').length], ['trips', tr('الرحلات', 'Trips'), 'map', db.trips.filter((t) => t.status === 'pending').length], ['customers', tr('العملاء', 'Customers'), 'users'], ['bookings', tr('الحجوزات والاسترداد', 'Bookings & refunds'), 'ticket', db.refunds.filter((r) => r.status === 'pending').length + db.disputes.filter((d) => d.status === 'open').length], ['grp', tr('المال', 'Money')], ['finance', tr('المالية والعمولات', 'Finance & commission'), 'money'], ['grp', tr('المنصة', 'Platform')], ['offers', tr('عروض المواسم', 'Seasonal offers'), 'tag', liveCampaigns().length], ['content', tr('المحتوى', 'Content'), 'layers'], ['taxonomy', tr('الوجهات والتصنيفات', 'Destinations & categories'), 'tag'], ['notifications', tr('الإشعارات', 'Notifications'), 'bell', unread()], ['settings', tr('الإعدادات', 'Settings'), 'cog']]
  }[kind];
  const base = { me: '#/me', co: '#/co', admin: '#/admin' }[kind];
  const c = kind === 'co' ? myCompany() : null;
  const roleLabel = kind === 'me' ? tr('حساب مسافر', 'Traveller account') : kind === 'co' ? tr('لوحة الشركة', 'Company dashboard') : tr('إدارة المنصة', 'Platform admin');
  return `<div class="dash"><aside class="side ${UI.side ? 'open' : ''}" aria-label="${tr('قائمة اللوحة', 'Dashboard menu')}">
    <a href="#/" class="logo">${logoMark()}<span>${tr('رحلاتي', 'Rehlati')}</span></a>
    <div class="role">${c ? coLogo(c) : `<span class="avatar" style="width:30px;height:30px;font-size:12px">${esc(initials(u.name))}</span>`}<div style="min-width:0"><b style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c ? L(c.name) : u.name)}</b>${roleLabel}</div></div>
    <nav>${navs.map(([p, l, i, n]) => p === 'grp' ? `<div class="grp">${l}</div>` : `<a href="${base}${p ? '/' + p : ''}" class="${(p ? h.startsWith(base + '/' + p) : h === base) ? 'on' : ''}">${ic(i)}<span>${l}</span>${n ? `<span class="cnt">${n}</span>` : ''}</a>`).join('')}</nav>
    <div class="side-foot"><nav><a href="#/">${ic('home')}<span>${tr('الموقع العام', 'Public site')}</span></a><a href="#" data-a="lang">${ic('globe')}<span>${LANG === 'ar' ? 'English' : 'العربية'}</span></a><a href="#" data-a="logout">${ic('logout')}<span>${tr('تسجيل الخروج', 'Log out')}</span></a></nav></div></aside>
    ${UI.side ? '<div class="scrim" data-a="side"></div>' : ''}
    <div class="main"><header class="topbar"><button class="icon-btn side-toggle" data-a="side" aria-label="${tr('القائمة', 'Menu')}">${ic('menu')}</button><h1>${title}</h1><div class="grow"></div>${actions || ''}<a class="icon-btn" href="${base}/notifications" aria-label="${tr('الإشعارات', 'Notifications')}">${ic('bell')}${unread() ? `<span class="dot">${unread()}</span>` : ''}</a></header>
    <main class="content route-fade" id="main">${content}</main></div></div>`;
}
ACTIONS.side = () => { UI.side = !UI.side; render(); };
function notifList(list) {
  if (!list.length) return `<div class="card">${empty('bell', tr('لا توجد إشعارات', 'No notifications'), tr('هنبلغك هنا بأي جديد في حجوزاتك.', 'Updates about your bookings will appear here.'))}</div>`;
  return `<div class="card"><div class="card-h"><h3>${tr('كل الإشعارات', 'All notifications')}</h3><button class="btn btn-ghost btn-sm" data-a="notif-all">${tr('تعليم الكل كمقروء', 'Mark all as read')}</button></div>${list.map((n) => `<a class="notif ${n.read ? '' : 'unread'}" href="${n.link || '#'}" data-a="notif-open" data-id="${n.id}"><span class="n-ic">${ic('bell')}</span><div class="grow"><b style="color:var(--navy)">${esc(L(n.title))}</b><p class="small muted">${esc(L(n.body))}</p></div><span class="xs faint" style="white-space:nowrap">${ago(n.createdAt)}</span></a>`).join('')}</div>`;
}
ACTIONS['notif-open'] = (el) => { tx((d) => { const n = byId(d.notifications, el.dataset.id); if (n) n.read = true; }); const l = el.getAttribute('href'); go(l && l !== '#' ? l : location.hash); };
ACTIONS['notif-all'] = () => { const ids = myNotifs().map((n) => n.id); tx((d) => d.notifications.forEach((n) => { if (ids.includes(n.id)) n.read = true; })); toast(tr('تم تعليم الكل كمقروء.', 'All marked as read.')); render(); };

/* ---------- 8. Customer dashboard ---------- */
const myBookings = () => db.bookings.filter((b) => b.customerId === me().id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
function bookingRow(b) {
  const t = tripById(b.tripId), d = depById(b.departureId), c = compById(b.companyId);
  return `<a class="card" href="#/me/booking/${b.ref}" style="display:grid;grid-template-columns:120px 1fr auto;gap:16px;padding:12px;align-items:center"><img src="${imgSrc(t.images[0])}" alt="" style="width:120px;height:84px;object-fit:cover;border-radius:12px"><div style="min-width:0"><div class="row wrapx" style="gap:8px">${badge(BSTAT, b.status)}<span class="ref xs faint" dir="ltr">${b.ref}</span></div><h3 style="font-size:15.5px;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(L(t.title))}</h3><div class="small muted row wrapx" style="gap:12px"><span>${ic('cal')} ${fmtD(d.start)}</span><span>${ic('users')} ${b.count}</span><span>${esc(L(c.name))}</span></div></div><div style="text-align:end"><div class="price num" style="font-size:17px">${money(b.total)}</div>${b.status === 'pending_payment' ? `<span class="btn btn-teal btn-sm" style="margin-top:6px">${tr('أكمل الدفع', 'Complete payment')}</span>` : ''}</div></a>`;
}
function viewMe() {
  const bs = myBookings(), up = bs.filter((b) => b.status === 'confirmed').sort((a, b) => depById(a.departureId).start.localeCompare(depById(b.departureId).start));
  const done = bs.filter((b) => b.status === 'completed'), toReview = done.filter((b) => !db.reviews.some((r) => r.bookingId === b.id));
  const spent = sum(bs.filter((b) => ['paid', 'partially_refunded'].includes(b.paymentStatus)), retained);
  const pend = bs.filter((b) => b.status === 'pending_payment');
  const next = up[0];
  const nd = next && depById(next.departureId), nt = next && tripById(next.tripId);
  return dashLayout('me', tr(`أهلًا ${me().name.split(' ')[0]}`, `Hi ${me().name.split(' ')[0]}`), `
    ${pend.map((b) => `<div class="callout warn" style="margin-bottom:12px">${ic('clock')}<div class="grow">${tr('عندك حجز في انتظار الدفع', 'You have a booking awaiting payment')}: <b>${esc(L(tripById(b.tripId).title))}</b> — ${tr('المقاعد محجوزة لحد', 'seats held until')} ${fmtDT(b.holdUntil)}</div><button class="btn btn-sm btn-sand" data-a="resume" data-id="${b.id}">${tr('أكمل الدفع', 'Complete payment')}</button></div>`).join('')}
    <div class="kpis">${kpi(tr('رحلات قادمة', 'Upcoming trips'), up.length, '', 'cal', true)}${kpi(tr('رحلات مكتملة', 'Completed trips'), done.length, '', 'check')}${kpi(tr('إجمالي المدفوع', 'Total paid'), money(spent), '', 'wallet')}${kpi(tr('بانتظار تقييمك', 'Awaiting your review'), toReview.length, toReview.length ? `<a class="btn-link" href="#/me/reviews">${tr('قيّم الآن', 'Review now')}</a>` : '', 'star')}</div>
    <div class="grid" style="grid-template-columns:1.4fr 1fr;margin-top:20px;align-items:start" id="me-grid">
      <div class="card"><div class="card-h"><h3>${tr('رحلتك الجاية', 'Your next trip')}</h3><a class="btn-link small" href="#/me/bookings">${tr('كل الحجوزات', 'All bookings')}</a></div>${next ? `<div class="card-pad"><div class="row wrapx" style="align-items:stretch;gap:18px"><img src="${imgSrc(nt.images[0])}" alt="" style="width:220px;max-width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:14px"><div class="grow stack"><h3>${esc(L(nt.title))}</h3><div class="row wrapx small muted" style="gap:14px"><span>${ic('cal')} ${fmtD(nd.start, { weekday: 'long', day: 'numeric', month: 'long' })}</span><span>${ic('users')} ${next.count}</span></div><div class="callout ok">${ic('clock')}<div>${tr(`باقي ${daysBetween(TODAY, nd.start)} يوم على السفر`, `${daysBetween(TODAY, nd.start)} days to go`)}</div></div><div class="row wrapx"><a class="btn btn-primary btn-sm" href="#/me/booking/${next.ref}">${tr('تفاصيل الحجز', 'Booking details')}</a><button class="btn btn-ghost btn-sm" data-a="dl-confirm" data-id="${next.id}">${ic('download')}${tr('تأكيد الحجز', 'Confirmation')}</button></div></div></div></div>` : empty('compass', tr('مفيش رحلات قادمة', 'No upcoming trips'), tr('اختار وجهتك الجاية واحجز في دقايق.', 'Pick your next destination and book in minutes.'), `<a class="btn btn-primary" href="#/trips">${tr('تصفح الرحلات', 'Browse trips')}</a>`)}</div>
      <div class="card"><div class="card-h"><h3>${tr('آخر الإشعارات', 'Latest notifications')}</h3><a class="btn-link small" href="#/me/notifications">${tr('الكل', 'All')}</a></div>${myNotifs().slice(0, 4).map((n) => `<a class="notif ${n.read ? '' : 'unread'}" href="${n.link}" data-a="notif-open" data-id="${n.id}"><span class="n-ic">${ic('bell')}</span><div class="grow"><b class="small" style="color:var(--navy)">${esc(L(n.title))}</b><p class="xs muted">${esc(L(n.body))}</p></div></a>`).join('') || `<p class="card-pad muted">${tr('لا يوجد جديد.', 'Nothing new.')}</p>`}</div>
    </div>
    <div class="grid" style="grid-template-columns:1fr 1.6fr;margin-top:20px;align-items:start" id="me-grid2">${topCompaniesCard(5)}
      <div class="card"><div class="card-h"><h3>${tr('رحلات نرشحها لك', 'Recommended for you')}</h3><a class="btn-link small" href="#/compare?ids=${recommendedTrips(3).map((t) => t.id).join(',')}">${tr('قارن بينهم', 'Compare them')}</a></div><div class="card-pad"><p class="small muted" style="margin-bottom:12px">${tr('من الشركات الأعلى تقييمًا، والأولوية للرحلات اللي عليها عروض.', 'From the top‑rated operators, with seasonal offers first.')}</p><div class="grid g2">${recommendedTrips(2).map(tripCard).join('') || `<p class="muted">${tr('مفيش ترشيحات حاليًا.', 'No recommendations right now.')}</p>`}</div></div></div></div>
    <div class="card" style="margin-top:20px"><div class="card-h"><h3>${tr('آخر الحجوزات', 'Recent bookings')}</h3></div><div class="card-pad stack">${bs.slice(0, 3).map(bookingRow).join('') || `<p class="muted">${tr('لا توجد حجوزات بعد.', 'No bookings yet.')}</p>`}</div></div>
    <style>@media(max-width:1000px){#me-grid,#me-grid2{grid-template-columns:1fr!important}}</style>`);
}
ACTIONS.resume = (el) => resumeCheckout(byId(db.bookings, el.dataset.id));
function viewMyBookings() {
  const tab = UI.meTab || 'current', bs = myBookings();
  const groups = { current: bs.filter((b) => ['confirmed', 'pending_payment', 'refund_pending'].includes(b.status)), past: bs.filter((b) => b.status === 'completed'), cancelled: bs.filter((b) => ['cancelled', 'refunded'].includes(b.status)) };
  const labels = { current: tr('الحالية', 'Current'), past: tr('السابقة', 'Past'), cancelled: tr('الملغاة والمستردة', 'Cancelled & refunded') };
  const list = groups[tab];
  return dashLayout('me', tr('حجوزاتي', 'My bookings'), `<div class="tabs" role="tablist">${Object.keys(groups).map((k) => `<button role="tab" aria-selected="${k === tab}" class="${k === tab ? 'on' : ''}" data-a="me-tab" data-k="${k}">${labels[k]} <span class="faint">(${groups[k].length})</span></button>`).join('')}</div>
  <div class="stack">${list.length ? list.map(bookingRow).join('') : `<div class="card">${empty('ticket', tr('لا توجد حجوزات هنا', 'Nothing here'), tab === 'current' ? tr('حجوزاتك المؤكدة والقادمة هتظهر هنا.', 'Your confirmed and upcoming bookings appear here.') : tr('هتظهر هنا بعد ما يكون عندك حجوزات.', 'They’ll appear here once you have some.'), tab === 'current' ? `<a class="btn btn-primary" href="#/trips">${tr('احجز رحلة', 'Book a trip')}</a>` : '')}</div>`}</div>`);
}
ACTIONS['me-tab'] = (el) => { UI.meTab = el.dataset.k; render(); };
function viewMyBooking(ref) {
  const b = bookingByRef(ref);
  if (!b || b.customerId !== me().id) return dashLayout('me', tr('الحجز', 'Booking'), `<div class="card">${empty('ticket', tr('الحجز غير موجود', 'Booking not found'), tr('تأكد من رقم الحجز.', 'Check the reference.'), `<a class="btn btn-primary" href="#/me/bookings">${tr('حجوزاتي', 'My bookings')}</a>`)}</div>`);
  const t = tripById(b.tripId), d = depById(b.departureId), c = compById(b.companyId), isNew = readQuery().new;
  const pays = db.payments.filter((p) => p.bookingId === b.id), rf = db.refunds.filter((r) => r.bookingId === b.id), rev = db.reviews.find((r) => r.bookingId === b.id);
  const pol = b.status === 'confirmed' ? refundPolicy(b) : null;
  return dashLayout('me', tr('تفاصيل الحجز', 'Booking details'), `
  ${isNew ? `<div class="callout ok" style="margin-bottom:16px">${ic('check')}<div><b>${tr('تم تأكيد حجزك!', 'Your booking is confirmed!')}</b> ${tr(`بعتنا الإشعار لك ولشركة ${L(c.name)}. هتلاقي التأكيد والفاتورة هنا في أي وقت.`, `We notified you and ${L(c.name)}. Your confirmation and invoice are always here.`)}</div></div>` : ''}
  <div class="pass"><div class="pass-main"><div class="row between wrapx">${badge(BSTAT, b.status)}${badge(PSTAT, b.paymentStatus)}</div><h2 style="margin-top:12px;font-size:22px">${esc(L(t.title))}</h2><div class="row small muted" style="margin-top:6px">${coLogo(c)}${esc(L(c.name))} · <span dir="ltr">${esc(c.phone)}</span></div>
    <div class="kv"><div><small>${tr('السفر', 'Departs')}</small><b>${fmtD(d.start, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</b></div><div><small>${tr('العودة', 'Returns')}</small><b>${fmtD(d.end)}</b></div><div><small>${tr('الوجهة', 'Destination')}</small><b>${esc(L(destById(t.destId).name))}</b></div><div><small>${tr('المسافرون', 'Travellers')}</small><b>${b.count}</b></div><div><small>${tr('الإقامة', 'Stay')}</small><b class="small">${esc(L(t.accommodation)).slice(0, 48)}</b></div><div><small>${tr('الانتقالات', 'Transport')}</small><b class="small">${esc(L(t.transport)).slice(0, 48)}</b></div></div></div>
    <div class="pass-stub"><div><small>${tr('رقم الحجز', 'Booking ref')}</small><b dir="ltr">${b.ref}</b></div><div><small>${tr('الإجمالي', 'Total')}</small><b class="num">${money(b.total)}</b></div><div class="barcode" aria-hidden="true"></div></div></div>
  <div class="row wrapx no-print" style="margin:16px 0 20px">
    ${b.status === 'pending_payment' ? `<button class="btn btn-teal" data-a="resume" data-id="${b.id}">${tr('أكمل الدفع', 'Complete payment')}</button>` : ''}
    ${['confirmed', 'completed', 'refund_pending'].includes(b.status) ? `<button class="btn btn-primary" data-a="dl-confirm" data-id="${b.id}">${ic('download')}${tr('تحميل تأكيد الحجز', 'Download confirmation')}</button>` : ''}
    ${pays.some((p) => p.status === 'paid') ? `<button class="btn btn-ghost" data-a="dl-invoice" data-id="${b.id}">${ic('doc')}${tr('الفاتورة', 'Invoice')}</button>` : ''}
    <button class="btn btn-ghost" onclick="window.print()">${ic('print')}${tr('طباعة', 'Print')}</button>
    ${b.status === 'completed' && !rev ? `<button class="btn btn-sand" data-a="review-open" data-id="${b.id}">${ic('star')}${tr('قيّم الرحلة', 'Review this trip')}</button>` : ''}
    ${['confirmed', 'pending_payment'].includes(b.status) ? `<button class="btn btn-danger-soft" data-a="cancel-open" data-id="${b.id}" style="margin-inline-start:auto">${tr('طلب إلغاء', 'Request cancellation')}</button>` : ''}
  </div>
  <div class="grid g2" style="align-items:start">
    <div class="card"><div class="card-h"><h3>${tr('المسافرون', 'Travellers')}</h3></div><div class="tbl-wrap"><table class="tbl"><tbody>${b.travelers.map((x, i) => `<tr><td class="faint">${i + 1}</td><td><b style="color:var(--navy)">${esc(x.name)}</b></td><td class="num">${esc(x.age)} ${tr('سنة', 'yrs')}</td><td dir="ltr">${esc(x.phone || '')}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="card"><div class="card-h"><h3>${tr('الدفع', 'Payment')}</h3></div><div class="card-pad"><div class="calc"><div class="row"><span class="muted">${money(b.unitPrice)} × ${b.count}</span><span class="num">${money(b.subtotal || b.unitPrice * b.count)}</span></div>${b.discount ? `<div class="row" style="color:var(--ok)"><span>${tr('خصم', 'Discount')} ${esc(b.promo)}</span><span class="num">− ${money(b.discount)}</span></div>` : ''}<div class="row"><b>${tr('الإجمالي', 'Total')}</b><b class="num">${money(b.total)}</b></div>${b.refunded ? `<div class="row" style="color:var(--teal-700)"><span>${tr('تم رد', 'Refunded')}</span><span class="num">${money(b.refunded)}</span></div>` : ''}</div>
      ${pays.length ? `<div style="margin-top:14px;border-top:1px solid var(--line-2);padding-top:10px">${pays.map((p) => `<div class="row between small" style="padding:6px 0"><span>${esc(L(GATEWAYS[p.method].name))}${p.meta && p.meta.last4 ? ` •••• ${p.meta.last4}` : ''} · ${fmtDT(p.createdAt)}</span><span class="row">${badge(PSTAT, p.status)}<b class="num">${money(p.amount)}</b></span></div>`).join('')}</div>` : ''}</div></div>
    ${rf.length ? `<div class="card"><div class="card-h"><h3>${tr('طلبات الاسترداد', 'Refund requests')}</h3></div><div class="card-pad stack">${rf.map((r) => `<div class="row between"><span class="small">${fmtD(r.createdAt)} · ${esc(r.reason || '')}</span><span class="row">${badge({ pending: { c: 'b-warn', l: { ar: 'قيد المراجعة', en: 'Under review' } }, approved: { c: 'b-ok', l: { ar: 'تمت الموافقة', en: 'Approved' } }, rejected: { c: 'b-bad', l: { ar: 'مرفوض', en: 'Declined' } } }, r.status)}<b class="num">${money(r.amount)}</b></span></div>`).join('')}</div></div>` : ''}
    ${rev ? `<div class="card"><div class="card-h"><h3>${tr('تقييمك', 'Your review')}</h3>${starsHTML(rev.ratings.overall)}</div><div class="card-pad"><p>${esc(rev.text)}</p>${rev.reply ? `<div class="rev"><div class="reply"><b class="small">${tr('رد الشركة', 'Company reply')}</b><p class="small">${esc(rev.reply.text)}</p></div></div>` : ''}</div></div>` : ''}
    ${pol ? `<div class="card card-pad"><h3 style="font-size:15.5px">${tr('لو ألغيت النهارده', 'If you cancel today')}</h3><p class="small muted" style="margin-top:4px">${tr(`باقي ${pol.days} يوم على السفر، فهتسترد ${pol.pct}٪ = `, `${pol.days} days before departure, so you’d get ${pol.pct}% = `)}<b class="num" style="color:var(--navy)">${money(pol.amount)}</b></p></div>` : ''}
  </div>`, `<a class="btn btn-ghost btn-sm" href="#/trip/${t.id}">${tr('صفحة الرحلة', 'Trip page')}</a>`);
}
ACTIONS['cancel-open'] = async (el) => {
  const b = byId(db.bookings, el.dataset.id); let text;
  if (b.status === 'pending_payment') text = tr('الحجز لسه ما اتدفعش. هيتلغى فورًا وهتتفك المقاعد.', 'This booking isn’t paid yet. It will be cancelled immediately and the seats released.');
  else { const p = refundPolicy(b); text = p.amount ? tr(`حسب سياسة الرحلة هتسترد ${p.pct}٪ (${money(p.amount)}). الطلب هيتراجع من إدارة رحلاتي ويرجع المبلغ بنفس طريقة الدفع.`, `Under the trip policy you’ll get ${p.pct}% back (${money(p.amount)}). Rehlati will review it and refund to the original payment method.`) : tr('باقي أقل من ٧ أيام على السفر، فمفيش استرداد حسب سياسة الرحلة. متأكد إنك عايز تلغي؟', 'It’s less than 7 days to departure, so there’s no refund under the policy. Cancel anyway?'); }
  const reason = await confirmDialog({ title: tr('إلغاء الحجز', 'Cancel booking'), text, ok: tr('تأكيد الإلغاء', 'Confirm cancellation'), danger: true, input: tr('سبب الإلغاء (اختياري)', 'Reason (optional)') });
  if (reason === false) return;
  const r = await requestCancel(b.id, reason || tr('بدون سبب', 'No reason given'));
  toast(r.kind === 'refund_pending' ? tr('تم إرسال طلب الاسترداد. هنبلغك بعد المراجعة.', 'Refund request sent. We’ll notify you after review.') : tr('تم إلغاء الحجز.', 'Booking cancelled.'));
  render();
};
ACTIONS['review-open'] = (el) => {
  const b = byId(db.bookings, el.dataset.id), t = tripById(b.tripId);
  const rows = [['overall', tr('التجربة بشكل عام', 'Overall experience')], ['organization', tr('جودة التنظيم', 'Organization')], ['service', tr('جودة الخدمة', 'Service quality')], ['punctuality', tr('الالتزام بالمواعيد', 'Punctuality')], ['company', tr('الشركة المنظمة', 'Tour company')]];
  modal({ title: tr('قيّم رحلتك', 'Review your trip'), body: `<form data-f="review" data-id="${b.id}" id="rv-form" class="stack" novalidate><p class="muted small">${esc(L(t.title))}</p>${rows.map(([k, l]) => `<div class="field" style="flex-direction:row;justify-content:space-between;align-items:center"><span class="lbl">${l}</span>${starInput(k, 0)}<span class="err-msg" style="flex-basis:100%"></span></div>`).join('')}${txa('text', tr('اكتب رأيك', 'Your review'), '', { rows: 4, hint: tr('٢٠ حرف على الأقل. هيتنشر باسمك على صفحة الرحلة.', 'At least 20 characters. Published under your name.') })}</form>`, foot: `<button class="btn btn-ghost" data-a="close-modal">${tr('إلغاء', 'Cancel')}</button><button class="btn btn-primary" data-a="review-submit">${tr('نشر التقييم', 'Publish review')}</button>` });
};
ACTIONS['review-submit'] = () => $('#rv-form').requestSubmit();
FORMS.review = async (f) => {
  const st = (v) => +v >= 1 || tr('اختر عدد النجوم.', 'Pick a rating.');
  const d = validate(f, { overall: [st], organization: [st], service: [st], punctuality: [st], company: [st], text: ['req', (v) => v.length >= 20 || tr('اكتب ٢٠ حرف على الأقل.', 'Write at least 20 characters.')] }); if (!d) return;
  const btn = $('#layer [data-a=review-submit]'); busy(btn, true);
  try { await addReview(f.dataset.id, { overall: +d.overall, organization: +d.organization, service: +d.service, punctuality: +d.punctuality, company: +d.company }, d.text); } catch (e) { busy(btn, false); throw e; }
  closeModal(); toast(tr('شكرًا! تم نشر تقييمك.', 'Thanks! Your review is published.')); render();
};
function docHTML(title, inner) {
  return `<!doctype html><html lang="${LANG}" dir="${LANG === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:"IBM Plex Sans Arabic",Tahoma,sans-serif;color:#243447;margin:40px;max-width:760px}h1{color:#16324F;font-size:24px;margin:0}table{width:100%;border-collapse:collapse;margin:16px 0}td,th{border-bottom:1px solid #E2E8EE;padding:8px;text-align:start}th{background:#F3F6F9;font-size:13px;color:#5E6E7F}.top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #20A6A6;padding-bottom:16px;margin-bottom:20px}.ref{font-family:monospace;font-size:18px;color:#16324F}.muted{color:#5E6E7F;font-size:13px}.tot{font-size:20px;color:#16324F;font-weight:700}@media print{body{margin:0}}</style></head><body>${inner}<p class="muted" style="margin-top:30px">${tr('مستند صادر من منصة رحلاتي (نسخة تجريبية).', 'Issued by Rehlati (demo prototype).')} ${fmtDT(new Date())}</p><script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`;
}
ACTIONS['dl-confirm'] = (el) => {
  const b = byId(db.bookings, el.dataset.id), t = tripById(b.tripId), d = depById(b.departureId), c = compById(b.companyId);
  download(`booking-${b.ref}.html`, docHTML(tr('تأكيد حجز', 'Booking confirmation') + ' ' + b.ref, `<div class="top"><div><h1>${tr('تأكيد حجز', 'Booking confirmation')}</h1><div class="muted">${tr('رحلاتي', 'Rehlati')}</div></div><div class="ref" dir="ltr">${b.ref}</div></div><h2 style="color:#16324F;font-size:18px">${esc(L(t.title))}</h2><table><tr><th>${tr('الشركة المنظمة', 'Operator')}</th><td>${esc(L(c.name))} — <span dir="ltr">${esc(c.phone)}</span></td></tr><tr><th>${tr('السفر', 'Departs')}</th><td>${fmtD(d.start, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</td></tr><tr><th>${tr('العودة', 'Returns')}</th><td>${fmtD(d.end, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</td></tr><tr><th>${tr('الإقامة', 'Stay')}</th><td>${esc(L(t.accommodation))}</td></tr><tr><th>${tr('الانتقالات', 'Transport')}</th><td>${esc(L(t.transport))}</td></tr><tr><th>${tr('الحالة', 'Status')}</th><td>${L(BSTAT[b.status].l)} / ${L(PSTAT[b.paymentStatus].l)}</td></tr></table><h3>${tr('المسافرون', 'Travellers')}</h3><table><tr><th>#</th><th>${tr('الاسم', 'Name')}</th><th>${tr('السن', 'Age')}</th></tr>${b.travelers.map((x, i) => `<tr><td>${i + 1}</td><td>${esc(x.name)}</td><td>${esc(x.age)}</td></tr>`).join('')}</table><p class="muted">${esc(L(t.policy))}</p>`), 'text/html;charset=utf-8');
  toast(tr('تم تنزيل تأكيد الحجز.', 'Confirmation downloaded.'));
};
ACTIONS['dl-invoice'] = (el) => {
  const b = byId(db.bookings, el.dataset.id), t = tripById(b.tripId), u = userById(b.customerId), p = db.payments.find((x) => x.bookingId === b.id && x.status === 'paid');
  download(`invoice-${b.ref}.html`, docHTML(tr('فاتورة', 'Invoice') + ' ' + b.ref, `<div class="top"><div><h1>${tr('فاتورة', 'Invoice')}</h1><div class="muted">${tr('رحلاتي – التجمع الخامس، القاهرة الجديدة', 'Rehlati – New Cairo')}</div></div><div style="text-align:end"><div class="ref" dir="ltr">INV-${b.ref.slice(3)}</div><div class="muted">${fmtD(p.createdAt)}</div></div></div><p><b>${tr('إلى:', 'Billed to:')}</b> ${esc(u.name)} — ${esc(u.email)}</p><table><tr><th>${tr('البيان', 'Item')}</th><th>${tr('الكمية', 'Qty')}</th><th>${tr('السعر', 'Price')}</th><th>${tr('الإجمالي', 'Total')}</th></tr><tr><td>${esc(L(t.title))}<div class="muted">${b.ref}</div></td><td>${b.count}</td><td>${money(b.unitPrice)}</td><td>${money(b.subtotal || b.unitPrice * b.count)}</td></tr>${b.discount ? `<tr><td colspan="3">${tr('خصم', 'Discount')} ${esc(b.promo)}</td><td>− ${money(b.discount)}</td></tr>` : ''}${b.refunded ? `<tr><td colspan="3">${tr('مسترد', 'Refunded')}</td><td>− ${money(b.refunded)}</td></tr>` : ''}</table><p class="tot">${tr('المدفوع', 'Paid')}: ${money(retained(b))}</p><p class="muted">${tr('طريقة الدفع', 'Payment method')}: ${esc(L(GATEWAYS[p.method].name))} · ${tr('رقم العملية', 'Transaction')} <span dir="ltr">${p.txn}</span></p>`), 'text/html;charset=utf-8');
  toast(tr('تم تنزيل الفاتورة.', 'Invoice downloaded.'));
};
function viewMyPayments() {
  const mine = myBookings().map((b) => b.id);
  const rows = db.payments.filter((p) => mine.includes(p.bookingId)).map((p) => ({ ...p, b: byId(db.bookings, p.bookingId) }));
  return dashLayout('me', tr('المدفوعات والفواتير', 'Payments & invoices'), dataTable({ id: 'mepay', rows, defaultSort: 'createdAt', searchText: (r) => r.b.ref + ' ' + L(tripById(r.b.tripId).title) + ' ' + r.txn, emptyIcon: 'card', emptyTitle: tr('لا توجد مدفوعات', 'No payments'), emptyText: tr('مدفوعاتك هتظهر هنا بعد أول حجز.', 'Payments appear after your first booking.'),
    filters: [{ key: 'status', label: tr('كل الحالات', 'All statuses'), options: [['paid', tr('مدفوع', 'Paid')], ['failed', tr('فشل', 'Failed')], ['refund', tr('استرداد', 'Refund')]], test: (r, v) => r.status === v }],
    cols: [{ key: 'createdAt', label: tr('التاريخ', 'Date'), render: (r) => fmtDT(r.createdAt) }, { key: 'ref', label: tr('الحجز', 'Booking'), sortVal: (r) => r.b.ref, render: (r) => `<a class="ref" href="#/me/booking/${r.b.ref}">${r.b.ref}</a><div class="xs muted">${esc(L(tripById(r.b.tripId).title)).slice(0, 40)}</div>` }, { key: 'method', label: tr('الطريقة', 'Method'), render: (r) => esc(L(GATEWAYS[r.method].name)) }, { key: 'amount', label: tr('المبلغ', 'Amount'), render: (r) => `<b class="num">${money(r.amount)}</b>` }, { key: 'status', label: tr('الحالة', 'Status'), render: (r) => badge(PSTAT, r.status) }, { key: '', label: '', sort: false, render: (r) => r.status === 'paid' ? `<button class="btn btn-ghost btn-sm" data-a="dl-invoice" data-id="${r.b.id}">${ic('doc')}${tr('فاتورة', 'Invoice')}</button>` : '' }] }));
}
function viewMyCancellations() {
  const bs = myBookings().filter((b) => ['refund_pending', 'refunded', 'cancelled'].includes(b.status));
  return dashLayout('me', tr('طلبات الإلغاء والاسترداد', 'Cancellations & refunds'), `<div class="callout" style="margin-bottom:16px">${ic('info')}<div>${tr('الإلغاء قبل ١٤ يوم = استرداد كامل، من ٧ إلى ١٤ يوم = ٥٠٪، أقل من ٧ أيام = بدون استرداد. المبلغ بيرجع بنفس طريقة الدفع خلال ٥–٧ أيام عمل.', '14+ days before = full refund, 7–14 days = 50%, under 7 days = no refund. Refunds go back to the original method within 5–7 business days.')}</div></div><div class="stack">${bs.length ? bs.map(bookingRow).join('') : `<div class="card">${empty('refund', tr('لا توجد طلبات إلغاء', 'No cancellations'), tr('لو احتجت تلغي حجز، افتح تفاصيل الحجز واضغط "طلب إلغاء".', 'To cancel, open a booking and choose “Request cancellation”.'))}</div>`}</div>`);
}
function viewMyFavorites() {
  const favs = (me().favorites || []).map(tripById).filter(Boolean);
  return dashLayout('me', tr('المفضلة', 'Saved trips'), favs.length ? `<div class="grid g3">${favs.map(tripCard).join('')}</div>` : `<div class="card">${empty('heart', tr('لسه ما حفظتش رحلات', 'No saved trips yet'), tr('اضغط على القلب في أي رحلة علشان ترجعلها بسهولة.', 'Tap the heart on any trip to come back to it later.'), `<a class="btn btn-primary" href="#/trips">${tr('تصفح الرحلات', 'Browse trips')}</a>`)}</div>`);
}
function viewMyReviews() {
  const done = myBookings().filter((b) => b.status === 'completed');
  const pending = done.filter((b) => !db.reviews.some((r) => r.bookingId === b.id));
  const mine = db.reviews.filter((r) => r.customerId === me().id);
  return dashLayout('me', tr('تقييماتي', 'My reviews'), `${pending.length ? `<div class="card" style="margin-bottom:20px"><div class="card-h"><h3>${tr('رحلات مستنية تقييمك', 'Trips waiting for your review')}</h3></div><div class="card-pad stack">${pending.map((b) => { const t = tripById(b.tripId); return `<div class="row between wrapx"><div class="row"><img src="${imgSrc(t.images[0])}" alt="" style="width:64px;height:48px;object-fit:cover;border-radius:10px"><div><b style="color:var(--navy)">${esc(L(t.title))}</b><div class="xs muted">${fmtD(depById(b.departureId).start)}</div></div></div><button class="btn btn-sand btn-sm" data-a="review-open" data-id="${b.id}">${ic('star')}${tr('قيّم الآن', 'Review now')}</button></div>`; }).join('')}</div></div>` : ''}
  <div class="card"><div class="card-h"><h3>${tr('تقييماتي المنشورة', 'My published reviews')}</h3></div><div class="card-pad">${mine.length ? mine.map((r) => `<div class="rev"><div class="row between"><a href="#/trip/${r.tripId}"><b style="color:var(--navy)">${esc(L(tripById(r.tripId).title))}</b></a>${starsHTML(r.ratings.overall)}</div><p class="small" style="margin-top:6px">${esc(r.text)}</p>${r.reply ? `<div class="reply"><b class="small">${tr('رد الشركة', 'Company reply')}</b><p class="small">${esc(r.reply.text)}</p></div>` : ''}</div>`).join('') : `<p class="muted">${tr('التقييم متاح بعد انتهاء رحلتك.', 'You can review once your trip has ended.')}</p>`}</div></div>`);
}
function viewMyProfile() {
  const u = me();
  return dashLayout('me', tr('بياناتي', 'My details'), `<div class="grid g2" style="align-items:start"><form class="card card-pad stack" data-f="me-profile" novalidate><h3>${tr('البيانات الشخصية', 'Personal details')}</h3><div class="form-grid">${inp('username', tr('اسم المستخدم', 'Username'), u.username || u.email.split('@')[0], { attrs: 'dir="ltr" readonly disabled' })}${inp('email_ro', tr('البريد', 'Email'), u.email, { attrs: 'dir="ltr" readonly disabled' })}</div>${inp('name', tr('الاسم', 'Name'), u.name)}${inp('phone', tr('الموبايل', 'Mobile'), u.phone, { type: 'tel', attrs: 'dir="ltr"' })}${inp('city', tr('المدينة', 'City'), u.city || '')}<div><button class="btn btn-primary" type="submit">${tr('حفظ التغييرات', 'Save changes')}</button></div></form>
  ${passwordCard()}</div>`);
}
FORMS['me-profile'] = (f) => { const d = validate(f, { name: ['req', (v) => v.length >= 3 || tr('اكتب اسمك بالكامل.', 'Enter your full name.')], phone: ['req', 'phone'] }); if (!d) return; tx((x) => Object.assign(byId(x.users, me().id), { name: d.name, phone: d.phone, city: d.city })); toast(tr('تم حفظ بياناتك.', 'Details saved.')); render(); };
const passwordCard = () => `<form class="card card-pad stack" data-f="me-pass" novalidate><h3>${tr('تغيير كلمة المرور', 'Change password')}</h3>${inp('old', tr('كلمة المرور الحالية', 'Current password'), '', { type: 'password', attrs: 'dir="ltr" autocomplete="current-password"' })}${inp('nw', tr('كلمة المرور الجديدة', 'New password'), '', { type: 'password', attrs: 'dir="ltr" autocomplete="new-password"', hint: tr('٦ أحرف على الأقل', 'At least 6 characters') })}${inp('nw2', tr('تأكيد كلمة المرور الجديدة', 'Confirm new password'), '', { type: 'password', attrs: 'dir="ltr" autocomplete="new-password"' })}<div><button class="btn btn-ghost" type="submit">${tr('تحديث كلمة المرور', 'Update password')}</button></div></form>`;
FORMS['me-pass'] = async (f) => {
  const d = validate(f, { old: ['req'], nw: ['req', 'min6', (v, a) => v !== a.old || tr('اختر كلمة مرور مختلفة عن الحالية.', 'Choose a different password.')], nw2: ['req', (v, a) => v === a.nw || tr('كلمتا المرور غير متطابقتين.', 'Passwords don’t match.')] }); if (!d) return;
  const btn = $('button[type=submit]', f); busy(btn, true);
  try { await changePassword(d.old, d.nw); f.reset(); toast(tr('تم تحديث كلمة المرور.', 'Password updated.')); }
  catch (e) { const fe = f.elements.old.closest('.field'); fe.classList.add('err'); $('.err-msg', fe).textContent = e.message; }
  finally { busy(btn, false); }
};
