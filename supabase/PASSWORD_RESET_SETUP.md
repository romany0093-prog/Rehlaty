# تفعيل استرجاع كلمة المرور بالإيميل

الموقع جاهز. محتاج ٣ إعدادات في لوحة Supabase (مشروع `rehlaty`):

## ١. عنوان الموقع (ضروري)
Authentication → URL Configuration
- **Site URL:** `https://romany0093-prog.github.io/Rehlaty/`
- **Redirect URLs:** أضف `https://romany0093-prog.github.io/Rehlaty/**`

بدون ده الرابط في الإيميل هيودّي على `localhost` ومش هيشتغل.

## ٢. نص الإيميل بالعربي
Authentication → Emails → Templates → **Reset password**
- Subject: `إعادة تعيين كلمة المرور – UTravel`
- Body: انسخ محتوى `email-reset-password.html`

## ٣. خدمة إرسال الإيميل (ضروري قبل ما العملاء يستخدموها)
خدمة Supabase المدمجة بتبعت **رسالتين في الساعة بس، ولإيميلات فريق المشروع بس** — تنفع للتجربة بإيميلك أنت فقط.
للعملاء والشركات: Project Settings → Authentication → **SMTP Settings** → Enable custom SMTP، وحط بيانات خدمة زي Brevo (خطة مجانية):
- Host: `smtp-relay.brevo.com` · Port: `587`
- Username / Password: من حسابك على Brevo (SMTP & API → SMTP)
- Sender email: إيميل أكّدته على Brevo · Sender name: `UTravel`

بعد تفعيل SMTP ارفع حد الإرسال من Authentication → Rate Limits لو احتجت.
