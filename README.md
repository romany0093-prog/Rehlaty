# رحلاتي — منصة حجز رحلات سياحية متعددة الشركات

نموذج أولي (Prototype) شغال بالكامل في ملف واحد `index.html`، عربي RTL افتراضيًا مع زر تبديل للإنجليزية.

## التشغيل

- افتح `index.html` مباشرة في المتصفح، أو
- ارفعه على GitHub واشغّل **GitHub Pages** (Settings → Pages → Branch: `main` / root).

## حسابات تجريبية

| الدور | البريد | كلمة المرور |
|---|---|---|
| عميل | `mariam@demo.eg` | `123456` |
| شركة (بحر وصحرا) | `bahr@demo.eg` | `123456` |
| شركة (نيل ستار – عمولة خاصة 8٪) | `nilestar@demo.eg` | `123456` |
| شركة قيد المراجعة | `marsa@demo.eg` | `123456` |
| مدير المنصة | `admin@rehlati.eg` | `admin123` |

صفحة تسجيل الدخول فيها أزرار دخول سريع لكل حساب.

## بيانات الدفع التجريبية

- بطاقة ناجحة: `4242 4242 4242 4242` — بطاقة مرفوضة: `4000 0000 0000 0002`
- المحافظ الإلكترونية: كود التأكيد `123456`
- فوري وإنستاباي: زر محاكاة لتأكيد الدفع
- أكواد خصم: `NILE10` (الأقصر وأسوان)، `WELCOME5`

## ما الذي يعمل فعليًا

- الموقع العام: الرئيسية، البحث والفلاتر والترتيب، تفاصيل الرحلة وويدجت الحجز، صفحات الشركات والوجهات، الأسئلة الشائعة والصفحات الثابتة.
- الحجز: ٤ خطوات (المسافرون، المراجعة والشروط وكود الخصم، الدفع، التأكيد) مع حجز مؤقت للمقاعد ١٥ دقيقة وعداد تنازلي.
- قواعد الحجز: منع الحجز المكرر لنفس الموعد، منع بيع مقاعد أكثر من المتاح، تحديث المقاعد بعد الدفع، مفتاح Idempotency يمنع الدفع مرتين، معالجة فشل الدفع، تزامن حالة الحجز والدفع، إلغاء واسترداد حسب السياسة (١٠٠٪ / ٥٠٪ / ٠٪).
- لوحة العميل، لوحة الشركة (مع عزل كامل لبياناتها)، لوحة الإدارة (اعتماد الشركات والرحلات، الاسترداد، الشكاوى، العمولات الافتراضية والخاصة، التسويات، المحتوى، الوجهات والتصنيفات).
- التقييمات بعد انتهاء الرحلة فقط ومرة واحدة لكل حجز، وإشعارات داخل التطبيق للأدوار الثلاثة.
- تصدير CSV، وتنزيل تأكيد الحجز والفاتورة كملف قابل للطباعة.

## ما ليس جاهزًا للإنتاج (بصراحة)

- **لا يوجد خادم ولا قاعدة بيانات حقيقية**: كل البيانات محفوظة في `localStorage` داخل متصفح المستخدم. دالة `tx()` تحاكي المعاملة الذرية (Transaction) لكنها ليست بديلًا عن PostgreSQL.
- **المصادقة شكلية**: كلمات المرور محفوظة نصًا في المتصفح، والصلاحيات تُفرض في الواجهة فقط.
- **الدفع محاكاة**: بوابات الدفع في كائن `GATEWAYS` بواجهة موحدة لتسهيل ربط Paymob / Fawry / Kashier لاحقًا.
- الصور رسومات SVG مولدة لكل وجهة؛ الشركات تقدر ترفع صور حقيقية من لوحتها.

## الانتقال إلى المعمارية المستهدفة (Next.js + Prisma + PostgreSQL)

الكود مقسم بنفس طبقات المشروع الحقيقي لتسهيل النقل:

| في الملف | المقابل في Next.js |
|---|---|
| `seedDB()` | `prisma/seed.ts` |
| `tx()` + دوال `createBooking` / `payBooking` / `requestCancel` / `processRefund` | Server Actions داخل `prisma.$transaction` مع `SELECT ... FOR UPDATE` على الموعد |
| `scoped()` و `assertCompanyOwns()` | Middleware + فلتر `companyId` في كل استعلام |
| `GATEWAYS` | `lib/payments/*` (Adapter لكل بوابة + Webhook) |
| `tr()` و `L()` | `next-intl` بملفات `ar.json` / `en.json` |
| `dataTable()` / `barChart()` | shadcn/ui Data Table + Recharts |

الكيانات: Users, Companies, CompanyDocuments, Destinations, TripCategories, Trips, TripImages, TripItineraries, TripDepartures, Bookings, BookingTravelers, Payments, Refunds, Reviews, Notifications, CommissionSettings, CompanySettlements, PlatformSettings.

## الكود المصدري

مجلد `src/` فيه الأجزاء التي يُجمَّع منها `index.html`:

```bash
{ cat src/1-head.html; cat src/2-base.js src/3-seed.js src/4-store.js src/5-ui.js src/6-public.js src/7-customer.js src/8-company.js src/9-admin.js src/10-router.js; printf '\n</script>\n</body>\n</html>\n'; } > index.html
```
