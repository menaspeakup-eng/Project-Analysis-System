import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { resolveIdentity, requireIdentity, requireTeacher } from "../lib/identity";
import { logActivity } from "../lib/activity-logs";
import {
  db,
  aiStorySessionsTable,
  aiStoryQuizSubmissionsTable,
  aiStoryDailyAllowancesTable,
  studentsTable,
  classesTable,
} from "@workspace/db";

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
  questions: { question: string; options: string[]; correctAnswer: string }[];
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

function normalizeLetter(letter: string): string {
  const normalized = letter.trim().toLowerCase();
  const map: Record<string, string> = {
    أ: "أ",
    ب: "ب",
    ج: "ج",
    د: "د",
    a: "أ",
    b: "ب",
    c: "ج",
    d: "د",
    "آ": "أ",
    "إ": "أ",
  };
  return map[normalized] ?? normalized;
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
  return `اكتب قصة عربية فصحى قصيرة (300–400 كلمة) مشكولة بالتشكيل الكامل (الفتحة والضمة والكسرة والسكون والتنوين والشدة والمد)، بطلها: ${studentName}، ونوعها: ${typeLabel}.\n\nالشروط:\n- لغة سهلة، جمل قصيرة، بدون عامية أو رموز تعبيرية.\n- بدون رعب أو رومانسية أو عنف.\n- حوار بسيط، ودرس أخلاقي في النهاية.\n\nأعد النتيجة بالتنسيق التالي فقط، بدون مقدمة أو شرح أو أقواس حول العنوان:\n\n# عنوان القصة\n[العنوان مشكول في سطر واحد]\n\n# القصة\n[القصة مشكولة بفقرات]\n\n# الكلمات الجديدة\n1. كلمة: معناها\n2. كلمة: معناها\n3. كلمة: معناها\n4. كلمة: معناها\n5. كلمة: معناها\n\n# أسئلة الفهم\nاكتب بالضبط 5 أسئلة اختيار من متعدد، كل سؤال بـ 4 خيارات (أ، ب، ج، د)، وذكر الإجابة الصحيحة بحرف واحد.\n\n1. السؤال؟\n   أ) خيار\n   ب) خيار\n   ج) خيار\n   د) خيار\n   الإجابة الصحيحة: ب\n\n2. السؤال؟ ...\n\n...\n\n5. السؤال؟ ...\n\n# سؤال للتفكير\n[سؤال مفتوح]\n\n# الدرس المستفاد\n[درس في سطر]\n\n# معلومات القراءة\n- مستوى الصعوبة: 1-5\n- عدد الكلمات: عدد\n- الزمن المتوقع للقراءة: دقائق`;
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

  const title = sections.get("عنوان القصة") || "قصتي الذكية";
  const story = sections.get("القصة") || "";
  const newWordsRaw = sections.get("الكلمات الجديدة") || "";
  const questionsRaw = sections.get("أسئلة الفهم") || "";
  const reflectionQuestion = sections.get("سؤال تفكير") || "";
  const lesson = sections.get("الدرس المستفاد") || "";
  const readingInfoRaw =
    sections.get("معلومات الققراءة") || sections.get("معلومات القراءة") || "";

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

  const questions: GeneratedStory["questions"] = [];
  const questionBlocks = questionsRaw
    .split(/\n(?=\d+[\.\-]\s+|S\d|س\d|Question)/)
    .filter((b) => b.trim());
  for (const block of questionBlocks) {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) continue;
    const firstLine = lines[0] || "";
    const questionMatch = firstLine.match(/^(?:\d+[\.\-]\s*)?(.+?\?)/);
    const question = questionMatch ? questionMatch[1] : firstLine;
    const options: { letter: string; text: string }[] = [];
    let correctLetter = "";
    for (const line of lines.slice(1)) {
      const correctMatch = line.match(/(?:الإجابة الصحيحة|الإجابة)[\s:]\s*([أبجدABCDabcd])/);
      if (correctMatch) {
        correctLetter = normalizeLetter(correctMatch[1]);
        continue;
      }
      const optionMatch = line.match(/^([-\u0660-\u0669a-dA-D۰-۹])\s*[\.\-)]\s*(.+)$/);
      if (optionMatch) {
        const letter = normalizeLetter(optionMatch[1]);
        const text = optionMatch[2]
          .replace(/\s*\(?(?:الإجابة الصحيحة|صحيح|correct)\)?/i, "")
          .trim();
        options.push({ letter, text });
      }
    }
    if (options.length >= 2) {
      const correctAnswer = options.find((o) => o.letter === correctLetter)?.text ?? options[0].text;
      questions.push({ question, options: options.slice(0, 4).map((o) => o.text), correctAnswer });
    }
    if (questions.length >= 5) break;
  }

  let difficulty = 1;
  let wordCount = 0;
  let estimatedTime = "3 دقائق";

  const diffMatch = readingInfoRaw.match(/مستوى الصعوبة[:\s]*(\d)/i);
  if (diffMatch) difficulty = Math.min(5, Math.max(1, Number(diffMatch[1])));

  const countMatch = readingInfoRaw.match(/(?:عدد الكلمات|عدد الكلمات)[:\s]*(\d+)/i);
  if (countMatch) wordCount = Number(countMatch[1]);

  const timeMatch = readingInfoRaw.match(/(?:الزمن المتوقع للقراءة|الزمن)[:\s]*(.+)/i);
  if (timeMatch) estimatedTime = timeMatch[1].trim();

  return {
    title,
    story,
    newWords: newWords.length >= 5 ? newWords : [],
    questions: questions.length >= 1 ? questions : [],
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
        temperature: 0.6,
        max_tokens: 2048,
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
        message?: {
          content?: string;
        };
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

  const answers = body.answers.map((a) => {
    const question = questions[a.questionIndex];
    const isCorrect = Boolean(question && a.selectedAnswer === question.correctAnswer);
    return {
      questionIndex: a.questionIndex,
      question: question?.question || "",
      selectedAnswer: a.selectedAnswer,
      correctAnswer: question?.correctAnswer || "",
      isCorrect,
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
        sql`${studentsTable.classId} IN (${sql.join(teacherClassIds.map(String), sql`,`)})`,
        eq(studentsTable.role, "student"),
      ),
    );

  const studentIds = studentsInClasses.map((s) => s.studentId);
  if (studentIds.length === 0) {
    res.json({ submissions: [] });
    return;
  }

  const submissions = await db.query.aiStoryQuizSubmissionsTable.findMany({
    where: sql`${aiStoryQuizSubmissionsTable.studentId} IN (${sql.join(studentIds.map(String), sql`,`)})`,
    orderBy: sql`${aiStoryQuizSubmissionsTable.createdAt} DESC`,
  });

  const students = await db.query.studentsTable.findMany({
    where: sql`${studentsTable.id} IN (${sql.join(studentIds.map(String), sql`,`)})`,
  });
  const studentsById = new Map(students.map((s) => [s.id, s]));

  const sessionIds = submissions.map((s) => s.sessionId);
  const sessions =
    sessionIds.length > 0
      ? await db.query.aiStorySessionsTable.findMany({
          where: sql`${aiStorySessionsTable.id} IN (${sql.join(sessionIds.map(String), sql`,`)})`,
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

  // Merge per-question decisions into the stored answers.
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

  await db.transaction(async (tx) => {
    await tx
      .update(aiStoryQuizSubmissionsTable)
      .set({
        status: body.status,
        teacherFeedback: body.teacherFeedback ?? null,
        answers: updatedAnswers as unknown as Record<string, unknown>[],
        pointsAwarded: body.status === "accepted" ? pointsAwarded : 0,
        reviewedBy: identity.student.id,
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
    res.status(404).json({ error: "الطالب غير مرتبط بصف" });
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
