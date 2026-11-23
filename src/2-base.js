/* =========================================================================
   UTravel (formerly رحلاتي / Rehlati): Multi-vendor tourism marketplace (single-file prototype)
   Architecture (mirrors the target Next.js + Prisma design):
     1. Base: i18n (tr), formatting, icons, destination artwork
     2. Seed: realistic Egyptian demo data
     3. Data layer (store.js equivalent): transactional DB in localStorage,
        repositories, booking/payment/refund services, RBAC guards
     4. UI kit: toasts, modals, tables, charts, forms
     5. Views: public site, checkout, customer / company / admin dashboards
     6. Router: hash-based, role-guarded
   Everything below runs in the browser. There is NO real server, database,
   authentication or payment gateway in this file — see README.
   ========================================================================= */
'use strict';

/* ---------- 1. i18n ---------- */
const LANG_KEY = 'rehlati_lang';
let LANG = (() => { try { return localStorage.getItem(LANG_KEY) || 'ar'; } catch (e) { return 'ar'; } })();
/** tr(ar, en): every UI string goes through here, so a translation file can replace it later. */
const tr = (ar, en) => (LANG === 'en' && en ? en : ar);
/** L(obj): pick a bilingual data field {ar, en}. */
const L = (o) => (o == null ? '' : typeof o === 'string' ? o : (LANG === 'en' ? (o.en || o.ar) : (o.ar || o.en)) || '');
function applyLang() {
  document.documentElement.lang = LANG;
  document.documentElement.dir = LANG === 'ar' ? 'rtl' : 'ltr';
}
applyLang();

