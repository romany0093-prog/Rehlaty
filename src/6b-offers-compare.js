
/* ---------- 6b. Seasonal offers, platform rating, trip comparison ---------- */
const seasonChip = (c) => { const s = SEASONS[c.season] || SEASONS.christmas; return `<span class="offer-chip" style="background:${s.c}">${ic(s.i)}${esc(L(s.l))}</span>`; };
const starPath = '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>';
/** UTravel's own rating of a company: n of 5 filled stars */
const pStars = (n) => `<span class="pstars" role="img" aria-label="${tr(`${n} من ٥`, `${n} of 5`)}">${[1, 2, 3, 4, 5].map((i) => `<svg viewBox="0 0 24 24" class="${i <= n ? 'on' : ''}">${starPath}</svg>`).join('')}</span>`;
const prate = (c) => (c && c.platformRating ? `<span class="prate" title="${tr('تقييم فريق UTravel للشركة', 'UTravel team’s rating of this company')}">${pStars(c.platformRating)}${tr('تقييم UTravel', 'UTravel rating')}</span>` : '');

/* ---- homepage: live seasonal offers ---- */
function campaignCard(c) {
  const co = compById(c.companyId), trips = (c.tripIds || []).map(tripById).filter((t) => t && publicTrips().includes(t));
  if (!co || !trips.length) return '';
  const from = Math.min(...trips.map((t) => offerPrice(tripStats(t).minPrice, c)));
  return `<a class="camp" href="#/trips?offer=${c.id}"><img src="${imgSrc(trips[0].images[0])}" alt=""><span class="top">${seasonChip(c)}</span><span class="pct">−${c.percent}٪<small>${tr('خصم', 'off')}</small></span>
    <div class="cb"><h3>${esc(L(c.title))}</h3><p>${esc(L(c.note || {}))}</p><div class="row wrapx small" style="color:#D6E2EC;gap:10px">${coLogo(co)}<span>${esc(L(co.name))}</span><span>· ${tr(`${trips.length} رحلة`, `${trips.length} trips`)}</span><span>· ${tr('حتى', 'until')} ${fmtD(c.until)}</span></div>
    <div class="row between" style="margin-top:6px"><span class="price num" style="color:#fff"><small style="color:#B9C7D4">${tr('يبدأ من / للفرد', 'From / person')}</small>${money(from)}</span><span class="btn btn-sand btn-sm">${tr('شوف الرحلات', 'See trips')}</span></div></div></a>`;
}
function homeOffers() {
  const live = liveCampaigns().map(campaignCard).filter(Boolean);
  if (!live.length) return '';
  return `<section class="sec" style="padding-bottom:16px"><div class="wrap"><div class="sec-h"><div><h2>${tr('عروض الموسم', 'Seasonal offers')}</h2><p>${tr('خصومات متفق عليها مع شركات السياحة، والخصم بيتطبق تلقائيًا وقت الحجز.', 'Discounts agreed with tour operators — applied automatically when you book.')}</p></div><a class="btn btn-ghost btn-sm" href="#/offers">${tr('كل العروض', 'All offers')}</a></div>
    <div class="grid ${live.length === 2 ? 'g2' : 'g3'}">${live.slice(0, 3).join('')}</div></div></section>`;
}
function viewOffers() {
  const live = liveCampaigns(), soon = campaigns().filter((c) => campaignState(c) === 'upcoming' && (compById(c.companyId) || {}).status === 'approved');
  const band = (c) => { const co = compById(c.companyId), trips = (c.tripIds || []).map(tripById).filter((t) => t && publicTrips().includes(t)); if (!trips.length) return ''; return `<section class="camp-band" style="margin-bottom:24px" id="${c.id}"><div class="bh">${seasonChip(c)}<div class="grow"><h2 style="font-size:20px">${esc(L(c.title))}</h2><p class="small muted">${esc(L(c.note || {}))} · ${esc(L(co.name))} · ${tr(`للحجز من ${fmtD(c.from)} حتى ${fmtD(c.until)}`, `Book ${fmtD(c.from)} – ${fmtD(c.until)}`)}</p></div><span class="price num" style="color:var(--ok)">−${c.percent}٪</span></div><div class="card-pad"><div class="grid g3">${trips.map(tripCard).join('')}</div></div></section>`; };
  return publicLayout(`<section class="phead"><div class="wrap"><h1>${tr('عروض الموسم', 'Seasonal offers')}</h1><p>${tr('عروض الكريسماس ونصف العام والصيف والعيد، بالاتفاق مع شركات السياحة على UTravel.', 'Christmas, mid‑year, summer and Eid offers agreed with UTravel’s tour operators.')}</p></div></section>
  <div class="wrap sec" style="padding-top:28px">${live.length ? live.map(band).join('') : `<div class="card">${empty('tag', tr('مفيش عروض شغالة دلوقتي', 'No offers running right now'), tr('تابعنا، العروض الجاية هتظهر هنا.', 'Upcoming offers will appear here.'), `<a class="btn btn-primary" href="#/trips">${tr('تصفح كل الرحلات', 'Browse all trips')}</a>`)}</div>`}
  ${soon.length ? `<h2 style="margin:12px 0 14px">${tr('عروض قادمة', 'Coming soon')}</h2><div class="grid g3">${soon.map((c) => `<div class="card card-pad stack">${seasonChip(c)}<h3>${esc(L(c.title))}</h3><p class="small muted">${esc(L((compById(c.companyId) || {}).name))} · ${tr(`تبدأ ${fmtD(c.from)}`, `Starts ${fmtD(c.from)}`)}</p><b style="color:var(--ok)">${tr(`خصم ${c.percent}٪`, `${c.percent}% off`)}</b></div>`).join('')}</div>` : ''}</div>`);
}

