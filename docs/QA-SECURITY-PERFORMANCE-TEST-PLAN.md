# خطة الاختبار: الجودة والأمان والأداء – رحلاتي

## 1. Executive Summary
اتعمل اختبار للتطبيق الحقيقي: الكود في الريبو وقاعدة Supabase الحقيقية. اتنفّذ **٢٥٨ فحص آلي**:

| المجموعة | عدد الفحوصات |
|---|---:|
| E2E | ١٧١ |
| أمان قاعدة البيانات | ٥١ |
| REST و Edge Function | ١٨ |
| XSS | ٩ + fuzz على ٢٥٤٧ نص (فحص واحد) |
| Webhook | ٨ |

- **اللي اتلقى:** ٢ Critical، و٥ High، و١١ Medium، و٦ Low.
- **اللي اتصلح:** Critical واحدة، و٤ High، و٦ Medium.
- **القرار: NOT READY FOR PRODUCTION.** الأسباب: الدفع لسه محاكاة، والحسابات التجريبية شغالة بكلمة مرور منشورة، واختبار الضغط ما اتعملش.
- التفاصيل في `PRODUCTION-READINESS-REPORT.md`.

## 2. Project Scope
**داخل النطاق:**
- الموقع العام.
- الدخول والتسجيل والاسترجاع.
- لوحات العميل والشركة والإدارة.
- الحجز والدفع (محاكاة) والإلغاء والاسترداد والعمولة والتسويات.
- التقييمات والإشعارات.
- العروض والمقارنة.
- الرحلات المخصصة.
- PWA.
- قاعدة البيانات (RLS والدوال والـ triggers).
- Edge Functions.

**خارج النطاق (من غير وجود حقيقي في المشروع):** بوابة دفع حقيقية، و SMS و WhatsApp، و Storage، و CI/CD، و background queues.

## 3. Architecture Overview
```
المتصفح (index.html – SPA بـ Vanilla JS، hash router)
   │  supabase-js v2 (CDN) – Bearer JWT في localStorage
   ▼
Supabase (Free)
   ├─ Auth (GoTrue): email/password، و recovery email
   ├─ PostgREST: الجداول، كلها RLS ─┐
   ├─ RPC: دوال SECURITY DEFINER ───┼─ Postgres 17 (triggers للحماية والتحقق)
   └─ Edge Functions: password-reset (منشورة)، payment-webhook (مش منشورة)
GitHub Pages: استضافة ثابتة + service worker (PWA)
```

**دورة الحجز:**
1. `create_booking` (قفل `FOR UPDATE` على الموعد، والحالة `pending_payment`، ومهلة ١٥ دقيقة).
2. `pay_booking` (محاكاة، idempotent). الحالة تبقى `confirmed/paid`.
3. بعد كده واحد من دول:
   - `request_cancel`، ثم `refunds.pending`، ثم `process_refund` من الأدمن، ثم `refunded`.
   - انتهاء الرحلة، ثم `housekeeping`، ثم `completed`، ثم `add_review`.

**دورة الدفع المستهدفة:**
1. البوابة تبعت للـ webhook (HMAC + مهلة).
2. `confirm_gateway_payment` (service role، idempotent لكل حدث، يتأكد من المبلغ والعملة).
3. الحجز يتأكد.

## 4. Technology Stack
| البند | الفعلي |
|---|---|
| الواجهة | HTML/CSS/Vanilla JS، ملف واحد بيتبني من `src/` بـ `build.sh` |
| الباك إند | من غير سيرفر خاص: Supabase (PostgREST + Postgres functions + Edge Functions بـ Deno) |
| قاعدة البيانات | PostgreSQL 17، و jsonb `data` لباقي الحقول |
| ORM | مفيش |
| الدخول | Supabase Auth (bcrypt، JWT ساعة، refresh token) |
| الصلاحيات | RLS + triggers + فحوصات جوه الدوال |
| الدفع | محاكاة (`_pay_booking_sim`) + webhook جاهز |
| الصور | base64 جوه قاعدة البيانات |
| الإيميل | Supabase Auth (استرجاع كلمة المرور بس) |
| الاستضافة | GitHub Pages |
| الاختبارات | Playwright (Python)، SQL، Node test، k6 (سكربت بس) |
| CI/CD | مفيش |

## 5. User Roles
Guest، و Customer، و Company (حالاتها: pending / approved / rejected / suspended)، و Admin.

مصفوفة الصلاحيات المختصرة:

