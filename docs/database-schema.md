# مخطط قاعدة بيانات منصة "انطق"

هذا الملف يوثّق جداول قاعدة البيانات PostgreSQL والعلاقات بينها باستخدام Drizzle ORM.

## نظرة عامة

قاعدة البيانات تتكون من 7 مجموعات رئيسية:
1. المستخدمين والفصول (`students`, `classes`)
2. الألعاب (`games`, `game_items`, `student_game_sessions`)
3. الدردشة (`chat_messages`, `chat_mutes`)
4. قصص الذكاء الاصطناعي (`ai_story_sessions`, `ai_story_quiz_submissions`, `ai_story_daily_allowances`)
5. سجل النشاطات (`activity_logs`)
6. الصداقات (`friendships`)
7. المكتبة التعليمية (`library_items`, `library_questions`, `library_submissions`, `library_answers`)

## 1. المستخدمين والفصول

### `students`

كل صف يمثل مستخدمًا واحدًا (طالب أو معلم) مرتبطًا بحساب Clerk.

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | serial PK | معرف فريد |
| `clerk_user_id` | text unique | معرف حساب Clerk |
| `name` | text | الاسم المعروض |
| `email` | text | البريد الإلكتروني (يمكن أن يكون null) |
| `role` | text | student أو teacher |
| `name_confirmed` | boolean | هل أكمل المستخدم خطوة تأكيد الاسم |
| `class_id` | integer FK | الفصل المرتبط (references classes.id) |
| `points` | integer | النقاط المتراكمة |
| `avatar_config` | jsonb | إعدادات الشخصية (لون، جنس، إكسسوارات، حيوان) |
| `created_at` | timestamp | تاريخ الإنشاء |

### `classes`

الفصول الدراسية، كل فصل يرتبط بمعلم.

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | serial PK | معرف فريد |
| `name` | text | اسم الفصل |
| `teacher_id` | integer FK | معلم الفصل (references students.id) |
| `is_chat_enabled` | boolean | هل الدردشة مفعّلة |
| `created_at` | timestamp | تاريخ الإنشاء |

**العلاقات:**
- `students.class_id` → `classes.id` (N:1)
- `classes.teacher_id` → `students.id` (1:1 أو 1:N)

## 2. الألعاب

### `games`

ألعاب تعليمية من إعداد المعلم.

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | serial PK | معرف فريد |
| `slug` | text unique | معرف نصي فريد |
| `class_id` | integer FK | الفصل (references classes.id) |
| `name` | text | اسم اللعبة |
| `type` | text enum | نوع اللعبة: match-sentence-picture, arrange-sentence, ... |
| `description` | text | الوصف |
| `image_url` | text | رابط صورة الغلاف |
| `points_reward` | integer | النقاط المكافأة |
| `is_active` | boolean | هل اللعبة نشطة |
| `version` | integer | رقم الإصدار |
| `created_at` | timestamp | تاريخ الإنشاء |
| `updated_at` | timestamp | تاريخ التحديث |

### `game_items`

أسئلة/عناصر كل لعبة.

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | serial PK | معرف فريد |
| `game_id` | integer FK | اللعبة (references games.id) |
| `item_order` | integer | ترتيب العنصر |
| `payload` | jsonb | بيانات السؤال (تختلف حسب نوع اللعبة) |
| `created_at` | timestamp | تاريخ الإنشاء |

### `student_game_sessions`

نتائج الطلاب في كل لعبة.

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | serial PK | معرف فريد |
| `student_id` | integer FK | الطالب (references students.id) |
| `game_id` | integer FK | اللعبة (references games.id) |
| `version` | integer | إصدار اللعبة |
| `status` | text | completed أو غيره |
| `score` | integer | النتيجة |
| `mistakes` | integer | عدد الأخطاء |
| `duration_ms` | integer | المدة بالمللي ثانية |
| `completed_at` | timestamp | تاريخ الإنجاز |

**القيود:**
- unique (`student_id`, `game_id`, `version`)

## 3. الدردشة

### `chat_messages`

رسائل الدردشة داخل الفصل.

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | serial PK | معرف فريد |
| `class_id` | integer | معرف الفصل |
| `sender_id` | integer FK | المرسل (references students.id) |
| `content` | text | محتوى الرسالة |
| `is_deleted` | boolean | هل تم حذفها |
| `created_at` | timestamp | تاريخ الإرسال |

### `chat_mutes`

إسكات بعض الطلاب في الدردشة.

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | serial PK | معرف فريد |
| `class_id` | integer | معرف الفصل |
| `student_id` | integer FK | الطالب المسكات (references students.id) |
| `muted_until` | timestamp | تاريخ انتهاء الإسكات (null = دائم) |
| `reason` | text | السبب |
| `created_by` | integer FK | من قام بالإسكات (references students.id) |
| `created_at` | timestamp | تاريخ الإنشاء |

**القيود:**
- unique (`class_id`, `student_id`)

## 4. قصص الذكاء الاصطناعي

### `ai_story_sessions`

قصص مولدة بالذكاء الاصطناعي لكل طالب.

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | serial PK | معرف فريد |
| `student_id` | integer FK | الطالب (references students.id, onDelete cascade) |
| `story_type` | text | نوع القصة |
| `student_name` | text | اسم الطالب في القصة |
| `title` | text | عنوان القصة |
| `story` | text | نص القصة |
| `generated_content` | jsonb | المحتوى المولد كاملاً (أسئلة، كلمات، إلخ) |
| `for_date` | date | تاريخ القصة |
| `created_at` | timestamp | تاريخ الإنشاء |

### `ai_story_quiz_submissions`