/* ---- comparison: up to 4 trips, a separate list per account on this device ----
   Key = rehlati_compare:<user id> (or :guest). Logging out or switching account
   switches lists. A guest's picks move into the account when they log in. */
const CMP_MAX = 4, CMP_MEM = {};
try { localStorage.removeItem('rehlati_compare'); } catch (e) { } // old shared list from before accounts were separated
const cmpKey = (who) => 'rehlati_compare:' + (who || (me() ? me().id : 'guest'));
function cmpRead(key) { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { return CMP_MEM[key] || []; } }
function cmpWrite(key, a) { CMP_MEM[key] = a; try { a.length ? localStorage.setItem(key, JSON.stringify(a)) : localStorage.removeItem(key); } catch (e) { } }
function cmpList() {
  const key = cmpKey(); let a = cmpRead(key);
  if (me()) { const g = cmpRead(cmpKey('guest')); if (g.length) { a = a.concat(g.filter((id) => !a.includes(id))); cmpWrite(cmpKey('guest'), []); cmpWrite(key, a.slice(0, CMP_MAX)); } }
  return a.filter((id) => tripById(id) && publicTrips().includes(tripById(id))).slice(0, CMP_MAX);
}
function cmpSave(a) { cmpWrite(cmpKey(), a.slice(0, CMP_MAX)); }
const cmpBtn = (t) => { const on = cmpList().includes(t.id); return `<button class="cmp-btn ${on ? 'on' : ''}" data-a="cmp-toggle" data-id="${t.id}" aria-pressed="${on}" title="${tr('أضف للمقارنة', 'Add to compare')}"><span class="bx">${on ? ic('check') : ''}</span>${tr('قارن', 'Compare')}</button>`; };
function cmpTray() {
  const a = cmpList(); if (!a.length || (location.hash || '').startsWith('#/compare')) return '';
  return `<div class="cmp-tray" role="region" aria-label="${tr('المقارنة', 'Comparison')}"><div class="th">${a.map((id) => `<img src="${imgSrc(tripById(id).images[0])}" alt="" title="${esc(L(tripById(id).title))}">`).join('')}${'<span class="slot"></span>'.repeat(CMP_MAX - a.length)}</div><span class="small">${tr(`${a.length} من ${CMP_MAX} رحلات`, `${a.length} of ${CMP_MAX} trips`)}</span><a class="btn btn-teal btn-sm" href="#/compare">${tr('قارن الآن', 'Compare now')}</a><button class="icon-btn" style="width:32px;height:32px;background:transparent;border-color:rgba(255,255,255,.25);color:#fff" data-a="cmp-clear" aria-label="${tr('مسح المقارنة', 'Clear comparison')}">${ic('x')}</button></div>`;
}
ACTIONS['cmp-toggle'] = (el) => {
  const id = el.dataset.id, a = cmpList(), i = a.indexOf(id);
  if (i >= 0) a.splice(i, 1);
  else { if (a.length >= CMP_MAX) return toast(tr(`تقدر تقارن ${CMP_MAX} رحلات بحد أقصى. شيل رحلة الأول.`, `You can compare up to ${CMP_MAX} trips. Remove one first.`), 'info'); a.push(id); }
  cmpSave(a);
  if (i < 0 && a.length === 1) toast(tr('اتضافت للمقارنة. اختار رحلة تانية علشان تقارن.', 'Added. Pick another trip to compare.'), 'info');
  const y = scrollY; render(); scrollTo(0, y);
};
ACTIONS['cmp-clear'] = () => { cmpSave([]); const y = scrollY; render(); scrollTo(0, y); };
ACTIONS['cmp-remove'] = (el) => { cmpSave(cmpList().filter((x) => x !== el.dataset.id)); history.replaceState(null, '', '#/compare'); render(); };
CHANGES['cmp-add'] = (el) => { if (!el.value) return; const a = cmpList(); if (a.length >= CMP_MAX) { el.value = ''; return toast(tr(`الحد الأقصى ${CMP_MAX} رحلات.`, `Maximum ${CMP_MAX} trips.`), 'info'); } if (!a.includes(el.value)) a.push(el.value); cmpSave(a); history.replaceState(null, '', '#/compare'); render(); };
const pickBy = (filterFn) => publicTrips().filter(filterFn).sort((a, b) => tripStats(b).rating - tripStats(a).rating).slice(0, CMP_MAX).map((t) => t.id);
CHANGES['cmp-dest'] = (el) => { if (!el.value) return; cmpSave(pickBy((t) => t.destId === el.value)); history.replaceState(null, '', '#/compare'); render(); };
CHANGES['cmp-co'] = (el) => { if (!el.value) return; cmpSave(pickBy((t) => t.companyId === el.value)); history.replaceState(null, '', '#/compare'); render(); };
CHANGES['cmp-sort'] = (el) => { UI.cmpSort = el.value; render(); };
function viewCompare() {
  const q = readQuery();
  if (q.ids) cmpSave(q.ids.split(',').filter((id) => tripById(id)).slice(0, CMP_MAX));
  else if (q.dest) cmpSave(pickBy((t) => t.destId === q.dest));
  else if (q.co) cmpSave(pickBy((t) => t.companyId === q.co));
  let ids = cmpList();
  const rows = ids.map((id) => { const t = tripById(id), s = tripStats(t), c = compById(t.companyId), cr = companyRating(c.id), camp = tripCampaign(t), price = offerPrice(s.minPrice, camp); return { t, s, c, cr, camp, price, perDay: Math.round(price / t.days), seats: s.next ? s.remaining : 0 }; });
  const sorts = { price: (a, b) => a.price - b.price, rating: (a, b) => b.s.rating - a.s.rating, company: (a, b) => ((b.c.platformRating || 0) - (a.c.platformRating || 0)) || (b.cr.avg - a.cr.avg), dest: (a, b) => L(destById(a.t.destId).name).localeCompare(L(destById(b.t.destId).name)) };
  if (UI.cmpSort && sorts[UI.cmpSort]) rows.sort(sorts[UI.cmpSort]);
  const best = (vals, dir) => { const v = vals.filter((x) => x > 0); if (rows.length < 2 || !v.length) return null; return dir === 'min' ? Math.min(...v) : Math.max(...v); };
  const bPrice = best(rows.map((r) => r.price), 'min'), bDay = best(rows.map((r) => r.perDay), 'min'), bRate = best(rows.map((r) => r.s.rating), 'max'), bCo = best(rows.map((r) => r.cr.avg), 'max'), bPr = best(rows.map((r) => +r.c.platformRating || 0), 'max'), bSeats = best(rows.map((r) => r.seats), 'max');
  const cell = (val, isBest, html) => `<td class="${isBest && val === isBest ? 'best' : ''}">${html}${isBest != null && val === isBest ? `<span class="best-tag">${tr('الأفضل', 'Best')}</span>` : ''}</td>`;
  const tripOpts = db.destinations.map((d) => { const ts = publicTrips().filter((t) => t.destId === d.id && !ids.includes(t.id)); return ts.length ? `<optgroup label="${esc(L(d.name))}">${ts.map((t) => `<option value="${t.id}">${esc(L(t.title))} — ${esc(L(compById(t.companyId).name))}</option>`).join('')}</optgroup>` : ''; }).join('');
  const tools = `<div class="card card-pad" style="margin-bottom:18px"><div class="grid g4" style="gap:14px;align-items:end">
    <div class="field"><label for="cmp-add">${tr('أضف رحلة للمقارنة', 'Add a trip')}</label><select class="select" id="cmp-add" data-ch="cmp-add" ${ids.length >= CMP_MAX ? 'disabled' : ''}><option value="">${ids.length >= CMP_MAX ? tr('وصلت للحد الأقصى (٤)', 'Maximum reached (4)') : tr('اختر رحلة…', 'Choose a trip…')}</option>${tripOpts}</select></div>
    <div class="field"><label for="cmp-dest">${tr('قارن رحلات وجهة', 'Compare a destination')}</label><select class="select" id="cmp-dest" data-ch="cmp-dest"><option value="">${tr('اختر الوجهة…', 'Choose destination…')}</option>${db.destinations.filter((d) => publicTrips().some((t) => t.destId === d.id)).map((d) => `<option value="${d.id}">${esc(L(d.name))} (${publicTrips().filter((t) => t.destId === d.id).length})</option>`).join('')}</select></div>
    <div class="field"><label for="cmp-co">${tr('قارن رحلات شركة', 'Compare an operator')}</label><select class="select" id="cmp-co" data-ch="cmp-co"><option value="">${tr('اختر الشركة…', 'Choose operator…')}</option>${db.companies.filter((c) => c.status === 'approved' && publicTrips().some((t) => t.companyId === c.id)).map((c) => `<option value="${c.id}">${esc(L(c.name))}</option>`).join('')}</select></div>
    <div class="field"><label for="cmp-sort">${tr('رتّب الأعمدة حسب', 'Order columns by')}</label><select class="select" id="cmp-sort" data-ch="cmp-sort"><option value="">${tr('ترتيب الإضافة', 'Order added')}</option>${[['price', tr('السعر: الأقل أولًا', 'Price: lowest first')], ['rating', tr('تقييم الرحلة', 'Trip rating')], ['company', tr('تقييم الشركة', 'Company rating')], ['dest', tr('الوجهة', 'Destination')]].map(([v, l]) => `<option value="${v}" ${UI.cmpSort === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
  </div></div>`;
  const R = (label, fn) => `<tr><th scope="row">${label}</th>${rows.map(fn).join('')}</tr>`;
  const table = rows.length ? `<div class="cmp-wrap"><table class="cmp"><thead><tr><th scope="row" style="vertical-align:bottom">${tr(`${rows.length} رحلات`, `${rows.length} trips`)}${rows.length > 1 ? `<div style="margin-top:8px"><button class="btn-link small" data-a="cmp-clear">${tr('مسح الكل', 'Clear all')}</button></div>` : ''}</th>${rows.map((r) => `<td class="tt"><img src="${imgSrc(r.t.images[0])}" alt=""><a href="#/trip/${r.t.id}"><b style="color:var(--navy)">${esc(L(r.t.title))}</b></a><div style="margin-top:8px"><button class="btn-link small" data-a="cmp-remove" data-id="${r.t.id}">${tr('إزالة', 'Remove')}</button></div></td>`).join('')}</tr></thead><tbody>
    ${R(tr('الوجهة', 'Destination'), (r) => `<td><span class="row" style="gap:5px;color:var(--teal-700);font-weight:600">${ic('pin')}${esc(L(destById(r.t.destId).name))}</span><div class="xs muted">${esc(L(catById(r.t.catId).name))}</div></td>`)}
    ${R(tr('الشركة', 'Operator'), (r) => `<td><a class="row" href="#/company/${r.c.id}" style="gap:8px">${coLogo(r.c)}<b style="color:var(--navy)">${esc(L(r.c.name))}</b></a></td>`)}
    ${R(tr('تقييم UTravel للشركة', 'UTravel rating'), (r) => cell(+r.c.platformRating || 0, bPr, r.c.platformRating ? pStars(r.c.platformRating) : `<span class="faint">${tr('لم تُقيَّم بعد', 'Not rated yet')}</span>`))}
    ${R(tr('تقييم العملاء للشركة', 'Customer rating (company)'), (r) => cell(r.cr.avg, bCo, starsHTML(r.cr.avg, r.cr.count)))}
    ${R(tr('تقييم الرحلة', 'Trip rating'), (r) => cell(r.s.rating, bRate, starsHTML(r.s.rating, r.s.reviews)))}
    ${R(tr('السعر يبدأ من / للفرد', 'From / person'), (r) => cell(r.price, bPrice, `<b class="price num" style="font-size:18px">${money(r.price)}</b>${r.camp ? `<div><s class="was">${money(r.s.minPrice)}</s> ${seasonChip(r.camp)}</div>` : ''}`))}
    ${R(tr('السعر لليوم الواحد', 'Price per day'), (r) => cell(r.perDay, bDay, `<span class="num">${money(r.perDay)}</span>`))}
    ${R(tr('المدة', 'Duration'), (r) => `<td>${nightsLabel(r.t.days)}</td>`)}
    ${R(tr('أقرب موعد', 'Next departure'), (r) => `<td>${r.s.next ? fmtD(r.s.next.start, { weekday: 'short', day: 'numeric', month: 'short' }) : '—'}<div class="xs muted">${tr(`${r.s.deps.length} موعد متاح`, `${r.s.deps.length} dates`)}</div></td>`)}
    ${R(tr('المقاعد المتاحة', 'Seats left'), (r) => cell(r.seats, bSeats, `<span class="num">${r.seats}</span>`))}
    ${R(tr('الإقامة', 'Stay'), (r) => `<td class="small">${esc(L(r.t.accommodation))}</td>`)}
    ${R(tr('الانتقالات', 'Transport'), (r) => `<td class="small">${esc(L(r.t.transport))}</td>`)}
    ${R(tr('السعر يشمل', 'Included'), (r) => `<td><ul class="ticklist tick-ok small">${r.t.included.map((x) => `<li>${ic('check')}${esc(L(x))}</li>`).join('')}</ul></td>`)}
    ${R('', (r) => `<td><a class="btn btn-teal btn-sm btn-block" href="#/trip/${r.t.id}">${tr('التفاصيل والحجز', 'Details & booking')}</a></td>`)}
  </tbody></table></div>${rows.length === 1 ? `<div class="callout" style="margin-top:14px">${ic('info')}<div>${tr('أضف رحلة تانية على الأقل علشان تظهر أفضل قيمة في كل صف.', 'Add at least one more trip to see the best value in each row.')}</div></div>` : ''}`
    : `<div class="card">${empty('layers', tr('لسه ما اخترتش رحلات للمقارنة', 'No trips to compare yet'), tr('اضغط "قارن" على أي رحلة، أو اختار وجهة أو شركة من فوق وهنجيبلك أعلى رحلاتها تقييمًا.', 'Tap “Compare” on any trip, or pick a destination or operator above and we’ll load its top‑rated trips.'), `<a class="btn btn-primary" href="#/trips">${tr('تصفح الرحلات', 'Browse trips')}</a>`)}</div>`;
  return publicLayout(`<section class="phead"><div class="wrap"><h1>${tr('قارن بين الرحلات', 'Compare trips')}</h1><p>${tr('قارن لحد ٤ رحلات بالوجهة والشركة والسعر والتقييم. الخانة الخضرا هي الأفضل في كل صف.', 'Compare up to 4 trips by destination, operator, price and rating. Green cells are the best in each row.')}</p></div></section>
  <div class="wrap sec" style="padding-top:24px">${tools}${table}</div>`);
}

/* ---- customer dashboard: top-rated companies & recommended trips ---- */
function topCompaniesCard(limit) {
  const list = rankedCompanies().slice(0, limit || 5);
  if (!list.length) return '';
  return `<div class="card"><div class="card-h"><h3>${tr('الشركات الأعلى تقييمًا', 'Top‑rated operators')}</h3><a class="btn-link small" href="#/companies">${tr('كل الشركات', 'All operators')}</a></div><div class="card-pad stack">
    ${list.map((x, i) => `<a class="row" href="#/company/${x.c.id}" style="gap:12px;align-items:center"><span class="rank ${i === 0 ? 'r1' : ''}">${i + 1}</span>${coLogo(x.c, 'md')}<div class="grow" style="min-width:0"><b style="color:var(--navy)">${esc(L(x.c.name))}</b><div class="row wrapx xs muted" style="gap:10px;margin-top:2px">${x.pr ? `<span class="row" style="gap:4px">${pStars(x.pr)}${tr('UTravel', 'UTravel')}</span>` : ''}<span>${starsHTML(x.cr.avg, x.cr.count)}</span><span>${tr(`${x.trips} رحلة`, `${x.trips} trips`)}</span></div></div>${ic(LANG === 'ar' ? 'chev' : 'chevr')}</a>`).join('')}
    <p class="xs faint">${tr('الترتيب حسب تقييم فريق UTravel للشركة، وبعده تقييمات العملاء اللي سافروا معاها.', 'Ranked by the UTravel team’s rating, then by reviews from travellers who went with them.')}</p></div></div>`;
}
function recommendedTrips(n) {
  const u = me(), mine = new Set(db.bookings.filter((b) => b.customerId === (u || {}).id).map((b) => b.tripId));
  const rank = new Map(rankedCompanies().map((x, i) => [x.c.id, i]));
  const pool = publicTrips().filter((t) => !mine.has(t.id) && tripStats(t).avail.length && rank.has(t.companyId))
    .sort((a, b) => (rank.get(a.companyId) - rank.get(b.companyId)) || ((tripCampaign(b) ? 1 : 0) - (tripCampaign(a) ? 1 : 0)) || (tripStats(b).rating - tripStats(a).rating));
  // one trip from each top company first, then fill
  const out = [], seen = new Set(); n = n || 3;
  pool.forEach((t) => { if (out.length < n && !seen.has(t.companyId)) { out.push(t); seen.add(t.companyId); } });
  pool.forEach((t) => { if (out.length < n && !out.includes(t)) out.push(t); });
  return out;
}