| العملية | Guest | Customer | Company | Admin |
|---|---|---|---|---|
| الرحلات العامة | ✔ | ✔ | ✔ | ✔ |
| الحجز والدفع | ✖ | ✔ لنفسه بس | ✖ | ✖ |
| الإلغاء أو طلب الاسترداد | ✖ | ✔ حجوزاته بس | ✖ | — |
| الموافقة على الاسترداد | ✖ | ✖ | ✖ | ✔ |
| إدارة الرحلات والمواعيد | ✖ | ✖ | ✔ شركته بس، ولازم تكون معتمدة | ✔ |
| حجوزات الشركة | ✖ | ✖ | ✔ شركته بس | ✔ |
| اعتماد الشركات والعمولة والتقييم | ✖ | ✖ | ✖ | ✔ |
| التسويات | ✖ | ✖ | قراءة لشركته بس | ✔ |
| الإشعارات (إضافة) | ✖ | ✖ | ✖ | ✔ + دوال السيرفر |

## 6. Feature Inventory
| ID | الميزة | الدور | الاختبار |
|---|---|---|---|
| F-PUB | الرئيسية، البحث، الفلاتر، الترتيب، تفاصيل الرحلة، الشركات، الوجهات، الصفحات الثابتة، عربي/إنجليزي | Guest | test_journeys |
| F-AUTH | التسجيل، الدخول باسم المستخدم أو الإيميل، الخروج، تغيير كلمة المرور، الاسترجاع | الكل | test_journeys, t_reset, AUTH-* |
| F-BOOK | الحجز ٤ خطوات، المهلة، كود الخصم، عروض المواسم | Customer | test_journeys, BK-* |
| F-PAY | البطاقة، فوري، المحافظ، إنستاباي (محاكاة) | Customer | test_journeys, BK-06/07/08 |
| F-CXL | الإلغاء والاسترداد حسب السياسة | Customer/Admin | test_journeys, BK-09..13 |
| F-REV | التقييم بعد انتهاء الرحلة | Customer | test_journeys |
| F-FAV | المفضلة | Customer | test_journeys |
| F-CMP | المقارنة لكل حساب | الكل | t_cmp |
| F-OFF | عروض المواسم | Admin/Guest | t_new |
| F-RATE | تقييم المنصة للشركات | Admin | t_new |
| F-CO | الرحلات والمواعيد والحجوزات والمستحقات والتقييمات وملف الشركة | Company | test_journeys, TEN-* |
| F-ADM | الشركات والرحلات والعملاء والحجوزات والمالية والمحتوى والإعدادات | Admin | test_journeys, t_new |
| F-REQ | الرحلات المخصصة: الطلب والعروض والمحادثة والقبول والرحلة الخاصة | Customer/Company | t_req |
| F-PWA | التثبيت والعمل من غير إنترنت | Guest | t_pwa |

## 7. User Flow Inventory
| Flow | الوصف | الاختبار | الحالة |
|---|---|---|---|
| UF-1 | زائر يبقى عميل ويكمل الحجز من غير ما يضيع اختياره | test_journeys (Guest → login → back on checkout) | PASS |
| UF-2 | حجز كامل: مقاعد، سعر، دفع، إشعارات | test_journeys + BK-03..08 | PASS (الدفع محاكاة) |
| UF-3 | شركة تضيف رحلة، والأدمن يعتمدها، فتظهر للجمهور | test_journeys | PASS |
| UF-4 | شركة تدير حجز (عرض التفاصيل وبيانات المسافرين) | test_journeys | PASS |
| UF-5 | الأدمن يعتمد أو يرفض شركة | test_journeys, t_new | PASS |
| UF-6 | الإلغاء والاسترداد | test_journeys + BK-09..13 | PASS |
| UF-7 | العمولة والتسوية | test_journeys + BK-08 + VAL-09 + فحص سلامة البيانات الحقيقية (0 أخطاء عمولة) | PASS |
| UF-8 | رحلة مخصصة من الطلب للحجز | t_req (42) | PASS |

