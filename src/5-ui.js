
/* ---------- 5. UI kit ---------- */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const ACTIONS = {}, FORMS = {}, CHANGES = {};
const UI = { tables: {}, tableState: {}, menu: null, mnav: false, side: false, after: [] };

function toast(msg, kind) {
  const el = document.createElement('div');
  el.className = 'toast ' + (kind || 'ok');
  el.innerHTML = ic(kind === 'bad' ? 'alert' : kind === 'info' ? 'info' : 'check') + `<div>${msg}</div>`;
  $('#toasts').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, kind === 'bad' ? 5200 : 3400);
}
function closeModal() { $('#layer').innerHTML = ''; document.body.style.overflow = ''; }
function modal({ title, body, foot, wide, onOpen }) {
  $('#layer').innerHTML = `<div class="modal-bg"><div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-h"><h3>${title}</h3><button class="icon-btn" data-a="close-modal" aria-label="${tr('إغلاق', 'Close')}">${ic('x')}</button></div><div class="modal-b">${body}</div>${foot ? `<div class="modal-f">${foot}</div>` : ''}</div></div>`;
  document.body.style.overflow = 'hidden';
  const f = $('#layer input, #layer select, #layer textarea, #layer .modal-f .btn'); if (f) setTimeout(() => f.focus(), 30);
  if (onOpen) onOpen($('#layer .modal'));
}
/** confirmDialog → Promise<boolean>. Used for every destructive action. */
function confirmDialog({ title, text, ok, danger, input }) {
  return new Promise((res) => {
    modal({ title, body: `<p class="muted">${text}</p>${input ? `<div class="field" style="margin-top:14px"><label for="cf-in">${input}</label><textarea class="textarea" id="cf-in" rows="3"></textarea></div>` : ''}`,
      foot: `<button class="btn btn-ghost" data-a="cf-no">${tr('رجوع', 'Go back')}</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-a="cf-yes">${ok}</button>` });
    ACTIONS['cf-yes'] = () => { const v = input ? $('#cf-in').value.trim() : true; closeModal(); res(v || (input ? '' : true)); };
    ACTIONS['cf-no'] = () => { closeModal(); res(false); };
  });
}
ACTIONS['close-modal'] = closeModal;
// clicking the dimmed backdrop (not the dialog) closes it
document.addEventListener('click', (e) => { if (e.target.classList && e.target.classList.contains('modal-bg')) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if ($('#layer').innerHTML) closeModal(); if (UI.menu) { UI.menu = null; render(); } } });

/* event delegation */
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-a]');
  if (UI.menu && !e.target.closest('.user-menu')) { UI.menu = null; $$('.menu').forEach((m) => m.remove()); }
  if (!a) return;
  const fn = ACTIONS[a.dataset.a];
  if (fn) { e.preventDefault(); try { const r = fn(a, e); if (r && r.catch) r.catch(handleErr); } catch (err) { handleErr(err); } }
});
document.addEventListener('submit', (e) => {
  const f = e.target.closest('form[data-f]'); if (!f) return;
  e.preventDefault();
  const fn = FORMS[f.dataset.f]; if (fn) { try { const r = fn(f, e); if (r && r.catch) r.catch(handleErr); } catch (err) { handleErr(err); } }
});
document.addEventListener('input', (e) => { const el = e.target.closest('[data-on]'); if (el && CHANGES[el.dataset.on]) CHANGES[el.dataset.on](el, e); const fe = e.target.closest('.field.err'); if (fe) fe.classList.remove('err'); });
document.addEventListener('change', (e) => { const el = e.target.closest('[data-ch]'); if (el && CHANGES[el.dataset.ch]) CHANGES[el.dataset.ch](el, e); });
function handleErr(err) {
  console.error(err);
  if (err && err.code === 'STORAGE_FULL') return toast(tr('مساحة التخزين في المتصفح امتلأت. صغّر الصور أو أعد ضبط البيانات التجريبية.', 'Browser storage is full. Use smaller images or reset the demo data.'), 'bad');
  toast((err && err.message) || tr('حدث خطأ غير متوقع.', 'Something went wrong.'), 'bad');
}

