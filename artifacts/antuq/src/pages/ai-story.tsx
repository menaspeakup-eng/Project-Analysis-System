import { useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, BookOpen, Sparkles, Loader2, Volume2, Mic, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AIStatusIndicator } from "@/components/ai-status";
import { useGenerateStory, type StoryType, type ApiError } from "@workspace/api-client-react";

function getApiErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error && "data" in error) {
    const data = (error as ApiError<unknown>).data;
    if (data && typeof data === "object" && "error" in data && typeof (data as { error?: string }).error === "string") {
      return (data as { error: string }).error;
    }
  }
  return null;
}

const storyTypes = [
  { value: "adventure", label: "🏕️ مغامرة", emoji: "🏕️" },
  { value: "space", label: "🚀 الفضاء", emoji: "🚀" },
  { value: "mystery", label: "🕵️ لغز وتحقيق", emoji: "🕵️" },
  { value: "robots-ai", label: "🤖 روبوتات وذكاء اصطناعي", emoji: "🤖" },
  { value: "fantasy", label: "🏰 عالم الخيال", emoji: "🏰" },
  { value: "ocean", label: "🌊 أعماق البحار", emoji: "🌊" },
  { value: "world-exploration", label: "🌍 استكشاف العالم", emoji: "🌍" },
  { value: "challenge-success", label: "🏆 التحدي والنجاح", emoji: "🏆" },
  { value: "school", label: "📚 قصة مدرسية", emoji: "📚" },
  { value: "nature", label: "🌱 البيئة والطبيعة", emoji: "🌱" },
];

const fadeSlide: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.25 } },
};

