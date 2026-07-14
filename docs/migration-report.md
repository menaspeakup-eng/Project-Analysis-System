# تقرير مراجعة ونقل منصة "انطق"

**تاريخ التقرير:** 14 يوليو 2026
**الهدف:** مراجعة المشروع بالكامل وتجهيزه للنقل من Replit إلى استضافة خارجية (مثل Google Cloud) مع تحسين SEO والأمان والأداء، دون تغيير التصميم أو الوظائف الأساسية.

---

## 1. ملخص ما تم إنجازه

### 1.1 الاستقلال عن Replit

تمت إزالة جميع الاعتماديات والإعدادات الخاصة بـ Replit من المشروع:

- **إزالة حزم @replit:**
  - `@replit/connectors-sdk` من `package.json` الجذر.
  - `@replit/vite-plugin-cartographer` و `@replit/vite-plugin-dev-banner` و `@replit/vite-plugin-runtime-error-modal` من `artifacts/antuq/package.json`.
  - `@replit/vite-plugin-cartographer` و `@replit/vite-plugin-runtime-error-modal` من `artifacts/mockup-sandbox/package.json`.
  - إزالة الإدخالات من `pnpm-workspace.yaml` (catalog و minimumReleaseAgeExclude).
- **تبسيط إعدادات Vite:**
  - `PORT` و `BASE_PATH` أصبحا اختياريين مع قيم افتراضية (`3000` و `/`).
  - إزالة المنطق الشرطي المرتبط بـ `REPL_ID` والإضافات الخاصة بـ Replit من `vite.config.ts` في `antuq` و `mockup-sandbox`.
- **إعادة كتابة تخزين الملفات:**
  - ملف `artifacts/api-server/src/lib/objectStorage.ts` تم إعادة كتابته ليستخدم Google Cloud Storage SDK مباشرةً بدلاً من Replit Sidecar (`127.0.0.1:1106`).
  - توليد روابط موقعة (signed URLs) يتم الآن عبر `file.getSignedUrl()` الأصلية في GCS، وهي متوافقة مع Cloud Run و GCE باستخدام Application Default Credentials (ADC).
- **تحديث middleware واضح:**
  - `clerkProxyMiddleware.ts` لا يزال يعمل على النطاقات المخصصة، لكن تمت إزالة الإشارات الخاصة بـ `.replit.app` من التعليقات.

### 1.2 إعدادات البيئة (Environment Variables)

- إنشاء `.env.example` في:
  - جذر المشروع.
  - `artifacts/antuq/.env.example` للواجهة الأمامية.
  - `artifacts/api-server/.env.example` للخادم الخلفي.
- جميع المفاتيح الحساسة (Clerk، OpenAI، GCS) موضحة في `.env.example` بدون قيم حقيقية.
- إضافة متغيرات جديدة:
  - `GOOGLE_CLOUD_PROJECT_ID`
  - `GOOGLE_APPLICATION_CREDENTIALS`
  - `ALLOWED_ORIGINS` (لتقييد CORS في الإنتاج)

### 1.3 قاعدة البيانات

- تحديث `lib/db/drizzle.config.ts` لإضافة مجلد migrations (`./migrations`) وتوفير قيمة افتراضية لـ `DATABASE_URL`.
- إضافة سكريبت `generate` إلى `lib/db/package.json`.
- توليد migration أولى: `lib/db/migrations/0000_smart_overlord.sql` (18 جدولًا، 248 سطرًا).
- إنشاء وثائق مخطط قاعدة البيانات: `docs/database-schema.md`.
- لا حاجة لنقل بيانات المستخدمين الحاليين؛ يمكن إنشاء قاعدة بيانات جديدة وتشغيل migrations.

### 1.4 تحسين SEO

- تحديث `artifacts/antuq/index.html`:
  - تعديل الوصف ليستخدم "طلاب" بدلاً من "أطفال".
  - إضافة كلمات مفتاحية.
  - إضافة `canonical`.
  - إضافة Open Graph و Twitter Cards (مع رابط صورة placeholder).
  - إضافة بيانات منظمة JSON-LD (`WebSite` / `Organization`).
- إنشاء `artifacts/antuq/public/sitemap.xml` يشمل جميع الصفحات العامة.
- تحديث `robots.txt` (كان موجودًا مسبقًا).
- إنشاء صفحات عامة قابلة للأرشفة:
  - `/about` — عن المنصة.
  - `/features` — المميزات.
  - `/contact` — التواصل.
  - `/faq` — الأسئلة الشائعة.
