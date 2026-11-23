
/* ---------- 6d. Self-service password reset: e-mail link, or WhatsApp code for mobile sign-ups ----------
   1. #/forgot: the person types their username or email. We always show the same
      answer ("if the account exists, we sent an email") so nobody can probe which
      accounts exist.
   2. Supabase emails a one-time link (valid 1 hour by default) back to this site.
   3. The link signs them in for recovery only; #/reset-password lets them set a
      new password, then takes them to their dashboard.
   In the offline demo nothing is emailed — the page offers the link directly. */
const RESET = { sentTo: null, cooldownUntil: 0, demoUser: null };
const RESET_COOLDOWN = 60; // seconds (Supabase also limits repeat requests)

function viewForgot() {
  const q = readQuery(), sent = RESET.sentTo !== null;
  const left = Math.max(0, Math.ceil((RESET.cooldownUntil - Date.now()) / 1000));
  const wa = sent && RESET.channel === 'whatsapp';
  const body = wa ? `
    <div class="em-ic" style="width:64px;height:64px;border-radius:20px;background:var(--ok-50);color:var(--ok);display:grid;place-items:center;margin-bottom:16px">${ic('phone', 'lg')}</div>
    <h1 style="font-size:26px">${tr('بص على واتساب', 'Check WhatsApp')}</h1>
    <p class="muted" style="margin:8px 0 18px">${tr(`لو الرقم <b><bdi dir="ltr" style="unicode-bidi:isolate">${esc(RESET.sentTo)}</bdi></b> مسجّل على UTravel، هيوصلك كود من ٦ أرقام على واتساب. اكتبه هنا خلال دقايق.`, `If <b>${esc(RESET.sentTo)}</b> is registered on UTravel, a 6-digit code is on its way on WhatsApp. Enter it here within a few minutes.`)}</p>
    ${RESET.demoUser ? `<div class="callout warn" style="margin-bottom:14px">${ic('info')}<div>${tr('وضع العرض التجريبي: مفيش رسايل حقيقية بتتبعت. الكود هو 123456.', 'Demo mode: no real messages are sent. The code is 123456.')}</div></div>` : ''}
    <form data-f="wa-code" class="stack" novalidate>${inp('code', tr('كود التأكيد', 'Verification code'), '', { attrs: 'dir="ltr" inputmode="numeric" autocomplete="one-time-code" maxlength="6" style="letter-spacing:.4em;text-align:center;font-size:20px"' })}
      <button class="btn btn-primary btn-lg btn-block" type="submit">${tr('تأكيد الكود', 'Verify code')}</button></form>
    <div class="row wrapx" style="margin-top:14px"><button class="btn btn-ghost" data-a="forgot-resend" ${left ? 'disabled' : ''} id="resend-btn">${left ? tr(`إعادة الإرسال بعد ${left} ث`, `Resend in ${left}s`) : tr('إعادة إرسال الكود', 'Resend the code')}</button><button class="btn-link" data-a="forgot-other">${tr('استرجع بالإيميل بدلها', 'Use my email instead')}</button></div>
    <p class="small muted" style="margin-top:22px"><a class="btn-link" href="#/login">${tr('رجوع لتسجيل الدخول', 'Back to log in')}</a></p>`
  : sent ? `
    <div class="em-ic" style="width:64px;height:64px;border-radius:20px;background:var(--teal-50);color:var(--teal-700);display:grid;place-items:center;margin-bottom:16px">${ic('mail', 'lg')}</div>
    <h1 style="font-size:26px">${tr('بص على إيميلك', 'Check your email')}</h1>
    <p class="muted" style="margin:8px 0 18px">${tr('لو الحساب ده موجود على UTravel، بعتنا على الإيميل المسجل بيه رابط لتعيين كلمة مرور جديدة. الرابط صالح لمدة ساعة ولاستخدام مرة واحدة.', 'If this account exists on UTravel, we’ve emailed a link to set a new password to the address it was registered with. The link works once and expires in an hour.')}</p>
    <ul class="ticklist tick-ok small" style="margin-bottom:18px"><li>${ic('check')}${tr('ما وصلكش خلال دقيقتين؟ بص في الرسائل غير المرغوب فيها (Spam).', 'Nothing after two minutes? Check your spam folder.')}</li><li>${ic('check')}${tr('افتح الرابط من نفس الجهاز أو أي جهاز تاني، الاتنين شغالين.', 'You can open the link on this device or another one.')}</li></ul>
    ${RESET.demoUser ? `<div class="callout warn" style="margin-bottom:14px">${ic('info')}<div>${tr('وضع العرض التجريبي: مفيش إيميلات حقيقية بتتبعت. اضغط الزر علشان تكمّل كأنك فتحت الرابط.', 'Demo mode: no real emails are sent. Press the button to continue as if you opened the link.')}<div style="margin-top:8px"><button class="btn btn-sand btn-sm" data-a="reset-demo-link">${tr('افتح رابط إعادة التعيين', 'Open the reset link')}</button></div></div></div>` : ''}
    <div class="row wrapx"><button class="btn btn-ghost" data-a="forgot-resend" ${left ? 'disabled' : ''} id="resend-btn">${left ? tr(`إعادة الإرسال بعد ${left} ث`, `Resend in ${left}s`) : tr('إعادة إرسال الإيميل', 'Resend the email')}</button><button class="btn-link" data-a="forgot-other">${tr('جرّب اسم مستخدم أو إيميل تاني', 'Try a different username or email')}</button></div>
    <p class="small muted" style="margin-top:22px"><a class="btn-link" href="#/login">${tr('رجوع لتسجيل الدخول', 'Back to log in')}</a></p>`
  : `
    <h1 style="font-size:28px">${tr('نسيت كلمة المرور؟', 'Forgot your password?')}</h1>
    <p class="muted" style="margin:6px 0 22px">${tr('اكتب الإيميل أو اسم المستخدم وهنبعتلك رابط على الإيميل. ولو سجلت برقم الموبايل، اكتب الرقم وهيوصلك كود على واتساب.', 'Enter your email or username and we’ll email you a link. If you signed up with your mobile number, enter it and we’ll send a code on WhatsApp.')}</p>
    ${q.expired ? `<div class="callout warn" style="margin-bottom:16px" role="alert">${ic('clock')}<div>${tr('الرابط اللي فتحته انتهت صلاحيته أو اتستخدم قبل كده. اطلب رابط جديد.', 'That link has expired or was already used. Request a new one.')}</div></div>` : ''}
    <form data-f="forgot" class="stack" novalidate>${inp('ident', tr('الإيميل أو رقم الموبايل أو اسم المستخدم', 'Email, mobile number or username'), q.u || '', { attrs: 'autocomplete="username" dir="ltr" autocapitalize="none" spellcheck="false"' })}
    <button class="btn btn-primary btn-lg btn-block" type="submit">${tr('استرجع حسابي', 'Recover my account')}</button></form>
    <p class="small muted" style="margin-top:14px;text-align:center"><a class="btn-link" href="#/login">${tr('افتكرتها؟ سجّل الدخول', 'Remembered it? Log in')}</a></p>`;
  return header() + `<main class="auth route-fade"><div class="auth-art"><img src="${artURL('oasis', 1)}" alt="">${authBrand()}<p class="cap">${tr('واحة سيوة', 'Siwa Oasis')}</p></div><div class="auth-f"><div class="auth-box">${body}</div></div></main>`;
}
async function sendReset(ident) {
  const v = String(ident || '').trim(), ph = /^[\d+\s]{8,20}$/.test(v) ? normPhone(v) : null;
  RESET.channel = ph ? 'whatsapp' : 'email'; RESET.phone = ph;
  if (ph) return sendWhatsAppCode(v, ph);
  if (CLOUD) {
    // The username → e-mail lookup happens server-side (Edge Function "password-reset"), so the
    // browser never learns anyone's e-mail and the answer is the same whether the account exists or not.
    const { error } = await sb.functions.invoke('password-reset', { body: { ident: v, redirectTo: location.origin + location.pathname } });
    if (error) {
      const st = error.context && error.context.status;
      if (st === 429) throw new AppError('RATE', tr('طلبت روابط كتير ورا بعض. استنى دقيقة وحاول تاني.', 'Too many requests. Wait a minute and try again.'));
      throw new AppError('NET', tr('مفيش اتصال بالسيرفر. اتأكد من الإنترنت وحاول تاني.', 'Can’t reach the server. Check your connection and try again.'));
    }
    RESET.demoUser = null;
  } else {
    const l = v.toLowerCase(); const u = db.users.find((x) => x.email.toLowerCase() === l || (x.username || x.email.split('@')[0]).toLowerCase() === l);
    RESET.demoUser = u && u.role !== 'admin' ? u.id : null;
  }
  RESET.sentTo = v; RESET.cooldownUntil = Date.now() + RESET_COOLDOWN * 1000;
}
/* Accounts registered with a mobile number recover with a one-time code sent on WhatsApp
   (Supabase Auth phone OTP, Twilio WhatsApp sender). The code signs them in for recovery,
   then #/reset-password sets the new password. Same answer whether the number exists or not. */