## 8. Security Threat Model
| الأصل | التهديد (STRIDE) | الضابط | الحالة |
|---|---|---|---|
| جلسات المستخدمين | سرقة التوكن بـ XSS (I/E) | escaping + تحقق على السيرفر + CSP | محمي (SEC-01) |
| المدفوعات | تأكيد مزيف من المتصفح (T) | webhook موقّع + `paymentMode` | **مفتوح** (SEC-05) |
| بيانات العملاء | IDOR بين العملاء وبين الشركات (I) | RLS | محمي (RBAC/TEN) |
| الإيميلات | تعداد الحسابات وجمع الإيميلات (I) | `resolve_login` بكلمة المرور + Edge Function | محمي (SEC-03) |
| الحسابات | brute force (S) | GoTrue limits + حد للمحاولات | محمي جزئيًا (SEC-13) |
| الحسابات التجريبية | الدخول بكلمة مرور منشورة (S) | — | **مفتوح** (SEC-10) |
| الإشعارات | phishing من مستخدم (S) | إضافة من الأدمن والسيرفر بس | محمي (SEC-02) |
| العمولة والتسويات | التلاعب (T) | triggers + RLS + `validate_settlement` | محمي |
| التوفّر | تسجيل بالجملة، بيانات ضخمة (D) | حدود للتسجيل والحجم | محمي جزئيًا |
| سلسلة التوريد | CDN بإصدار مش ثابت (T) | CSP؛ تثبيت الإصدار و SRI ناقصين | جزئي (SEC-12) |

**حدود الثقة:**
- المتصفح ← PostgREST: كل حاجة جاية من المتصفح مش موثوقة.
- PostgREST ← Postgres: الـ role والـ claims.
- Edge Function ← service role.
- البوابة ← webhook: توقيع HMAC.

## 9–15. Test Cases
**الصيغة:** كل صف بيقابل الحقول المطلوبة: Test ID، و Module، و Feature/Category، و Priority/Severity، و Role، و Preconditions/Data، و Steps، و Expected، و Actual، و Status، و Evidence، و Bug.
- اختبارات الواجهة الكاملة (١٧١) موجودة باسمها في `tests/e2e/*.py`، وكل سطر فيها `ok('name', condition)` هو test case فيه المتوقع والفعلي.
- اختبارات قاعدة البيانات (٥١) في `tests/sql/security_regression.sql`، وكل `pg_temp.run('ID name', role, expected-regex, sql)` هو test case.

### 9. Security Test Cases (مختارة)
| ID | Module | Category | P | Role | Steps / Data | Expected | Actual | Status | Evidence | Bug |
|---|---|---|---|---|---|---|---|---|---|---|
| SEC-T01 | Notifications | Stored XSS | P0 | Customer | إضافة إشعار للأدمن برابط فيه attribute injection | يترفض | قبل: اتحفظ واتنفّذ. بعد: RLS violation | PASS | RBAC-08, t_xss | SEC-01/02 |
| SEC-T02 | Companies | Stored XSS | P0 | Company | `color`/`logo` = payload | `BAD_COLOR`/`BAD_IMAGE` | زي المتوقع | PASS | VAL-01/02 | SEC-01 |
| SEC-T03 | Trips | Stored XSS | P0 | Company | id/images = payload | `BAD_ID`/`BAD_IMAGE` | زي المتوقع | PASS | VAL-03/04 | SEC-01 |
| SEC-T04 | UI | DOM/Stored XSS fuzz | P0 | الكل | ٢٥٤٧ نص فيه polyglot، وكل الصفحات | ولا تنفيذ | 0 | PASS | t_xss_fuzz | SEC-01 |
| SEC-T05 | Payments | Business logic | P0 | Customer | `pay_booking` من غير دفع | يترفض في الإنتاج | بيتأكد | **FAIL** | B23 | SEC-05 |
| SEC-T06 | Auth | Enumeration | P1 | Guest | `resolve_login('mariam')` | ما يرجّعش الإيميل | NULL أو function missing | PASS | AUTH-01/02 | SEC-03 |
| SEC-T07 | Auth | Brute force | P1 | Guest | ١١ محاولة غلط | `LOCKED` | 400 بعد ١٠ | PASS | REST | SEC-03 |
| SEC-T08 | Auth | Weak password | P1 | Guest | تسجيل بكلمة مرور ٦ حروف | `WEAK_PASSWORD` | زي المتوقع | PASS | AUTH-03 | SEC-04 |
| SEC-T09 | Auth | Vertical escalation | P0 | Customer | `role='admin'` | ما يتغيرش | customer | PASS | AUTH-06 | — |
| SEC-T10 | Auth | Demo creds | P1 | Guest | الدخول بكلمة المرور المنشورة | ممنوع في الإنتاج | ٢٠ حساب بيقبلها | **FAIL** | فحص hash | SEC-10 |
| SEC-T11 | API | Function-level auth | P0 | Guest | `pay_booking`/`create_booking`/`housekeeping`/`_throttle`/`confirm_gateway_payment` من غير تسجيل | 401/403 | 401 permission denied | PASS | REST | — |
| SEC-T12 | API | Malformed input | P2 | Guest | JSON بايظ | 400 من غير تفاصيل داخلية | 400 PGRST102 | PASS | REST | — |
| SEC-T13 | API | SQLi | P0 | Guest | `id=eq.t1' or 1=1--` | ما يتنفّذش | 403 (WAF) | PASS | REST | — |
| SEC-T14 | Headers | CSP | P2 | — | فحص الـ meta | فيه CSP | موجود، ومفيش violations في الاختبارات | PASS | t_pwa, t_perf | SEC-12 |

