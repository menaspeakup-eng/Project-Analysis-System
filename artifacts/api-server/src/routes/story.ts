import { Router, type IRouter } from "express";
import { z } from "zod";
import { resolveIdentity, requireIdentity } from "../lib/identity";

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

function buildPrompt(studentName: string, storyType: StoryType): string {
  const typeLabel = STORY_TYPE_LABELS[storyType];
  return `أنت كاتب قصص تعليمية محترف ومتخصص في تنمية مهارة القراءة للطلاب.

مهمتك هي إنشاء قصة عربية تعليمية جديدة بالكامل.

بيانات الطالب:

- الاسم: ${studentName}
- نوع القصة: ${typeLabel}

التعليمات:

- اجعل اسم الطالب هو بطل القصة.
- أنشئ قصة أصلية بالكامل، ولا تكرر قصصاً معروفة.
- اكتب باللغة العربية الفصحى فقط.
- ضع التشكيل على جميع كلمات القصة قدر الإمكان لتسهيل القراءة.
- اجعل اللغة سهلة ومناسبة للطلاب من عمر 12 سنة فما فوق.
- اجعل الأحداث ممتعة ومشوقة دون مبالغة.
- لا تستخدم الرعب أو العنف أو الرومانسية أو أي محتوى غير مناسب.
- اجعل القصة تنتهي بقيمة تربوية أو درس مستفاد.
- استخدم جملاً قصيرة وواضحة لتناسب التدريب على القراءة.
- أضف حواراً بسيطاً بين الشخصيات.
- اجعل القصة مناسبة للقراءة بصوت مرتفع.
- لا تستخدم كلمات عامية.
- لا تستخدم الرموز التعبيرية داخل القصة.

حجم القصة:

- بين 300 و450 كلمة.
- زمن القراءة التقريبي من دقيقتين إلى أربع دقائق.

بعد انتهاء القصة أرجع البيانات بهذا الترتيب فقط:

# عنوان القصة

# القصة

# الكلمات الجديدة
اكتب 5 كلمات جديدة مع شرح مبسط جداً لكل كلمة.

# أسئلة الفهم
أنشئ 5 أسئلة اختيار من متعدد، ولكل سؤال 4 خيارات وحدد الإجابة الصحيحة.

# سؤال تفكير
اكتب سؤالاً مفتوحاً يدعو الطالب للتفكير.

# الدرس المستفاد
اكتب الدرس المستفاد في سطر واحد.

# معلومات القراءة
- مستوى الصعوبة: (1-5)
- عدد الكلمات.
- الزمن المتوقع للقراءة.

مهم جداً:
لا تكتب أي مقدمة مثل "إليك القصة" أو "بالتأكيد"، ولا تشرح ما ستفعله، بل أعد النتيجة مباشرة بالتنسيق المطلوب فقط.`;
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
  const readingInfoRaw = sections.get("معلومات الققراءة") || sections.get("معلومات القراءة") || "";

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
  const questionBlocks = questionsRaw.split(/\n(?=\d+[\.\-]\s|S\d|س\d|Question|\?)/).filter((b) => b.trim());
  for (const block of questionBlocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    const firstLine = lines[0] || "";
    const questionMatch = firstLine.match(/^(?:\d+[\.\-]\s*)?(.+?\?)/);
    const question = questionMatch ? questionMatch[1] : firstLine;
    const options: string[] = [];
    let correctAnswer = "";
    for (const line of lines.slice(1)) {
      const optionMatch = line.match(/^[-\u0660-\u0669a-dA-D۰-۹]\s*[\.\-)]\s*(.+)$/);
      if (optionMatch) {
        const text = optionMatch[1].replace(/\s*\(?(?:الإجابة الصحيحة|صحيح|correct)\)?/i, "").trim();
        if (line.match(/(?:الإجابة الصحيحة|صحيح|correct)/i)) {
          correctAnswer = text;
        }
        options.push(text);
      }
    }
    if (options.length >= 2) {
      questions.push({ question, options: options.slice(0, 4), correctAnswer });
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

router.post("/stories/generate", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);

  const body = GenerateStoryBody.parse(req.body);
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    res.status(500).json({ error: "OPENAI_API_KEY غير مضبوط" });
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
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!openaiRes.ok) {
      const json = (await openaiRes.json().catch(() => ({}))) as { error?: { message?: string; code?: string } };
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
    res.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ غير معروف";
    res.status(500).json({ error: message });
  }
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
      const json = (await openaiRes.json().catch(() => ({}))) as { error?: { message?: string; code?: string } };
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
