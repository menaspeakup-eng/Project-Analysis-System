import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, eq, inArray, sql } from "drizzle-orm";
import { resolveIdentity, requireIdentity, requireTeacher } from "../lib/identity";
import { logActivity } from "../lib/activity-logs";
import {
  db,
  aiStorySessionsTable,
  aiStoryQuizSubmissionsTable,
  aiStoryDailyAllowancesTable,
  studentsTable,
  classesTable,
  LIBRARY_QUESTION_TYPES,
  LIBRARY_QUESTION_LEVELS,
} from "@workspace/db";
import {
  buildQuestionPrompt,
  parseGeneratedQuestions,
  type GeneratedQuestion,
} from "./ai-questions";

const router: IRouter = Router();

export const STORY_TYPES = [
  "adventure",
  "space",
  "mystery",
  "robots-ai",
  "fantasy",
  "ocean",
  "world-exploration",
  "challenge-success",
  "school",
  "nature",
] as const;

export type StoryType = (typeof STORY_TYPES)[number];

const OPENAI_BASE_URL = process.env["OPENAI_BASE_URL"] || "https://openrouter.ai/api/v1";
const OPENAI_MODEL = process.env["OPENAI_MODEL"] || "openai/gpt-4o-mini";
const POINTS_PER_CORRECT_ANSWER = 10;

const STORY_TYPE_LABELS: Record<StoryType, string> = {
  adventure: "مغامرة",
  space: "الفضاء",
  mystery: "لغز وتحقيق",
  "robots-ai": "روبوتات وذكاء اصطناعي",
  fantasy: "عالم الخيال",
  ocean: "أعماق البحار",
  "world-exploration": "استكشاف العالم",
  "challenge-success": "التحدي والنجاح",
  school: "قصة مدرسية",
  nature: "البيئة والطبيعة",
};

const GenerateStoryBody = z.object({
  studentName: z.string().min(1).max(120),
  storyType: z.enum(STORY_TYPES),
});

const QuizAnswersBody = z.object({
  sessionId: z.number().int().positive(),
  answers: z.array(
    z.object({
      questionIndex: z.number().int().min(0),
      selectedAnswer: z.string().min(1),
    }),
  ),
});

const GenerateStoryQuizBody = z.object({
  sessionId: z.number().int().positive(),
  count: z.number().int().min(1).max(20).default(5),
  level: z.enum(LIBRARY_QUESTION_LEVELS),
  types: z.array(z.enum(LIBRARY_QUESTION_TYPES)).min(1).max(5),
});

type AiStoryQuizDefaults = {
  level: (typeof LIBRARY_QUESTION_LEVELS)[number];
  types: (typeof LIBRARY_QUESTION_TYPES)[number][];
  count: number;
};

const AiStoryQuizDefaultsBody = z.object({
  classId: z.number().int().positive(),
  level: z.enum(LIBRARY_QUESTION_LEVELS),
  types: z.array(z.enum(LIBRARY_QUESTION_TYPES)).min(1).max(5),
  count: z.number().int().min(1).max(20),
});

const DEFAULT_AI_STORY_QUIZ: AiStoryQuizDefaults = {
  level: "medium",
  types: ["mcq"],
  count: 5,
};

function parseDefaults(value: unknown): AiStoryQuizDefaults {
  if (!value || typeof value !== "object") return DEFAULT_AI_STORY_QUIZ;
  const v = value as Partial<AiStoryQuizDefaults> & { type?: string };
  const level = LIBRARY_QUESTION_LEVELS.includes(v.level as AiStoryQuizDefaults["level"]) ? v.level : DEFAULT_AI_STORY_QUIZ.level;
  const rawTypes = Array.isArray(v.types)
    ? v.types
    : v.type
      ? [v.type]
      : DEFAULT_AI_STORY_QUIZ.types;
  const types = rawTypes.filter((t): t is AiStoryQuizDefaults["types"][number] =>
    LIBRARY_QUESTION_TYPES.includes(t as AiStoryQuizDefaults["types"][number]),
  );
  const count = typeof v.count === "number" && Number.isInteger(v.count) && v.count >= 1 && v.count <= 20 ? v.count : DEFAULT_AI_STORY_QUIZ.count;
  return { level: level!, types: types.length > 0 ? types : DEFAULT_AI_STORY_QUIZ.types, count };
}