/* ---------- formatting ---------- */
const TODAY = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
const iso = (d) => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
const locale = () => (LANG === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB');
const fmtN = (n) => new Intl.NumberFormat('en-US').format(Math.round(n || 0));
const money = (n) => (LANG === 'ar' ? fmtN(n) + ' ج.م' : 'EGP ' + fmtN(n));
const fmtD = (d, o) => d ? new Intl.DateTimeFormat(locale(), o || { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d)) : '—';
const fmtDS = (d) => fmtD(d, { day: 'numeric', month: 'short' });
const fmtDT = (d) => fmtD(d, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const ago = (d) => {
  const m = Math.round((Date.now() - new Date(d)) / 6e4);
  if (m < 1) return tr('الآن', 'just now');
  if (m < 60) return tr(`منذ ${m} دقيقة`, `${m} min ago`);
  const h = Math.round(m / 60); if (h < 24) return tr(`منذ ${h} ساعة`, `${h} h ago`);
  const dd = Math.round(h / 24); if (dd < 30) return tr(`منذ ${dd} يوم`, `${dd} d ago`);
  return fmtD(d);
};
const nightsLabel = (days) => days <= 1 ? tr('يوم واحد', '1 day') : tr(`${days} أيام / ${days - 1} ليالٍ`, `${days} days / ${days - 1} nights`);
/* ---------- UTravel brand ----------
   The customised "T" (gold serif T over a globe with a compass star) is drawn as geometry, so it stays
   crisp at any size; the rest of the wordmark is set in the brand serif (Marcellus). Colours come from
   CSS custom properties, so the same mark serves light, dark and monochrome backgrounds. */
const BRAND = { name: 'UTravel', tagline: 'Your Choice. Your Journey.' };
const brandT = (cls) => `<svg class="ut-t ${cls || ''}" viewBox="0 0 64 80" aria-hidden="true" focusable="false"><defs>
<linearGradient id="utGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--ut-gold-1,#DCC48F)"/><stop offset=".55" style="stop-color:var(--ut-gold-2,#C8A96E)"/><stop offset="1" style="stop-color:var(--ut-gold-3,#A9874B)"/></linearGradient>
<radialGradient id="utGlobe" cx=".42" cy=".36" r=".72"><stop offset="0" style="stop-color:var(--ut-globe-1,#F7F1E4)"/><stop offset="1" style="stop-color:var(--ut-globe-2,#DDCCA8)"/></radialGradient></defs>
<circle cx="32" cy="45" r="19" fill="url(#utGlobe)" style="stroke:var(--ut-gold-2,#C8A96E)" stroke-width="1.1"/>
<g fill="none" style="stroke:var(--ut-gold-2,#C8A96E)" stroke-width=".8"><ellipse cx="32" cy="45" rx="8" ry="19" opacity=".75"/><ellipse cx="32" cy="45" rx="14.5" ry="19" opacity=".45"/><path d="M13 45H51" opacity=".6"/><path d="M15.5 36.5Q32 32.5 48.5 36.5M15.5 53.5Q32 57.5 48.5 53.5" opacity=".5"/></g>
<path d="M3 6H61V17.5C58 15.2 55 14.2 50.5 14.2H37.6V69.6C37.6 72.8 39.6 74.4 43.2 74.9V77H20.8V74.9C24.4 74.4 26.4 72.8 26.4 69.6V14.2H13.5C9 14.2 6 15.2 3 17.5Z" fill="url(#utGold)"/>
<g style="fill:var(--ut-star-d,#1E3F5B)"><path d="M32 44L32 25.5L35 41Z"/><path d="M32 44L51 44L35 47Z"/><path d="M32 44L32 62.5L29 47Z"/><path d="M32 44L13 44L29 41Z"/></g>
<g style="fill:var(--ut-star-l,#6F9EC6)"><path d="M32 44L32 25.5L29 41Z"/><path d="M32 44L51 44L35 41Z"/><path d="M32 44L32 62.5L35 47Z"/><path d="M32 44L13 44L29 47Z"/></g>
<circle cx="32" cy="44" r="1.7" style="fill:var(--ut-globe-1,#F7F1E4);stroke:var(--ut-star-d,#1E3F5B)" stroke-width=".7"/></svg>`;
/* variant: '' (light background) | 'dark' (reversed) | 'mono' (single colour = currentColor) */
const brandLogo = (opts) => { const o = opts || {}; return `<span class="ut-logo ${o.variant ? 'ut-' + o.variant : ''} ${o.cls || ''}" dir="ltr"><span class="ut-word" role="img" aria-label="${BRAND.name}">U${brandT()}ravel</span>${o.tagline ? `<span class="ut-tag">${BRAND.tagline}</span>` : ''}</span>`; };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = (p) => p + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const initials = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('');
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
const sum = (arr, f) => arr.reduce((a, x) => a + (f ? f(x) : x), 0);
const r1 = (n) => (Math.round(n * 10) / 10).toFixed(1);

/* ---------- icons (inline SVG, lucide-style) ---------- */
const IC = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  heart: '<path d="M12 20s-7.5-4.6-9.2-9.3C1.6 7.3 4 4 7.4 4c2 0 3.6 1.2 4.6 2.7C13 5.2 14.6 4 16.6 4 20 4 22.4 7.3 21.2 10.7 19.5 15.4 12 20 12 20z"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  minus: '<path d="M5 12h14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  bus: '<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M8 21v-3M16 21v-3"/><circle cx="8" cy="14.5" r=".6"/><circle cx="16" cy="14.5" r=".6"/>',
  bed: '<path d="M3 18V7M21 18v-5a3 3 0 0 0-3-3h-7v8M3 14h18"/><circle cx="7" cy="11" r="2"/>',
  shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6 15h4"/>',
  wallet: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3"/><path d="M21 8h-6a3 3 0 0 0 0 6h6z"/>',
  home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  ticket: '<path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z"/><path d="M13 6v2M13 11v2M13 16v2"/>',
  money: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v.01M18 15v.01"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  building: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01M10 21v-3h4v3"/>',
  cog: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.3 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.3l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1A2 2 0 1 1 19.7 7l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.3 4.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M4 4h16"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  chev: '<path d="m15 6-6 6 6 6"/>',
  chevr: '<path d="m9 6 6 6-6 6"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z"/>',
  refund: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 8v8M9.5 10.5c0-1 1-1.5 2.5-1.5s2.5.6 2.5 1.6c0 2.4-5 1.4-5 3.9 0 1 1 1.5 2.5 1.5s2.5-.5 2.5-1.5"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>',
  doc: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  reply: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 5 5v6"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
  play: '<path d="M7 4v16l13-8z"/>',
  print: '<path d="M6 9V3h12v6M6 18H4v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7h-2"/><rect x="6" y="14" width="12" height="7"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'
};
const ic = (n, cls) => `<svg class="i ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true">${IC[n] || ''}</svg>`;
const starIc = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>';
const starsHTML = (v, count) => `<span class="stars">${starIc}${v ? r1(v) : tr('جديد', 'New')}${count != null ? `<span class="faint small" style="font-weight:400">(${count})</span>` : ''}</span>`;

/* ---------- 2. Destination artwork ----------
   Each destination has an illustrated scene (generated SVG), so the prototype
   never depends on third‑party photo hosting. Companies can upload real photos
   from their dashboard; those replace the artwork for their trips. */
const ART_CACHE = {};
function rng(seed) { let s = seed * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); }
const SKIES = [
  { top: '#7EC8E3', bot: '#E8F4F2', sun: '#FFF4D6', sunY: 70 },
  { top: '#F2A65A', bot: '#FCE1B5', sun: '#FFF1C9', sunY: 150 },
  { top: '#2B3F66', bot: '#E58F65', sun: '#FBD38D', sunY: 170 }
];
function palm(x, y, h, c, flip) {
  const s = flip ? -1 : 1, tx = x + s * h * 0.18, ty = y - h;
  let f = `<path d="M${x} ${y} Q${x + s * h * 0.05} ${y - h * 0.5} ${tx} ${ty}" stroke="${c}" stroke-width="${h * 0.06}" fill="none" stroke-linecap="round"/>`;
  const fr = [[-1, 0.15], [-0.6, -0.35], [0, -0.45], [0.6, -0.3], [1, 0.2], [0.35, 0.4], [-0.35, 0.45]];
  fr.forEach(([dx, dy]) => { const ex = tx + dx * h * 0.55, ey = ty + dy * h * 0.45 + h * 0.12; f += `<path d="M${tx} ${ty} Q${(tx + ex) / 2} ${Math.min(ty, ey) - h * 0.14} ${ex} ${ey} Q${(tx + ex) / 2} ${Math.min(ty, ey) - h * 0.05} ${tx} ${ty}z" fill="${c}"/>`; });
  return f;
}
function scene(kind, v) {
  const sk = SKIES[v % 3], R = rng(kind.length * 31 + v * 7), W = 800, H = 520;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sk.top}"/><stop offset="1" stop-color="${sk.bot}"/></linearGradient><linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1E8FA6"/><stop offset="1" stop-color="#0E4F6B"/></linearGradient><linearGradient id="tq" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3FC7C4"/><stop offset="1" stop-color="#1B8EA0"/></linearGradient><linearGradient id="sand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EBC890"/><stop offset="1" stop-color="#C99A5B"/></linearGradient><radialGradient id="glow"><stop offset="0" stop-color="${sk.sun}" stop-opacity=".9"/><stop offset="1" stop-color="${sk.sun}" stop-opacity="0"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#sk)"/>`;
  const sx = 120 + R() * 560, sy = sk.sunY;
  s += `<circle cx="${sx}" cy="${sy}" r="150" fill="url(#glow)"/><circle cx="${sx}" cy="${sy}" r="${38 + R() * 14}" fill="${sk.sun}"/>`;
  const dusk = v % 3 === 2, ink = dusk ? '#23304A' : '#3A2E2A';
  if (kind === 'sea' || kind === 'sinai') {
    if (kind === 'sinai') {
      const mc = dusk ? ['#5E3B4B', '#7A4552'] : ['#B8644A', '#9A4E3D'];
      s += `<path d="M0 300 L90 190 L160 240 L260 150 L360 250 L440 200 L560 120 L660 230 L800 170 L800 320 L0 320z" fill="${mc[0]}" opacity=".75"/><path d="M0 320 L120 230 L230 290 L340 210 L470 300 L600 220 L720 280 L800 240 L800 330 L0 330z" fill="${mc[1]}"/>`;
    }
    s += `<rect y="300" width="${W}" height="${H - 300}" fill="url(#sea)"/>`;
    for (let i = 0; i < 14; i++) { const y = 320 + R() * 170, x = R() * W; s += `<path d="M${x} ${y} h${30 + R() * 60}" stroke="#fff" stroke-opacity=".28" stroke-width="2" stroke-linecap="round"/>`; }
    s += `<path d="M${sx - 60} 300 L${sx + 60} 300 L${sx + 30} 470 L${sx - 30} 470z" fill="${sk.sun}" opacity=".12"/>`;
    const bx = 160 + R() * 420;
    s += `<g transform="translate(${bx} 330)"><path d="M0 0 h90 l-12 14 h-66z" fill="#F7F3EA"/><rect x="28" y="-16" width="34" height="16" rx="3" fill="#F7F3EA"/><rect x="34" y="-12" width="22" height="6" fill="#2C6E8F"/></g>`;
    s += `<path d="M0 440 Q120 400 250 430 T520 420 T800 440 V520 H0z" fill="#0B3F57" opacity=".7"/>`;
    for (let i = 0; i < 7; i++) { const x = 40 + i * 120 + R() * 40, h = 30 + R() * 40, c = ['#E9B872', '#E0584A', '#F28F6B', '#20A6A6'][i % 4]; s += `<path d="M${x} 520 q-14 -${h} 0 -${h + 10} q14 ${10} 0 ${h + 10}" fill="${c}" opacity=".85"/><circle cx="${x + 18}" cy="${520 - h * 0.6}" r="${8 + R() * 8}" fill="${c}" opacity=".7"/>`; }
  } else if (kind === 'coast') {
    s += `<rect y="250" width="${W}" height="80" fill="#1B8EA0"/><rect y="300" width="${W}" height="70" fill="url(#tq)"/><path d="M0 360 Q200 340 400 360 T800 350 V520 H0z" fill="#F8F1E3"/><path d="M0 352 Q200 332 400 352 T800 342" stroke="#fff" stroke-width="6" fill="none" opacity=".8"/>`;
    const ux = 520 + R() * 120;
    s += `<path d="M${ux} 470 L${ux + 8} 330" stroke="#7A5C3A" stroke-width="5"/><path d="M${ux - 80} 350 Q${ux + 8} 260 ${ux + 96} 340 Q${ux + 8} 318 ${ux - 80} 350z" fill="#E0584A"/><path d="M${ux - 40} 340 Q${ux + 8} 300 ${ux + 50} 336" stroke="#fff" stroke-width="10" fill="none" opacity=".9"/><rect x="${ux - 120}" y="452" width="90" height="10" rx="5" fill="#16324F" opacity=".8"/><path d="M${ux - 120} 452 l-16 -22" stroke="#16324F" stroke-width="8" stroke-linecap="round" opacity=".8"/>`;
    s += `<path d="M60 300 h170 v-60 h-40 v-20 h-90 v20 h-40z" fill="#FFFFFF" opacity=".85"/><rect x="80" y="255" width="16" height="16" fill="#9CC7D6"/><rect x="120" y="255" width="16" height="16" fill="#9CC7D6"/><rect x="160" y="255" width="16" height="16" fill="#9CC7D6"/>`;
  } else if (kind === 'temple') {
    s += `<path d="M0 360 Q400 330 800 360 V520 H0z" fill="url(#sand)"/>`;
    const col = dusk ? '#6B4A3A' : '#C28E57', shade = dusk ? '#4E3428' : '#A8743F';
    s += `<rect x="80" y="160" width="640" height="34" fill="${shade}"/><rect x="70" y="146" width="660" height="18" fill="${col}"/>`;
    for (let i = 0; i < 7; i++) { const x = 100 + i * 92; s += `<path d="M${x - 8} 194 h68 l-6 18 h-56z" fill="${col}"/><rect x="${x}" y="212" width="52" height="170" fill="${col}"/><rect x="${x + 34}" y="212" width="18" height="170" fill="${shade}"/>`; for (let k = 0; k < 5; k++) s += `<path d="M${x} ${240 + k * 28} h52" stroke="${shade}" stroke-width="1.5" opacity=".6"/>`; }
    s += `<path d="M0 380 Q400 360 800 385 V520 H0z" fill="#D9AE72"/>`;
    for (let i = 0; i < 6; i++) s += `<ellipse cx="${R() * W}" cy="${420 + R() * 80}" rx="${20 + R() * 40}" ry="6" fill="#C99A5B" opacity=".5"/>`;
    if (v % 3 !== 2) for (let i = 0; i < 2; i++) { const bx = 560 + i * 120 - R() * 60, by = 70 + R() * 50; s += `<g transform="translate(${bx} ${by})"><path d="M0 0 a26 30 0 1 1 1 0z" fill="${['#E0584A', '#20A6A6'][i]}" transform="translate(-26 0)"/><ellipse cx="0" cy="0" rx="26" ry="31" fill="${['#E0584A', '#20A6A6'][i]}"/><path d="M-26 0 a26 31 0 0 0 52 0" fill="#fff" opacity=".15"/><rect x="-7" y="38" width="14" height="10" fill="#7A5C3A"/><path d="M-12 28 L-6 38 M12 28 L6 38" stroke="#7A5C3A"/></g>`; }
  } else if (kind === 'nile') {
    s += `<path d="M0 250 Q200 230 400 250 T800 240 V300 H0z" fill="#D9AE72"/><path d="M0 262 q60 -30 120 0 q80 -40 160 0 q60 -24 140 0 q90 -36 180 0 q60 -26 200 0 V300 H0z" fill="#C99A5B"/>`;
    s += `<rect y="290" width="${W}" height="140" fill="url(#sea)"/>`;
    for (let i = 0; i < 10; i++) { const y = 305 + R() * 110, x = R() * W; s += `<path d="M${x} ${y} h${30 + R() * 50}" stroke="#fff" stroke-opacity=".3" stroke-width="2" stroke-linecap="round"/>`; }
    const fx = 300 + R() * 200;
    s += `<g transform="translate(${fx} 345)"><path d="M-60 0 Q0 22 60 0 z" fill="#5A3B23"/><path d="M-4 -2 L8 -150 L70 -8 z" fill="#FBF7EE"/><path d="M8 -150 L-4 -2" stroke="#5A3B23" stroke-width="3"/><path d="M8 -150 L-56 -40" stroke="#5A3B23" stroke-width="2"/></g>`;
    s += `<path d="M0 430 Q200 410 400 430 T800 420 V520 H0z" fill="${dusk ? '#2F4A3A' : '#3E7A4B'}"/>`;
    s += palm(70, 440, 150, ink) + palm(160, 450, 110, ink, true) + palm(690, 440, 160, ink, true) + palm(760, 455, 100, ink);
  } else if (kind === 'oasis') {
    s += `<path d="M0 300 Q200 280 400 300 T800 290 V330 H0z" fill="#D9AE72"/>`;
    s += `<path d="M460 300 l10 -40 h16 l6 -22 h20 l8 -28 h14 l6 28 h22 l4 26 h18 l10 36z" fill="${dusk ? '#6B4A3A' : '#B98A5A'}"/>`;
    s += `<rect y="318" width="${W}" height="70" fill="#8FD3D3"/><rect y="318" width="${W}" height="70" fill="url(#sk)" opacity=".35"/><path d="M0 330 h800" stroke="#fff" stroke-opacity=".6" stroke-width="3"/>`;
    s += `<path d="M0 380 Q200 360 400 384 T800 376 V520 H0z" fill="url(#sand)"/>`;
    for (let i = 0; i < 9; i++) { const x = 30 + i * 90 + R() * 30; s += palm(x, 400 + R() * 30, 90 + R() * 90, ink, i % 2 === 0); }
    s += `<path d="M0 470 Q300 440 800 480 V520 H0z" fill="#C99A5B"/>`;
  } else if (kind === 'desert') {
    s += `<path d="M0 300 Q160 250 320 300 T640 290 T800 280 V520 H0z" fill="#E7C08A"/><path d="M0 360 Q200 300 420 360 T800 340 V520 H0z" fill="#D9AE72"/><path d="M0 430 Q240 380 500 440 T800 420 V520 H0z" fill="#C99A5B"/>`;
    for (let i = 0; i < 4; i++) { const x = 90 + i * 180 + R() * 60, y = 370 + R() * 40, h = 60 + R() * 70, w = 50 + R() * 40; s += `<path d="M${x - w * 0.2} ${y} q-4 -${h * 0.5} ${-w * 0.35} -${h * 0.6} q${w * 0.1} -${h * 0.45} ${w * 0.55} -${h * 0.4} q${w * 0.45} 0 ${w * 0.5} ${h * 0.35} q-${w * 0.25} ${h * 0.2} -${w * 0.22} ${h * 0.65}z" fill="#FBF7EE"/><ellipse cx="${x}" cy="${y + 4}" rx="${w * 0.5}" ry="6" fill="#B9853A" opacity=".35"/>`; }
    if (v % 3 === 2) for (let i = 0; i < 40; i++) s += `<circle cx="${R() * W}" cy="${R() * 180}" r="${R() * 1.6}" fill="#fff"/>`;
    s += `<g transform="translate(${560 + R() * 120} 430)" fill="${ink}"><path d="M0 0 q10 -26 24 -26 q8 -18 22 -12 q10 4 10 18 q16 2 18 20 v8 h-6 v-10 q-30 6 -54 0 v10 h-6z"/><path d="M60 -20 q14 -20 18 -36 l6 2 q-4 20 -16 38z"/></g>`;
  } else if (kind === 'pyramids') {
    s += `<path d="M0 360 Q400 330 800 360 V520 H0z" fill="url(#sand)"/>`;
    const pc = dusk ? ['#8A5A3E', '#5E3B2A'] : ['#E2B677', '#B98A4E'];
    [[420, 360, 250, 210], [210, 362, 170, 140], [630, 362, 110, 90]].forEach(([x, y, w, h]) => { s += `<path d="M${x - w / 2} ${y} L${x} ${y - h} L${x + w / 2} ${y}z" fill="${pc[0]}"/><path d="M${x} ${y - h} L${x + w / 2} ${y} L${x + w * 0.12} ${y}z" fill="${pc[1]}"/>`; });
    s += `<path d="M0 400 Q300 380 800 410 V520 H0z" fill="#D9AE72"/>`;
    s += palm(60, 470, 120, ink) + palm(740, 470, 110, ink, true);
  }
  return s + '</svg>';
}
/** artURL(kind, variant) -> data URI of the destination scene */
function artURL(kind, v) {
  const k = kind + (v || 0);
  if (!ART_CACHE[k]) ART_CACHE[k] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(scene(kind, v || 0));
  return ART_CACHE[k];
}
/** Image entries are either "art:kind:variant" or uploaded data URLs. */
/* Only these image sources are ever put into src="": generated art, our own assets, or base64 raster data.
   Anything else (javascript:, quotes, SVG, remote URLs) falls back to neutral art. Mirrors _safe_img() on the server. */
const SAFE_IMG = /^(assets\/[A-Za-z0-9_./-]+|data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+)$/;
const imgSrc = (x) => (typeof x === 'string' && /^art:[a-z]+:[0-9]+$/.test(x)) ? artURL(x.split(':')[1], +x.split(':')[2] || 0) : (typeof x === 'string' && SAFE_IMG.test(x) ? x : artURL('sea', 0));
const safeColor = (c) => (/^#[0-9A-Fa-f]{3,8}$/.test(String(c || '')) ? c : '#3D6C93');
const safeLink = (l) => (/^#\/[A-Za-z0-9/_?=&.%,:-]{0,200}$/.test(String(l || '')) ? l : '#');
