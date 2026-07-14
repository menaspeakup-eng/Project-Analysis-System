import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Link } from "wouter";
import {
  ArrowRight,
  Home,
  Mic,
  MicOff,
  Play,
  Square,
  Trophy,
  Sparkles,
  Loader2,
  Volume2,
  Target,
  RefreshCw,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AIStatusIndicator } from "@/components/ai-status";
import { useToast } from "@/hooks/use-toast";
import {
  useGetReadingCoachStatus,
  getGetReadingCoachStatusQueryKey,
  useGenerateReadingCoachSentence,
  useSubmitReadingCoachAttempt,
  useRequestUploadUrl,
  type ReadingCoachAnalysis,
  type ApiError,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

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

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} ساعة`);
  if (minutes > 0) parts.push(`${minutes} دقيقة`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} ثانية`);
  return parts.join(" و ");
}

function getStorageObjectUrl(objectPath: string): string {
  if (objectPath.startsWith("/")) {
    return `${import.meta.env.BASE_URL}api/storage${objectPath}`;
  }
  return objectPath;
}

export default function ReadingCoach() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<"idle" | "sentence" | "recording" | "uploading" | "result">("idle");
  const [sentence, setSentence] = useState("");
  const [difficulty, setDifficulty] = useState(1);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioObjectPath, setAudioObjectPath] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioContentType, setAudioContentType] = useState("audio/webm");
  const [analysis, setAnalysis] = useState<ReadingCoachAnalysis | null>(null);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<"pending" | "accepted" | "rejected" | null>(null);
  const [pointsAwarded, setPointsAwarded] = useState<number | null>(null);
  const [attemptId, setAttemptId] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: statusData, isLoading: isStatusLoading, refetch: refetchStatus } = useGetReadingCoachStatus({
    query: { queryKey: getGetReadingCoachStatusQueryKey() },
  });
  const { mutate: generateSentence, isPending: isGenerating } = useGenerateReadingCoachSentence();
  const { mutate: submitAttempt, isPending: isSubmitting } = useSubmitReadingCoachAttempt();
  const { mutate: requestUploadUrl, isPending: isRequestingUrl } = useRequestUploadUrl();

  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (statusData?.secondsUntilReset) {
      setCountdown(statusData.secondsUntilReset);
    }
  }, [statusData?.secondsUntilReset]);

  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          refetchStatus();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [countdown, refetchStatus]);

  const cleanupRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    mediaRecorderRef.current = null;
    setRecordingSeconds(0);
  }, []);

  useEffect(() => {
    return () => {
      cleanupRecording();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [cleanupRecording]);

  const canStartToday = (statusData?.remaining ?? 0) > 0 && !statusData?.hasAttemptedToday;
  const latestAttempt = statusData?.latestAttempt;

  const handleStart = () => {
    if (!canStartToday) return;
    setPhase("sentence");
    generateSentence(
      { data: {} },
      {
        onSuccess: (res) => {
          setSentence(res.sentence);
          setDifficulty(res.difficulty);
        },
        onError: (err) => {
          toast({ title: "تعذر إنشاء الجملة", description: getApiErrorMessage(err) ?? "حاول مرة أخرى", variant: "destructive" });
          setPhase("idle");
        },
      },
    );
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        setAudioBlob(blob);
        setAudioContentType(mimeType);
        uploadAudio(blob, mimeType);
      };
      mediaRecorderRef.current = recorder;
      recorder.start(200);
      setPhase("recording");
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch (err) {
      toast({ title: "لا يمكن الوصول للميكروفون", description: "اسمح بالوصول إلى الميكروفون وحاول مرة أخرى", variant: "destructive" });
    }
  };

  const handleStopRecording = () => {
    cleanupRecording();
    setPhase("uploading");
  };

  const uploadAudio = async (blob: Blob, mimeType: string) => {
    requestUploadUrl(
      { data: { name: `reading-coach-${Date.now()}.webm`, size: blob.size, contentType: mimeType } },
      {
        onSuccess: async (res) => {
          try {
            const uploadRes = await fetch(res.uploadURL, {
              method: "PUT",
              headers: { "Content-Type": mimeType },
              body: blob,
            });
            if (!uploadRes.ok) {
              throw new Error("فشل رفع التسجيل");
            }
            setAudioObjectPath(res.objectPath);
            submitForAnalysis(res.objectPath, mimeType);
          } catch (err) {
            toast({ title: "فشل رفع التسجيل", description: err instanceof Error ? err.message : "حاول مرة أخرى", variant: "destructive" });
            setPhase("sentence");
          }
        },
        onError: (err) => {
          toast({ title: "فشل طلب رفع التسجيل", description: getApiErrorMessage(err) ?? "حاول مرة أخرى", variant: "destructive" });
          setPhase("sentence");
        },
      },
    );
  };

  const submitForAnalysis = (objectPath: string, mimeType: string) => {
    submitAttempt(
      { data: { sentence, audioObjectPath: objectPath, contentType: mimeType } },
      {
        onSuccess: (res) => {
          setAnalysis(res.attempt.analysis as unknown as ReadingCoachAnalysis);
          setScore(res.attempt.score ?? 0);
          setStatus(res.attempt.status as "pending" | "accepted" | "rejected");
          setPointsAwarded(res.attempt.pointsAwarded ?? null);
          setAttemptId(res.attempt.id);
          setPhase("result");
          queryClient.invalidateQueries({ queryKey: getGetReadingCoachStatusQueryKey() });
        },
        onError: (err) => {
          toast({ title: "فشل تحليل القراءة", description: getApiErrorMessage(err) ?? "حاول مرة أخرى", variant: "destructive" });
          setPhase("sentence");
        },
      },
    );
  };

  const handleRetry = () => {
    cleanupRecording();
    setAudioBlob(null);
    setAudioObjectPath(null);
    setAnalysis(null);
    setScore(0);
    setStatus(null);
    setPointsAwarded(null);
    setAttemptId(null);
    setPhase("idle");
    refetchStatus();
  };

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
            <h1 className="text-lg font-black text-foreground mr-2">🎙️ مدرب القراءة الذكي</h1>
          </div>
          <AIStatusIndicator />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        <AnimatePresence mode="wait">
          {isStatusLoading ? (
            <motion.div key="loading" className="h-40 flex items-center justify-center" variants={fadeSlide} initial="initial" animate="animate" exit="exit">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </motion.div>
          ) : (
            <motion.div key="content" variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
              {phase === "idle" && (
                <>
                  <motion.div variants={staggerItem} className="text-center space-y-4 py-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[hsl(265,60%,92%)] text-[hsl(265,60%,45%)] text-sm font-bold">
                      <Sparkles className="w-4 h-4" />
                      مدعوم بالذكاء الاصطناعي
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-foreground">تدرب على القراءة بصوتك</h2>
                    <p className="text-muted-foreground font-medium max-w-2xl mx-auto text-lg">
                      سيُعطيك المدرب جملة جديدة كل يوم، تسجّل قراءتك، ويحللها الذكاء الاصطناعي ويُرسلها للمعلم للمراجعة.
                    </p>
                  </motion.div>

                  <motion.div variants={staggerItem}>
                    <Card className="rounded-3xl border-border bg-white shadow-sm overflow-hidden">
                      <CardContent className="p-6 md:p-8 text-center space-y-6">
                        {statusData && (
                          <div className="flex items-center justify-center gap-3">
                            <Badge variant="outline" className="rounded-full font-bold px-4 py-2 text-base">
                              <Trophy className="w-4 h-4 ml-1" />
                              المحاولات: {statusData.used}/{statusData.limit}
                            </Badge>
                            {countdown > 0 && statusData.remaining === 0 && (
                              <Badge variant="secondary" className="rounded-full font-bold px-4 py-2 text-base">
                                <Clock className="w-4 h-4 ml-1" />
                                المحاولة القادمة بعد: {formatDuration(countdown)}
                              </Badge>
                            )}
                          </div>
                        )}

                        <Button
                          size="lg"
                          className="w-full h-14 rounded-xl text-lg font-bold"
                          onClick={handleStart}
                          disabled={!canStartToday || isGenerating}
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              يُحضّر الجملة...
                            </>
                          ) : (
                            <>
                              <Mic className="w-5 h-5" />
                              ابدأ التدريب
                            </>
                          )}
                        </Button>

                        {!canStartToday && statusData?.hasAttemptedToday && latestAttempt && (
                          <div className="rounded-2xl bg-[hsl(40,33%,98%)] p-5 border border-border text-right">
                            <h3 className="font-black text-lg mb-2">محاولتك اليوم</h3>
                            <p className="text-muted-foreground font-medium mb-2">{latestAttempt.sentence}</p>
                            <div className="flex items-center gap-3 flex-wrap">
                              <Badge className="rounded-full font-bold">النتيجة: {latestAttempt.score}%</Badge>
                              <Badge variant={latestAttempt.status === "accepted" ? "default" : latestAttempt.status === "rejected" ? "destructive" : "outline"} className="rounded-full font-bold">
                                {latestAttempt.status === "accepted" ? "مقبولة" : latestAttempt.status === "rejected" ? "مرفوضة" : "بانتظار المراجعة"}
                              </Badge>
                              {latestAttempt.pointsAwarded != null && (
                                <Badge variant="outline" className="rounded-full font-bold">+{latestAttempt.pointsAwarded} نقطة</Badge>
                              )}
                            </div>
                            {latestAttempt.audioObjectPath && (
                              <audio
                                ref={audioRef}
                                controls
                                src={getStorageObjectUrl(latestAttempt.audioObjectPath)}
                                className="w-full mt-4"
                              />
                            )}
                          </div>
                        )}

                        {!canStartToday && statusData?.remaining === 0 && !statusData?.hasAttemptedToday && (
                          <div className="flex items-center gap-2 text-amber-600 text-sm font-bold bg-amber-50 rounded-xl p-3">
                            <AlertTriangle className="w-4 h-4" />
                            استنفذت محاولتك اليومية. اطلب من معلمك السماح بمحاولة إضافية.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </>
              )}

              {phase === "sentence" && (
                <motion.div variants={staggerItem}>
                  <Card className="rounded-3xl border-border bg-white shadow-md overflow-hidden">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-black flex items-center gap-2">
                          <Target className="w-6 h-6 text-[hsl(265,60%,45%)]" />
                          اقرأ الجملة التالية
                        </CardTitle>
                        <Badge variant="outline" className="rounded-full font-bold">مستوى {difficulty}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="bg-[hsl(40,33%,98%)] rounded-2xl p-6 md:p-8 border border-border text-center">
                        <p className="text-2xl md:text-3xl font-black text-foreground leading-loose">{sentence}</p>
                      </div>

                      <Button
                        size="lg"
                        className="w-full h-14 rounded-xl text-lg font-bold"
                        onClick={handleStartRecording}
                        disabled={isRequestingUrl}
                      >
                        <Mic className="w-5 h-5" />
                        تسجيل القراءة
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {phase === "recording" && (
                <motion.div variants={staggerItem}>
                  <Card className="rounded-3xl border-border bg-white shadow-md overflow-hidden">
                    <CardHeader>
                      <CardTitle className="text-xl font-black flex items-center gap-2">
                        <Mic className="w-6 h-6 text-red-500 animate-pulse" />
                        جاري التسجيل...
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 text-center">
                      <div className="text-4xl font-black text-foreground tabular-nums">{recordingSeconds} ث</div>
                      <p className="text-muted-foreground font-medium">اقرأ الجملة بصوت واضح ثم اضغط إيقاف.</p>
                      <Button size="lg" variant="destructive" className="w-full h-14 rounded-xl text-lg font-bold" onClick={handleStopRecording}>
                        <Square className="w-5 h-5" />
                        إيقاف التسجيل
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {(phase === "uploading" || isSubmitting) && (
                <motion.div variants={staggerItem}>
                  <Card className="rounded-3xl border-border bg-white shadow-md overflow-hidden">
                    <CardContent className="p-8 text-center space-y-4">
                      <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                      <p className="font-black text-lg">جاري تحليل قراءتك...</p>
                      <p className="text-muted-foreground font-medium">نرفع التسجيل، نحوّله إلى نص، ونحلله بالذكاء الاصطناعي.</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {phase === "result" && analysis && (
                <motion.div variants={staggerItem} className="space-y-6">
                  <Card className="rounded-3xl border-border bg-white shadow-md overflow-hidden">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-xl font-black flex items-center gap-2">
                        <Trophy className="w-6 h-6 text-accent" />
                        نتيجة التدريب
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="w-24 h-24 rounded-2xl bg-accent/10 flex items-center justify-center text-accent font-black text-3xl">
                          {score}%
                        </div>
                        <div>
                          <p className="font-black text-lg">{analysis.summary}</p>
                          <p className="text-muted-foreground font-medium">{analysis.tips}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm font-bold">
                          <span>دقة القراءة</span>
                          <span>{analysis.accuracy}%</span>
                        </div>
                        <Progress value={analysis.accuracy} className="h-3 rounded-full" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm font-bold">
                          <span>طلاقة القراءة</span>
                          <span>{analysis.fluency}%</span>
                        </div>
                        <Progress value={analysis.fluency} className="h-3 rounded-full" />
                      </div>

                      <div className="bg-[hsl(40,33%,98%)] rounded-2xl p-5 border border-border space-y-3">
                        <div>
                          <p className="text-sm font-bold text-muted-foreground mb-1">الجملة الأصلية</p>
                          <p className="font-black text-foreground">{sentence}</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-muted-foreground mb-1">ما سمعه الذكاء الاصطناعي</p>
                          <p className="font-medium text-foreground">{latestAttempt?.transcription || "—"}</p>
                        </div>
                      </div>

                      {analysis.missingWords.length > 0 && (
                        <div className="rounded-2xl bg-red-50 border border-red-100 p-4">
                          <p className="font-bold text-red-700 mb-1">كلمات ناقصة:</p>
                          <p className="text-red-700 font-medium">{analysis.missingWords.join(" · ")}</p>
                        </div>
                      )}
                      {analysis.wrongWords.length > 0 && (
                        <div className="rounded-2xl bg-orange-50 border border-orange-100 p-4">
                          <p className="font-bold text-orange-700 mb-1">كلمات خاطئة:</p>
                          <p className="text-orange-700 font-medium">{analysis.wrongWords.join(" · ")}</p>
                        </div>
                      )}
                      {analysis.addedWords.length > 0 && (
                        <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
                          <p className="font-bold text-amber-700 mb-1">كلمات أضافها الطالب:</p>
                          <p className="text-amber-700 font-medium">{analysis.addedWords.join(" · ")}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge variant={status === "accepted" ? "default" : status === "rejected" ? "destructive" : "outline"} className="rounded-full font-bold text-base px-4 py-2">
                          {status === "accepted" ? "✅ تم قبول القراءة" : status === "rejected" ? "❌ تم رفض القراءة" : "⏳ بانتظار مراجعة المعلم"}
                        </Badge>
                        {pointsAwarded != null && (
                          <Badge variant="outline" className="rounded-full font-bold text-base px-4 py-2">+{pointsAwarded} نقطة</Badge>
                        )}
                      </div>

                      {audioObjectPath && (
                        <audio controls src={getStorageObjectUrl(audioObjectPath)} className="w-full" />
                      )}
                    </CardContent>
                  </Card>

                  <Button size="lg" className="w-full h-14 rounded-xl text-lg font-bold" onClick={handleRetry} disabled={countdown > 0 && (statusData?.remaining ?? 0) === 0}>
                    <RefreshCw className="w-5 h-5" />
                    {countdown > 0 && (statusData?.remaining ?? 0) === 0 ? `المحاولة القادمة بعد ${formatDuration(countdown)}` : "تدريب جديد"}
                  </Button>
                </motion.div>
              )}
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