const staggerContainer: Variants = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const staggerItem: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function AIStory() {
  const [studentName, setStudentName] = useState("");
  const [storyType, setStoryType] = useState<StoryType | "">("");
  const [submitted, setSubmitted] = useState(false);
  const { mutate: generateStory, data, isPending, error } = useGenerateStory();

  const result = data?.result;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !storyType) return;
    setSubmitted(true);
    generateStory({ data: { studentName: studentName.trim(), storyType: storyType as StoryType } });
  };

  const handleNewStory = () => {
    setSubmitted(false);
    setStudentName("");
    setStoryType("");
  };

  return (
    <div className="min-h-[100dvh] bg-background relative overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/ai-assistant" className="w-10 h-10 rounded-xl bg-[hsl(265,60%,92%)] text-[hsl(265,60%,45%)] flex items-center justify-center hover:bg-[hsl(265,60%,88%)] transition-colors">
              <ArrowRight className="w-5 h-5 rotate-180" />
            </Link>
            <h1 className="text-lg font-black text-foreground">📖 قصتي الذكية</h1>
          </div>
          <AIStatusIndicator />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        <AnimatePresence mode="wait">
          {!submitted || isPending ? (
            <motion.div
              key="form"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              exit="exit"
              className="max-w-2xl mx-auto"
            >
              <motion.div variants={staggerItem} className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[hsl(265,60%,92%)] text-[hsl(265,60%,45%)] text-sm font-bold mb-4">
                  <Sparkles className="w-4 h-4" />
                  مدعوم بالذكاء الاصطناعي
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
                  قصة جديدة خصيصاً لك
                </h2>
                <p className="text-muted-foreground font-medium text-lg">
                  اكتب اسمك واختر نوع القصة، وسيقوم الذكاء الاصطناعي بكتابة قصة قصيرة تكون أنت بطلها.
                </p>
              </motion.div>

              <motion.div variants={staggerItem}>
                <Card className="rounded-3xl border-border bg-white shadow-sm overflow-hidden">
                  <CardContent className="p-6 md:p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="studentName" className="text-base font-bold">
                          اسمك
                        </Label>
                        <Input
                          id="studentName"
                          value={studentName}
                          onChange={(e) => setStudentName(e.target.value)}
                          placeholder="اكتب اسمك هنا"
                          className="h-12 rounded-xl text-base"
                          maxLength={120}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="storyType" className="text-base font-bold">
                          نوع القصة
                        </Label>
                        <Select value={storyType} onValueChange={(v) => setStoryType(v as StoryType | "")} required>
                          <SelectTrigger id="storyType" className="h-12 rounded-xl text-base">
                            <SelectValue placeholder="اختر نوع المغامرة" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {storyTypes.map((t) => (
                              <SelectItem key={t.value} value={t.value} className="rounded-lg text-base">
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        type="submit"
                        size="lg"
                        className="w-full h-14 rounded-xl text-lg font-bold"
                        disabled={isPending || !studentName.trim() || !storyType}
                      >
                        {isPending ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            يقوم الذكاء الاصطناعي بكتابة قصتك
                            <span className="inline-flex gap-0.5">
                              <span className="animate-bounce">.</span>
                              <span className="animate-bounce [animation-delay:0.1s]">.</span>
                              <span className="animate-bounce [animation-delay:0.2s]">.</span>
                            </span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            إنشاء القصة
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>

              {isPending && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-8 text-center"
                >
                  <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-white border border-border shadow-sm">
                    <Loader2 className="w-6 h-6 animate-spin text-[hsl(265,60%,45%)]" />
                    <span className="font-bold text-foreground">يقوم الذكاء الاصطناعي بكتابة قصتك...</span>
                  </div>
                </motion.div>
              )}

              {error && (
                <motion.div variants={staggerItem} className="mt-6 p-4 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 text-center">
                  <p className="font-bold mb-1">حدث خطأ أثناء إنشاء القصة</p>
                  <p className="text-sm font-medium opacity-90">
                    {getApiErrorMessage(error) ?? "تعذر الاتصال بالذكاء الاصطناعي. حاول مرة أخرى."}
                  </p>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="result"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="space-y-6"
            >
              {/* Story card */}
              <motion.div variants={staggerItem}>
                <Card className="rounded-3xl border-border bg-white shadow-md overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-[hsl(265,60%,92%)] text-[hsl(265,60%,45%)] flex items-center justify-center">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                          <CardTitle className="text-2xl font-black leading-tight">{result?.title}</CardTitle>
                          {result?.readingInfo && (
                            <p className="text-sm text-muted-foreground font-medium mt-1">
                              {result.readingInfo.wordCount > 0 ? `${result.readingInfo.wordCount} كلمة · ` : ""}
                              {result.readingInfo.estimatedTime}
                              {` · مستوى الصعوبة ${result.readingInfo.difficulty}/5`}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="prose prose-lg max-w-none leading-loose text-foreground font-medium bg-[hsl(40,33%,98%)] rounded-2xl p-5 md:p-6 border border-border">
                      {result?.story?.split("\n").map((paragraph, idx) => (
                        <p key={idx} className="mb-4 last:mb-0">
                          {paragraph}
                        </p>
                      ))}
                    </div>

                    {/* New words */}
                    {result?.newWords && result.newWords.length > 0 && (
                      <div>
                        <h3 className="font-black text-lg mb-3 flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-[hsl(265,60%,45%)]" />
                          الكلمات الجديدة
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {result.newWords.map((w, idx) => (
                            <div
                              key={idx}
                              className="bg-[hsl(40,33%,98%)] rounded-2xl p-4 border border-border flex flex-col gap-1"
                            >
                              <span className="font-black text-foreground text-lg">{w.word}</span>
                              <span className="text-sm text-muted-foreground font-medium">{w.meaning}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Questions */}
                    {result?.questions && result.questions.length > 0 && (
                      <div>
                        <h3 className="font-black text-lg mb-3 flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-accent" />
                          أسئلة الفهم
                        </h3>
                        <div className="space-y-4">
                          {result.questions.map((q, idx) => (
                            <div key={idx} className="bg-[hsl(40,33%,98%)] rounded-2xl p-4 border border-border">
                              <p className="font-bold text-foreground mb-3">
                                {idx + 1}. {q.question}
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {q.options.map((opt, optIdx) => (
                                  <div
                                    key={optIdx}
                                    className={`rounded-xl px-3 py-2 text-sm font-medium border ${
                                      opt === q.correctAnswer
                                        ? "bg-accent/10 border-accent text-accent-foreground"
                                        : "bg-white border-border text-muted-foreground"
                                    }`}
                                  >
                                    {opt}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Lesson */}
                    {result?.lesson && (
                      <div className="bg-secondary/15 rounded-2xl p-5 border border-secondary/30">
                        <h3 className="font-black text-lg mb-1 flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-secondary-foreground" />
                          الدرس المستفاد
                        </h3>
                        <p className="text-foreground font-medium">{result.lesson}</p>
                      </div>
                    )}

                    {/* Reflection */}
                    {result?.reflectionQuestion && (
                      <div className="bg-primary/10 rounded-2xl p-5 border border-primary/20">
                        <h3 className="font-black text-lg mb-1 flex items-center gap-2">
                          <Mic className="w-5 h-5 text-primary" />
                          سؤال للتفكير
                        </h3>
                        <p className="text-foreground font-medium">{result.reflectionQuestion}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Action buttons */}
              <motion.div variants={staggerItem} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button variant="outline" size="lg" className="rounded-xl h-12 font-bold" disabled>
                  <Volume2 className="w-5 h-5" />
                  الاستماع للقصة
                </Button>
                <Button variant="outline" size="lg" className="rounded-xl h-12 font-bold" disabled>
                  <Mic className="w-5 h-5" />
                  اقرأ القصة
                </Button>
                <Button
                  size="lg"
                  className="rounded-xl h-12 font-bold"
                  onClick={handleNewStory}
                >
                  <RefreshCw className="w-5 h-5" />
                  أنشئ قصة جديدة
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Background decorations */}
      <div className="absolute top-[15%] left-[5%] w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[15%] right-[5%] w-96 h-96 bg-[hsl(265,60%,60%)]/10 rounded-full blur-3xl pointer-events-none"></div>
    </div>
  );
}