إجابات الطلاب على أسئلة فهم القصة.

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | serial PK | معرف فريد |
| `session_id` | integer FK | القصة (references ai_story_sessions.id, onDelete cascade) |
| `student_id` | integer FK | الطالب (references students.id, onDelete cascade) |
| `answers` | jsonb | مصفوفة الإجابات |
| `score` | integer | النتيجة |
| `max_score` | integer | الدرجة القصوى |
| `status` | text | pending أو reviewed |
| `points_awarded` | integer | النقاط الممنوحة |
| `teacher_feedback` | text | تعليق المعلم |
| `reviewed_by` | integer FK | المعلم (references students.id, onDelete set null) |
| `reviewed_at` | timestamp | تاريخ المراجعة |
| `created_at` | timestamp | تاريخ الإنشاء |

**القيود:**
- unique (`student_id`, `session_id`)

### `ai_story_daily_allowances`

عدد القصص الإضافية المسموح بها يوميًا لكل طالب.

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | serial PK | معرف فريد |
| `student_id` | integer FK | الطالب (references students.id, onDelete cascade) |
| `for_date` | date | التاريخ |
| `extra_uses` | integer | عدد المحاولات الإضافية |
| `created_at` | timestamp | تاريخ الإنشاء |

**القيود:**
- unique (`student_id`, `for_date`)

## 5. سجل النشاطات

### `activity_logs`

سجل الأحداث المهمة لكل طالب.

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | serial PK | معرف فريد |
| `student_id` | integer FK | الطالب (references students.id, onDelete cascade) |
| `type` | text enum | نوع النشاط: login, game_complete, story_complete, ... |
| `title` | text | عنوان النشاط |
| `description` | text | الوصف |
| `metadata` | text | بيانات إضافية |
| `created_at` | timestamp | تاريخ الحدوث |

**الفهارس:**
- index (`student_id`, `created_at`)

## 6. الصداقات

### `friendships`

طلبات الصداقة بين الطلاب.

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | serial PK | معرف فريد |
| `requester_id` | integer FK | الطالب الطالب (references students.id, onDelete cascade) |
| `addressee_id` | integer FK | الطالب المطلوب (references students.id, onDelete cascade) |
| `status` | text enum | pending, accepted, rejected |
| `created_at` | timestamp | تاريخ الطلب |
| `updated_at` | timestamp | تاريخ آخر تحديث |

**القيود:**
- unique (`requester_id`, `addressee_id`)
- index (`addressee_id`, `status`)

## 7. المكتبة التعليمية

### `library_items`

مواد تعليمية (قصص، صوتيات، ملفات) من المعلم.

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | serial PK | معرف فريد |
| `class_id` | integer | معرف الفصل |
| `teacher_id` | integer FK | المعلم (references students.id, onDelete cascade) |
| `type` | text | read, audio, attachment |
| `title` | text | العنوان |
| `description` | text | الوصف |
| `cover_object_path` | text | مسار صورة الغلاف |
| `content_object_path` | text | مسار الملف (صوت أو PDF) |
| `body_text` | text | النص (للقصص) |
| `external_url` | text | رابط خارجي (للملفات المرفقة) |
| `is_published` | boolean | هل المنشور منشور |
| `created_at` | timestamp | تاريخ الإنشاء |
| `updated_at` | timestamp | تاريخ التحديث |

### `library_questions`

أسئلة مرتبطة بكل مادة في المكتبة.

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | serial PK | معرف فريد |
| `library_item_id` | integer FK | المادة (references library_items.id, onDelete cascade) |
| `type` | text | mcq أو text |
| `question` | text | نص السؤال |
| `options` | jsonb | خيارات الاختيار المتعدد |
| `correct_answer` | text | الإجابة الصحيحة (للاختيار المتعدد) |
| `points` | integer | النقاط |
| `sort_order` | integer | الترتيب |
| `created_at` | timestamp | تاريخ الإنشاء |

### `library_submissions`

تسليمات الطلاب لمواد المكتبة.

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | serial PK | معرف فريد |
| `library_item_id` | integer FK | المادة (references library_items.id, onDelete cascade) |
| `student_id` | integer FK | الطالب (references students.id, onDelete cascade) |
| `score` | integer | النتيجة |
| `max_score` | integer | الدرجة القصوى |
| `status` | text | pending, accepted, rejected |
| `teacher_feedback` | text | تعليق المعلم |
| `created_at` | timestamp | تاريخ الإنشاء |

**القيود:**
- unique (`library_item_id`, `student_id`)

### `library_answers`

إجابات الطلاب على أسئلة المكتبة.

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | serial PK | معرف فريد |
| `submission_id` | integer FK | التسليم (references library_submissions.id, onDelete cascade) |
| `question_id` | integer FK | السؤال (references library_questions.id, onDelete cascade) |
| `selected_answer` | text | إجابة الاختيار المتعدد |
| `text_answer` | text | إجابة نصية |
| `is_correct` | boolean | هل الإجابة صحيحة |
| `points_awarded` | integer | النقاط الممنوحة |
| `status` | text | pending, accepted, rejected |
| `created_at` | timestamp | تاريخ الإنشاء |

## ملاحظات للنقل

- جميع الجداول تستخدم `serial` كمفتاح أساسي.
- يتم حذف البيانات التابعة تلقائيًا عند حذف الطالب (`onDelete cascade`) في معظم الجداول.
- `jsonb` يستخدم لتخزين البيانات المرنة مثل إعدادات الشخصية والأسئلة.
- لا حاجة لنقل بيانات المستخدمين الحاليين؛ يمكن إنشاء قاعدة بيانات جديدة وتشغيل migrations.