async function sendWhatsAppCode(raw, ph) {
  if (CLOUD) {
    const { error } = await sb.auth.signInWithOtp({ phone: '+' + ph, options: { channel: 'whatsapp', shouldCreateUser: false } });
    if (error) {
      const code = error.code || '', st = error.status;
      if (st === 429 || /rate|seconds/i.test(error.message || '')) throw new AppError('RATE', tr('طلبت أكواد كتير ورا بعض. استنى دقيقة وحاول تاني.', 'Too many requests. Wait a minute and try again.'));
      if (/provider|unsupported|sms_send_failed|phone_provider_disabled/i.test(code + ' ' + (error.message || ''))) throw new AppError('WA_OFF', tr('الاسترجاع بكود واتساب مش متاح دلوقتي. اكتب الإيميل اللي سجلت بيه وهنبعتلك رابط.', 'WhatsApp recovery isn’t available right now. Enter your email and we’ll send you a link.'));
      if (/Failed to fetch|network/i.test(error.message || '')) throw new AppError('NET', tr('مفيش اتصال بالسيرفر. اتأكد من الإنترنت وحاول تاني.', 'Can’t reach the server. Check your connection and try again.'));
      // anything else (e.g. no account with this number): same answer as a success
    }
    RESET.demoUser = null;
  } else {
    const u = db.users.find((x) => x.via === 'phone' && normPhone(x.phone) === ph && x.role !== 'admin');
    RESET.demoUser = u ? u.id : null;
  }
  RESET.sentTo = raw; RESET.cooldownUntil = Date.now() + RESET_COOLDOWN * 1000;
}
FORMS['wa-code'] = async (f) => {
  const d = validate(f, { code: ['req', (v) => /^\d{6}$/.test(v) || tr('الكود ٦ أرقام.', 'The code has 6 digits.')] }); if (!d) return;
  const btn = $('button[type=submit]', f); busy(btn, true);
  try {
    if (CLOUD) {
      const { data, error } = await sb.auth.verifyOtp({ phone: '+' + RESET.phone, token: d.code, type: 'sms' });
      if (error || !data || !data.session) throw new AppError('CODE', tr('الكود غلط أو انتهت صلاحيته. اطلب كود جديد.', 'The code is wrong or expired. Request a new one.'));
      AUTH_UID = data.session.user.id; RESET.recovering = AUTH_UID; await loadCloud();
    } else {
      if (!RESET.demoUser || d.code !== '123456') throw new AppError('CODE', tr('الكود غلط أو انتهت صلاحيته. اطلب كود جديد.', 'The code is wrong or expired. Request a new one.'));
      RESET.recovering = RESET.demoUser;
    }
    go('#/reset-password');
  } catch (e) { busy(btn, false); const fe = f.elements.code.closest('.field'); fe.classList.add('err'); $('.err-msg', fe).textContent = e.message; }
};
FORMS.forgot = async (f) => {
  const d = validate(f, { ident: ['req'] }); if (!d) return;
  const btn = $('button[type=submit]', f); busy(btn, true); if (!CLOUD) await wait(500);
  try { await sendReset(d.ident); render(); }
  catch (e) { busy(btn, false); const fe = f.elements.ident.closest('.field'); fe.classList.add('err'); $('.err-msg', fe).textContent = e.message; }
};
ACTIONS['forgot-resend'] = async (el) => { busy(el, true); try { await sendReset(RESET.sentTo); toast(RESET.channel === 'whatsapp' ? tr('بعتنا الكود تاني.', 'Code sent again.') : tr('بعتنا الإيميل تاني.', 'Email sent again.')); } catch (e) { toast(e.message, 'bad'); } render(); };
ACTIONS['forgot-other'] = () => { RESET.sentTo = null; RESET.demoUser = null; render(); };
ACTIONS['reset-demo-link'] = () => { RESET.recovering = RESET.demoUser; go('#/reset-password'); };
setInterval(() => { const b = document.getElementById('resend-btn'); if (!b) return; const left = Math.max(0, Math.ceil((RESET.cooldownUntil - Date.now()) / 1000)); b.disabled = left > 0; b.textContent = left ? tr(`إعادة الإرسال بعد ${left} ث`, `Resend in ${left}s`) : (RESET.channel === 'whatsapp' ? tr('إعادة إرسال الكود', 'Resend the code') : tr('إعادة إرسال الإيميل', 'Resend the email')); }, 1000);