const ReviewQuestionBody = z.object({
  questionIndex: z.number().int().min(0),
  status: z.enum(["accepted", "rejected"]),
  points: z.number().int().min(0).max(100).default(10),
  note: z.string().max(500).optional(),
});

const ReviewSubmissionBody = z.object({
  status: z.enum(["accepted", "rejected"]),
  teacherFeedback: z.string().max(500).optional(),
  answers: z.array(ReviewQuestionBody).optional(),
});

type GeneratedStory = {
  title: string;
  story: string;
  newWords: { word: string; meaning: string }[];
  questions: GeneratedQuestion[];
  reflectionQuestion: string;
  lesson: string;
  readingInfo: {
    difficulty: number;
    wordCount: number;
    estimatedTime: string;
  };
};

function todayDate(): string {
  return new Date().toISOString().split("T")[0];
}

async function getDailyUsage(studentId: number): Promise<{ used: number; limit: number; extra: number }> {
  const today = todayDate();
  const [sessions, allowance] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(aiStorySessionsTable)
      .where(
        and(
          eq(aiStorySessionsTable.studentId, studentId),
          eq(aiStorySessionsTable.forDate, today),
        ),
      ),
    db.query.aiStoryDailyAllowancesTable.findFirst({
      where: and(
        eq(aiStoryDailyAllowancesTable.studentId, studentId),
        eq(aiStoryDailyAllowancesTable.forDate, today),
      ),
    }),
  ]);
  const used = sessions[0]?.count ?? 0;
  const extra = allowance?.extraUses ?? 0;
  return { used, limit: 1 + extra, extra };
}

async function requireDailyStoryAllowance(studentId: number) {
  const { used, limit } = await getDailyUsage(studentId);
  if (used >= limit) {
    const err = new Error("لقد استنفذت محاولات إنشاء القصص اليوم. تحدث إلى معلمك إذا أردت محاولة إضافية.") as Error & {
      status?: number;
      code?: string;
    };
    err.status = 429;
    err.code = "daily_limit_exceeded";
    throw err;
  }
}

function buildPrompt(studentName: string, storyType: StoryType): string {
  const typeLabel = STORY_TYPE_LABELS[storyType];
  return `أنت كاتب قصص أطفال محترف ومتقن للغاية للغة العربية ومحيط بقواعد الإملاء والنحو.
اكتب قصة عربية فصحى مشوقة ومناسبة للأطفال (300–400 كلمة).
البطل: ${studentName}
نوع القصة: ${typeLabel}

قواعد وإرشادات هامة جداً:
1. الإملاء والنحو: يجب أن تكون القصة خالية تماماً من أي أخطاء إملائية أو نحوية (انتبه للفرق بين الهمزات "أ، إ، آ"، والتاء المربوطة "ة" والهاء "ه"، والألف المقصورة "ى").
2. التشكيل والتنسيق: النص مشكول تشكيلاً كاملاً وصحيحاً. قسم القصة إلى فقرات قصيرة وواضحة يفصل بينها سطر فارغ لتسهيل القراءة على الشاشة.
3. المضمون: لغة ممتعة، حوارات بسيطة وواضحة، بدون عامية أو رموز تعبيرية (إيموجي)، وبدون أي عنف أو رعب. تتضمن القصة درساً أخلاقياً وتربوياً رائعاً.

التزم بالصيغة والتنسيق التالي بدقة متناهية (بدون أي مقدمات أو شرح خارج التنسيق):

# عنوان القصة
[العنوان مشكول وبدون أقواس]

# القصة
[نص القصة مقسم إلى فقرات قصيرة ومواقف مشوقة ومشكولة بالكامل]

# الكلمات الجديدة
1. الكلمة: معناها ببساطة
2. الكلمة: معناها ببساطة
3. الكلمة: معناها ببساطة
4. الكلمة: معناها ببساطة
5. الكلمة: معناها ببساطة

# سؤال للتفكير
[سؤال مفتوح ومحفز للتفكير حول القصة]

# الدرس المستفاد
[الدرس الأخلاقي المكتسب بأسلوب دقيق وشيق]

# معلومات القراءة
- مستوى الصعوبة: 3
- عدد الكلمات: 350
- الزمن المتوقع للقراءة: 3 دقائق`;
}

