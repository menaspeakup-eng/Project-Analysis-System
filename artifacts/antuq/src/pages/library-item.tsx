import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useGetLibraryItem, useCreateLibrarySubmission } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function LibraryItem() {
  const { isSignedIn, isLoaded } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const id = Number(params.id);
  const { data, isLoading } = useGetLibraryItem(id, { query: { enabled: isLoaded && isSignedIn && Number.isFinite(id) } as never });
  const submitMutation = useCreateLibrarySubmission();
  const queryClient = useQueryClient();
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, string>>({});
  const textRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});
  const [submitted, setSubmitted] = useState(!!data?.submission);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) setLocation("/");
  }, [isLoaded, isSignedIn, setLocation]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const item = data.item;
  const questions = item.questions || [];
  const existingSubmission = data.submission;
  const isComplete = submitted || !!existingSubmission;

  const handleSubmit = async () => {
    if (questions.length === 0) return;

    const missing = questions.filter((q) => {
      if (q.type === "mcq") return !mcqAnswers[q.id];
      return !(textRefs.current[q.id]?.value || "").trim();
    });
    if (missing.length > 0) {
      toast.error("يرجى الإجابة على جميع الأسئلة قبل الإرسال");
      return;
    }

    const payload = {
      libraryItemId: item.id,
      answers: questions.map((q) => ({
        questionId: q.id,
        selectedAnswer: String(q.type) === "mcq" ? mcqAnswers[q.id] || "" : undefined,
        textAnswer: String(q.type) === "text" ? (textRefs.current[q.id]?.value || "").trim() : undefined,
      })),
    };
    try {
      await submitMutation.mutateAsync({ data: payload });
      queryClient.invalidateQueries({ queryKey: ["/api/library/class"] });
      queryClient.invalidateQueries({ queryKey: ["/api/library/reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/library/items", { id: item.id }] });
      setSubmitted(true);
      toast.success("تم إرسال إجاباتك بنجاح");
    } catch (e: any) {
      const msg = e?.response?.data?.error || "حدث خطأ أثناء إرسال الإجابات";
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background p-4 md:p-8" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setLocation(`/library/${item.type}`)}>
            ← العودة
          </Button>
          <h1 className="text-2xl md:text-3xl font-black text-foreground">{item.title}</h1>
        </div>

        {item.coverUrl && (
          <img src={item.coverUrl} alt={item.title} className="w-full h-48 md:h-64 object-cover rounded-3xl" />
        )}

        {item.type === "read" && item.bodyText ? (
          <Card>
            <CardContent className="p-6 leading-loose text-lg font-medium text-foreground whitespace-pre-wrap">
              {item.bodyText}
            </CardContent>
          </Card>
        ) : item.type === "audio" && item.contentUrl ? (
          <Card>
            <CardContent className="p-6">
              <audio controls className="w-full" src={item.contentUrl}>
                المتصفح لا يدعم تشغيل الصوت.
              </audio>
            </CardContent>
          </Card>
        ) : item.type === "attachment" ? (
          <Card>
            <CardContent className="p-6 space-y-4">
              {item.contentUrl && (
                <a href={item.contentUrl} target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline">
                  فتح الملف المرفق
                </a>
              )}
              {item.externalUrl && (
                <a href={item.externalUrl} target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline block">
                  الرابط الخارجي
                </a>
              )}
            </CardContent>
          </Card>
        ) : null}

        {questions.length > 0 && !isComplete && !started && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-6 text-center space-y-4">
              <p className="font-black text-foreground text-lg">
                هل أنت جاهز؟ اختبر فهمك واحصل على {item.totalPoints ?? questions.reduce((s, q) => s + q.points, 0)} نقطة
              </p>
              <Button className="rounded-xl font-bold h-12 px-8" onClick={() => setStarted(true)}>
                اختبر نفسك واحصل على نقاط
              </Button>
            </CardContent>
          </Card>
        )}

        {questions.length > 0 && !isComplete && started && (
          <div className="space-y-4">
            <h2 className="font-black text-foreground text-xl">أسئلة الفهم</h2>
            {questions.map((q, idx) => (
              <Card key={q.id}>
                <CardContent className="p-5 space-y-4">
                  <p className="font-bold text-foreground">
                    {idx + 1}. {q.question} <span className="text-sm text-muted-foreground">({q.points} نقطة)</span>
                  </p>
                  {q.type === "mcq" ? (
                    <RadioGroup
                      value={mcqAnswers[q.id] || ""}
                      onValueChange={(value) => setMcqAnswers((prev) => ({ ...prev, [q.id]: value }))}
                    >
                      <div className="space-y-2">
                        {(q.options || []).map((opt, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <RadioGroupItem value={opt} id={`q${q.id}-opt${i}`} />
                            <Label htmlFor={`q${q.id}-opt${i}`}>{opt}</Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  ) : (
                    <Textarea
                      placeholder="اكتب إجابتك هنا..."
                      ref={(el) => { textRefs.current[q.id] = el; }}
                      defaultValue=""
                      className="min-h-[120px]"
                    />
                  )}
                </CardContent>
              </Card>
            ))}
            <Button
              className="w-full rounded-xl font-bold h-12"
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? "جاري الإرسال..." : "إرسال الإجابات و الحصول على النقاط"}
            </Button>
          </div>
        )}

        {isComplete && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6 text-center space-y-2">
              <p className="font-black text-green-700 text-lg">تم إرسال إجاباتك!</p>
              <p className="text-green-600 font-medium">
                {(existingSubmission?.score ?? 0) > 0
                  ? `حصلت على ${existingSubmission?.score} من ${existingSubmission?.maxScore} نقطة`
                  : "سيقوم المعلم بمراجعة إجاباتك المفتوحة قريباً."}
              </p>
              <Button className="mt-4 rounded-xl font-bold" onClick={() => setLocation(`/library/${item.type}`)}>
                العودة للقائمة
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
