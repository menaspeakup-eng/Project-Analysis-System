import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetTeacherReadingCoachAttempts,
  getGetTeacherReadingCoachAttemptsQueryKey,
  useReviewReadingCoachAttempt,
  useAllowStudentReadingCoach,
  type TeacherReadingCoachAttempt,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Headphones,
  Check,
  X,
  Plus,
  Loader2,
  Trophy,
  Target,
  Clock,
  Mic,
  AlertTriangle,
} from "lucide-react";

function getAudioDataUrl(base64: string, contentType: string): string {
  return `data:${contentType || "audio/webm"};base64,${base64}`;
}

function formatDate(dateStr: string | Date): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
}

function formatTime(dateStr: string | Date): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
}

export default function TeacherReadingCoach() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useGetTeacherReadingCoachAttempts({
    query: { queryKey: getGetTeacherReadingCoachAttemptsQueryKey() },
  });
  const { mutate: review, isPending: isReviewing } = useReviewReadingCoachAttempt();
  const { mutate: allow, isPending: isAllowing } = useAllowStudentReadingCoach();
  const [selected, setSelected] = useState<TeacherReadingCoachAttempt | null>(null);
  const [points, setPoints] = useState(20);
  const [feedback, setFeedback] = useState("");
  const [allowingId, setAllowingId] = useState<number | null>(null);

  const attempts = data?.attempts ?? [];

  const handleReview = (attempt: TeacherReadingCoachAttempt, status: "accepted" | "rejected") => {
    review(
      { id: attempt.id, data: { status, points: status === "accepted" ? points : 0, teacherFeedback: feedback || undefined } },
      {
        onSuccess: () => {
          toast({ title: status === "accepted" ? "تم قبول القراءة" : "تم رفض القراءة" });
          setSelected(null);
          setFeedback("");
          setPoints(20);
          queryClient.invalidateQueries({ queryKey: getGetTeacherReadingCoachAttemptsQueryKey() });
        },
        onError: () => {
          toast({ title: "تعذر إكمال التقييم", variant: "destructive" });
        },
      },
    );
  };

  const handleAllow = (studentId: number) => {
    setAllowingId(studentId);
    allow(
      { id: studentId },
      {
        onSuccess: () => {
          toast({ title: "تم السماح بمحاولة إضافية" });
          setAllowingId(null);
          refetch();
        },
        onError: () => {
          toast({ title: "تعذر السماح بالمحاولة", variant: "destructive" });
          setAllowingId(null);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="h-40 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Mic className="w-6 h-6 text-primary" />
        <h2 className="font-black text-foreground text-lg">تدريبات القراءة الذكية</h2>
      </div>

      {attempts.length === 0 ? (
        <Card className="rounded-3xl border-border shadow-sm">
          <CardContent className="p-8 text-center text-muted-foreground font-medium">
            لا توجد تدريبات قراءة للمراجعة بعد.
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-3xl border-border shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border bg-[hsl(40,33%,98%)]">
                    <TableHead className="font-bold text-right">الطالب</TableHead>
                    <TableHead className="font-bold text-right">الصف</TableHead>
                    <TableHead className="font-bold text-right">التاريخ</TableHead>
                    <TableHead className="font-bold text-right">النتيجة</TableHead>
                    <TableHead className="font-bold text-right">الحالة</TableHead>
                    <TableHead className="font-bold text-right">التفاصيل</TableHead>
                    <TableHead className="font-bold text-right">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attempts.map((attempt) => (
                    <TableRow key={attempt.id} className="border-border">
                      <TableCell className="font-bold text-foreground">{attempt.student?.name || "—"}</TableCell>
                      <TableCell className="font-medium text-muted-foreground">{attempt.class?.name || "—"}</TableCell>
                      <TableCell className="font-medium text-muted-foreground">
                        {formatDate(attempt.createdAt)}
                        <br />
                        <span className="text-xs">{formatTime(attempt.createdAt)}</span>
                      </TableCell>
                      <TableCell className="font-bold text-foreground">
                        <div className="flex items-center gap-1">
                          <Trophy className="w-4 h-4 text-accent" />
                          {attempt.score}%
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            attempt.status === "accepted"
                              ? "default"
                              : attempt.status === "rejected"
                                ? "destructive"
                                : "outline"
                          }
                          className="rounded-full font-bold"
                        >
                          {attempt.status === "accepted" ? "مقبول" : attempt.status === "rejected" ? "مرفوض" : "معلق"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="rounded-xl font-bold" onClick={() => setSelected(attempt)}>
                              <Target className="w-4 h-4 ml-1" />
                              عرض
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
                            <DialogHeader>
                              <DialogTitle className="font-black text-lg flex items-center gap-2">
                                <Headphones className="w-5 h-5 text-primary" />
                                تفاصيل تدريب القراءة
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 mt-2">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div>
                                  <p className="font-bold text-foreground">{attempt.student?.name}</p>
                                  <p className="text-sm text-muted-foreground">{attempt.class?.name}</p>
                                </div>
                                <div className="text-left">
                                  <p className="text-sm text-muted-foreground">{formatDate(attempt.createdAt)}</p>
                                  <p className="text-sm text-muted-foreground">{formatTime(attempt.createdAt)}</p>
                                </div>
                              </div>

                              <div className="bg-[hsl(40,33%,98%)] rounded-2xl p-4 border border-border">
                                <p className="text-sm font-bold text-muted-foreground mb-1">الجملة</p>
                                <p className="font-black text-foreground text-lg font-reading">{attempt.sentence}</p>
                              </div>

                              <div className="bg-[hsl(40,33%,98%)] rounded-2xl p-4 border border-border">
                                <p className="text-sm font-bold text-muted-foreground mb-1">ما سمعه الذكاء الاصطناعي</p>
                                <p className="font-medium text-foreground font-reading">{attempt.transcription || "—"}</p>
                              </div>

                              {attempt.audioBase64 && attempt.audioBase64.length > 0 && (
                                <div>
                                  <p className="text-sm font-bold text-muted-foreground mb-1">التسجيل الصوتي</p>
                                  <audio controls src={getAudioDataUrl(attempt.audioBase64, "audio/webm")} className="w-full" />
                                </div>
                              )}

                              {attempt.analysis && (
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <Target className="w-5 h-5 text-primary" />
                                    <span className="font-bold">الدقة: {attempt.analysis.accuracy}%</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-primary" />
                                    <span className="font-bold">الطلاقة: {attempt.analysis.fluency}%</span>
                                  </div>
                                  <div className="rounded-2xl bg-primary/10 p-4 border border-primary/20">
                                    <p className="font-bold text-foreground">{attempt.analysis.summary}</p>
                                    <p className="text-muted-foreground font-medium mt-1">{attempt.analysis.tips}</p>
                                  </div>
                                  {attempt.analysis.missingWords.length > 0 && (
                                    <p className="text-sm text-red-600 font-medium">
                                      <span className="font-bold">ناقص:</span> {attempt.analysis.missingWords.join(" · ")}
                                    </p>
                                  )}
                                  {attempt.analysis.wrongWords.length > 0 && (
                                    <p className="text-sm text-orange-600 font-medium">
                                      <span className="font-bold">خاطئ:</span> {attempt.analysis.wrongWords.join(" · ")}
                                    </p>
                                  )}
                                  {attempt.analysis.addedWords.length > 0 && (
                                    <p className="text-sm text-amber-600 font-medium">
                                      <span className="font-bold">إضافي:</span> {attempt.analysis.addedWords.join(" · ")}
                                    </p>
                                  )}
                                </div>
                              )}

                              {attempt.status === "pending" && (
                                <div className="space-y-3 pt-2">
                                  <div className="flex items-center gap-2">
                                    <Trophy className="w-4 h-4 text-accent" />
                                    <label className="font-bold text-sm">النقاط:</label>
                                    <Input
                                      type="number"
                                      value={points}
                                      onChange={(e) => setPoints(Math.max(0, Number(e.target.value)))}
                                      className="w-24 rounded-xl"
                                      min={0}
                                      max={100}
                                    />
                                  </div>
                                  <Textarea
                                    placeholder="ملاحظات المعلم (اختياري)"
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    className="rounded-xl min-h-[80px]"
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      className="flex-1 rounded-xl font-bold"
                                      onClick={() => handleReview(attempt, "accepted")}
                                      disabled={isReviewing}
                                    >
                                      <Check className="w-4 h-4 ml-1" />
                                      قبول ومنح {points} نقطة
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      className="flex-1 rounded-xl font-bold"
                                      onClick={() => handleReview(attempt, "rejected")}
                                      disabled={isReviewing}
                                    >
                                      <X className="w-4 h-4 ml-1" />
                                      رفض
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                      <TableCell>
                        {attempt.status === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="rounded-xl font-bold"
                              onClick={() => {
                                setSelected(attempt);
                                handleReview(attempt, "accepted");
                              }}
                              disabled={isReviewing}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="rounded-xl font-bold"
                              onClick={() => {
                                setSelected(attempt);
                                handleReview(attempt, "rejected");
                              }}
                              disabled={isReviewing}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
