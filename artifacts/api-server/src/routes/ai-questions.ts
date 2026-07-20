import { Router, type IRouter } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { resolveIdentity, requireIdentity, requireTeacher } from "../lib/identity";
import { logActivity } from "../lib/activity-logs";
import {
  db,
  libraryItemsTable,
  libraryQuestionsTable,
  LIBRARY_QUESTION_TYPES,
  LIBRARY_QUESTION_LEVELS,
} from "@workspace/db";

const router: IRouter = Router();

const OPENAI_BASE_URL = process.env["OPENAI_BASE_URL"] || "https://openrouter.ai/api/v1";
const OPENAI_MODEL = process.env["OPENAI_MODEL"] || "openai/gpt-4o-mini";

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  mcq: "اختيار من متعدد",
  text: "سؤال مفتوح",
  true_false: "صح أو خطأ",
  fill_blank: "أكمل الفراغ",
  irab: "الإعراب",
  classification: "التصنيف",
  ordering: "الترتيب",
  analytical: "سؤال تحليلي",
  inference: "التفكير والاستنتاج",
  error_correction: "تصحيح الخطأ",
  justification: "تعليل الإجابة",
};

export const QUESTION_LEVEL_LABELS: Record<QuestionLevel, string> = {
  easy: "سهل",
  medium: "متوسط",
  advanced: "متقدم",
  high: "عالي",
  enrichment: "إثرائي",
  higher_order: "مهارات التفكير العليا",
};

type QuestionType = (typeof LIBRARY_QUESTION_TYPES)[number];
type QuestionLevel = (typeof LIBRARY_QUESTION_LEVELS)[number];

const GenerateQuestionsBody = z.object({
  libraryItemId: z.number().int().positive(),
  count: z.number().int().min(1).max(20).default(5),
  level: z.enum(LIBRARY_QUESTION_LEVELS),
  type: z.enum(LIBRARY_QUESTION_TYPES),
});

const SaveQuestionsBody = z.object({
  libraryItemId: z.number().int().positive(),
  questions: z.array(
    z.object({
      type: z.enum(LIBRARY_QUESTION_TYPES),
      level: z.enum(LIBRARY_QUESTION_LEVELS).optional(),
      question: z.string().min(1).max(2000),
      options: z.array(z.string().min(1)).default([]),
      correctAnswer: z.string().optional(),
      points: z.number().int().min(0).default(5),
      sortOrder: z.number().int().default(0),
    }),
  ),
});

export type GeneratedQuestion = {
  type: QuestionType;
  level?: QuestionLevel;
  question: string;
  options: string[];
  correctAnswer: string | null;
  points: number;
};

function getOpenAIErrorMessage(json: { error?: { message?: string; code?: string } }): string {
  const message = json.error?.message || "فشل الاتصال بخدمة الذكاء الاصطناعي";
  const code = json.error?.code ? ` (${json.error.code})` : "";
  return `${message}${code}`;
}

export function buildQuestionPrompt(
  item: { title: string; bodyText: string | null; description: string },
  count: number,
  level: QuestionLevel,
  type: QuestionType,
): string {
  const typeLabel = QUESTION_TYPE_LABELS[type];
  const levelLabel = QUESTION_LEVEL_LABELS[level];
  const text = [item.bodyText, item.description].filter(Boolean).join("\n\n");

  const typeInstructions: Record<QuestionType, string> = {
    mcq: `كل سؤال يجب أن يحتوي على 4 خيارات وإجابة واحدة صحيحة. ضع الخيارات في options والإجابة الصحيحة في correctAnswer.`,
    text: `كل سؤال مفتوح يحتاج إلى إجابة نصية حرة. اترك options و correctAnswer فارغين؛ سيراجع المعلم الإجابة.`,
    true_false: `كل سؤال يجب أن يكون عبارةً عن جملة يُختار لها "صح" أو "خطأ" فقط. ضع ["صح", "خطأ"] في options والإجابة الصحيحة في correctAnswer.`,
    fill_blank: `كل سؤال يحتوي على فراغ واحد يُمثل بثلاث نقاط (...). ضع الكلمة الصحيحة التي تملأ الفراغ في correctAnswer. اترك options فارغاً.`,
    irab: `كل سؤال يطلب إعراب كلمة أو جملة من النص. اترك options فارغاً و correctAnswer فارغاً؛ سيراجع المعلم الإجابة يدوياً.`,
    classification: `كل سؤال يطلب تصنيف كلمات أو جمل إلى فئات. ضع أسماء الفئات في options، وضع اسم الفئة الصحيحة في correctAnswer. اكتب العناصر المراد تصنيفها داخل نص السؤال.`,
    ordering: `كل سؤال يطلب ترتيب عناصر. ضع العناصر في options بترتيب عشوائي، وضع الترتيب الصحيح (مفصولاً بفواصل) في correctAnswer.`,
    analytical: `كل سؤال يطلب تحليلاً أو شرحاً. اترك options و correctAnswer فارغين؛ سيراجع المعلم الإجابة.`,
    inference: `كل سؤال يعتمد على الاستنتاج والتفكير. اترك options و correctAnswer فارغين؛ سيراجع المعلم الإجابة.`,
    error_correction: `كل سؤال يطلب تصحيح خطأ لغوي أو إملائي. اترك options و correctAnswer فارغين؛ سيراجع المعلم الإجابة.`,
    justification: `كل سؤال يطلب تعليل إجابة أو إعطاء السبب. اترك options و correctAnswer فارغين؛ سيراجع المعلم الإجابة.`,
  };

  return `أنت مساعد تعليمي متخصص في اللغة العربية والمنهج العربي. اقرأ النص التالي المقتبس من الدرس "${item.title}" ثم أنشئ ${count} سؤال/أسئلة من نوع "${typeLabel}" على مستوى "${levelLabel}".

ملاحظات مهمة:
- الأسئلة يجب أن تكون مباشرةً من النص ومناسبةً للمنهج العربي، وليس عشوائية.
- الصيغة المطلوبة: JSON فقط، مصفوفة تحت المفتاح "questions".
- لكل سؤال: type = "${type}", level = "${level}", question (السؤال بالعربية), options (مصفوفة خيارات أو []), correctAnswer (نص أو null), points (عدد صحيح من 1 إلى 20).
${typeInstructions[type]}
- لا تُضف أي نص خارج JSON.

النص:
---
${text || "لا يوجد نص للدرس، فأنشئ أسئلة عامة مناسبة للعمر والمستوى."}
---

أرجع الرد بهذا الشكل بالضبط:
{"questions": [{"type": "${type}", "level": "${level}", "question": "...", "options": [...], "correctAnswer": "...", "points": 5}]}`;
}

