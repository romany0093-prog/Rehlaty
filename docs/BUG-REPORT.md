# تقرير الأخطاء (Bug Report) – رحلاتي

كل الأخطاء هنا اتأكدت باختبار اتنفّذ فعلًا. الترتيب حسب الأولوية المطلوبة: الأمان، ثم الصلاحيات، ثم عزل الشركات، ثم الفلوس، ثم الحجز، ثم البيانات، ثم الوظائف، ثم الأداء.
**التصنيف:** Critical/P0 · High/P1 · Medium/P2 · Low/P3

| Bug ID | العنوان | الجزء | الخطورة | الأولوية | الحالة | اختبار التحقق |
|---|---|---|---|---|---|---|
| SEC-01 | Stored XSS (رابط إشعار، لون، لوجو، صور، اسم شركة) | الواجهة + قاعدة البيانات | Critical | P0 | Fixed | t_xss 9/9، fuzz 0/2547، VAL-01..05 |
| SEC-05 | الدفع يتأكد من غير بوابة | الدفع | Critical | P0 | **Open** (محتاج بوابة) | B23 (إثبات الثغرة) |
| SEC-02 | أي مستخدم يبعت إشعارات أو يكتب في سجل النشاط | الإشعارات | High | P1 | Fixed | RBAC-08 |
| SEC-03 | `resolve_login` بتكشف الإيميل | الدخول | High | P1 | Fixed | AUTH-01/02 + REST |
| SEC-04 | تسجيل حسابات من غير حد أو تحقق | الدخول | High | P1 | Fixed | AUTH-03/04, A09 |
| SEC-10 | حسابات تجريبية شغالة وكلمة مرورها منشورة | البيانات/الإعداد | High | P1 | **Open** (قرار المالك) | فحص hash: 20 حساب |
| BUG-01 | حجز الرحلة المخصصة بأكتر من ١٠ أفراد بيفشل | الحجز | High | P1 | Fixed | BK-02, BK-14 |
| SEC-06 | الشركة الموقوفة بتعدّل رحلاتها | عزل الشركات | Medium | P2 | Fixed | TEN-08 |
| SEC-07 | موعد يرجع للماضي، ومواعيد رحلات مخفية ظاهرة | الحجز | Medium | P2 | Fixed | VAL-08, A06 |
| SEC-08 | بيانات من غير حد للحجم | التحقق من المدخلات | Medium | P2 | Fixed | VAL-06/07 |
| SEC-09 | تسوية أكبر من المستحقات | الفلوس | Medium | P2 | Fixed | VAL-09 |
| SEC-11 | `housekeeping` مفتوحة لغير المسجلين | API | Medium | P2 | Fixed | AUTH-05 |
| PERF-01 | RLS بطيء مع البيانات الكبيرة | الأداء | Medium | P2 | Fixed | قياس قبل وبعد |
| SEC-12 | مفيش CSP، والمكتبة من غير رقم إصدار ثابت | الإعداد | Medium | P2 | Partial | — |
| SEC-13 | حماية كلمات المرور المسرّبة مقفولة | الدخول | Medium | P2 | Partial | — |
| SEC-14 | الإيميل مش بيتأكد عند التسجيل | الدخول | Medium | P2 | Open | — |
| PERF-02 | تحميل كل الجداول مرة واحدة | الأداء | Medium | P2 | Open | 8.2MB عند x40 |
| PERF-03 | الصفحة كبيرة، و LCP على الموبايل ٤٫٢ ثانية | الأداء | Medium | P2 | Open | t_perf |
| L-1..L-6 | ملاحظات منخفضة (شوف تقرير الأمان) | — | Low | P3 | Open | — |

---

## SEC-01 – Stored XSS
- **الوصف:** قيم بيدخّلها المستخدم كانت بتتحط في الـ HTML attributes من غير escaping، والسيرفر كان بيقبلها.
- **خطوات إعادة الإنتاج:**
  1. `mariam` تبعت `POST /rest/v1/notifications` بـ `to_user=admin` و`link='#" autofocus onfocus="…'`.
  2. الأدمن يفتح لوحته، فالكود يتنفّذ.
  3. بديل: الشركة تعمل `PATCH companies` وتحط `data.color='red" onmouseover="…'`.
- **المتوقع:** يترفض على السيرفر، ويتعرض كنص.
- **الفعلي:** اتحفظ واتنفّذ (اتأكد في المتصفح في ٥ أماكن).
- **السبب:** escaping ناقص في 2-base.js (`imgSrc`) و 5-ui.js (`coLogo`) و 7-customer.js (روابط الإشعارات) و 6-public.js (البانر) و 6e و 9-admin (أسماء في رسائل التأكيد والـ toast). وكمان مفيش أي تحقق على السيرفر.
- **الملفات المتأثرة:** `src/2-base.js` و`5-ui.js` و`6-public.js` و`6e-requests.js` و`7-customer.js` و`8-company.js` و`9-admin.js` و`1-head.html` (CSP) و`supabase/005_security_hardening.sql`.
- **الأثر:** سرقة الحساب، ومنه حساب الأدمن (التوكن في `localStorage`).
- **الإصلاح:** تحقق على السيرفر (triggers + CHECK) + `imgSrc`/`safeColor`/`safeLink` + `esc()` + CSP.
- **التحقق:** `tests/e2e/t_xss.py` و`t_xss_fuzz.py` و`tests/sql/security_regression.sql` (VAL-01..05).