- إضافة روابط الصفحات الجديدة في `App.tsx` وفي تذييل `static-page-layout.tsx`.

### 1.5 الأمان

- إزالة جميع الاعتماديات الخاصة بـ Replit.
- تحديث `artifacts/api-server/src/app.ts` لتقييد CORS عبر `ALLOWED_ORIGINS` في الإنتاج.
- التأكد من عدم وجود مفاتيح API مكتوبة في الكود (جميعها تُقرأ من `process.env`).
- التأكد من أن تسجيل الدخول عبر Clerk لا يزال يعمل بشكل صحيح.
- لم يتم إضافة `helmet` أو rate limiting، وهي تحسينات اختيارية يمكن إضافتها لاحقًا.

### 1.6 الأداء وتجربة المستخدم

- المحتوى الثابت يُبنى عبر Vite (code splitting مدمج).
- المنصة متجاوبة وتعمل على الهاتف والكمبيوتر (Bootstrap موجود عبر Tailwind).
- لم تتم إضافة ضغط الصور بشكل فعلي؛ يُنصح بتحسين `attached_assets/generated_images/*` قبل النشر.

### 1.7 التوثيق

- إنشاء `README.md` شامل يتضمن:
  - نظرة عامة على المشروع.
  - التقنيات المستخدمة.
  - هيكل المشروع.
  - خطوات التشغيل محليًا.
  - إعدادات البيئة.
  - خطوات نشر على Google Cloud (Cloud SQL + Cloud Storage + Cloud Run).
  - استضافات بديلة.

---

## 2. الملفات التي تم تعديلها

| الملف | التعديل |
|---|---|
| `package.json` | إزالة `@replit/connectors-sdk` |
| `pnpm-workspace.yaml` | إزالة إدخالات @replit من catalog و overrides |
| `artifacts/antuq/vite.config.ts` | إزالة إضافات Replit، جعل PORT/BASE_PATH اختياريين |
| `artifacts/antuq/package.json` | إزالة @replit vite plugins |
| `artifacts/antuq/index.html` | تحسين SEO، إضافة JSON-LD، كلمات مفتاحية، canonical |
| `artifacts/antuq/src/App.tsx` | إضافة routes للصفحات العامة الجديدة |
| `artifacts/antuq/src/components/static-page-layout.tsx` | إضافة روابط الصفحات العامة في التذييل |
| `artifacts/api-server/src/app.ts` | تقييد CORS عبر ALLOWED_ORIGINS |
| `artifacts/api-server/src/lib/objectStorage.ts` | استخدام GCS SDK مباشرة بدلاً من Replit sidecar |
| `lib/db/drizzle.config.ts` | إضافة migrations output وقيمة افتراضية لـ DATABASE_URL |
| `lib/db/package.json` | إضافة سكريبت generate |
| `artifacts/mockup-sandbox/vite.config.ts` | إزالة إضافات Replit |
| `artifacts/mockup-sandbox/package.json` | إزالة @replit vite plugins |

## 3. الملفات التي تم إنشاؤها

| الملف | الوصف |
|---|---|
| `.env.example` | نموذج إعدادات جذر المشروع |
| `artifacts/antuq/.env.example` | إعدادات الواجهة الأمامية |
| `artifacts/api-server/.env.example` | إعدادات الخادم الخلفي |
| `artifacts/antuq/public/sitemap.xml` | خريطة الموقع لمحركات البحث |
| `artifacts/antuq/src/pages/about.tsx` | صفحة "عن المنصة" |
| `artifacts/antuq/src/pages/features.tsx` | صفحة "المميزات" |
| `artifacts/antuq/src/pages/contact.tsx` | صفحة "تواصل معنا" |
| `artifacts/antuq/src/pages/faq.tsx` | صفحة "الأسئلة الشائعة" |
| `lib/db/migrations/0000_smart_overlord.sql` | migration أولى لإنشاء الجداول |
| `docs/database-schema.md` | توثيق مخطط قاعدة البيانات |
| `README.md` | دليل تشغيل ونشر المشروع |
| `docs/migration-report.md` | هذا التقرير |
| `screenshots/home-after-seo.jpg` | لقطة للصفحة الرئيسية بعد التحسينات |
| `screenshots/about-page.jpg` | لقطة لصفحة "عن المنصة" |

---

## 4. المشاكل التي تحتاج إلى حل قبل النقل

### 4.1 صورة Open Graph / Twitter Card

