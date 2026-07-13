import { useState } from "react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Target, BookOpen, Loader2, Sparkles, AlertTriangle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  useGetTeacherStorySubmissions,
  getGetTeacherStorySubmissionsQueryKey,
  useReviewTeacherStorySubmission,
  type TeacherStorySubmission,
} from "@workspace/api-client-react";

const item = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function TeacherAiStories() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useGetTeacherStorySubmissions();
  const { mutate: review } = useReviewTeacherStorySubmission();

  const [feedback, setFeedback] = useState<Record<number, string>>({});

  const submissions = data?.submissions ?? [];

  const handleReview = (submission: TeacherStorySubmission, status: "accepted" | "rejected") => {
    review(
      { id: submission.id, data: { status, teacherFeedback: feedback[submission.id] } },
      {
        onSuccess: () => {
          toast({
            title: status === "accepted" ? "تم قبول الإجابات وإضافة النقاط" : "تم رفض الإجابات",
            description: status === "accepted" ? `تم إضافة ${submission.score * 10} نقطة للطالب` : undefined,
          });
          queryClient.invalidateQueries({ queryKey: getGetTeacherStorySubmissionsQueryKey() });
          queryClient.invalidateQueries({ queryKey: ["/api/teacher/classes"] });
          queryClient.invalidateQueries({ queryKey: ["/api/student/me"] });
        },
        onError: (err) => {
          toast({ title: "تعذر حفظ التقييم", description: err instanceof Error ? err.message : "", variant: "destructive" });
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <Card className="rounded-3xl border-border shadow-sm">
        <CardContent className="p-8 text-center text-muted-foreground font-medium">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
          لا توجد إجابات على قصص ذكية حالياً.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-[hsl(265,60%,45%)]" />
        <h2 className="font-black text-lg text-foreground">إجابات قصصي الذكية</h2>
      </div>

      <div className="grid grid-cols-1 gap-5">
        {submissions.map((submission) => {
          const status = submission.status;
          const isPending = status === "pending";
          return (
            <motion.div key={submission.id} variants={item} initial="initial" animate="animate">
              <Card className={`rounded-3xl border-border shadow-sm overflow-hidden ${isPending ? "bg-white" : "bg-muted/30"}`}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-black">{submission.student?.name ?? "طالب"}</CardTitle>
                        <p className="text-sm text-muted-foreground font-medium">
                          {submission.session?.title ?? "قصة ذكية"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={status === "accepted" ? "default" : status === "rejected" ? "destructive" : "outline"} className="rounded-full font-bold">
                        {status === "accepted" ? "مقبول" : status === "rejected" ? "مرفوض" : "بانتظار المراجعة"}
                      </Badge>
                      <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-black">
                        {submission.score}/{submission.maxScore}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {submission.answers?.map((answer, idx) => (
                    <div key={idx} className="rounded-2xl border border-border bg-[hsl(40,33%,98%)] p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${answer.isCorrect ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>
                          {answer.isCorrect ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 space-y-2">
                          <p className="font-bold text-foreground">{answer.question}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            <div className={`rounded-xl px-3 py-2 border ${answer.isCorrect ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"}`}>
                              <span className="font-bold">إجابة الطالب:</span> {answer.selectedAnswer}
                            </div>
                            <div className="rounded-xl px-3 py-2 border bg-emerald-50 border-emerald-200 text-emerald-800">
                              <span className="font-bold">الإجابة الصحيحة:</span> {answer.correctAnswer}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {submission.teacherFeedback && (
                    <div className="rounded-2xl bg-secondary/15 p-4 border border-secondary/30 text-sm font-medium">
                      <span className="font-bold">ملاحظة المعلم:</span> {submission.teacherFeedback}
                    </div>
                  )}

                  {isPending && (
                    <div className="space-y-3">
                      <Textarea
                        placeholder="ملاحظاتك للطالب (اختياري)"
                        value={feedback[submission.id] ?? ""}
                        onChange={(e) => setFeedback((prev) => ({ ...prev, [submission.id]: e.target.value }))}
                        className="rounded-xl min-h-[80px]"
                        maxLength={500}
                      />
                      <div className="flex items-center gap-2">
                        <Button className="rounded-xl font-bold h-11 flex-1" onClick={() => handleReview(submission, "accepted")}>
                          <CheckCircle2 className="w-4 h-4 ml-2" />
                          قبول وإضافة {submission.score * 10} نقطة
                        </Button>
                        <Button variant="outline" className="rounded-xl font-bold h-11 flex-1 border-destructive text-destructive hover:bg-destructive/10" onClick={() => handleReview(submission, "rejected")}>
                          <XCircle className="w-4 h-4 ml-2" />
                          رفض
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        يتم منح 10 نقاط لكل إجابة صحيحة عند القبول.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