function parseStoryText(raw: string): GeneratedStory {
  const sections = new Map<string, string>();
  const parts = raw.split(/\n#\s+/);
  for (const part of parts) {
    const lines = part.trim().split("\n");
    if (lines.length === 0) continue;
    const headerLine = lines[0].replace(/^#\s*/, "").trim();
    const body = lines.slice(1).join("\n").trim();
    sections.set(headerLine, body);
  }

  const title = (sections.get("عنوان القصة") || "قصتي الذكية").replace(/^["'«]/, "").replace(/["'»]$/, "").trim();
  const story = sections.get("القصة") || "";
  const newWordsRaw = sections.get("الكلمات الجديدة") || "";
  const reflectionQuestion = sections.get("سؤال للتفكير") || sections.get("سؤال تفكير") || "";
  const lesson = sections.get("الدرس المستفاد") || "";
  const readingInfoRaw = sections.get("معلومات القراءة") || sections.get("معلومات الققراءة") || "";

  const newWords: GeneratedStory["newWords"] = [];
  const wordLines = newWordsRaw.split("\n").filter((l) => l.trim());
  for (const line of wordLines) {
    const match = line.match(/^[-\d\.]\s*(.+?)[:\-]\s*(.+)$/);
    if (match) {
      newWords.push({ word: match[1].trim(), meaning: match[2].trim() });
    } else if (line.includes("-")) {
      const [w, ...m] = line.split("-");
      newWords.push({ word: w.trim().replace(/^[-\d\.]\s*/, ""), meaning: m.join("-").trim() });
    }
    if (newWords.length >= 5) break;
  }

  let difficulty = 3;
  let wordCount = story.split(/\s+/).length || 300;
  let estimatedTime = "3 دقائق";

  const diffMatch = readingInfoRaw.match(/مستوى الصعوبة[:\s]*(\d)/i);
  if (diffMatch) difficulty = Math.min(5, Math.max(1, Number(diffMatch[1])));

  const countMatch = readingInfoRaw.match(/(?:عدد الكلمات)[:\s]*(\d+)/i);
  if (countMatch) wordCount = Number(countMatch[1]);

  const timeMatch = readingInfoRaw.match(/(?:الزمن المتوقع للقراءة|الزمن)[:\s]*(.+)/i);
  if (timeMatch) estimatedTime = timeMatch[1].trim();

  return {
    title,
    story,
    newWords: newWords.length >= 5 ? newWords : [],
    questions: [],
    reflectionQuestion,
    lesson,
    readingInfo: { difficulty, wordCount, estimatedTime },
  };
}

function getOpenAIErrorMessage(errorBody: unknown): string {
  if (!errorBody || typeof errorBody !== "object") return "حدث خطأ في الاتصال بالذكاء الاصطناعي";
  const body = errorBody as Record<string, unknown>;
  const error = body.error as Record<string, unknown> | undefined;
  const message = typeof error?.message === "string" ? error.message : "";
  const code = typeof error?.code === "string" ? error.code : "";

  if (code === "invalid_api_key" || message.toLowerCase().includes("incorrect api key")) {
    return "مفتاح الذكاء الاصطناعي غير صالح. يرجى التحقق من المفتاح.";
  }
  if (code === "insufficient_quota" || message.toLowerCase().includes("quota")) {
    return "رصيد الذكاء الاصطناعي نفد. يرجى شحن الحساب أو استخدام مفتاح آخر.";
  }
  if (code === "model_not_found" || message.toLowerCase().includes("model")) {
    return `نموذج الذكاء الاصطناعي المستخدم (${OPENAI_MODEL}) غير متاح. يرجى اختيار نموذج آخر.`;
  }
  return message || "حدث خطأ في الاتصال بالذكاء الاصطناعي";
}

router.get("/stories/usage", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  try {
    const usage = await getDailyUsage(identity.student.id);
    res.json({ ...usage, remaining: Math.max(0, usage.limit - usage.used) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ غير معروف";
    res.status(500).json({ error: message });
  }
});

router.post("/stories/generate", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);

  const body = GenerateStoryBody.parse(req.body);
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    res.status(500).json({ error: "OPENAI_API_KEY غير مضبوط" });
    return;
  }

  try {
    await requireDailyStoryAllowance(identity.student.id);
  } catch (err) {
    const typed = err as Error & { status?: number; code?: string };
    res.status(typed.status || 429).json({ error: typed.message, code: typed.code });
    return;
  }

  const prompt = buildPrompt(body.studentName, body.storyType);
  const url = `${OPENAI_BASE_URL.replace(/\/+$/, "")}/chat/completions`;

  try {
    const openaiRes = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 2500,
      }),
    });

    if (!openaiRes.ok) {
      const json = (await openaiRes.json().catch(() => ({}))) as {
        error?: { message?: string; code?: string };
      };
      res.status(502).json({ error: getOpenAIErrorMessage(json) });
      return;
    }

    const json = (await openaiRes.json()) as {
      choices?: Array<{
        message?: { content?: string };
        finish_reason?: string;
      }>;
      error?: { message?: string; code?: string };
    };

    const rawText = json.choices?.[0]?.message?.content ?? "";
    if (!rawText) {
      res.status(502).json({ error: "لم يعيد الذكاء الاصطناعي نصاً للقصة. حاول مرة أخرى." });
      return;
    }

    const result = parseStoryText(rawText);

    const [session] = await db
      .insert(aiStorySessionsTable)
      .values({
        studentId: identity.student.id,
        storyType: body.storyType,
        studentName: body.studentName,
        title: result.title,
        story: result.story,
        generatedContent: result as unknown as Record<string, unknown>,
        forDate: todayDate(),
      })
      .returning();

    await logActivity(identity.student.id, {
      type: "story_complete",
      title: "أنشأ قصة ذكية",
      description: `أنشأ قصة جديدة بعنوان "${result.title}"`,
      metadata: JSON.stringify({ storyType: body.storyType }),
    });

    res.json({ result, sessionId: session.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ غير معروف";
    res.status(500).json({ error: message });
  }
});

