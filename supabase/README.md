# قاعدة البيانات وإعداد فرع جديد (Multi-Branch)

هذا الدليل يشرح كيف تنشئ فرعاً جديداً للنظام (نفس الكود، نفس الـ deployment، لكن قاعدة بيانات Supabase مستقلة وبيانات منفصلة تماماً).

## نظرة سريعة

- كل فرع له قاعدة بيانات Supabase خاصة (مدير، موظفون، أقسام، طلبات، مهام منفصلة).
- كل الفروع تشترك في نفس الكود ونفس الـ deployment.
- الفصل يتم عبر الـ subdomain:
  - `branch1.<your-domain>` → قاعدة الفرع الأول
  - `branch2.<your-domain>` → قاعدة الفرع الثاني
  - أي subdomain آخر أو `localhost` → القاعدة الافتراضية (`VITE_SUPABASE_URL`).

## ملف `bootstrap.sql`

`supabase/bootstrap.sql` يحتوي على **كامل** مخطط قاعدة البيانات (مجمَّع من جميع الـ migrations المتسلسلة في ملف واحد). يحتوي على:

- الأنواع (`app_role`, `task_status`, `task_level`, `request_status`, `request_priority`, `field_type`).
- جميع الجداول: `departments, profiles, user_roles, requests, tasks, attachments, task_history, notifications, custom_fields, task_custom_field_values, task_comments, automation_rules, time_entries, docs, weekly_time_goals, request_custom_field_values, leads, lead_activities, user_settings, announcements, activity_logs, role_permissions`.
- الدوال الأمنية (Security Definer): `get_user_role, has_role, is_general_manager, get_user_department, get_activity_user_department, update_updated_at_column, handle_new_user`.
- جميع الـ Triggers و RLS Policies.
- Storage bucket باسم `task-attachments` بحد ١٠ ميجابايت.
- بيانات افتراضية لـ `role_permissions` للأدوار الستة.

> **ملاحظة:** ملف `bootstrap.sql` آمن للتشغيل **مرة واحدة على قاعدة جديدة فاضية**. إذا كنت ستضيف تعديلات على المخطط لاحقاً، أنشئ migration جديد في `supabase/migrations/` بدلاً من تعديل `bootstrap.sql` يدوياً (ثم لما تحتاج إعادة بنائه: شغّل السكربت في الأسفل).

---

## خطوات إنشاء الفرع الثاني (خطوة بخطوة)

### ١) إنشاء مشروع Supabase جديد

