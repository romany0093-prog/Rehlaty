
/* ---------- 5b. Mobile & form niceties ----------
   1) Date fields: browsers show an empty date input as "mm/dd/yyyy" (in English, even on the Arabic site).
      Each date input gets a readable overlay: the chosen date in the page language, or "اختار التاريخ".
      The native field (and its picker) is still the real control; while it has focus the native text shows.
   2) Trip page: the sticky "pick a date & book" bar hides while the booking box itself is on screen. */
const dxText = (inp) => inp.value ? fmtD(inp.value, { day: 'numeric', month: 'short', year: 'numeric' }) : (inp.dataset.ph || tr('اختار التاريخ', 'Pick a date'));
function dxEnhance(root) {
  (root || document).querySelectorAll('input[type=date]:not([data-dx])').forEach((inp) => {
    inp.setAttribute('data-dx', '');
    const wrap = document.createElement('span'); wrap.className = 'dx' + (inp.classList.contains('input') ? ' dx-block' : '');
    inp.parentNode.insertBefore(wrap, inp); wrap.appendChild(inp);
    const v = document.createElement('span'); v.className = 'dx-v'; v.setAttribute('aria-hidden', 'true'); wrap.appendChild(v);
    const sync = () => { v.textContent = dxText(inp); wrap.classList.toggle('dx-empty', !inp.value); };
    sync(); inp.addEventListener('input', sync); inp.addEventListener('change', () => { sync(); if (matchMedia('(pointer:coarse)').matches) inp.blur(); });
    inp.addEventListener('click', () => { try { inp.showPicker && inp.showPicker(); } catch (e) { } });
  });
}
let MB_IO = null;
function mbWatch() {
  const bar = document.getElementById('m-book'), box = document.getElementById('bw');
  if (MB_IO) { MB_IO.disconnect(); MB_IO = null; }
  if (!bar || !box || !('IntersectionObserver' in window)) return;
  MB_IO = new IntersectionObserver((es) => es.forEach((e) => bar.classList.toggle('hide', e.isIntersecting)), { rootMargin: '0px 0px -30% 0px' });
  MB_IO.observe(box);
}
new MutationObserver(() => { dxEnhance(); if (document.getElementById('m-book') && (!MB_IO || !document.body.contains(MB_IO._box))) { mbWatch(); if (MB_IO) MB_IO._box = document.getElementById('bw'); } })
  .observe(document.documentElement, { childList: true, subtree: true });
