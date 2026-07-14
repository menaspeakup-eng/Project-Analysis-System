import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { resolveIdentity, requireIdentity, requireTeacher } from "../lib/identity";
import { logActivity } from "../lib/activity-logs";
import { ObjectStorageService } from "../lib/objectStorage";
import {
  db,
  readingCoachSentencesTable,
  readingCoachAttemptsTable,
  readingCoachDailyAllowancesTable,
  studentsTable,
  classesTable,
} from "@workspace/db";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

const GROQ_BASE_URL = process.env["GROQ_BASE_URL"] || "https://api.groq.com/openai/v1";
const GROQ_CHAT_MODEL = process.env["GROQ_CHAT_MODEL"] || "llama-3.3-70b-versatile";
const GROQ_TRANSCRIPTION_MODEL = process.env["GROQ_TRANSCRIPTION_MODEL"] || "whisper-large-v3";
const POINTS_PER_ACCEPTED_READING = 20;

function todayDate(): string {
  return new Date().toISOString().split("T")[0];
}

function studentDifficulty(points: number): number {
  // 1–5 scale based on accumulated points.
  return Math.min(5, Math.max(1, 1 + Math.floor(points / 200)));
}

const GetSentenceBody = z.object({
  difficulty: z.number().int().min(1).max(5).optional(),
});

const SubmitAttemptBody = z.object({
  sentence: z.string().min(1).max(2000),
  audioObjectPath: z.string().min(1).optional(),
  audioBase64: z.string().min(1).optional(),
  contentType: z.string().min(1).max(120).optional(),
}).refine((data) => data.audioObjectPath || data.audioBase64, {
  message: "يجب إرسال مسار الصوت أو محتواه",
});

const ReviewAttemptBody = z.object({
  status: z.enum(["accepted", "rejected"]),
  points: z.number().int().min(0).max(100).default(POINTS_PER_ACCEPTED_READING),
  teacherFeedback: z.string().max(500).optional(),
});

const AllowExtraAttemptBody = z.object({
  studentId: z.number().int().positive(),
});

type ReadingAnalysis = {
  accuracy: number;
  missingWords: string[];
  wrongWords: string[];
  addedWords: string[];
  fluency: number;
  tips: string;
  summary: string;
  score: number;
};

function getGroqApiKey(): string | undefined {
  return process.env["GROQ_API_KEY"];
}

async function getDailyUsage(studentId: number): Promise<{ used: number; limit: number; extra: number }> {
  const today = todayDate();
  const [attempts, allowance] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(readingCoachAttemptsTable)
      .where(
        and(
          eq(readingCoachAttemptsTable.studentId, studentId),
          eq(readingCoachAttemptsTable.forDate, today),
        ),
      ),
    db.query.readingCoachDailyAllowancesTable.findFirst({
      where: and(
        eq(readingCoachDailyAllowancesTable.studentId, studentId),
        eq(readingCoachDailyAllowancesTable.forDate, today),
      ),
    }),
  ]);
  const used = attempts[0]?.count ?? 0;
  const extra = allowance?.extraUses ?? 0;
  return { used, limit: 1 + extra, extra };
}

async function requireDailyAllowance(studentId: number) {
  const { used, limit } = await getDailyUsage(studentId);
  if (used >= limit) {
    const err = new Error(
      "لقد استنفذت محاولتك اليومية. اطلب من معلمك السماح لك بمحاولة إضافية.",
    ) as Error & { status?: number; code?: string };
    err.status = 429;
    err.code = "daily_limit_exceeded";
    throw err;
  }
}

async function fetchRecentSentences(studentId: number, days: number): Promise<string[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const rows = await db
    .select({ sentence: readingCoachSentencesTable.sentence })
    .from(readingCoachSentencesTable)
    .where(
      and(
        eq(readingCoachSentencesTable.studentId, studentId),
        sql`${readingCoachSentencesTable.createdAt} >= ${since.toISOString()}`,
      ),
    );
  return rows.map((r) => r.sentence);
}