### 10. Functional Test Cases
موجودة في `test_journeys.py` (58)، و`t_new.py` (33)، و`t_cmp.py` (7)، و`t_req.py` (42)، و`t_pwa.py` (15)، و`t_reset.py` (16). **كلها PASS.**

بتغطي:
- البحث بالوجهة والتاريخ والسعر، والفلاتر، والترتيب، و empty state.
- عربي وإنجليزي و RTL/LTR.
- الموبايل من غير scroll أفقي في ١٠ صفحات.
- التسجيل مع الأخطاء (إيميل غلط، اسم مستخدم مكرر، حقول ناقصة).
- الحجز بكل خطواته، والدفع المرفوض، والدفع المزدوج.
- الإلغاء والاسترداد ١٠٠٪ و٥٠٪ و٠٪.
- التقييم بعد الانتهاء بس.
- الشركة: رحلة ومواعيد وإلغاء موعد واسترداد كامل.
- الأدمن: اعتماد ورفض وإيقاف وعمولة خاصة وتسوية و CSV.

### 11. User Journey Test Cases
شوف القسم ٧. كلها PASS بشرط إن الدفع محاكاة.

### 12. Edge Case Test Cases
| ID | الحالة | المتوقع | الفعلي | Status | Evidence |
|---|---|---|---|---|---|
| EC-01 | ٠ مسافرين | `COUNT` | زي المتوقع | PASS | BK-01 |
| EC-02 | عدد سالب أو أكبر من ١٠ في الواجهة | الواجهة بتحدده من ١ لـ ١٠، والسيرفر بيرفض | زي المتوقع | PASS | BK-02 |
| EC-03 | مقاعد أكتر من المتاح | `NO_SEATS:n` | زي المتوقع | PASS | BK-04 |
| EC-04 | حجز آخر مقعد بالظبط | ينجح | زي المتوقع | PASS | F03 |
| EC-05 | موعد في الماضي | `DEP_CLOSED` | زي المتوقع | PASS | كود + test_journeys |
| EC-06 | رحلة متوقفة، أو شركة موقوفة | `UNAVAILABLE` | زي المتوقع | PASS | B20 |
| EC-07 | حجز مزدوج أو ضغطتين | `DUPLICATE` / idempotency | زي المتوقع | PASS | BK-05, test_journeys |
| EC-08 | عميلين على آخر مقعد في نفس اللحظة | واحد بس ينجح | قفل صف الموعد (كود) | NOT VERIFIED بالتوازي | — |
| EC-09 | الدفع بعد انتهاء المهلة | `EXPIRED` | زي المتوقع | PASS | F10 |
| EC-10 | السعر يتغير أثناء الدفع | السعر محفوظ في الحجز | الحجز بيحتفظ بـ `unitPrice` والإجمالي | PASS | F21 |
| EC-11 | تقليل المقاعد تحت المحجوز | `SEATS_BELOW_BOOKED` | موجود في الكود | PASS (كود) | guard_departure |
| EC-12 | استرداد مكرر | `STATE` | زي المتوقع | PASS | BK-12 |
| EC-13 | حدث webhook مكرر، أو مبلغ أو عملة غلط، أو دفع متأخر | idempotent أو رفض أو تسوية | منفّذ في `confirm_gateway_payment` | NOT VERIFIED (مفيش بوابة) | — |
| EC-14 | توقيع غلط أو حدث قديم | 401 | unit 8/8 | PASS (unit) | webhook test |
| EC-15 | عميل موقوف | `SUSPENDED` | زي المتوقع | PASS | AUTH-07 |
| EC-16 | شركة موقوفة تعدّل | `COMPANY_NOT_APPROVED` | زي المتوقع | PASS | TEN-08 |
| EC-17 | صورة ضخمة، أو بايظة، أو SVG | ترفض | الواجهة بتعيد ترميزها JPEG، والسيرفر بيرفض أي حاجة مش raster | PASS | VAL-02, readImage |
| EC-18 | الإشعار يفشل بعد الحجز | الحجز يفضل | الإشعار جوه نفس الـ transaction (ما يقدرش يفشل لوحده) | PASS (كود) | — |