/* forms: tiny validation layer (Zod-like rules per field) */
function formData(form) { const o = {}; new FormData(form).forEach((v, k) => { if (o[k] !== undefined) { o[k] = [].concat(o[k], v); } else o[k] = typeof v === 'string' ? v.trim() : v; }); return o; }
const RULES = {
  req: (v) => (v !== '' && v != null) || tr('هذا الحقل مطلوب.', 'This field is required.'),
  email: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || tr('اكتب بريدًا صحيحًا مثل name@mail.com', 'Enter a valid email like name@mail.com'),
  phone: (v) => !v || /^01[0125]\d{8}$/.test(v.replace(/\s/g, '')) || tr('رقم موبايل مصري من ١١ رقم يبدأ بـ 01', 'An 11‑digit Egyptian mobile starting with 01'),
  pw: (v) => !v || v.length >= 8 || tr('٨ أحرف على الأقل.', 'At least 8 characters.'),
  username: (v) => !v || /^[a-z0-9_.]{3,24}$/.test(v.toLowerCase()) || tr('من ٣ إلى ٢٤ حرف إنجليزي أو أرقام أو _ أو . بدون مسافات.', '3–24 letters, numbers, _ or . — no spaces.'),
  pos: (v) => v === '' || +v > 0 || tr('أدخل رقمًا أكبر من صفر.', 'Enter a number above zero.'),
  int: (v) => v === '' || Number.isInteger(+v) || tr('رقم صحيح فقط.', 'Whole numbers only.'),
  future: (v) => !v || new Date(v) > TODAY || tr('اختر تاريخًا بعد اليوم.', 'Pick a date after today.'),
  pct: (v) => v === '' || (+v >= 0 && +v <= 50) || tr('نسبة من ٠ إلى ٥٠.', 'A rate from 0 to 50.')
};
function validate(form, spec) {
  let ok = true, first = null;
  $$('.field.err', form).forEach((f) => f.classList.remove('err'));
  const data = formData(form);
  Object.entries(spec).forEach(([name, rules]) => {
    const el = form.elements[name]; if (!el) return;
    const v = data[name] == null ? '' : data[name];
    for (const r of rules) {
      const res = typeof r === 'function' ? r(v, data) : RULES[r](v);
      if (res !== true) { ok = false; const fld = (el.closest ? el : el[0]).closest('.field'); if (fld) { fld.classList.add('err'); const m = $('.err-msg', fld); if (m) m.textContent = res; } if (!first) first = el.focus ? el : el[0]; break; }
    }
  });
  if (first && first.focus) first.focus();
  return ok ? data : null;
}
const fld = (name, label, inner, opts) => `<div class="field ${opts && opts.full ? 'full' : ''}">${label ? `<label for="f-${name}">${label}</label>` : ''}${inner}${opts && opts.hint ? `<span class="hint">${opts.hint}</span>` : ''}<span class="err-msg"></span></div>`;
const inp = (name, label, val, opts) => fld(name, label, `<input class="input" id="f-${name}" name="${name}" value="${esc(val == null ? '' : val)}" type="${(opts && opts.type) || 'text'}" ${opts && opts.ph ? `placeholder="${esc(opts.ph)}"` : ''} ${opts && opts.attrs || ''}>`, opts);
const sel = (name, label, options, val, opts) => fld(name, label, `<select class="select" id="f-${name}" name="${name}" ${opts && opts.attrs || ''}>${options.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`, opts);
const txa = (name, label, val, opts) => fld(name, label, `<textarea class="textarea" id="f-${name}" name="${name}" rows="${(opts && opts.rows) || 4}">${esc(val || '')}</textarea>`, opts);