## SEC-05 – الدفع يتأكد من غير بوابة
- **الخطوات:** `create_booking`، ثم `pay_booking(id,'fawry',idem,'{}')`، فالحجز يبقى `confirmed/paid`.
- **المتوقع:** الحجز ما يتأكدش غير لما البوابة تأكد الدفع (webhook موقّع).
- **السبب:** الدفع محاكاة من البداية (README بيقول كده).
- **الملفات:** `supabase/002_functions.sql`، و`005` (اسمها اتغير لـ `_pay_booking_sim` واتعمل لها wrapper).
- **الأثر:** حجوزات مؤكدة من غير فلوس، ودي خسارة مباشرة للشركات والمنصة.
- **الإصلاح المقترح والمجهّز:**
  1. حساب sandbox.
  2. ربط `parseEvent` بحقول البوابة.
  3. نشر `supabase/functions/payment-webhook` وضبط `PAYMENT_WEBHOOK_SECRET`.
  4. في الواجهة: بدل `pay_booking` نوجّه العميل لصفحة البوابة، ونستنى تأكيد الـ webhook.
  5. `settings.paymentMode = 'gateway'`.
- **التحقق المجهّز:** `tests/unit/webhook-signature.test.mjs` (8/8). وبعد الربط: اختبار حدث مكرر، ومبلغ غلط، وعملة غلط، ودفع متأخر على `confirm_gateway_payment`.

## SEC-02 – إشعارات وسجل نشاط مزيفين
- **الخطوات:** عميل يعمل `POST /rest/v1/notifications` لأي `to_user` بنص ورابط من اختياره.
- **السبب:** `notif_insert with check (auth.uid() is not null)`.
- **الإصلاح:** الإضافة بقت `is_admin()` بس، والإشعارات التانية بتطلع من دوال السيرفر، والرابط عليه CHECK. `activity` بيتختم بـ `actor` وطوله محدود.

## SEC-03 – كشف الإيميل
- **الخطوات:** من غير تسجيل دخول، `POST /rest/v1/rpc/resolve_login {"p_ident":"mariam"}` بيرجّع الإيميل.
- **الإصلاح:** `resolve_login(p_ident, p_password)` + حد للمحاولات + Edge Function `password-reset`.
- **الملفات:** `005`، و`src/4b-cloud.js` (الدخول)، و`src/6d-reset.js` (الاسترجاع)، و`supabase/functions/password-reset`.

## SEC-04 – تسجيل من غير حد
- **الإصلاح:** حد للتسجيل لكل IP وعلى المنصة كلها، وكلمة مرور ٨ حروف، وتحقق من الحقول، وقائمة مسموحة لبيانات الشركة.
- **الملفات:** `005` و`src/5-ui.js` (قاعدة `pw`) وصفحات التسجيل والاسترجاع.

## SEC-10 – الحسابات التجريبية
- **الحقيقة:** ٢٠ حساب على القاعدة الحقيقية (١٤ عميل و٦ شركات) بكلمة مرور منشورة في README.
- **الإصلاح المقترح:** قبل الإطلاق نوقف الحسابات دي أو نمسحها، ونقفل `showDemo`، ونشيل الجدول من README. **ما اتنفّذش** لحد ما توافق.

## BUG-01 – حجز رحلة مخصصة بأكتر من ١٠ أفراد
- **الخطوات:** طلب لـ ١٢ فرد، ثم قبول عرض، ثم `create_booking` بـ ١٢ مسافر، فيفشل بـ `bookings_count_check`.
- **الإصلاح:** الحد بقى ١ لحد ٤٠، والرحلات العامة لسه ١٠ عن طريق الدالة.

## SEC-06 / SEC-07 / SEC-08 / SEC-09 / SEC-11 / PERF-01
التفاصيل في `SECURITY-AUDIT-REPORT.md` و`PERFORMANCE-TEST-REPORT.md`. كل الإصلاحات في `supabase/005_security_hardening.sql`، واختباراتها في `tests/sql/security_regression.sql`.

## سجل التغييرات في الكود (Change Log)
| الملف | التغيير |
|---|---|
| `supabase/005_security_hardening.sql` | جديد: validators و triggers وسياسات RLS وحدود للمحاولات و wrappers للحجز والدفع و`confirm_gateway_payment` و indexes |
| `supabase/functions/password-reset/index.ts` | جديد، ومنشور (verify_jwt=false، والرد ثابت) |
| `supabase/functions/payment-webhook/*` | جديد، **مش منشور** |
| `src/1-head.html` | Content-Security-Policy و Referrer-Policy |
| `src/2-base.js` | `imgSrc` آمنة، و`safeColor`، و`safeLink` |
| `src/5-ui.js` | `coLogo` آمن، وقاعدة `pw` (٨ حروف) |
| `src/4b-cloud.js` | الدخول بالشكل الجديد لـ `resolve_login`، و١٥ رسالة خطأ جديدة |
| `src/6d-reset.js` | الاسترجاع عن طريق Edge Function |
| `src/6-public.js`, `6e-requests.js`, `7-customer.js`, `8-company.js`, `9-admin.js` | `esc()` و`safeLink()` في الأماكن المعرضة |
| `sw.js` | `VERSION` بقى v4 |
| `tests/` | جديد: e2e و sql و unit و load |
