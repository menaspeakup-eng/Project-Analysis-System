import { useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, BookOpen, Sparkles, Loader2, Volume2, Mic, RefreshCw, Target, Lock, AlertTriangle, Trophy, Send, Home, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AIStatusIndicator } from "@/components/ai-status";
import { useToast } from "@/hooks/use-toast";
import {
  useGenerateStory,
  useGetStoriesUsage,
  getGetStoriesUsageQueryKey,
  useSubmitStoryQuiz,
  useGenerateStoryQuiz,
  type StoryType,
  type ApiError,
  type StoryQuizAnswer,
  type StoryQuestionType,
  type StoryQuestionLevel,
  type StoryQuestion,
} from "@workspace/api-client-react";

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

function getApiErrorCode(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error && "data" in error) {
    const data = (error as ApiError<unknown>).data;
    if (data && typeof data === "object" && "code" in data && typeof (data as { code?: string }).code === "string") {
      return (data as { code: string }).code;
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

const quizLevels: { value: StoryQuestionLevel; label: string }[] = [
  { value: "easy", label: "سهل" },
  { value: "medium", label: "متوسط" },
  { value: "advanced", label: "متقدم" },
  { value: "high", label: "عالي" },
  { value: "enrichment", label: "إثرائي" },
  { value: "higher_order", label: "مهارات التفكير العليا" },
];

const quizTypes: { value: StoryQuestionType; label: string }[] = [
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
  const { toast } = useToast();
  const [studentName, setStudentName] = useState("");
  const [storyType, setStoryType] = useState<StoryType | "">("");
  const [submitted, setSubmitted] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [quizMode, setQuizMode] = useState(false);
  const [quizConfigMode, setQuizConfigMode] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<StoryQuestion[]>([]);
  const [quizLevel, setQuizLevel] = useState<StoryQuestionLevel>("medium");
  const [quizType, setQuizType] = useState<StoryQuestionType>("mcq");
  const [quizCount, setQuizCount] = useState(5);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const { mutate: generateStory, data, isPending, error, reset } = useGenerateStory();
  const { data: usageData, refetch: refetchUsage } = useGetStoriesUsage({
    query: { queryKey: getGetStoriesUsageQueryKey() },
  });
  const { mutate: submitQuiz, data: quizResultData, isPending: isSubmittingQuiz } = useSubmitStoryQuiz();
  const { mutate: generateQuiz, isPending: isGeneratingQuiz } = useGenerateStoryQuiz();

  const result = data?.result;
  const quizResult = quizResultData?.submission;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !storyType) return;
    setSubmitted(true);
    reset();
    generateStory(
      { data: { studentName: studentName.trim(), storyType: storyType as StoryType } },
      {
        onSuccess: (res) => {
          setSessionId(res.sessionId);
          refetchUsage();
        },
      },
    );
  };

  const handleNewStory = () => {
    setSubmitted(false);
    setStudentName("");
    setStoryType("");
    setSessionId(null);
    setQuizMode(false);
    setQuizConfigMode(false);
    setQuizQuestions([]);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setCurrentQuestionIndex(0);
    reset();
  };

  const isLimitReached = usageData && usageData.remaining <= 0;

  const handleQuizSubmit = () => {
    if (!sessionId || quizQuestions.length === 0) return;
    const answeredCount = Object.keys(quizAnswers).length;
    if (answeredCount < quizQuestions.length) {
      toast({ title: "أجب على جميع الأسئلة أولاً", variant: "destructive" });
      return;
    }
    const answers: StoryQuizAnswer[] = quizQuestions.map((_, idx) => ({
      questionIndex: idx,
      selectedAnswer: quizAnswers[idx] ?? "",
    }));
    submitQuiz(
      { data: { sessionId, answers } },
      {
        onSuccess: () => {
          setQuizSubmitted(true);
          setQuizMode(false);
          setQuizConfigMode(false);
          toast({ title: "تم إرسال الإجابات للمعلم", description: "ستظهر النتيجة بعد مراجعة المعلم" });
        },
        onError: (err) => {
          toast({ title: "تعذر إرسال الإجابات", description: getApiErrorMessage(err) ?? "حاول مرة أخرى", variant: "destructive" });
        },
      },
    );
  };

  const currentQuestion = quizQuestions[currentQuestionIndex];
  const totalQuestions = quizQuestions.length;
  const answeredQuestions = Object.keys(quizAnswers).length;
  const allAnswered = totalQuestions > 0 && answeredQuestions === totalQuestions;
  const needsTextAnswer = Boolean(currentQuestion && !["mcq", "true_false", "classification"].includes(currentQuestion.type));

  return (
    <div className="min-h-[100dvh] bg-background relative overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/ai-assistant" className="w-10 h-10 rounded-xl bg-[hsl(265,60%,92%)] text-[hsl(265,60%,45%)] flex items-center justify-center hover:bg-[hsl(265,60%,88%)] transition-colors" aria-label="رجوع">
              <ArrowRight className="w-5 h-5 rotate-180" />
            </Link>
            <Link href="/portal" className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors" aria-label="الرئيسية">
              <Home className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-black text-foreground mr-2">📖 قصتي الذكية</h1>
          </div>
          <AIStatusIndicator />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        {/* Usage banner */}
        {usageData && (
          <div className={`mb-6 rounded-2xl border px-4 py-3 flex items-center justify-between ${usageData.remaining > 0 ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"}`}>
            <div className="flex items-center gap-2 text-sm font-bold">
              {usageData.remaining > 0 ? (
                <>
                  <Trophy className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">لديك {usageData.remaining} {usageData.remaining === 1 ? "قصة" : "قصص"} متبقية اليوم</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-amber-600" />
                  <span className="text-amber-700">استنفذت قصتك اليومية. اطلب من معلمك السماح بقصة إضافية.</span>
                </>
              )}
            </div>
            <Badge variant="outline" className="rounded-full font-bold border-current">
              {usageData.used}/{usageData.limit}
            </Badge>
          </div>
        )}

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
                        disabled={isPending || !studentName.trim() || !storyType || isLimitReached}
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

                      {isLimitReached && (
                        <div className="flex items-center gap-2 text-amber-600 text-sm font-bold bg-amber-50 rounded-xl p-3">
                          <AlertTriangle className="w-4 h-4" />
                          لقد استنفذت محاولاتك اليوم. تحدث إلى معلمك ليمنحك محاولة إضافية.
                        </div>
                      )}
                    </form>
                  </CardContent>
                </Card>
              </motion.div>

              {error && (
                <motion.div variants={staggerItem} className="mt-6 p-4 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 text-center">
                  <p className="font-bold mb-1">حدث خطأ أثناء إنشاء القصة</p>
                  <p className="text-sm font-medium opacity-90">
                    {getApiErrorMessage(error) ?? "تعذر الاتصال بالذكاء الاصطناعي. حاول مرة أخرى."}
                  </p>
                  {getApiErrorCode(error) === "daily_limit_exceeded" && (
                    <p className="text-xs mt-2 opacity-80">اطلب من معلمك السماح بقصة إضافية.</p>
                  )}
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

              {/* Quiz CTA */}
              {!quizMode && !quizConfigMode && !quizSubmitted && !quizResult && (
                <motion.div variants={staggerItem}>
                  <Card className="rounded-3xl border-border bg-gradient-to-br from-[hsl(265,60%,96%)] to-white overflow-hidden">
                    <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
                      <div className="w-16 h-16 rounded-2xl bg-[hsl(265,60%,92%)] text-[hsl(265,60%,45%)] flex items-center justify-center shrink-0">
                        <Target className="w-8 h-8" />
                      </div>
                      <div className="flex-1 text-center md:text-right">
                        <h3 className="font-black text-xl mb-2">اختبر نفسك لزيادة نقاطك</h3>
                        <p className="text-muted-foreground font-medium">
                          اختر المستوى ونوع السؤال وعدد الأسئلة، ثم أنشئ أسئلة مباشرة من القصة.
                        </p>
                      </div>
                      <Button size="lg" className="rounded-xl h-14 px-8 font-bold shrink-0" onClick={() => setQuizConfigMode(true)}>
                        ابدأ الاختبار
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Quiz configuration */}
              {quizConfigMode && !quizMode && !quizSubmitted && !quizResult && (
                <motion.div variants={staggerItem}>
                  <Card className="rounded-3xl border-border bg-white shadow-sm overflow-hidden">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-xl font-black flex items-center gap-2">
                        <Target className="w-6 h-6 text-[hsl(265,60%,45%)]" />
                        إعداد اختبار القصة
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="space-y-2">
                        <Label className="text-base font-bold">نوع السؤال</Label>
                        <Select value={quizType} onValueChange={(v) => setQuizType(v as StoryQuestionType)}>
                          <SelectTrigger className="h-12 rounded-xl text-base">
                            <SelectValue placeholder="اختر نوع السؤال" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {quizTypes.map((t) => (
                              <SelectItem key={t.value} value={t.value} className="rounded-lg text-base">
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-base font-bold">المستوى</Label>
                        <Select value={quizLevel} onValueChange={(v) => setQuizLevel(v as StoryQuestionLevel)}>
                          <SelectTrigger className="h-12 rounded-xl text-base">
                            <SelectValue placeholder="اختر المستوى" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {quizLevels.map((l) => (
                              <SelectItem key={l.value} value={l.value} className="rounded-lg text-base">
                                {l.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-base font-bold">عدد الأسئلة</Label>
                        <Select value={String(quizCount)} onValueChange={(v) => setQuizCount(Number(v))}>
                          <SelectTrigger className="h-12 rounded-xl text-base">
                            <SelectValue placeholder="اختر عدد الأسئلة" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                              <SelectItem key={n} value={String(n)} className="rounded-lg text-base">
                                {n} {n === 1 ? "سؤال" : "أسئلة"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        <Button
                          variant="outline"
                          className="rounded-xl h-12 font-bold flex-1"
                          onClick={() => setQuizConfigMode(false)}
                        >
                          إلغاء
                        </Button>
                        <Button
                          className="rounded-xl h-12 font-bold flex-1"
                          disabled={isGeneratingQuiz || !sessionId}
                          onClick={() => {
                            if (!sessionId) return;
                            generateQuiz(
                              { data: { sessionId, count: quizCount, level: quizLevel, type: quizType } },
                              {
                                onSuccess: (res) => {
                                  setQuizQuestions(res.questions ?? []);
                                  setQuizConfigMode(false);
                                  setQuizMode(true);
                                  setQuizAnswers({});
                                  setCurrentQuestionIndex(0);
                                },
                                onError: (err) => {
                                  toast({ title: "تعذر إنشاء الأسئلة", description: getApiErrorMessage(err) ?? "حاول مرة أخرى", variant: "destructive" });
                                },
                              },
                            );
                          }}
                        >
                          {isGeneratingQuiz ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              يُنشئ الأسئلة...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-5 h-5" />
                              إنشاء الأسئلة
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Quiz form */}
              {quizMode && !quizSubmitted && !quizResult && (
                <motion.div variants={staggerItem}>
                  <Card className="rounded-3xl border-border bg-white shadow-sm overflow-hidden">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-black flex items-center gap-2">
                          <Target className="w-6 h-6 text-[hsl(265,60%,45%)]" />
                          اختبر فهمك للقصة
                        </CardTitle>
                        <Badge variant="outline" className="rounded-full font-bold">
                          السؤال {currentQuestionIndex + 1} من {totalQuestions}
                        </Badge>
                      </div>
                      <div className="mt-3 h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[hsl(265,60%,55%)] transition-all duration-300"
                          style={{ width: `${totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0}%` }}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {currentQuestion && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-foreground text-lg">
                              {currentQuestionIndex + 1}. {currentQuestion.question}
                            </p>
                            {currentQuestion.level && (
                              <Badge variant="outline" className="rounded-full text-xs font-bold">
                                {quizLevels.find((l) => l.value === currentQuestion.level)?.label ?? currentQuestion.level}
                              </Badge>
                            )}
                          </div>
                          {needsTextAnswer ? (
                            <div className="space-y-2">
                              <Label htmlFor={`q-${currentQuestionIndex}-answer`} className="font-bold text-sm">
                                أكتب إجابتك هنا
                              </Label>
                              <Input
                                id={`q-${currentQuestionIndex}-answer`}
                                value={quizAnswers[currentQuestionIndex] ?? ""}
                                onChange={(e) => setQuizAnswers((prev) => ({ ...prev, [currentQuestionIndex]: e.target.value }))}
                                placeholder="اكتب إجابتك..."
                                className="h-14 rounded-xl text-base"
                              />
                            </div>
                          ) : (
                            <RadioGroup
                              value={quizAnswers[currentQuestionIndex] ?? ""}
                              onValueChange={(value) => setQuizAnswers((prev) => ({ ...prev, [currentQuestionIndex]: value }))}
                              className="grid grid-cols-1 gap-2"
                            >
                              {currentQuestion.options.map((opt) => (
                                <div key={opt} className={`flex items-center gap-3 rounded-xl border p-4 hover:bg-[hsl(40,33%,96%)] transition-colors cursor-pointer ${quizAnswers[currentQuestionIndex] === opt ? "border-[hsl(265,60%,55%)] bg-[hsl(265,60%,96%)]" : "border-border bg-[hsl(40,33%,98%)]"}`}>
                                  <RadioGroupItem value={opt} id={`q-${currentQuestionIndex}-${opt}`} />
                                  <Label htmlFor={`q-${currentQuestionIndex}-${opt}`} className="flex-1 font-medium text-base cursor-pointer">
                                    {opt}
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          className="rounded-xl h-12 font-bold flex-1"
                          onClick={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
                          disabled={currentQuestionIndex === 0}
                        >
                          <ChevronRight className="w-5 h-5" />
                          السابق
                        </Button>
                        {currentQuestionIndex < totalQuestions - 1 ? (
                          <Button
                            className="rounded-xl h-12 font-bold flex-1"
                            onClick={() => setCurrentQuestionIndex((i) => Math.min(totalQuestions - 1, i + 1))}
                            disabled={!quizAnswers[currentQuestionIndex]}
                          >
                            التالي
                            <ChevronLeft className="w-5 h-5" />
                          </Button>
                        ) : (
                          <Button
                            className="rounded-xl h-12 font-bold flex-1"
                            onClick={handleQuizSubmit}
                            disabled={isSubmittingQuiz || !allAnswered}
                          >
                            {isSubmittingQuiz ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                جاري الإرسال...
                              </>
                            ) : (
                              <>
                                <Send className="w-5 h-5" />
                                إرسال الإجابات
                              </>
                            )}
                          </Button>
                        )}
                      </div>

                      {!allAnswered && (
                        <p className="text-sm text-muted-foreground font-medium text-center">
                          أجبت على {answeredQuestions} من {totalQuestions} أسئلة.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Quiz result */}
              {(quizSubmitted || quizResult) && (
                <motion.div variants={staggerItem}>
                  <Card className="rounded-3xl border-border bg-white shadow-sm overflow-hidden">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-xl font-black flex items-center gap-2">
                        <Trophy className="w-6 h-6 text-accent" />
                        نتيجة الاختبار
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center text-accent font-black text-2xl">
                          {(quizResult?.score ?? 0)}/{quizResult?.maxScore ?? quizQuestions.length ?? 0}
                        </div>
                        <div>
                          <p className="font-black text-lg">إجابات صحيحة: {quizResult?.score ?? 0}</p>
                          <p className="text-muted-foreground font-medium">
                            الحالة: {quizResult?.status === "accepted" ? "تم قبولها وإضافة النقاط" : "بانتظار مراجعة المعلم"}
                          </p>
                          {quizResult?.pointsAwarded != null && (
                            <p className="text-accent font-bold">+{quizResult.pointsAwarded} نقطة</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

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
                <Button size="lg" className="rounded-xl h-12 font-bold" onClick={handleNewStory}>
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