function busy(btn, on, label) {
  if (!btn) return;
  if (on) { btn.dataset.lbl = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="spin"></span>${label || ''}`; }
  else { btn.disabled = false; if (btn.dataset.lbl) btn.innerHTML = btn.dataset.lbl; }
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function readImage(file, max) {
  return new Promise((res, rej) => {
    if (!file || !/^image\//.test(file.type)) return rej(new AppError('IMG', tr('اختر ملف صورة (JPG أو PNG).', 'Choose an image file (JPG or PNG).')));
    const fr = new FileReader();
    fr.onload = () => { const img = new Image(); img.onload = () => { const s = Math.min(1, (max || 1280) / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.8)); }; img.onerror = () => rej(new AppError('IMG', tr('تعذر قراءة الصورة.', 'Couldn’t read the image.'))); img.src = fr.result; };
    fr.readAsDataURL(file);
  });
}
function download(name, content, type) {
  const blob = new Blob([content], { type: type || 'text/plain;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function toCSV(rows, cols) {
  const q = (v) => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return '﻿' + [cols.map((c) => q(c.label)).join(','), ...rows.map((r) => cols.map((c) => q(c.csv ? c.csv(r) : r[c.key])).join(','))].join('\n');
}

/* ---------- data table: search, filters, sortable columns, paging, CSV ---------- */
function dataTable(cfg) {
  UI.tables[cfg.id] = cfg;
  const st = UI.tableState[cfg.id] = UI.tableState[cfg.id] || { q: '', sort: cfg.defaultSort || null, dir: cfg.defaultDir || 'desc', page: 0, f: {} };
  const filters = (cfg.filters || []).map((f) => `<select class="select" data-ch="tbl-filter" data-t="${cfg.id}" data-k="${f.key}" aria-label="${esc(f.label)}"><option value="">${esc(f.label)}</option>${f.options.map(([v, l]) => `<option value="${esc(v)}" ${st.f[f.key] === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`).join('');
  return `<div class="card">${cfg.title ? `<div class="card-h"><h3>${cfg.title}</h3>${cfg.headExtra || ''}</div>` : ''}
    <div class="tbl-tools">${cfg.search !== false ? `<div class="search">${ic('search')}<input class="input" placeholder="${esc(cfg.searchPh || tr('بحث…', 'Search…'))}" value="${esc(st.q)}" data-on="tbl-search" data-t="${cfg.id}" aria-label="${tr('بحث', 'Search')}"></div>` : ''}${filters}
    ${cfg.export ? `<button class="btn btn-ghost btn-sm" data-a="tbl-export" data-t="${cfg.id}" style="height:38px">${ic('download')}${tr('تصدير CSV', 'Export CSV')}</button>` : ''}${cfg.toolsExtra || ''}</div>
    <div id="tblb-${cfg.id}">${tableBody(cfg.id)}</div></div>`;
}
function tableRows(id) {
  const cfg = UI.tables[id], st = UI.tableState[id];
  let rows = cfg.rows.slice();
  if (st.q && cfg.searchText) { const q = st.q.toLowerCase(); rows = rows.filter((r) => cfg.searchText(r).toLowerCase().includes(q)); }
  (cfg.filters || []).forEach((f) => { if (st.f[f.key]) rows = rows.filter((r) => f.test(r, st.f[f.key])); });
  if (st.sort) { const c = cfg.cols.find((x) => x.key === st.sort); if (c) { const val = c.sortVal || ((r) => r[c.key]); rows.sort((a, b) => { const x = val(a), y = val(b); const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y)); return st.dir === 'asc' ? r : -r; }); } }
  return rows;
}
function tableBody(id) {
  const cfg = UI.tables[id], st = UI.tableState[id]; const rows = tableRows(id);
  const size = cfg.pageSize || 10, pages = Math.max(1, Math.ceil(rows.length / size)); st.page = clamp(st.page, 0, pages - 1);
  const slice = rows.slice(st.page * size, st.page * size + size);
  if (!rows.length) return `<div class="empty"><div class="em-ic">${ic(cfg.emptyIcon || 'search', 'lg')}</div><h3>${cfg.emptyTitle || tr('لا توجد نتائج', 'No results')}</h3><p>${cfg.emptyText || tr('غيّر كلمات البحث أو الفلاتر.', 'Try different search words or filters.')}</p></div>`;
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr>${cfg.cols.map((c) => `<th class="${c.sort !== false && c.key ? 'sortable' : ''} ${st.sort === c.key ? 'sorted' : ''}" ${c.sort !== false && c.key ? `data-a="tbl-sort" data-t="${id}" data-k="${c.key}" tabindex="0" aria-sort="${st.sort === c.key ? (st.dir === 'asc' ? 'ascending' : 'descending') : 'none'}"` : ''}>${c.label}${c.sort !== false && c.key ? `<span class="arr">${st.sort === c.key ? (st.dir === 'asc' ? '↑' : '↓') : '↕'}</span>` : ''}</th>`).join('')}</tr></thead>
  <tbody>${slice.map((r) => `<tr>${cfg.cols.map((c) => `<td>${c.render ? c.render(r) : esc(r[c.key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
  <div class="pager"><span>${tr(`${rows.length} نتيجة`, `${rows.length} results`)}</span>${pages > 1 ? `<div class="row"><button class="btn btn-ghost btn-sm" data-a="tbl-page" data-t="${id}" data-d="-1" ${st.page === 0 ? 'disabled' : ''}>${tr('السابق', 'Previous')}</button><span class="num">${st.page + 1} / ${pages}</span><button class="btn btn-ghost btn-sm" data-a="tbl-page" data-t="${id}" data-d="1" ${st.page >= pages - 1 ? 'disabled' : ''}>${tr('التالي', 'Next')}</button></div>` : ''}</div>`;
}
const refreshTable = (id) => { const el = $('#tblb-' + id); if (el && UI.tables[id]) el.innerHTML = tableBody(id); };
CHANGES['tbl-search'] = (el) => { const st = UI.tableState[el.dataset.t]; st.q = el.value; st.page = 0; refreshTable(el.dataset.t); };
CHANGES['tbl-filter'] = (el) => { const st = UI.tableState[el.dataset.t]; st.f[el.dataset.k] = el.value; st.page = 0; refreshTable(el.dataset.t); };
ACTIONS['tbl-sort'] = (el) => { const st = UI.tableState[el.dataset.t]; if (st.sort === el.dataset.k) st.dir = st.dir === 'asc' ? 'desc' : 'asc'; else { st.sort = el.dataset.k; st.dir = 'asc'; } refreshTable(el.dataset.t); };
ACTIONS['tbl-page'] = (el) => { UI.tableState[el.dataset.t].page += +el.dataset.d; refreshTable(el.dataset.t); };
ACTIONS['tbl-export'] = (el) => { const cfg = UI.tables[el.dataset.t]; const cols = cfg.csvCols || cfg.cols.filter((c) => c.key); download((cfg.exportName || 'export') + '-' + iso(new Date()) + '.csv', toCSV(tableRows(el.dataset.t), cols), 'text/csv;charset=utf-8'); toast(tr('تم تنزيل الملف.', 'File downloaded.')); };
document.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('th[data-a]')) { e.preventDefault(); e.target.click(); } });

/* ---------- charts (SVG, no library) ---------- */
function barChart({ labels, series, h, fmt }) {
  h = h || 240; const W = 640, pad = { t: 14, r: 10, b: 28, l: 54 };
  const max = Math.max(1, ...series.flatMap((s) => s.values)) * 1.1;
  const iw = W - pad.l - pad.r, ih = h - pad.t - pad.b, gw = iw / labels.length, bw = Math.min(30, (gw * 0.7) / series.length);
  const nice = (v) => (fmt ? fmt(v) : (v >= 1e6 ? r1(v / 1e6) + 'M' : v >= 1e3 ? Math.round(v / 1e3) + 'K' : Math.round(v)));
  let g = '';
  for (let i = 0; i <= 4; i++) { const y = pad.t + ih - (ih * i) / 4; g += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y}" y2="${y}" stroke="#EEF2F6"/><text x="${pad.l - 8}" y="${y + 4}" text-anchor="end">${nice((max * i) / 4)}</text>`; }
  labels.forEach((lb, i) => {
    const gx = pad.l + gw * i + (gw - bw * series.length) / 2;
    series.forEach((s, k) => { const v = s.values[i], bh = (v / max) * ih; g += `<rect x="${gx + k * bw}" y="${pad.t + ih - bh}" width="${bw - 3}" height="${Math.max(0, bh)}" rx="4" fill="${s.color}"><title>${esc(s.name)}: ${fmtN(v)}</title></rect>`; });
    g += `<text x="${pad.l + gw * i + gw / 2}" y="${h - 8}" text-anchor="middle">${esc(lb)}</text>`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${h}" role="img" style="direction:ltr" aria-label="${esc(series.map((s) => s.name).join(', '))}">${g}</svg>${series.length > 1 ? `<div class="legend">${series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>` : ''}`;
}
function lineChart({ labels, values, h, color }) {
  h = h || 220; const W = 640, pad = { t: 14, r: 12, b: 28, l: 44 };
  const max = Math.max(1, ...values) * 1.15, iw = W - pad.l - pad.r, ih = h - pad.t - pad.b;
  const pts = values.map((v, i) => [pad.l + (iw * i) / Math.max(1, values.length - 1), pad.t + ih - (v / max) * ih]);
  let g = '';
  for (let i = 0; i <= 4; i++) { const y = pad.t + ih - (ih * i) / 4; g += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y}" y2="${y}" stroke="#EEF2F6"/><text x="${pad.l - 8}" y="${y + 4}" text-anchor="end">${Math.round((max * i) / 4)}</text>`; }
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');
  g += `<path d="${d} L${pts[pts.length - 1][0]} ${pad.t + ih} L${pts[0][0]} ${pad.t + ih}z" fill="${color || '#3D6C93'}" opacity=".12"/><path d="${d}" fill="none" stroke="${color || '#3D6C93'}" stroke-width="2.5" stroke-linejoin="round"/>`;
  pts.forEach((p, i) => { g += `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#fff" stroke="${color || '#3D6C93'}" stroke-width="2"><title>${fmtN(values[i])}</title></circle><text x="${p[0]}" y="${h - 8}" text-anchor="middle">${esc(labels[i])}</text>`; });
  return `<svg class="chart" viewBox="0 0 ${W} ${h}" role="img" style="direction:ltr">${g}</svg>`;
}
const kpi = (label, value, sub, icon, hl) => `<div class="card kpi ${hl ? 'hl' : ''}"><small><span class="ic">${ic(icon || 'chart')}</span>${label}</small><b class="num">${value}</b>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
const empty = (icon, title, text, cta) => `<div class="empty"><div class="em-ic">${ic(icon, 'lg')}</div><h3>${title}</h3><p>${text}</p>${cta || ''}</div>`;
const coLogo = (c, size) => c.logo ? `<span class="co-logo ${size || ''}"><img src="${imgSrc(c.logo)}" alt=""></span>` : `<span class="co-logo ${size || ''}" style="background:${safeColor(c.color)}" aria-hidden="true">${esc(initials(L(c.name)).slice(0, 1))}</span>`;
const starInput = (name, val) => `<div class="star-input" role="radiogroup" data-name="${name}">${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="${n <= val ? 'on' : ''}" data-a="star" data-v="${n}" role="radio" aria-checked="${n === val}" aria-label="${n}">${starIc}</button>`).join('')}<input type="hidden" name="${name}" value="${val || ''}"></div>`;
ACTIONS.star = (el) => { const w = el.closest('.star-input'); const v = +el.dataset.v; $$('button', w).forEach((b, i) => { b.classList.toggle('on', i < v); b.setAttribute('aria-checked', i + 1 === v); }); $('input', w).value = v; const f = w.closest('.field'); if (f) f.classList.remove('err'); };