function viewResetPassword() {
  const u = CLOUD ? me() : (RESET.recovering ? byId(db.users, RESET.recovering) : null);
  const ok = CLOUD ? !!(u && RESET.recovering) : !!u;
  const body = !ok ? `
    <div class="em-ic" style="width:64px;height:64px;border-radius:20px;background:var(--warn-50);color:var(--warn);display:grid;place-items:center;margin-bottom:16px">${ic('lock', 'lg')}</div>
    <h1 style="font-size:24px">${tr('افتح الرابط من الإيميل', 'Open the link from your email')}</h1>
    <p class="muted" style="margin:8px 0 18px">${tr('الصفحة دي بتشتغل بس من رابط إعادة التعيين اللي بيوصلك على الإيميل. لو الرابط انتهى، اطلب واحد جديد.', 'This page only works from the reset link in your email. If it expired, request a new one.')}</p>
    <a class="btn btn-primary" href="#/forgot">${tr('اطلب رابط جديد', 'Request a new link')}</a>`
  : `
    <h1 style="font-size:28px">${tr('كلمة مرور جديدة', 'Set a new password')}</h1>
    <p class="muted" style="margin:6px 0 22px">${tr(`للحساب <b dir="ltr">${esc(u.username || u.email)}</b>. اختار كلمة مرور ما استخدمتهاش قبل كده.`, `For <b>${esc(u.username || u.email)}</b>. Choose a password you haven’t used before.`)}</p>
    <form data-f="reset-pw" class="stack" novalidate>
      <input type="text" name="username" value="${esc(u.username || u.email)}" autocomplete="username" hidden>
      ${inp('nw', tr('كلمة المرور الجديدة', 'New password'), '', { type: 'password', attrs: 'dir="ltr" autocomplete="new-password"', hint: tr('٨ أحرف على الأقل', 'At least 8 characters') })}
      ${inp('nw2', tr('أكّد كلمة المرور', 'Confirm the password'), '', { type: 'password', attrs: 'dir="ltr" autocomplete="new-password"' })}
      <button class="btn btn-primary btn-lg btn-block" type="submit">${tr('حفظ كلمة المرور والدخول', 'Save password and log in')}</button></form>`;
  return header() + `<main class="auth route-fade"><div class="auth-art"><img src="${artURL('oasis', 1)}" alt="">${authBrand()}<p class="cap">${tr('واحة سيوة', 'Siwa Oasis')}</p></div><div class="auth-f"><div class="auth-box">${body}</div></div></main>`;
}
FORMS['reset-pw'] = async (f) => {
  const d = validate(f, { nw: ['req', 'pw'], nw2: ['req', (v, a) => v === a.nw || tr('كلمتا المرور غير متطابقتين.', 'Passwords don’t match.')] }); if (!d) return;
  const btn = $('button[type=submit]', f); busy(btn, true);
  try {
    if (CLOUD) {
      const { error } = await sb.auth.updateUser({ password: d.nw });
      if (error) throw new AppError('PW', /different from the old|same_password/i.test(error.message || '') ? tr('كلمة المرور الجديدة لازم تكون مختلفة عن القديمة.', 'The new password must differ from the old one.') : /expired|invalid|session/i.test(error.message || '') ? tr('انتهت مهلة الرابط. اطلب رابط جديد.', 'The link expired. Request a new one.') : cloudMsg(error));
      RESET.recovering = null; await loadCloud();
    } else {
      const id = RESET.recovering; tx((x) => { byId(x.users, id).password = d.nw; });
      RESET.recovering = null; setSession(byId(db.users, id));
    }
    RESET.sentTo = null; RESET.demoUser = null;
    toast(tr('تم تغيير كلمة المرور، وسجّلناك دخول.', 'Password changed — you’re logged in.'));
    go(homeFor(me()));
  } catch (e) { busy(btn, false); const fe = f.elements.nw.closest('.field'); fe.classList.add('err'); $('.err-msg', fe).textContent = e.message; }
};
