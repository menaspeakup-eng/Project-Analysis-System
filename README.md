# منصة "انطق" (Antuq)

منصة تعليمية عربية لتعليم الطلاب القراءة والنطق الصحيح للغة العربية باستخدام الذكاء الاصطناعي.

## المحتويات

- [نظرة عامة](#نظرة-عامة)
- [التقنيات المستخدمة](#التقنيات-المستخدمة)
- [هيكل المشروع](#هيكل-المشروع)
- [المتطلبات المسبقة](#المتلبات-المسبقة)
- [تشغيل المشروع محليًا](#تشغيل-المشروع-محليًا)
- [إعدادات البيئة](#إعدادات-البيئة)
- [قاعدة البيانات](#قاعدة-البيانات)
- [نشر المشروع](#نشر-المشروع)
  - [Google Cloud](#google-cloud)
  - [استضافة أخرى](#استضافة-أخرى)
- [الأمان](#الأمان)
- [SEO](#seo)
- [الترخيص](#الترخيص)

## نظرة عامة

تتيح منصة انطق:

- تعليم القراءة والنطق العربي للطلاب عبر ألعاب وقصص تفاعلية.
- مدرب نطق ذكي يستمع للطالب ويصحح النطق.
- قصص مولدة بالذكاء الاصطناعي تناسب كل طالب.
- مكتبة تعليمية للمعلمين مع أسئلة ونقاط تحفيزية.
- لوحة تحكم للمعلمين لمتابعة تقدم الطلاب.
- نظام صداقات ودردشة آمنة داخل الفصل.

## التقنيات المستخدمة

### Frontend

- **React 19** + **TypeScript**
- **Vite 7** (build tool)
- **Tailwind CSS 4**
- **shadcn/ui** components
- **wouter** (routing)
- **Clerk** (authentication)
- **TanStack Query** (data fetching)
- **React Three Fiber** (3D avatar)

### Backend

- **Express 5** + **TypeScript**
- **Drizzle ORM** (PostgreSQL)
- **Clerk** (authentication)
- **OpenAI / OpenRouter** (AI stories)
- **Google Cloud Storage** (file uploads)
- **Pino** (logging)

### DevOps / Infrastructure

- **pnpm** workspaces (monorepo)
- **PostgreSQL** database
- **Google Cloud Storage** buckets
- **esbuild** (backend bundling)

## هيكل المشروع

```
workspace/
├── artifacts/
│   ├── antuq/              # Frontend (React + Vite)
│   └── api-server/         # Backend (Express + Node.js)
├── lib/
│   ├── db/                 # Database schema & Drizzle config
│   ├── api-client-react/   # Auto-generated API client
│   └── api-zod/            # Shared Zod schemas
├── .env.example            # Root env example
├── artifacts/antuq/.env.example
├── artifacts/api-server/.env.example
├── pnpm-workspace.yaml
└── README.md
```

## المتطلبات المسبقة

- [Node.js](https://nodejs.org/) 20 أو أحدث
- [pnpm](https://pnpm.io/) 9 أو أحدث
- PostgreSQL 14 أو أحدث
- حساب Clerk ([dashboard.clerk.com](https://dashboard.clerk.com/))
- مفتاح OpenAI / OpenRouter
- Google Cloud project مع Storage buckets

## تشغيل المشروع محليًا

### 1. نسخ المستودع وتثبيت الحزم

```bash
git clone <repo-url>
cd workspace
pnpm install
```

### 2. إعداد ملفات البيئة

انسخ ملفات `.env.example` إلى `.env` في كل دليل واملأ القيم:

```bash
cp .env.example .env
cp artifacts/antuq/.env.example artifacts/antuq/.env
cp artifacts/api-server/.env.example artifacts/api-server/.env
```

> **ملاحظة:** لا ترفع ملفات `.env` إلى Git. وهي مدرجة في `.gitignore` بالفعل.

### 3. تشغيل قاعدة البيانات

أنشئ قاعدة بيانات PostgreSQL محلية:

```bash
createdb antuq
```

ثم شغّل migrations:

```bash
export DATABASE_URL=postgresql://user:password@localhost:5432/antuq
pnpm --filter @workspace/db push
```

### 4. تشغيل الخادم الخلفي

```bash
cd artifacts/api-server
export DATABASE_URL=postgresql://user:password@localhost:5432/antuq
export PORT=3001
export CLERK_PUBLISHABLE_KEY=pk_test_...
export CLERK_SECRET_KEY=sk_test_...
export OPENAI_API_KEY=sk-...
export PUBLIC_OBJECT_SEARCH_PATHS=/bucket/assets
export PRIVATE_OBJECT_DIR=/bucket/private
pnpm run dev
```

### 5. تشغيل الواجهة الأمامية

في طرفية جديدة:

```bash
cd artifacts/antuq
export VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
export BASE_PATH=/
export PORT=3000
pnpm run dev
```

افتح المتصفح على: `http://localhost:3000`

## إعدادات البيئة

### الواجهة الأمامية (`artifacts/antuq/.env`)

| المتغير | الوصف | مطلوب؟ |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | مفتاح Clerk العام | نعم |
| `VITE_CLERK_PROXY_URL` | رابط وسيط Clerk للنطاق المخصص | اختياري |
| `BASE_PATH` | مسار الأساس (`/` للنطاق الجذر) | نعم |
| `PORT` | منفذ خادم التطوير | نعم |

### الخادم الخلفي (`artifacts/api-server/.env`)

| المتغير | الوصف | مطلوب؟ |
|---|---|---|
| `PORT` | منفذ الخادم | نعم |
| `DATABASE_URL` | رابط اتصال PostgreSQL | نعم |
| `CLERK_PUBLISHABLE_KEY` | مفتاح Clerk العام | نعم |
| `CLERK_SECRET_KEY` | مفتاح Clerk السري | نعم |
| `OPENAI_API_KEY` | مفتاح OpenAI / OpenRouter | نعم |
| `OPENAI_BASE_URL` | رابط OpenAI API (افتراضي: OpenRouter) | اختياري |
| `OPENAI_MODEL` | نموذج الذكاء الاصطناعي (افتراضي: gpt-4o-mini) | اختياري |
| `PUBLIC_OBJECT_SEARCH_PATHS` | مسارات البحث في GCS العامة | نعم |
| `PRIVATE_OBJECT_DIR` | مسار التحميلات الخاصة في GCS | نعم |
| `GOOGLE_CLOUD_PROJECT_ID` | معرف مشروع Google Cloud | اختياري |
| `GOOGLE_APPLICATION_CREDENTIALS` | مسار ملف مفتاح الخدمة | اختياري |
| `LOG_LEVEL` | مستوى التسجيل (info, debug, warn) | اختياري |

## قاعدة البيانات

المخطط معرف في `lib/db/src/schema/` باستخدام Drizzle ORM. يحتوي على 18 جدولًا للطلاب، الفصول، الألعاب، الدردشة، قصص الذكاء الاصطناعي، المكتبة، سجل النشاطات، والصداقات.

### توليد migrations

```bash
pnpm --filter @workspace/db generate
```

### تطبيق migrations على قاعدة بيانات جديدة

```bash
export DATABASE_URL=postgresql://user:password@host:5432/antuq
pnpm --filter @workspace/db push
```

تفاصيل الجداول والعلاقات متوفرة في `lib/db/migrations/0000_smart_overlord.sql`.

## نشر المشروع

### Google Cloud (الخيار المقترح)

#### 1. Google Cloud SQL (PostgreSQL)

- أنشئ نسخة PostgreSQL في Cloud SQL.
- أنشئ قاعدة بيانات `antuq` ومستخدمًا لها.
- احصل على رابط الاتصال (connection name).

#### 2. Google Cloud Storage

- أنشئ bucket للملفات العامة (مثلاً `antuq-public-assets`).
- أنشئ bucket للملفات الخاصة (مثلاً `antuq-private-uploads`).
- امنح حساب الخدمة (service account) الصلاحيات: `Storage Object Admin`.
- لتوليد روابط موقعة (signed URLs)، يحتاج حساب الخدمة أيضًا إلى دور `roles/iam.serviceAccountTokenCreator` على نفسه.

#### 3. Cloud Run (Backend)

- ابنِ الخادم الخلفي:

```bash
pnpm --filter @workspace/api-server run build
```

- انشر على Cloud Run:

```bash
gcloud run deploy antuq-api \
  --source artifacts/api-server \
  --region me-central1 \
  --set-env-vars DATABASE_URL=...,CLERK_SECRET_KEY=...,OPENAI_API_KEY=... \
  --allow-unauthenticated
```

> **ملاحظة:** يمكن استخدام Dockerfile بدلاً من `--source` للتحكم الكامل في البيئة.

#### 4. Cloud Run / Firebase Hosting / Vercel (Frontend)

ابنِ الواجهة الأمامية:

```bash
cd artifacts/antuq
export BASE_PATH=/
export VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
pnpm run build
```

المخرجات في `artifacts/antuq/dist/public`. انشرها على:

- **Cloud Run** مع خدمة static files.
- **Firebase Hosting** أو **Vercel** للاستضافة المجانية للمواقع الثابتة.

#### 5. ربط النطاق المخصص

- أضف نطاقك في Cloud Run / Firebase Hosting.
- اضبط `VITE_CLERK_PROXY_URL` و `VITE_CLERK_PUBLISHABLE_KEY` للواجهة الأمامية.
- اضبط `CLERK_PUBLISHABLE_KEY` و `CLERK_SECRET_KEY` للخلفية.
- تأكد من إعدادات CORS في `app.ts` لتسمح بالنطاق المخصص.

### استضافة أخرى

يمكن نشر المشروع على أي منصة تدعم Node.js و PostgreSQL، مثل:

- **Render**: frontend static + backend web service + PostgreSQL.
- **Railway**: backend + PostgreSQL.
- **Vercel**: frontend static + backend serverless (يحتاج تعديلات بسيطة).
- **Supabase**: PostgreSQL + Edge Functions.

## الأمان

- لا توجد مفاتيح API مكتوبة في الكود. جميعها تُقرأ من `process.env`.
- تسجيل الدخول عبر Clerk يوفر حماية قوية ضد الاختراق.
- تحقق من الهوية في كل نقطة نهاية API باستخدام `requireIdentity` و `requireTeacher`.
- التحميلات الخاصة تُخزن في GCS ولا يمكن الوصول إليها إلا عبر روابط موقعة.
- يُنصح بتمكين HTTPS في الإنتاج وتقييد CORS على النطاقات المعتمدة فقط.

## SEO

تم تحسين المنصة لمحركات البحث من خلال:

- وسم `title` و `meta description` محسّن في `index.html`.
- كلمات مفتاحية بالعربية.
- Open Graph و Twitter Cards.
- ملف `robots.txt`.
- ملف `sitemap.xml`.
- صفحات عامة قابلة للأرشفة: الرئيسية، عن المنصة، المميزات، للمدارس، تواصل، الأسئلة الشائعة، الشروط، الخصوصية.
- بيانات منظمة JSON-LD للموقع.

> **ملاحظة:** استبدل `https://antuq.app` في `index.html` و `sitemap.xml` بالنطاق الفعلي قبل النشر.

## الترخيص

MIT License — انظر ملف `LICENSE` إذا كان موجودًا.