- في `index.html` تم وضع رابط placeholder: `https://antuq.app/og-image.png`.
- **الحل:** أنشئ صورة PNG بحجم 1200×630 بكسل تتضمن شعار المنصة ووصفها، وضعها في `artifacts/antuq/public/og-image.png`.
- بديل مؤقت: استبدل الرابط بـ `https://antuq.app/logo.svg` إذا لم تتوفر صورة PNG.

### 4.2 النطاق المخصص (Custom Domain)

- استبدل جميع روابط `https://antuq.app` في:
  - `artifacts/antuq/index.html` (canonical، og:url، og:image، twitter:image، JSON-LD).
  - `artifacts/antuq/public/sitemap.xml`.
- **الحل:** بعد شراء/ربط النطاق، استبدل `https://antuq.app` بالنطاق الفعلي.

### 4.3 حسابات وإعدادات Clerk للإنتاج

- حاليًا يستخدم المشروع مفاتيح Clerk للتطوير (development keys) في Replit.
- **الحل:**
  - أنشئ تطبيق Clerk جديد للإنتاج.
  - احصل على `CLERK_PUBLISHABLE_KEY` و `CLERK_SECRET_KEY` للإنتاج.
  - اضبط Google OAuth provider في إعدادات Clerk.
  - أضف النطاق المخصص في إعدادات Clerk.

### 4.4 قاعدة بيانات الإنتاج

- **الحل:** أنشئ Cloud SQL instance في Google Cloud (أو Render PostgreSQL أو Railway أو Supabase) واستخدم `DATABASE_URL` للإنتاج.
- بعد إنشاء قاعدة البيانات، شغّل:
  ```bash
  export DATABASE_URL=postgresql://...
  pnpm --filter @workspace/db push
  ```

### 4.5 Google Cloud Storage

- أنشئ bucket للملفات العامة (`PUBLIC_OBJECT_SEARCH_PATHS`).
- أنشئ bucket للملفات الخاصة (`PRIVATE_OBJECT_DIR`).
- امنح حساب الخدمة الصلاحيات:
  - `roles/storage.objectAdmin`
  - `roles/iam.serviceAccountTokenCreator` (لتوليد روابط موقعة).
- اضبط `GOOGLE_CLOUD_PROJECT_ID` إذا لزم الأمر.

### 4.6 مفاتيح OpenAI / OpenRouter

- تأكد من أن `OPENAI_API_KEY` يعمل مع الإنتاج.
- راقب استهلاك API لأن توليد القصص يكلف مبلغًا بسيطًا لكل قصة.
- يمكن تغيير النموذج عبر `OPENAI_MODEL` لتقليل التكلفة.

### 4.7 CORS في الإنتاج

- حدد `ALLOWED_ORIGINS` في `artifacts/api-server/.env` لتقييد الطلبات على النطاق الفعلي فقط.
- مثال: `ALLOWED_ORIGINS=https://antuq.app,https://www.antuq.app`.

### 4.8 ضغط وتحسين الصور

- صور `attached_assets/generated_images/*` قد تكون كبيرة.
- **الحل:** استخدم أدوات مثل `imagemin` أو `sharp` أو تحسين يدوي قبل النشر.
- يمكن إضافة Vite plugin لضغط الصور تلقائيًا.

### 4.9 إضافة Helmet و Rate Limiting (موصى به)

- لم يتم إضافة `helmet` أو `express-rate-limit`.
- **الحل:**
  ```bash
  pnpm --filter @workspace/api-server add helmet express-rate-limit
  ```
  ثم أضفها في `app.ts` قبل المسارات.

### 4.10 إعدادات SSL / HTTPS

- في الإنتاج، يجب فرض HTTPS.
- Cloud Run و Firebase Hosting و Vercel يقدمون HTTPS تلقائيًا.
- إذا استخدمت خادمًا خاصًا، اضبط شهادة SSL.

---

## 5. خطوات نقل المشروع من Replit إلى Google Cloud

### الخطوة 1: استنساخ المشروع محليًا أو على GitHub

```bash
git clone <repo-url>
cd workspace
pnpm install
```

### الخطوة 2: إعداد قاعدة البيانات

- أنشئ Cloud SQL instance (PostgreSQL 14+).
- أنشئ قاعدة بيانات `antuq` ومستخدمًا.
- شغّل migrations:
  ```bash
  export DATABASE_URL=postgresql://user:password@/antuq?host=/cloudsql/PROJECT:REGION:INSTANCE
  pnpm --filter @workspace/db push
  ```

### الخطوة 3: إعداد Google Cloud Storage