async function generateSentence(studentId: number, points: number): Promise<{ sentence: string; difficulty: number }> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new Error("GROQ_API_KEY غير مضبوط");
  }

  const difficulty = studentDifficulty(points);
  const recent = await fetchRecentSentences(studentId, 30);
  const avoidList = recent.length > 0 ? recent.slice(0, 50).join("\n- ") : "لا يوجد";

  const prompt = `اكتب جملة عربية فصحى واحدة مناسبة للطلاب، مشكولة بالتشكيل الكامل، لمستوى صعوبة ${difficulty} من 5.

متطلبات:
- الجملة طويلة نسبياً (15–35 كلمة بحسب المستوى) ولا تحتوي على أرقام أو رموز.
- اللغة سهلة، بدون عامية، وخالية من العنف أو الرعب.
- استخدم التشكيل الكامل (الفتحة والضمة والكسرة والسكون والتنوين والشدة والمد).
- لا تكرر أي جملة من القائمة التالية:
- ${avoidList}

أعد الجملة فقط في سطر واحد، بدون مقدمة أو شرح أو علامات اقتباس.`;

  const res = await fetch(`${GROQ_BASE_URL.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_CHAT_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 256,
    }),
  });

  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(json.error?.message || "فشل إنشاء الجملة");
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = json.choices?.[0]?.message?.content?.trim() || "";
  const sentence = raw.replace(/["'`]/g, "").replace(/\n/g, " ").trim();
  if (!sentence) {
    throw new Error("لم يُنشئ الذكاء الاصطناعي جملة");
  }
  return { sentence, difficulty };
}

async function downloadAudioBuffer(objectPath: string): Promise<{ buffer: Buffer; contentType: string }> {
  const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
  const response = await objectStorageService.downloadObject(objectFile, 60);
  const arrayBuffer = await response.arrayBuffer();
  const contentType = response.headers.get("Content-Type") || "application/octet-stream";
  return { buffer: Buffer.from(arrayBuffer), contentType };
}

async function transcribeAudio(buffer: Buffer, contentType: string): Promise<string> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new Error("GROQ_API_KEY غير مضبوط");
  }

  const extension = contentType.includes("webm") ? "webm" : contentType.includes("mp4") ? "m4a" : "mp3";
  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(buffer)], { type: contentType }), `recording.${extension}`);
  formData.append("model", GROQ_TRANSCRIPTION_MODEL);
  formData.append("language", "ar");
  formData.append("response_format", "json");

  const res = await fetch(`${GROQ_BASE_URL.replace(/\/+$/, "")}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(json.error?.message || "فشل تحويل الصوت إلى نص");
  }

  const json = (await res.json()) as { text?: string };
  return json.text?.trim() || "";
}

async function analyzeReading(sentence: string, transcription: string): Promise<ReadingAnalysis> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new Error("GROQ_API_KEY غير مضبوط");
  }

  const prompt = `أنت مقيّم قراءة عربية. قارن الجملة الأصلية بما قرأه الطالب.

الجملة الأصلية:
"${sentence}"

ما قرأه الطالب:
"${transcription}"

أعد JSON فقط بهذا الشكل بدون أي شرح إضافي:
{
  "accuracy": رقم بين 0 و 100,
  "missingWords": ["كلمة1", "كلمة2"],
  "wrongWords": ["كلمة1", "كلمة2"],
  "addedWords": ["كلمة1", "كلمة2"],
  "fluency": رقم بين 0 و 100,
  "tips": "نصيحة قصيرة ومشجعة للطالب",
  "summary": "جملة تشجيعية مختصرة للطالب"
}

إذا كانت القراءة صحيحة تماماً، اجعل accuracy و fluency 100 واجعل المصفوفات فارغة.`;

  const res = await fetch(`${GROQ_BASE_URL.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_CHAT_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 512,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(json.error?.message || "فشل تحليل القراءة");
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = json.choices?.[0]?.message?.content?.trim() || "{}";
  const parsed = JSON.parse(raw) as Partial<ReadingAnalysis>;

  return {
    accuracy: Math.min(100, Math.max(0, Number(parsed.accuracy) || 0)),
    missingWords: Array.isArray(parsed.missingWords) ? parsed.missingWords.map(String) : [],
    wrongWords: Array.isArray(parsed.wrongWords) ? parsed.wrongWords.map(String) : [],
    addedWords: Array.isArray(parsed.addedWords) ? parsed.addedWords.map(String) : [],
    fluency: Math.min(100, Math.max(0, Number(parsed.fluency) || 0)),
    tips: String(parsed.tips || "استمر في التدرب!"),
    summary: String(parsed.summary || "أحسنت المحاولة!"),
    score: Math.min(100, Math.max(0, Number(parsed.accuracy) || 0)),
  };
}

router.get("/reading-coach/status", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);

  try {
    const usage = await getDailyUsage(identity.student.id);
    const remaining = Math.max(0, usage.limit - usage.used);
    const today = todayDate();
    const now = new Date();
    const tomorrowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const secondsUntilReset = Math.max(0, Math.floor((tomorrowMidnight.getTime() - now.getTime()) / 1000));

    const latestAttempt = await db.query.readingCoachAttemptsTable.findFirst({
      where: and(
        eq(readingCoachAttemptsTable.studentId, identity.student.id),
        eq(readingCoachAttemptsTable.forDate, today),
      ),
      orderBy: sql`${readingCoachAttemptsTable.createdAt} DESC`,
    });

    res.json({
      remaining,
      used: usage.used,
      limit: usage.limit,
      secondsUntilReset,
      hasAttemptedToday: !!latestAttempt,
      latestAttempt: latestAttempt
        ? {
            id: latestAttempt.id,
            sentence: latestAttempt.sentence,
            audioObjectPath: latestAttempt.audioObjectPath,
            audioBase64: latestAttempt.audioBase64,
            transcription: latestAttempt.transcription,
            analysis: latestAttempt.analysis,
            score: latestAttempt.score,
            maxScore: latestAttempt.maxScore,
            status: latestAttempt.status,
            pointsAwarded: latestAttempt.pointsAwarded,
            createdAt: latestAttempt.createdAt,
          }
        : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ غير معروف";
    res.status(500).json({ error: message });
  }
});

router.post("/reading-coach/sentence", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);

  try {
    await requireDailyAllowance(identity.student.id);
  } catch (err) {
    const typed = err as Error & { status?: number; code?: string };
    res.status(typed.status || 429).json({ error: typed.message, code: typed.code });
    return;
  }

  const body = GetSentenceBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "طلب غير صالح" });
    return;
  }

  const apiKey = getGroqApiKey();
  if (!apiKey) {
    res.status(500).json({ error: "GROQ_API_KEY غير مضبوط" });
    return;
  }

  try {
    const student = await db.query.studentsTable.findFirst({
      where: eq(studentsTable.id, identity.student.id),
    });
    const points = student?.points ?? 0;
    const { sentence, difficulty } = await generateSentence(identity.student.id, points);

    await db.insert(readingCoachSentencesTable).values({
      studentId: identity.student.id,
      sentence,
      difficulty,
      forDate: todayDate(),
    });

    res.json({ sentence, difficulty });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ غير معروف";
    res.status(500).json({ error: message });
  }
});