1. ادخل [Supabase Dashboard](https://supabase.com/dashboard).
2. اضغط **New Project** ثم:
   - **Name**: `alytam-branch2` (أو أي اسم يناسبك).
   - **Database Password**: ولّد كلمة قوية واحفظها في مدير كلمات السر.
   - **Region**: اختر الأقرب جغرافياً (لمستخدمي الخليج: Frankfurt أو AWS-Bahrain).
3. انتظر حتى يجهز المشروع (٢-٣ دقائق).

### ٢) تشغيل ملف الإنشاء (Bootstrap)

1. من Supabase Dashboard للمشروع الجديد، افتح **SQL Editor** من الشريط الجانبي.
2. اضغط **New Query**.
3. افتح ملف `supabase/bootstrap.sql` من المستودع، انسخ كامل محتواه، والصقه في الـ SQL Editor.
4. اضغط **Run** (أو `Ctrl+Enter`).
5. تحقق من نجاح التشغيل — يفترض ترى رسالة "Success. No rows returned".

> **في حال خطأ:** أكثر سبب شائع أن المشروع غير فاضي تماماً. أنشئ مشروع جديد بدل تنظيف مشروع موجود.

### ٣) أخذ مفاتيح الـ API

1. من Supabase Dashboard، اضغط **Settings** → **API**.
2. انسخ:
   - **Project URL** (يبدأ بـ `https://` وينتهي بـ `.supabase.co`).
   - **anon / public key** (المفتاح العام الآمن لاستخدامه في الواجهة).

### ٤) ضبط متغيرات البيئة في الـ Deployment

في إعدادات النشر (Vercel / Netlify / Cloudflare Pages / أي منصة)، أضف هذين المتغيرين:

```bash
VITE_BRANCH2_SUPABASE_URL="https://<project-id>.supabase.co"
VITE_BRANCH2_SUPABASE_PUBLISHABLE_KEY="<anon-key>"
```

> **مهم:** كلا المتغيرين يجب أن يبدآ بـ `VITE_` لأن Vite لا يكشف غيرها للواجهة.

### ٥) ربط الـ Subdomain

في إعدادات الدومين على منصة النشر:

1. أضف custom domain جديد: `branch2.<your-domain>` (مثلاً `branch2.alyatama.org`).
2. تأكد من إضافة CNAME في DNS مزوّد الدومين يشير إلى الـ deployment.
3. انتظر انتشار DNS (دقائق إلى ساعات).

### ٦) التحقق

1. افتح `https://branch2.<your-domain>` في المتصفح.
2. شاشة الدخول ستظهر بنفس الشكل لكن متصلة بقاعدة بيانات الفرع الجديدة.
3. سجّل أول مستخدم مدير عام للفرع (راجع القسم التالي).

---

## إنشاء أول مدير عام (General Manager) للفرع الجديد

قاعدة البيانات الجديدة فاضية ولا فيها مستخدمين. لإنشاء أول مدير:

### الطريقة (أ) — عبر Supabase Auth + SQL

1. من Supabase Dashboard للمشروع الجديد: **Authentication** → **Users** → **Add user** → **Create new user**:
   - Email + Password.
   - فعّل **Auto Confirm User** (يتجنب التحقق بالبريد).
2. من الـ SQL Editor شغّل:

```sql
-- استبدل البريد بالبريد المستخدم في الخطوة السابقة، وعدّل الاسم
INSERT INTO public.profiles (id, email, full_name, status)
SELECT id, email, 'اسم المدير العام للفرع الجديد', 'active'
FROM auth.users
WHERE email = 'manager@example.com';

-- إعطاء الدور
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'GeneralManager'::app_role
FROM auth.users
WHERE email = 'manager@example.com';
```

### الطريقة (ب) — عبر التطبيق ثم ترقية يدوية

1. سجّل المستخدم من شاشة الدخول كمستخدم عادي.
2. شغّل فقط الـ INSERT الثاني أعلاه (الـ INSERT في `user_roles`) لأن `profiles` يُنشأ تلقائياً بفضل `handle_new_user` trigger.

> بعد ترقية المستخدم لـ `GeneralManager`، أعد تسجيل الدخول من واجهة التطبيق.

---

## ما الفرق بين الفرع الجديد والقديم؟

- **نفس المخطط بالضبط** — جداول، أعمدة، أنواع، RLS، Storage، Functions، Triggers.
- **نفس الكود** — نفس الـ deployment، نفس الواجهة.
- **نختلف في:** البيانات (مدير، موظفون، أقسام، طلبات، مهام، مستندات … كلها مستقلة لكل فرع).

---

## كيفية عمل الفصل في الكود

`src/integrations/supabase/client.ts`:

1. يقرأ `window.location.hostname` ويأخذ أول مقطع كـ `subdomain`.
2. لو `subdomain === 'branch1'` → يستخدم `VITE_BRANCH1_SUPABASE_URL` + `VITE_BRANCH1_SUPABASE_PUBLISHABLE_KEY`.
3. لو `subdomain === 'branch2'` → يستخدم `VITE_BRANCH2_SUPABASE_URL` + `VITE_BRANCH2_SUPABASE_PUBLISHABLE_KEY`.
4. أي شيء آخر (مثل `localhost`) → يستخدم `VITE_SUPABASE_URL` الافتراضي.
5. لكل فرع `storageKey` منفصل في الـ localStorage بصيغة `sb-<project-ref>-auth-token` (نفس الصيغة الافتراضية لمكتبة `supabase-js`) — فيمنع تسرب الجلسات بين الفروع، ويحافظ في نفس الوقت على جلسات الفرع الأصلي بعد ترقية الكود.

---

## إضافة فرع ثالث (أو أكثر) لاحقاً

١) أضف فرعاً في الخريطة داخل `src/integrations/supabase/client.ts`:

```ts
const branchEnvMap = {
  branch1: { urlVar: "VITE_BRANCH1_SUPABASE_URL", keyVar: "VITE_BRANCH1_SUPABASE_PUBLISHABLE_KEY" },
  branch2: { urlVar: "VITE_BRANCH2_SUPABASE_URL", keyVar: "VITE_BRANCH2_SUPABASE_PUBLISHABLE_KEY" },
  branch3: { urlVar: "VITE_BRANCH3_SUPABASE_URL", keyVar: "VITE_BRANCH3_SUPABASE_PUBLISHABLE_KEY" }, // ← الجديد
};
```

٢) أضف المتغيرات إلى `.env.example` و إعدادات النشر.
٣) كرّر خطوات إنشاء مشروع Supabase وتشغيل `bootstrap.sql`.
٤) اربط `branch3.<your-domain>` بـ DNS.

---

## إعادة بناء `bootstrap.sql` (للمطورين)

لو أضفت migrations جديدة وتبي تحدّث `bootstrap.sql`:

```bash
{
  echo "-- =====================================================================";
  echo "-- alytam — bootstrap (Auto-generated from supabase/migrations/*.sql)";
  echo "-- =====================================================================";
  for f in $(ls supabase/migrations/*.sql | sort); do
    echo "";
    echo "-- ----- المصدر: $(basename $f) -----";
    cat "$f";
  done;
} > supabase/bootstrap.sql
```

---

## استكشاف الأخطاء

**خطأ: `relation "auth.users" does not exist` عند تشغيل bootstrap.sql.**
→ تأكد إنك في مشروع Supabase وليس Postgres عام. Supabase يوفّر schema `auth` تلقائياً.

**خطأ: `type "app_role" already exists`.**
→ المشروع غير فاضي. أنشئ مشروع جديد بدل تنظيف القديم.

**شاشة الدخول تظهر لكن لا أستطيع تسجيل أي حساب.**
→ تحقق من **Authentication → Providers** في Supabase Dashboard إن **Email** مفعّل.

**التطبيق يفتح القاعدة الخاطئة في الفرع الجديد.**
→ افتح Console في المتصفح، تأكد من رسالة `[supabase]` أو افحص الـ Network tab وراقب الطلبات إلى أي subdomain من `*.supabase.co` تذهب. لو تذهب لقاعدة الفرع القديم، فإن متغيرات البيئة `VITE_BRANCH2_*` غير معبأة في الـ deployment.