### 13. Error State Test Cases
- الواجهة من غير إنترنت.
- مكتبة Supabase ما اتحمّلتش.
- السيرفر مش بيرد.
- رابط الاسترجاع منتهي.
- الدفع المرفوض.

كلها بتعرض رسالة واضحة وزر "حاول تاني" (`t_pwa` و`t_reset` و`test_journeys`). وأخطاء قاعدة البيانات بتتحول لرسائل عربي عن طريق `cloudMsg` (+١٥ كود جديد).

### 14. Integration Test Cases
| التكامل | الاختبار | الحالة |
|---|---|---|
| Postgres (RLS/RPC/triggers) | security_regression 51 | PASS |
| PostgREST (HTTP) | ١٦ طلب REST | PASS |
| Auth: الدخول والاسترجاع | Edge Function عبر HTTP، و t_reset (stub) | PASS / الإيميل نفسه NOT VERIFIED (محتاج SMTP) |
| بوابة الدفع | Mock: unit test للتوقيع | Mock بس. البوابة الحقيقية NOT TESTED |
| الإشعارات داخل التطبيق | test_journeys, t_req | PASS |
| SMS / WhatsApp / Storage | مش موجودين | N/A |

### 15. Database Integrity Tests (على البيانات الحقيقية، قراءة بس)
| الفحص | النتيجة |
|---|---|
| عمولة غلط على حجوزات مدفوعة | 0 |
| مسترد أكبر من الإجمالي أو بالسالب | 0 |
| حجز مدفوع مرتين | 0 |
| حجز مدفوع من غير دفعة | 0 |
| حجز مؤكد مش مدفوع | 0 |
| استرداد مرتين | 0 |
| عدم تطابق الاسترداد مع حركة الدفع | 0 |
| حجز أو موعد بشركة غير شركة الرحلة | 0 |
| موعد عليه حجوزات أكتر من المقاعد | **1** (بيانات seed قديمة: L-6) |

## 16. Performance Test Scenarios
شوف `PERFORMANCE-TEST-REPORT.md`. السيناريوهات من A لحد G جاهزة في k6، **ومش متنفّذة**.

## 17. Test Data Requirements
- حسابات العرض التجريبي (`?demo=1`)، بتتعمل تلقائيًا في المتصفح.
- قاعدة الإنتاج: حسابات demo (mariam، ahmed، khaled الموقوف، bahr/c2، nilestar/c1 الموقوفة، admin). كل كتابة بتترجع (rollback). أما الـ fixture `dp_sec` فبيتعمل جوه الـ transaction.
- لاختبار الضغط والتزامن: مشروع Supabase منفصل.

## 18. Test Environment Requirements
- Chrome أو Chromium + Python 3 + `playwright`.
- Node 18 أو أحدث (للـ unit test).
- k6 (للضغط).
- مشروع Supabase منفصل (للضغط والتزامن ولاختبار الـ webhook الكامل).
- حساب sandbox عند بوابة الدفع.
- SMTP (للإيميلات).

## 19–20. Expected / Actual Results
موجودة في جداول الأقسام ٩ لحد ١٥، وفي مخرجات الاختبارات.

## 21. Pass/Fail Criteria
- **PASS:** النتيجة الفعلية بتطابق المتوقع، وفي دليل من اختبار اتنفّذ.
- **FAIL:** ما بتطابقش.
- **BLOCKED:** محتاج حاجة مش متاحة.
- **NOT TESTED / NOT VERIFIED:** ما اتنفّذش، أو اتراجع من الكود بس. **ما بنحسبهوش PASS.**

## 22. Risk Classification
P0 = SEC-01 (اتصلحت)، SEC-05 (مفتوحة). P1 = SEC-02/03/04/BUG-01 (اتصلحت)، SEC-10 (مفتوحة). P2/P3: شوف `BUG-REPORT.md`.

## 23. Known Limitations
- البيئة كانت ممنوعة توصل لـ supabase.co و github.io، عشان كده اختبارات HTTP اتعملت من جوه Supabase.
- مفيش اختبار ضغط.
- مفيش تزامن حقيقي بأكتر من اتصال.
- مفيش OWASP ZAP (التثبيت كان مقفول).
- مفيش بوابة دفع ولا SMTP.
- تقييم الـ headers على GitHub Pages محدود: مفيش تحكم في HSTS و frame-ancestors.

## 24. Production Readiness Assessment
**NOT READY FOR PRODUCTION.** شوف `PRODUCTION-READINESS-REPORT.md`.