export function parseGeneratedQuestions(rawText: string): GeneratedQuestion[] {
  const cleaned = rawText
    .replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/, "$1")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as { questions?: GeneratedQuestion[] };
    if (!Array.isArray(parsed.questions)) {
      throw new Error("missing questions array");
    }
    return parsed.questions.map((q) => ({
      type: q.type,
      level: q.level || "medium",
      question: q.question?.trim() || "",
      options: Array.isArray(q.options) ? q.options.filter((o) => typeof o === "string" && o.trim()) : [],
      correctAnswer: q.correctAnswer ? q.correctAnswer.trim() : null,
      points: typeof q.points === "number" && q.points > 0 ? q.points : 5,
    }));
  } catch (err) {
    console.error("Failed to parse AI questions:", err, "raw:", rawText);
    throw new Error("لم يتمكن النظام من قراءة أسئلة الذكاء الاصطناعي. حاول مرة أخرى.");
  }
}

router.post("/teacher/ai-questions/generate", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireTeacher(identity);

  const body = GenerateQuestionsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "بيانات غير صحيحة", details: body.error.flatten() });
    return;
  }

  const { libraryItemId, count, level, type } = body.data;

  const [item] = await db
    .select()
    .from(libraryItemsTable)
    .where(eq(libraryItemsTable.id, libraryItemId))
    .limit(1);

  if (!item) {
    res.status(404).json({ error: "الدرس غير موجود" });
    return;
  }

  if (!identity.isAdmin && item.teacherId !== identity.student.id && !identity.teacherClassIds.includes(item.classId)) {
    res.status(403).json({ error: "لا تملك صلاحية الوصول إلى هذا الدرس" });
    return;
  }

  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    res.status(500).json({ error: "OPENAI_API_KEY غير مضبوط" });
    return;
  }

  const prompt = buildQuestionPrompt(item, count, level, type);
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
        temperature: 0.5,
        max_tokens: 4096,
      }),
    });

    if (!openaiRes.ok) {
      const json = (await openaiRes.json().catch(() => ({}))) as { error?: { message?: string; code?: string } };
      res.status(502).json({ error: getOpenAIErrorMessage(json) });
      return;
    }

    const json = (await openaiRes.json()) as {
      choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
      error?: { message?: string; code?: string };
    };

    const rawText = json.choices?.[0]?.message?.content ?? "";
    if (!rawText) {
      res.status(502).json({ error: "لم يعيد الذكاء الاصطناعي أسئلة. حاول مرة أخرى." });
      return;
    }

    const questions = parseGeneratedQuestions(rawText);
    res.json({ questions, itemTitle: item.title });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ غير معروف";
    res.status(500).json({ error: message });
  }
});

router.post("/teacher/ai-questions/save", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireTeacher(identity);

  const body = SaveQuestionsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "بيانات غير صحيحة", details: body.error.flatten() });
    return;
  }

  const { libraryItemId, questions } = body.data;

  const [item] = await db
    .select()
    .from(libraryItemsTable)
    .where(eq(libraryItemsTable.id, libraryItemId))
    .limit(1);

  if (!item) {
    res.status(404).json({ error: "الدرس غير موجود" });
    return;
  }

  if (!identity.isAdmin && item.teacherId !== identity.student.id && !identity.teacherClassIds.includes(item.classId)) {
    res.status(403).json({ error: "لا تملك صلاحية الوصول إلى هذا الدرس" });
    return;
  }

  const maxOrder = await db
    .select({ max: libraryQuestionsTable.sortOrder })
    .from(libraryQuestionsTable)
    .where(eq(libraryQuestionsTable.libraryItemId, libraryItemId))
    .orderBy(libraryQuestionsTable.sortOrder)
    .limit(1);

  let nextOrder = (maxOrder[0]?.max ?? 0) + 1;

  const rows = questions.map((q) => ({
    libraryItemId,
    type: q.type,
    level: q.level || "medium",
    question: q.question,
    options: q.options,
    correctAnswer: q.correctAnswer || null,
    points: q.points,
    sortOrder: nextOrder++,
  }));

  await db.insert(libraryQuestionsTable).values(rows);

  await logActivity(identity.student.id, {
    type: "ai_questions_generated" as const,
    title: "أنشأ أسئلة ذكاء اصطناعي",
    description: `أنشأ ${questions.length} سؤال/أسئلة للدرس "${item.title}"`,
    metadata: JSON.stringify({ libraryItemId, count: questions.length }),
  });

  res.json({ saved: questions.length });
});

export default router;