router.post("/stories/quiz/generate", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);

  const body = GenerateStoryQuizBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "بيانات غير صحيحة", details: body.error.flatten() });
    return;
  }

  const { sessionId, count, level, types } = body.data;

  const session = await db.query.aiStorySessionsTable.findFirst({
    where: eq(aiStorySessionsTable.id, sessionId),
  });

  if (!session) {
    res.status(404).json({ error: "القصة غير موجودة" });
    return;
  }

  if (session.studentId !== identity.student.id) {
    res.status(403).json({ error: "لا يمكنك إنشاء اختبار لقصة طالب آخر" });
    return;
  }

  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    res.status(500).json({ error: "OPENAI_API_KEY غير مضبوط" });
    return;
  }

  const url = `${OPENAI_BASE_URL.replace(/\/+$/, "")}/chat/completions`;
  const questionsPerType = Math.max(1, Math.ceil(count / types.length));

  try {
    const results = await Promise.all(
      types.map(async (type) => {
        const prompt = buildQuestionPrompt(
          { title: session.title, bodyText: session.story, description: "" },
          questionsPerType,
          level,
          type,
        );
        const openaiRes = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.5,
            max_tokens: 4096,
          }),
        });

        if (!openaiRes.ok) {
          const json = (await openaiRes.json().catch(() => ({}))) as { error?: { message?: string; code?: string } };
          throw new Error(getOpenAIErrorMessage(json));
        }

        const json = (await openaiRes.json()) as {
          choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
          error?: { message?: string; code?: string };
        };

        const rawText = json.choices?.[0]?.message?.content ?? "";
        if (!rawText) {
          throw new Error("لم يعيد الذكاء الاصطناعي أسئلة. حاول مرة أخرى.");
        }

        return parseGeneratedQuestions(rawText);
      }),
    );

    const questions = results.flat().slice(0, count);
    if (questions.length === 0) {
      res.status(502).json({ error: "لم يتم إنشاء أي أسئلة. حاول مرة أخرى." });
      return;
    }

    const content = session.generatedContent as unknown as GeneratedStory;
    const updatedContent: GeneratedStory = { ...content, questions };

    await db
      .update(aiStorySessionsTable)
      .set({ generatedContent: updatedContent as unknown as Record<string, unknown> })
      .where(eq(aiStorySessionsTable.id, sessionId));

    res.json({ questions, sessionId, itemTitle: session.title });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ غير معروف";
    res.status(500).json({ error: message });
  }
});

