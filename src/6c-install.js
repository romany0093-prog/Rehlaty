
/* ---------- 6c. Installable app (PWA): service worker, install prompt, updates ---------- */
const INSTALL = { deferred: null, shown: false, views: 0, timer: null };
const SNOOZE_KEY = 'rehlati_install_snooze', SNOOZE_DAYS = 30;
const isStandalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const canInstallHere = () => !isStandalone() && (INSTALL.deferred || isIOS());
function snoozed() { try { const t = +localStorage.getItem(SNOOZE_KEY) || 0; return Date.now() - t < SNOOZE_DAYS * 864e5; } catch (e) { return false; } }

/* service worker: only on https or localhost (the browser refuses it on file://) */
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      const offer = (w) => { if (!w || !navigator.serviceWorker.controller) return; INSTALL.waiting = w; showUpdate(); };
      if (reg.waiting) offer(reg.waiting);
      reg.addEventListener('updatefound', () => { const w = reg.installing; if (w) w.addEventListener('statechange', () => { if (w.state === 'installed') offer(w); }); });
    }).catch((e) => console.warn('SW', e));
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded && INSTALL.updating) { reloaded = true; location.reload(); } });
  });
}
function showUpdate() {
  const el = document.getElementById('install-layer'); if (!el || el.querySelector('.upd')) return;
  el.insertAdjacentHTML('afterbegin', `<div class="install-bar upd" role="status"><span class="ib-ic">${ic('sparkle')}</span><div class="grow"><b>${tr('فيه نسخة جديدة من UTravel', 'A new version of UTravel is ready')}</b><p>${tr('حدّث علشان تشوف آخر التحسينات.', 'Update to get the latest improvements.')}</p></div><button class="btn btn-teal btn-sm" data-a="app-update">${tr('تحديث', 'Update')}</button></div>`);
}
ACTIONS['app-update'] = () => { INSTALL.updating = true; if (INSTALL.waiting) INSTALL.waiting.postMessage('skipWaiting'); else location.reload(); };

/* Android / desktop Chrome & Edge give us a one-tap install prompt */
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); INSTALL.deferred = e; refreshInstallButtons(); });
window.addEventListener('appinstalled', () => { INSTALL.deferred = null; hideInstallBar(); toast(tr('تم تثبيت تطبيق UTravel. هتلاقيه على الشاشة الرئيسية.', 'UTravel is installed. You’ll find it on your home screen.')); refreshInstallButtons(); });
function refreshInstallButtons() { $$('[data-install-btn]').forEach((b) => { b.hidden = isStandalone(); }); }