- أنشئ buckets: `antuq-public-assets` و `antuq-private-uploads`.
- امنح حساب الخدمة صلاحيات `Storage Object Admin` و `Service Account Token Creator`.
- اضبط `PUBLIC_OBJECT_SEARCH_PATHS` و `PRIVATE_OBJECT_DIR`.

### الخطوة 4: نشر الخادم الخلفي على Cloud Run

```bash
cd artifacts/api-server
export BASE_PATH=/
pnpm run build

gcloud run deploy antuq-api \
  --source . \
  --region me-central1 \
  --set-env-vars DATABASE_URL=...,CLERK_SECRET_KEY=...,OPENAI_API_KEY=...,PUBLIC_OBJECT_SEARCH_PATHS=...,PRIVATE_OBJECT_DIR=...,ALLOWED_ORIGINS=https://antuq.app \
  --allow-unauthenticated
```

### الخطوة 5: بناء ونشر الواجهة الأمامية

```bash
cd artifacts/antuq
export BASE_PATH=/
export VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
pnpm run build
```

- انشر `dist/public` على Firebase Hosting أو Vercel أو Cloud Run.
- تأكد من أن الواجهة الأمامية تتحدث مع الخادم الخلفي عبر `https://antuq.app/api` (أو عبر `BASE_URL` المناسب).

### الخطوة 6: ربط النطاق والتحقق

- أضف النطاق المخصص في Cloud Run / Firebase Hosting.
- اضبط `VITE_CLERK_PROXY_URL=https://antuq.app/api/__clerk` في الواجهة الأمامية.
- تأكد من إعدادات Clerk تسمح بالنطاق المخصص.
- استبدل `https://antuq.app` في `index.html` و `sitemap.xml` بالنطاق الفعلي.

### الخطوة 7: اختبار شامل

- تأكد من تسجيل الدخول عبر Clerk.
- تأكد من عمل توليد القصص بالذكاء الاصطناعي.
- تأكد من عمل التحميلات (GCS signed URLs).
- تأكد من ظهور الصفحات العامة: `/about`, `/features`, `/contact`, `/faq`.
- تحقق من `robots.txt` و `sitemap.xml`.
- افحص SEO باستخدام Google Search Console.

---

## 6. ملاحظات تقنية إضافية

### 6.1 لماذا لا يزال `BASE_PATH` مطلوبًا؟

- على Replit، يُستخدم `BASE_PATH` لتوجيه كل artifact عبر مسار فريد.
- على النطاق الجذر، استخدم `BASE_PATH=/`.
- في subdirectory، استخدم `BASE_PATH=/subpath/`.

### 6.2 كيف يعمل نقل قاعدة البيانات؟

- لا حاجة لنقل البيانات القديمة؛ يمكن بدء قاعدة بيانات جديدة.
- إذا أردت نقل البيانات، استخدم `pg_dump` من Replit DB ثم `pg_restore`.

### 6.3 ما هي الأجزاء التي تبقى على Replit؟

- `clerkProxyMiddleware` يعمل على أي نطاق، لكنه مصمم أساسًا لتجنب مشاكل CNAME مع Clerk.
- لا توجد أجزاء أخرى تعتمد على Replit بعد هذه التعديلات.

### 6.4 تكلفة التشغيل المتوقعة على Google Cloud

- Cloud Run: حسب الاستخدام، غالبًا مجاني للمواقع منخفضة الحركة.
- Cloud SQL: ~$7-20/شهر للنسخة الصغيرة.
- Cloud Storage: حسب حجم الملفات (~$0.02/GB).
- OpenAI/OpenRouter: حسب استخدام ميزة القصص الذكية.
- Clerk: خطة مجانية للمستخدمين المحدودين، ثم خطط مدفوعة.

---

## 7. الخلاصة

المشروع الآن مستقل تقريبًا عن Replit وجاهز للنشر على Google Cloud أو أي استضافة خارجية. تم:

- إزالة جميع الاعتماديات الخاصة بـ Replit.
- تجهيز ملفات البيئة وتوثيقها.
- توليد migrations لقاعدة البيانات.
- تحسين SEO بشكل كبير.
- إنشاء صفحات عامة جديدة.
- تحسين أمان CORS.
- كتابة توثيق شامل.

المشاكل المتبقية قبل النقل هي إعدادات البنية التحتية (نطاق، Clerk للإنتاج، GCS، Cloud SQL) وإنشاء صورة Open Graph، وليست مشاكل في الكود.