router.post("/stories/quiz/submit", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);

  const body = QuizAnswersBody.parse(req.body);
  const session = await db.query.aiStorySessionsTable.findFirst({
    where: eq(aiStorySessionsTable.id, body.sessionId),
  });

  if (!session) {
    res.status(404).json({ error: "القصة غير موجودة" });
    return;
  }
  if (session.studentId !== identity.student.id) {
    res.status(403).json({ error: "لا يمكنك إرسال إجابات لقصة طالب آخر" });
    return;
  }

  const existing = await db.query.aiStoryQuizSubmissionsTable.findFirst({
    where: and(
      eq(aiStoryQuizSubmissionsTable.studentId, identity.student.id),
      eq(aiStoryQuizSubmissionsTable.sessionId, body.sessionId),
    ),
  });
  if (existing) {
    res.status(400).json({ error: "لقد أرسلت إجاباتك لهذه القصة من قبل" });
    return;
  }

  const content = session.generatedContent as unknown as GeneratedStory;
  const questions = content.questions ?? [];

  const autoGradedTypes = new Set(["mcq", "true_false", "fill_blank", "classification", "ordering"]);

  const answers = body.answers.map((a) => {
    const question = questions[a.questionIndex];
    const type = question?.type ?? "mcq";
    const isAutoGraded = autoGradedTypes.has(type);
    const isCorrect = isAutoGraded && Boolean(question && a.selectedAnswer === question.correctAnswer);
    return {
      questionIndex: a.questionIndex,
      question: question?.question || "",
      selectedAnswer: a.selectedAnswer,
      correctAnswer: question?.correctAnswer || "",
      isCorrect,
      status: isAutoGraded ? (isCorrect ? "accepted" : "rejected") : "pending",
      points: isCorrect ? (question?.points ?? 10) : 0,
    };
  });

  const score = answers.filter((a) => a.isCorrect).length;
  const maxScore = questions.length;

  const [submission] = await db
    .insert(aiStoryQuizSubmissionsTable)
    .values({
      sessionId: body.sessionId,
      studentId: identity.student.id,
      answers,
      score,
      maxScore,
      status: "pending",
    })
    .returning();

  await logActivity(identity.student.id, {
    type: "quiz_complete",
    title: "أكمل اختبار قصة",
    description: `حصل على ${score} من ${maxScore} في اختبار القصة`,
    metadata: JSON.stringify({ sessionId: body.sessionId, score, maxScore }),
  });

  res.json({ submission });
});

router.get("/stories/quiz-defaults", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);

  const student = identity.student;
  if (!student.classId) {
    res.status(400).json({ error: "غير مرتبط بصف" });
    return;
  }

  const cls = await db.query.classesTable.findFirst({
    where: eq(classesTable.id, student.classId),
  });
  const defaults = parseDefaults(cls?.aiStoryQuizDefaults);
  res.json({ defaults });
});

router.get("/teacher/stories/quiz-defaults", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireTeacher(identity);

  if (identity.teacherClassIds.length === 0) {
    res.json({ classes: [] });
    return;
  }

  const classes = await db.query.classesTable.findMany({
    where: inArray(classesTable.id, identity.teacherClassIds),
  });

  res.json({
    classes: classes.map((c) => ({
      id: c.id,
      name: c.name,
      defaults: parseDefaults(c.aiStoryQuizDefaults),
    })),
  });
});

router.post("/teacher/stories/quiz-defaults", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireTeacher(identity);

  const body = AiStoryQuizDefaultsBody.parse(req.body);
  if (!identity.isAdmin && !identity.teacherClassIds.includes(body.classId)) {
    res.status(403).json({ error: "لا يمكنك تعديل صف آخر" });
    return;
  }

  const [cls] = await db
    .update(classesTable)
    .set({ aiStoryQuizDefaults: { level: body.level, types: body.types, count: body.count } as unknown as Record<string, unknown> })
    .where(eq(classesTable.id, body.classId))
    .returning();

  if (!cls) {
    res.status(404).json({ error: "الصف غير موجود" });
    return;
  }

  res.json({ classId: cls.id, defaults: parseDefaults(cls.aiStoryQuizDefaults) });
});