/* show the bar only after some real browsing: a trip page, a booking, or a few pages/40 s */
function installEngage(kind) {
  if (INSTALL.shown || isStandalone() || snoozed()) return;
  INSTALL.views++;
  if (kind === 'trip' || kind === 'booked' || INSTALL.views >= 3) return setTimeout(showInstallBar, kind === 'booked' ? 1500 : 4000);
  if (!INSTALL.timer) INSTALL.timer = setTimeout(showInstallBar, 40000);
}
function showInstallBar() {
  if (INSTALL.shown || isStandalone() || snoozed() || !canInstallHere()) return;
  const el = document.getElementById('install-layer'); if (!el) return;
  INSTALL.shown = true;
  el.insertAdjacentHTML('beforeend', `<div class="install-bar inst" role="dialog" aria-label="${tr('تثبيت التطبيق', 'Install the app')}"><img src="assets/icons/icon-192.png" alt="" class="ib-logo"><div class="grow"><b>${tr('ثبّت تطبيق UTravel', 'Install the UTravel app')}</b><p>${tr('رحلاتك وحجوزاتك بضغطة من الشاشة الرئيسية، وبيفتح أسرع.', 'Your trips and bookings one tap from your home screen, and faster.')}</p></div><div class="row" style="gap:6px"><button class="btn btn-teal btn-sm" data-a="app-install">${isIOS() && !INSTALL.deferred ? tr('إزاي أثبّته؟', 'How?') : tr('تثبيت', 'Install')}</button><button class="icon-btn" style="width:34px;height:34px" data-a="install-later" aria-label="${tr('مش دلوقتي', 'Not now')}" title="${tr('مش دلوقتي', 'Not now')}">${ic('x')}</button></div></div>`);
  document.body.classList.add('install-open');
}
function hideInstallBar() { const b = document.querySelector('#install-layer .inst'); if (b) b.remove(); document.body.classList.remove('install-open'); }
ACTIONS['install-later'] = () => { try { localStorage.setItem(SNOOZE_KEY, String(Date.now())); } catch (e) { } hideInstallBar(); };
ACTIONS['app-install'] = async () => {
  if (isStandalone()) return toast(tr('التطبيق متثبّت بالفعل وانت فاتحه منه.', 'You’re already using the installed app.'), 'info');
  if (INSTALL.deferred) {
    const ev = INSTALL.deferred; INSTALL.deferred = null; hideInstallBar();
    ev.prompt(); const r = await ev.userChoice.catch(() => ({}));
    if (r && r.outcome === 'dismissed') { try { localStorage.setItem(SNOOZE_KEY, String(Date.now())); } catch (e) { } }
    refreshInstallButtons(); return;
  }
  hideInstallBar(); installHelp();
};
function installHelp() {
  const ios = isIOS();
  const share = '<svg viewBox="0 0 24 24" class="i" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
  const steps = ios ? [
    [share, tr('اضغط زر <b>المشاركة</b> في شريط Safari (تحت في الآيفون، فوق في الآيباد).', 'Tap the <b>Share</b> button in Safari’s toolbar.')],
    [ic('plus'), tr('اختار <b>إضافة إلى الشاشة الرئيسية</b> (Add to Home Screen). لو مش ظاهرة، انزل في القائمة.', 'Choose <b>Add to Home Screen</b>. Scroll down if you don’t see it.')],
    [ic('check'), tr('اضغط <b>إضافة</b>. أيقونة UTravel هتظهر على الشاشة الرئيسية.', 'Tap <b>Add</b>. The UTravel icon appears on your home screen.')]
  ] : [
    [ic('menu'), tr('افتح قائمة المتصفح (⋮ أو ⋯).', 'Open the browser menu (⋮ or ⋯).')],
    [ic('download'), tr('اختار <b>تثبيت التطبيق</b> أو <b>إضافة إلى الشاشة الرئيسية</b>.', 'Choose <b>Install app</b> or <b>Add to Home screen</b>.')],
    [ic('check'), tr('أكّد، وأيقونة UTravel هتظهر مع تطبيقاتك.', 'Confirm, and the UTravel icon appears with your apps.')]
  ];
  modal({ title: tr('ثبّت تطبيق UTravel', 'Install the UTravel app'), body: `<div class="row" style="gap:14px;margin-bottom:16px"><img src="assets/icons/icon-192.png" alt="" style="width:56px;height:56px;border-radius:14px"><p class="muted">${ios ? tr('في الآيفون التثبيت بيتم من Safari في ٣ خطوات:', 'On iPhone, install from Safari in 3 steps:') : tr('متصفحك مش بيعرض زر تثبيت مباشر. التثبيت من القائمة:', 'Your browser has no install button. Install from its menu:')}</p></div>
    <ol class="install-steps">${steps.map(([i, t]) => `<li><span class="ib-ic">${i}</span><span>${t}</span></li>`).join('')}</ol>${ios && !/safari/i.test(navigator.userAgent) ? `<div class="callout warn" style="margin-top:12px">${ic('info')}<div>${tr('لو فاتح من متصفح تاني، افتح الموقع من Safari الأول.', 'If you’re in another browser, open the site in Safari first.')}</div></div>` : ''}`,
    foot: `<button class="btn btn-primary" data-a="close-modal">${tr('تمام', 'Got it')}</button>` });
}
/* persistent entry point (footer, mobile menu, user menu) */
const installLink = (cls) => (isStandalone() ? '' : `<button class="${cls || 'btn-link'}" data-a="app-install" data-install-btn>${ic('download')}${tr('حمّل التطبيق', 'Get the app')}</button>`);

/* connection status: tell people when they're offline instead of failing silently */
window.addEventListener('offline', () => toast(tr('انقطع الاتصال بالإنترنت. الحجز والدفع محتاجين اتصال.', 'You’re offline. Booking and payment need a connection.'), 'bad'));
window.addEventListener('online', () => { toast(tr('رجع الاتصال.', 'Back online.')); if (CLOUD && db) reloadCloud(); });
