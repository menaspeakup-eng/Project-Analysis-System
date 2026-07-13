import { useState } from "react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Target, BookOpen, Loader2, Sparkles, AlertTriangle, User, Trash2, Send, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  useGetTeacherStorySubmissions,
  getGetTeacherStorySubmissionsQueryKey,
  useReviewTeacherStorySubmission,
  useDeleteTeacherStorySubmission,
  type TeacherStorySubmission,
  type StoryQuizAnswerResult,
  type ReviewStoryQuestionBody,
} from "@workspace/api-client-react";

const item = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

type AnswerState = {
  status: "accepted" | "rejected";
  points: number;
  note: string;
};

export default function TeacherAiStories() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useGetTeacherStorySubmissions();
  const { mutate: review, isPending: isReviewing } = useReviewTeacherStorySubmission();
  const { mutate: deleteSubmission, isPending: isDeleting } = useDeleteTeacherStorySubmission();

  const [feedback, setFeedback] = useState<Record<number, string>>({});
  const [answerStates, setAnswerStates] = useState<Record<number, Record<number, AnswerState>>>({});
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const submissions = data?.submissions ?? [];

  const getAnswerState = (submissionId: number, questionIndex: number, defaultPoints: number): AnswerState => {
    const states = answerStates[submissionId];
    if (states && states[questionIndex]) return states[questionIndex];
    const submission = submissions.find((s) => s.id === submissionId);
    const answer = submission?.answers?.[questionIndex] as StoryQuizAnswerResult | undefined;
    if (answer && answer.status && answer.status !== "pending") {
      return { status: answer.status, points: answer.points ?? defaultPoints, note: answer.note ?? "" };
    }
    return { status: answer?.isCorrect ? "accepted" : "rejected", points: defaultPoints, note: "" };
  };

  const setAnswerState = (submissionId: number, questionIndex: number, partial: Partial<AnswerState>) => {
    setAnswerStates((prev) => {
      const states = prev[submissionId] ?? {};
      const current = states[questionIndex] ?? { status: "accepted", points: 10, note: "" };
      return {
        ...prev,
        [submissionId]: {
          ...states,
          [questionIndex]: { ...current, ...partial },
        },
      };
    });
  };

  const handleReview = (submission: TeacherStorySubmission) => {
    const answers: ReviewStoryQuestionBody[] = (submission.answers ?? []).map((answer, idx) => {
      const state = getAnswerState(submission.id, idx, 10);
      return {
        questionIndex: idx,
        status: state.status,
        points: state.points,
        note: state.note,
      };
    });
    const status = answers.some((a) => a.status === "accepted") ? "accepted" : "rejected";
    const totalPoints = answers.reduce((sum, a) => sum + (a.status === "accepted" ? (a.points ?? 10) : 0), 0);

    review(
      { id: submission.id, data: { status, teacherFeedback: feedback[submission.id], answers } },
      {
        onSuccess: () => {
          toast({
            title: status === "accepted" ? "تم قبول الإجابات وإضافة النقاط" : "تم رفض الإجابات",
            description: status === "accepted" ? `تم إضافة ${totalPoints} نقطة للطالب` : undefined,
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

  const handleDelete = (submission: TeacherStorySubmission) => {
    setDeletingId(submission.id);
    deleteSubmission(
      { id: submission.id },
      {
        onSuccess: () => {
          toast({ title: "تم حذف الإجابة نهائياً" });
          queryClient.invalidateQueries({ queryKey: getGetTeacherStorySubmissionsQueryKey() });
          queryClient.invalidateQueries({ queryKey: ["/api/teacher/classes"] });
          queryClient.invalidateQueries({ queryKey: ["/api/student/me"] });
          setDeletingId(null);
        },
        onError: (err) => {
          toast({ title: "تعذر حذف الإجابة", description: err instanceof Error ? err.message : "", variant: "destructive" });
          setDeletingId(null);
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
          const totalPoints = isPending
            ? (submission.answers ?? []).reduce((sum, _, idx) => {
                const state = getAnswerState(submission.id, idx, 10);
                return sum + (state.status === "accepted" ? state.points : 0);
              }, 0)
            : (submission.pointsAwarded ?? 0);
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

                <CardContent className="space-y-5">
                  {(submission.answers ?? []).map((answer, idx) => {
                    const ans = answer as StoryQuizAnswerResult;
                    const state = getAnswerState(submission.id, idx, 10);
                    const isCorrect = ans.isCorrect;
                    const isQuestionPending = isPending || !ans.status;
                    return (
                      <div key={idx} className="rounded-2xl border border-border bg-[hsl(40,33%,98%)] p-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isCorrect ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>
                            {isCorrect ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 space-y-3">
                            <div>
                              <p className="font-bold text-foreground">{idx + 1}. {ans.question}</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Badge variant={isCorrect ? "default" : "destructive"} className="rounded-full font-medium text-xs">
                                  {isCorrect ? "إجابة صحيحة" : "إجابة خاطئة"}
                                </Badge>
                                {ans.status && (
                                  <Badge variant={ans.status === "accepted" ? "default" : "destructive"} className="rounded-full font-medium text-xs">
                                    {ans.status === "accepted" ? "مقبولة" : "مرفوضة"}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                              <div className={`rounded-xl px-3 py-2 border ${isCorrect ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"}`}>
                                <span className="font-bold">إجابة الطالب:</span> {ans.selectedAnswer}
                              </div>
                              <div className="rounded-xl px-3 py-2 border bg-emerald-50 border-emerald-200 text-emerald-800">
                                <span className="font-bold">إجابة الذكاء الاصطناعي:</span> {ans.correctAnswer}
                              </div>
                            </div>

                            {isQuestionPending && (
                              <div className="space-y-3 pt-2 border-t border-border/50">
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant={state.status === "accepted" ? "default" : "outline"}
                                    className="rounded-lg font-bold flex-1"
                                    onClick={() => setAnswerState(submission.id, idx, { status: "accepted" })}
                                  >
                                    <CheckCircle2 className="w-4 h-4 ml-1" />
                                    قبول
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={state.status === "rejected" ? "destructive" : "outline"}
                                    className="rounded-lg font-bold flex-1"
                                    onClick={() => setAnswerState(submission.id, idx, { status: "rejected" })}
                                  >
                                    <XCircle className="w-4 h-4 ml-1" />
                                    رفض
                                  </Button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <Label className="text-xs font-bold">النقاط لهذا السؤال</Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      max={100}
                                      value={state.points}
                                      onChange={(e) => setAnswerState(submission.id, idx, { points: Math.max(0, Number(e.target.value) || 0) })}
                                      className="rounded-lg h-10"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs font-bold">ملاحظة للطالب</Label>
                                    <Input
                                      value={state.note}
                                      onChange={(e) => setAnswerState(submission.id, idx, { note: e.target.value })}
                                      placeholder="ملاحظة اختيارية"
                                      className="rounded-lg h-10"
                                      maxLength={500}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {submission.teacherFeedback && (
                    <div className="rounded-2xl bg-secondary/15 p-4 border border-secondary/30 text-sm font-medium">
                      <span className="font-bold flex items-center gap-1"><MessageSquare className="w-4 h-4" /> ملاحظة المعلم:</span> {submission.teacherFeedback}
                    </div>
                  )}

                  {isPending ? (
                    <div className="space-y-3">
                      <Textarea
                        placeholder="ملاحظاتك العامة للطالب (اختياري)"
                        value={feedback[submission.id] ?? ""}
                        onChange={(e) => setFeedback((prev) => ({ ...prev, [submission.id]: e.target.value }))}
                        className="rounded-xl min-h-[80px]"
                        maxLength={500}
                      />
                      <div className="flex items-center justify-between rounded-xl bg-accent/10 p-4 border border-accent/20">
                        <div className="flex items-center gap-2 font-bold text-foreground">
                          <Target className="w-5 h-5 text-accent" />
                          مجموع النقاط المتوقع: {totalPoints} نقطة
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            className="rounded-xl font-bold h-11 border-destructive text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(submission)}
                            disabled={isDeleting && deletingId === submission.id}
                          >
                            {isDeleting && deletingId === submission.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            حذف
                          </Button>
                          <Button className="rounded-xl font-bold h-11" onClick={() => handleReview(submission)} disabled={isReviewing}>
                            {isReviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            حفظ التقييم
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        يمكنك قبول أو رفض كل سؤال على حدة، وتحديد النقاط لكل سؤال.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4 border border-border">
                      <div className="font-bold text-foreground">
                        النقاط الممنوحة: {submission.pointsAwarded ?? 0} نقطة
                      </div>
                      <Button
                        variant="outline"
                        className="rounded-xl font-bold h-11 border-destructive text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(submission)}
                        disabled={isDeleting && deletingId === submission.id}
                      >
                        {isDeleting && deletingId === submission.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        حذف الإجابة
                      </Button>
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