router.get("/teacher/stories/submissions", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireTeacher(identity);

  const teacherClassIds = identity.teacherClassIds;
  if (teacherClassIds.length === 0) {
    res.json({ submissions: [] });
    return;
  }

  const studentsInClasses = await db
    .select({ studentId: studentsTable.id, classId: studentsTable.classId })
    .from(studentsTable)
    .where(
      and(
        inArray(studentsTable.classId, teacherClassIds),
        eq(studentsTable.role, "student"),
      ),
    );

  const studentIds = studentsInClasses.map((s) => s.studentId);
  if (studentIds.length === 0) {
    res.json({ submissions: [] });
    return;
  }

  const submissions = await db.query.aiStoryQuizSubmissionsTable.findMany({
    where: inArray(aiStoryQuizSubmissionsTable.studentId, studentIds),
    orderBy: sql`${aiStoryQuizSubmissionsTable.createdAt} DESC`,
  });

  const students = await db.query.studentsTable.findMany({
    where: inArray(studentsTable.id, studentIds),
  });
  const studentsById = new Map(students.map((s) => [s.id, s]));

  const sessionIds = submissions.map((s) => s.sessionId);
  const sessions =
    sessionIds.length > 0
      ? await db.query.aiStorySessionsTable.findMany({
          where: inArray(aiStorySessionsTable.id, sessionIds),
        })
      : [];
  const sessionsById = new Map(sessions.map((s) => [s.id, s]));

  res.json({
    submissions: submissions.map((s) => ({
      ...s,
      student: studentsById.get(s.studentId) ?? null,
      session: sessionsById.get(s.sessionId) ?? null,
    })),
  });
});

router.post("/teacher/stories/submissions/:id/review", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireTeacher(identity);

  const submissionId = Number(req.params.id);
  if (!Number.isFinite(submissionId)) {
    res.status(400).json({ error: "معرّف الإجابة غير صالح" });
    return;
  }

  const body = ReviewSubmissionBody.parse(req.body);
  const submission = await db.query.aiStoryQuizSubmissionsTable.findFirst({
    where: eq(aiStoryQuizSubmissionsTable.id, submissionId),
  });

  if (!submission) {
    res.status(404).json({ error: "الإجابة غير موجودة" });
    return;
  }
  if (submission.status === "accepted") {
    res.status(400).json({ error: "تم تقييم هذه الإجابة مسبقاً" });
    return;
  }

  const student = await db.query.studentsTable.findFirst({
    where: eq(studentsTable.id, submission.studentId),
  });
  if (!student || !student.classId) {
    res.status(404).json({ error: "الطالب غير مرتبط بصف" });
    return;
  }
  if (!identity.isAdmin && !identity.teacherClassIds.includes(student.classId)) {
    res.status(403).json({ error: "لا يمكنك تقييم طالب من صف آخر" });
    return;
  }

  const storedAnswers = (submission.answers ?? []) as Array<{
    questionIndex: number;
    question: string;
    selectedAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    status?: "accepted" | "rejected";
    points?: number;
    note?: string;
  }>;
  const decisions = body.answers ?? [];
  const updatedAnswers = storedAnswers.map((a) => {
    const decision = decisions.find((d) => d.questionIndex === a.questionIndex);
    if (!decision) return a;
    return {
      ...a,
      status: decision.status,
      points: decision.points,
      note: decision.note,
    };
  });

  const pointsAwarded =
    body.status === "accepted"
      ? updatedAnswers.reduce((sum, a) => sum + (a.status === "accepted" ? (a.points ?? POINTS_PER_CORRECT_ANSWER) : 0), 0)
      : 0;

const reviewerId = identity.student?.id ?? 0;
  await db.transaction(async (tx) => {
    await tx
      .update(aiStoryQuizSubmissionsTable)
      .set({
        status: body.status,
        teacherFeedback: body.teacherFeedback ?? null,
        answers: updatedAnswers as unknown as Record<string, unknown>[],
        pointsAwarded: body.status === "accepted" ? pointsAwarded : 0,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      })
      .where(eq(aiStoryQuizSubmissionsTable.id, submissionId));

    if (body.status === "accepted" && pointsAwarded > 0) {
      await tx
        .update(studentsTable)
        .set({ points: sql`${studentsTable.points} + ${pointsAwarded}` })
        .where(eq(studentsTable.id, submission.studentId));
    }
  });

  res.json({ id: submissionId, status: body.status, pointsAwarded, teacherFeedback: body.teacherFeedback });
});

