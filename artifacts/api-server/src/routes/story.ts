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

const GEMINI_MODEL = process.env["GEMINI_MODEL"] || "gemini-2.5-pro";

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

function getGeminiErrorMessage(geminiError: unknown): string {
  if (typeof geminiError === "string") return geminiError;
  if (!geminiError || typeof geminiError !== "object") return "حدث خطأ في الاتصال بالذكاء الاصطناعي";
  const error = geminiError as Record<string, unknown>;
  const message =
    typeof error.message === "string" ? error.message : Array.isArray(error.message) ? error.message.join(" ") : "";
  if (message.includes("quota") || message.includes("Quota")) {
    return "الحساب المجاني للذكاء الاصطناعي وصل للحد الأقصى. يرجى تفعيل الفوترة أو استخدام مفتاح آخر.";
  }
  if (message.includes("no longer available") || message.includes("not found") || message.includes("does not exist")) {
    return `نموذج الذكاء الاصطناعي المستخدم (${GEMINI_MODEL}) غير متاح على هذا المفتاح. يرجى اختيار نموذج آخر.`;
  }
  if (message.includes("API key not valid") || message.includes("API Key not valid")) {
    return "مفتاح الذكاء الاصطناعي غير صالح. يرجى التحقق من GEMINI_API_KEY.";
  }
  return message || "حدث خطأ في الاتصال بالذكاء الاصطناعي";
}

router.post("/stories/generate", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);

  const body = GenerateStoryBody.parse(req.body);
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    res.status(500).json({ error: "GEMINI_API_KEY غير مضبوط" });
    return;
  }

  const prompt = buildPrompt(body.studentName, body.storyType);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        },
      }),
    });

    if (!geminiRes.ok) {
      const json = (await geminiRes.json().catch(() => ({}))) as { error?: { message?: string } } | string;
      const geminiError = typeof json === "string" ? json : json.error;
      res.status(502).json({ error: getGeminiErrorMessage(geminiError) });
      return;
    }

    const json = (await geminiRes.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
        finishReason?: string;
      }>;
      error?: { message?: string };
    };

    const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
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
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    res.status(503).json({ status: "error", message: "GEMINI_API_KEY غير مضبوط" });
    return;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  try {
    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "مرحبا" }] }],
        generationConfig: { maxOutputTokens: 1 },
      }),
    });

    if (!geminiRes.ok) {
      const json = (await geminiRes.json().catch(() => ({}))) as { error?: { message?: string } } | string;
      const geminiError = typeof json === "string" ? json : json.error;
      res.status(503).json({ status: "error", message: getGeminiErrorMessage(geminiError) });
      return;
    }

    res.json({ status: "ok", model: GEMINI_MODEL });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ غير معروف";
    res.status(503).json({ status: "error", message });
  }
});

export default router;
