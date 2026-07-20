import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, BookOpen, Save, Plus, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useListLibraryItems } from "@workspace/api-client-react";

const LEVELS = [
  { value: "easy", label: "سهل" },
  { value: "medium", label: "متوسط" },
  { value: "advanced", label: "متقدم" },
  { value: "high", label: "عالي" },
  { value: "enrichment", label: "إثرائي" },
  { value: "higher_order", label: "مهارات التفكير العليا" },
];

const TYPES = [
  { value: "mcq", label: "اختيار من متعدد" },
  { value: "true_false", label: "صح أو خطأ" },
  { value: "fill_blank", label: "أكمل الفراغ" },
  { value: "irab", label: "الإعراب" },
  { value: "classification", label: "التصنيف" },
  { value: "ordering", label: "الترتيب" },
  { value: "text", label: "سؤال مفتوح" },
  { value: "analytical", label: "سؤال تحليلي" },
  { value: "inference", label: "التفكير والاستنتاج" },
  { value: "error_correction", label: "تصحيح الخطأ" },
  { value: "justification", label: "تعليل الإجابة" },
];

interface GeneratedQuestion {
  type: string;
  level: string;
  question: string;
  options: string[];
  correctAnswer: string | null;
  points: number;
}

export default function TeacherAIGenerator() {
  const { toast } = useToast();
  const { data: libraryData, isLoading: isLibraryLoading } = useListLibraryItems();
  const items = libraryData?.items ?? [];

  const [libraryItemId, setLibraryItemId] = useState<string>("");
  const [count, setCount] = useState<number>(5);
  const [level, setLevel] = useState<string>("medium");
  const [type, setType] = useState<string>("mcq");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);

  const selectedItem = items.find((i) => String(i.id) === libraryItemId);

  async function handleGenerate() {
    if (!libraryItemId) {
      toast({ title: "اختر الدرس", description: "يجب اختيار الدرس أولاً.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setQuestions([]);
    try {
      const res = await fetch("/api/teacher/ai-questions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          libraryItemId: Number(libraryItemId),
          count,
          level,
          type,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "فشل توليد الأسئلة");
      }

      setQuestions(data.questions ?? []);
      toast({ title: "تم التوليد", description: `تم إنشاء ${(data.questions ?? []).length} سؤال/أسئلة.` });
    } catch (err) {
      const message = err instanceof Error ? err.message : "خطأ غير معروف";
      toast({ title: "فشل التوليد", description: message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSave() {
    if (!libraryItemId || questions.length === 0) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/teacher/ai-questions/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          libraryItemId: Number(libraryItemId),
          questions: questions.map((q) => ({
            ...q,
            correctAnswer: q.correctAnswer ?? undefined,
          })),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "فشل حفظ الأسئلة");
      }

      toast({ title: "تم الحفظ", description: `تم حفظ ${data.saved} سؤال/أسئلة في الدرس.` });
      setQuestions([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "خطأ غير معروف";
      toast({ title: "فشل الحفظ", description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  function updateQuestion(index: number, patch: Partial<GeneratedQuestion>) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function updateOption(qIndex: number, optIndex: number, value: string) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        const options = [...q.options];
        options[optIndex] = value;
        return { ...q, options };
      }),
    );
  }

  function removeOption(qIndex: number, optIndex: number) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        const options = q.options.filter((_, idx) => idx !== optIndex);
        return { ...q, options };
      }),
    );
  }

  function addOption(qIndex: number) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qIndex ? { ...q, options: [...q.options, "خيار جديد"] } : q)),
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-[hsl(265,60%,45%)]/10">
          <Sparkles className="w-6 h-6 text-[hsl(265,60%,45%)]" />
        </div>
        <div>
          <h2 className="font-black text-foreground text-lg">مولد الأسئلة الذكية</h2>
          <p className="text-sm text-muted-foreground">اختر الدرس والمستوى ونوع السؤال، ودع الذكاء الاصطناعي ينشئ أسئلة مناسبة للمنهج العربي.</p>
        </div>
      </div>

      <Card className="rounded-3xl border-border shadow-sm">
        <CardContent className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2 md:col-span-2">
              <Label>الدرس</Label>
              <Select value={libraryItemId} onValueChange={setLibraryItemId} disabled={isLibraryLoading}>
                <SelectTrigger className="rounded-xl h-12">
                  <SelectValue placeholder={isLibraryLoading ? "جاري التحميل..." : "اختر درساً من المكتبة"} />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      <span className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-muted-foreground" />
                        {item.title}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>عدد الأسئلة</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                className="rounded-xl h-12"
              />
            </div>

            <div className="space-y-2">
              <Label>المستوى</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger className="rounded-xl h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>نوع السؤال</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="rounded-xl h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !libraryItemId}
              className="rounded-xl font-bold h-12 bg-[hsl(265,60%,45%)] hover:bg-[hsl(265,60%,40%)]"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Sparkles className="w-4 h-4 ml-2" />}
              توليد الأسئلة
            </Button>
            {selectedItem && (
              <span className="text-sm text-muted-foreground">
                الدرس المختار: <strong className="text-foreground">{selectedItem.title}</strong>
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {questions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground">الأسئلة المولدة</h3>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-xl font-bold h-10 bg-primary hover:bg-primary/90"
              >
                {isSaving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
                حفظ في الدرس
              </Button>
            </div>

            {questions.map((q, idx) => (
              <Card key={idx} className="rounded-2xl border-border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">
                      {idx + 1}
                    </span>
                    <span className="text-sm text-muted-foreground font-normal">
                      {TYPES.find((t) => t.value === q.type)?.label} — {LEVELS.find((l) => l.value === q.level)?.label}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-4">
                  <div className="space-y-2">
                    <Label>نص السؤال</Label>
                    <Input
                      value={q.question}
                      onChange={(e) => updateQuestion(idx, { question: e.target.value })}
                      className="rounded-xl h-12"
                    />
                  </div>

                  {q.type !== "analytical" &&
                    q.type !== "inference" &&
                    q.type !== "error_correction" &&
                    q.type !== "justification" &&
                    q.type !== "irab" && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>الخيارات</Label>
                          <Button type="button" variant="ghost" size="sm" onClick={() => addOption(idx)} className="h-8">
                            <Plus className="w-4 h-4 ml-1" />
                            إضافة خيار
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {q.options.map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <Input
                                value={opt}
                                onChange={(e) => updateOption(idx, optIdx, e.target.value)}
                                className="rounded-xl h-10 flex-1"
                                placeholder={`الخيار ${optIdx + 1}`}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeOption(idx, optIdx)}
                                className="h-10 w-10 rounded-xl text-destructive"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {q.type !== "analytical" &&
                    q.type !== "inference" &&
                    q.type !== "error_correction" &&
                    q.type !== "justification" &&
                    q.type !== "irab" && (
                      <div className="space-y-2">
                        <Label>الإجابة الصحيحة</Label>
                        <Input
                          value={q.correctAnswer ?? ""}
                          onChange={(e) => updateQuestion(idx, { correctAnswer: e.target.value })}
                          className="rounded-xl h-12"
                          placeholder="اكتب الإجابة الصحيحة"
                        />
                      </div>
                    )}

                  {(q.type === "irab" ||
                    q.type === "analytical" ||
                    q.type === "inference" ||
                    q.type === "error_correction" ||
                    q.type === "justification") && (
                    <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-xl">
                      <AlertCircle className="w-4 h-4" />
                      هذا النوع يتطلب مراجعة يدوية من المعلم عند إجابة الطالب.
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>النقاط</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={q.points}
                      onChange={(e) => updateQuestion(idx, { points: Math.max(0, Number(e.target.value) || 0) })}
                      className="rounded-xl h-12 w-32"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