router.delete("/teacher/stories/submissions/:id", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireTeacher(identity);

  const submissionId = Number(req.params.id);
  if (!Number.isFinite(submissionId)) {
    res.status(400).json({ error: "معرّف الإجابة غير صالح" });
    return;
  }

  const submission = await db.query.aiStoryQuizSubmissionsTable.findFirst({
    where: eq(aiStoryQuizSubmissionsTable.id, submissionId),
  });
  if (!submission) {
    res.status(404).json({ error: "الإجابة غير موجودة" });
    return;
  }

  const student = await db.query.studentsTable.findFirst({
    where: eq(studentsTable.id, submission.studentId),
  });
  if (!student || !student.classId) {
    res.status(404).json({ error: "الطالب غير موجود أو غير مرتبط بصف" });
    return;
  }
  if (!identity.isAdmin && !identity.teacherClassIds.includes(student.classId)) {
    res.status(403).json({ error: "لا يمكنك حذف إجابة طالب من صف آخر" });
    return;
  }

  await db.transaction(async (tx) => {
    if (submission.status === "accepted" && submission.pointsAwarded && submission.pointsAwarded > 0) {
      await tx
        .update(studentsTable)
        .set({ points: sql`${studentsTable.points} - ${submission.pointsAwarded}` })
        .where(eq(studentsTable.id, submission.studentId));
    }
    await tx.delete(aiStoryQuizSubmissionsTable).where(eq(aiStoryQuizSubmissionsTable.id, submissionId));
  });

  res.json({ id: submissionId, deleted: true });
});

router.post("/teacher/students/:id/allow-ai-story", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireTeacher(identity);

  const studentId = Number(req.params.id);
  if (!Number.isFinite(studentId)) {
    res.status(400).json({ error: "معرّف الطالب غير صالح" });
    return;
  }

  const student = await db.query.studentsTable.findFirst({ where: eq(studentsTable.id, studentId) });
  if (!student || !student.classId) {
    res.status(404).json({ error: "الطالب غير موجود أو غير مرتبط بصف" });
    return;
  }
  if (!identity.isAdmin && !identity.teacherClassIds.includes(student.classId)) {
    res.status(403).json({ error: "لا يمكنك السماح لطالب من صف آخر" });
    return;
  }

  const today = todayDate();
  const existing = await db.query.aiStoryDailyAllowancesTable.findFirst({
    where: and(
      eq(aiStoryDailyAllowancesTable.studentId, studentId),
      eq(aiStoryDailyAllowancesTable.forDate, today),
    ),
  });

  if (existing) {
    const [updated] = await db
      .update(aiStoryDailyAllowancesTable)
      .set({ extraUses: existing.extraUses + 1 })
      .where(eq(aiStoryDailyAllowancesTable.id, existing.id))
      .returning();
    res.json({ allowed: true, extraUses: updated.extraUses, forDate: today });
    return;
  }

  const [created] = await db
    .insert(aiStoryDailyAllowancesTable)
    .values({ studentId, forDate: today, extraUses: 1 })
    .returning();
  res.json({ allowed: true, extraUses: created.extraUses, forDate: today });
});

router.get("/stories/health", async (_req, res) => {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    res.status(503).json({ status: "error", message: "OPENAI_API_KEY غير مضبوط" });
    return;
  }

  const url = `${OPENAI_BASE_URL.replace(/\/+$/, "")}/chat/completions`;
  try {
    const openaiRes = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [{ role: "user", content: "مرحبا" }],
        max_tokens: 1,
      }),
    });

    if (!openaiRes.ok) {
      const json = (await openaiRes.json().catch(() => ({}))) as {
        error?: { message?: string; code?: string };
      };
      res.status(503).json({ status: "error", message: getOpenAIErrorMessage(json) });
      return;
    }

    res.json({ status: "ok", model: OPENAI_MODEL });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ غير معروف";
    res.status(503).json({ status: "error", message });
  }
});

export default router;