router.post("/reading-coach/attempt", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);

  try {
    await requireDailyAllowance(identity.student.id);
  } catch (err) {
    const typed = err as Error & { status?: number; code?: string };
    res.status(typed.status || 429).json({ error: typed.message, code: typed.code });
    return;
  }

  const body = SubmitAttemptBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "بيانات المحاولة غير صالحة" });
    return;
  }

  const { sentence, audioObjectPath, audioBase64, contentType } = body.data;

  try {
    let buffer: Buffer;
    let actualContentType = contentType || "audio/webm";

    if (audioBase64) {
      buffer = Buffer.from(audioBase64, "base64");
    } else if (audioObjectPath) {
      const downloaded = await downloadAudioBuffer(audioObjectPath);
      buffer = downloaded.buffer;
      actualContentType = downloaded.contentType || actualContentType;
    } else {
      throw new Error("لا يوجد صوت مُرسل");
    }

    const transcription = await transcribeAudio(buffer, actualContentType);
    const analysis = await analyzeReading(sentence, transcription);

    const [attempt] = await db
      .insert(readingCoachAttemptsTable)
      .values({
        studentId: identity.student.id,
        sentence,
        audioObjectPath: audioObjectPath || null,
        audioBase64: audioBase64 || null,
        transcription,
        analysis: analysis as unknown as Record<string, unknown>,
        score: analysis.score,
        maxScore: 100,
        status: "pending",
        forDate: todayDate(),
      })
      .returning();

    await logActivity(identity.student.id, {
      type: "reading_coach_complete",
      title: "أكمل تدريب القراءة",
      description: `أكمل تدريب القراءة بنتيجة ${analysis.score}%`,
      metadata: JSON.stringify({ attemptId: attempt.id, score: analysis.score }),
    });

    res.json({
      attempt: {
        id: attempt.id,
        sentence: attempt.sentence,
        audioObjectPath: attempt.audioObjectPath,
        audioBase64: attempt.audioBase64,
        transcription: attempt.transcription,
        analysis: attempt.analysis,
        score: attempt.score,
        maxScore: attempt.maxScore,
        status: attempt.status,
        pointsAwarded: attempt.pointsAwarded,
        createdAt: attempt.createdAt,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ غير معروف";
    res.status(500).json({ error: message });
  }
});

router.get("/teacher/reading-coach/attempts", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireTeacher(identity);

  const teacherClassIds = identity.teacherClassIds;
  if (teacherClassIds.length === 0) {
    res.json({ attempts: [] });
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
    res.json({ attempts: [] });
    return;
  }

  const attempts = await db.query.readingCoachAttemptsTable.findMany({
    where: sql`${readingCoachAttemptsTable.studentId} IN (${sql.join(studentIds.map(String), sql`,`)})`,
    orderBy: sql`${readingCoachAttemptsTable.createdAt} DESC`,
  });

  const students = await db.query.studentsTable.findMany({
    where: sql`${studentsTable.id} IN (${sql.join(studentIds.map(String), sql`,`)})`,
  });
  const studentsById = new Map(students.map((s) => [s.id, s]));
  const classesById = new Map(
    (await db.query.classesTable.findMany()).map((c) => [c.id, c]),
  );

  res.json({
    attempts: attempts.map((a) => {
      const student = studentsById.get(a.studentId) ?? null;
      return {
        ...a,
        student,
        class: student?.classId ? classesById.get(student.classId) ?? null : null,
      };
    }),
  });
});

router.post("/teacher/reading-coach/attempts/:id/review", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireTeacher(identity);

  const attemptId = Number(req.params.id);
  if (!Number.isFinite(attemptId)) {
    res.status(400).json({ error: "معرّف المحاولة غير صالح" });
    return;
  }

  const body = ReviewAttemptBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "بيانات التقييم غير صالحة" });
    return;
  }

  const attempt = await db.query.readingCoachAttemptsTable.findFirst({
    where: eq(readingCoachAttemptsTable.id, attemptId),
  });
  if (!attempt) {
    res.status(404).json({ error: "المحاولة غير موجودة" });
    return;
  }
  if (attempt.status !== "pending") {
    res.status(400).json({ error: "تم تقييم هذه المحاولة مسبقاً" });
    return;
  }

  const student = await db.query.studentsTable.findFirst({
    where: eq(studentsTable.id, attempt.studentId),
  });
  if (!student || !student.classId) {
    res.status(404).json({ error: "الطالب غير مرتبط بصف" });
    return;
  }
  if (!identity.isAdmin && !identity.teacherClassIds.includes(student.classId)) {
    res.status(403).json({ error: "لا يمكنك تقييم طالب من صف آخر" });
    return;
  }

  const pointsAwarded = body.data.status === "accepted" ? body.data.points : 0;

  await db.transaction(async (tx) => {
    await tx
      .update(readingCoachAttemptsTable)
      .set({
        status: body.data.status,
        teacherFeedback: body.data.teacherFeedback ?? null,
        pointsAwarded: body.data.status === "accepted" ? pointsAwarded : 0,
        reviewedBy: identity.student.id,
        reviewedAt: new Date(),
      })
      .where(eq(readingCoachAttemptsTable.id, attemptId));

    if (body.data.status === "accepted" && pointsAwarded > 0) {
      await tx
        .update(studentsTable)
        .set({ points: sql`${studentsTable.points} + ${pointsAwarded}` })
        .where(eq(studentsTable.id, attempt.studentId));
    }
  });

  res.json({ id: attemptId, status: body.data.status, pointsAwarded, teacherFeedback: body.data.teacherFeedback });
});

router.post("/teacher/students/:id/allow-reading-coach", async (req, res) => {
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
  const existing = await db.query.readingCoachDailyAllowancesTable.findFirst({
    where: and(
      eq(readingCoachDailyAllowancesTable.studentId, studentId),
      eq(readingCoachDailyAllowancesTable.forDate, today),
    ),
  });

  if (existing) {
    const [updated] = await db
      .update(readingCoachDailyAllowancesTable)
      .set({ extraUses: existing.extraUses + 1 })
      .where(eq(readingCoachDailyAllowancesTable.id, existing.id))
      .returning();
    res.json({ allowed: true, extraUses: updated.extraUses, forDate: today });
    return;
  }

  const [created] = await db
    .insert(readingCoachDailyAllowancesTable)
    .values({ studentId, forDate: today, extraUses: 1 })
    .returning();
  res.json({ allowed: true, extraUses: created.extraUses, forDate: today });
});

export default router;
