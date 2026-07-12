import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetTeacherChallenges,
  useCreateTeacherChallenge,
  useDeleteTeacherChallenge,
  useGetTeacherChallengeSubmissions,
  useReviewTeacherSubmission,
} from "@workspace/api-client-react";
import type { TeacherClass, TeacherChallenge } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Flame, Plus, Trash2, Eye, Check, X, Clock } from "lucide-react";

interface TeacherChallengesProps {
  teacherIdParam?: number;
  classes: TeacherClass[];
}

const SUBMISSION_TYPES = [
  { value: "text", label: "نص" },
  { value: "audio", label: "تسجيل صوتي" },
  { value: "image", label: "صورة" },
  { value: "file", label: "ملف" },
  { value: "mixed", label: "نص + ملفات" },
];

const STATUS_LABELS: Record<string, string> = {
  not_started: "لم يبدأ",
  pending: "قيد المراجعة",
  accepted: "مقبول",
  rejected: "مرفوض",
};

const STATUS_COLORS: Record<string, string> = {
  not_started: "bg-muted text-muted-foreground",
  pending: "bg-[hsl(45,90%,55%)] text-white",
  accepted: "bg-[hsl(150,55%,45%)] text-white",
  rejected: "bg-destructive text-white",
};

export default function TeacherChallenges({ teacherIdParam, classes }: TeacherChallengesProps) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"list" | "create">("list");
  const [selectedChallenge, setSelectedChallenge] = useState<TeacherChallenge | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<Record<number, string>>({});
  const [form, setForm] = useState({
    classId: classes[0]?.id ? String(classes[0].id) : "",
    title: "",
    description: "",
    instructions: "",
    linkUrl: "",
    pointsReward: 20,
    submissionType: "text",
  });

  const params = teacherIdParam ? { teacherId: teacherIdParam } : undefined;
  const { data, isLoading } = useGetTeacherChallenges(params, {
    query: { enabled: true } as never,
  });
  const { data: submissionsData } = useGetTeacherChallengeSubmissions(
    selectedChallenge?.id ?? 0,
    params,
    { query: { enabled: !!selectedChallenge } as never },
  );

  const { mutate: create, isPending: isCreating } = useCreateTeacherChallenge();
  const { mutate: deleteChallenge } = useDeleteTeacherChallenge();
  const { mutate: review } = useReviewTeacherSubmission();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/teacher/challenges"] });
    queryClient.invalidateQueries({ queryKey: ["/api/teacher/challenges/"] });
  };

  const handleCreate = () => {
    if (!form.classId || !form.title.trim() || !form.description.trim()) return;
    create(
      {
        data: {
          classId: Number(form.classId),
          title: form.title.trim(),
          description: form.description.trim(),
          instructions: form.instructions.trim() || undefined,
          linkUrl: form.linkUrl.trim() || undefined,
          pointsReward: Number(form.pointsReward),
          submissionType: form.submissionType as any,
        },
        params,
      },
      {
        onSuccess: () => {
          setForm({
            classId: classes[0]?.id ? String(classes[0].id) : "",
            title: "",
            description: "",
            instructions: "",
            linkUrl: "",
            pointsReward: 20,
            submissionType: "text",
          });
          setView("list");
          invalidate();
        },
      },
    );
  };

  const handleDelete = (id: number, title: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف التحدي "${title}"؟`)) return;
    deleteChallenge({ id, params }, { onSuccess: invalidate });
  };

  const handleReview = (submissionId: number, status: "accepted" | "rejected") => {
    review(
      {
        id: submissionId,
        data: {
          status,
          feedback: feedbackMap[submissionId] || undefined,
        },
        params,
      },
      {
        onSuccess: () => {
          if (selectedChallenge) {
            queryClient.invalidateQueries({
              queryKey: [`/api/teacher/challenges/${selectedChallenge.id}/submissions`],
            });
          }
          invalidate();
        },
      },
    );
  };

  const challenges = data?.challenges ?? [];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-black text-foreground text-lg flex items-center gap-2">
          <Flame className="w-5 h-5 text-accent" />
          التحديات اليومية
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant={view === "list" ? "default" : "outline"}
            className="rounded-xl font-bold h-9"
            onClick={() => setView("list")}
          >
            <Eye className="w-4 h-4 ml-1" />
            التحديات
          </Button>
          <Button
            variant={view === "create" ? "default" : "outline"}
            className="rounded-xl font-bold h-9"
            onClick={() => setView("create")}
          >
            <Plus className="w-4 h-4 ml-1" />
            إنشاء تحدي
          </Button>
        </div>
      </div>

      {view === "create" ? (
        <Card className="rounded-3xl border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-black">إنشاء تحدي جديد</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold">الصف</Label>
                <Select
                  value={form.classId}
                  onValueChange={(v) => setForm((f) => ({ ...f, classId: v }))}
                >
                  <SelectTrigger className="rounded-xl border-border bg-[hsl(40,33%,98%)]">
                    <SelectValue placeholder="اختر صفاً" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={String(cls.id)}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-bold">نوع الإجابة المطلوبة</Label>
                <Select
                  value={form.submissionType}
                  onValueChange={(v) => setForm((f) => ({ ...f, submissionType: v }))}
                >
                  <SelectTrigger className="rounded-xl border-border bg-[hsl(40,33%,98%)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {SUBMISSION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-bold">عنوان التحدي</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="مثال: اقرأ الكلمة التالية وسجلها بصوتك"
                className="rounded-xl border-border"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold">وصف التحدي</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="شرح موجز للطلاب..."
                className="rounded-xl border-border min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold">تعليمات إضافية (اختياري)</Label>
              <Textarea
                value={form.instructions}
                onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
                placeholder="خطوات التنفيذ، ملاحظات، أو أي تعليمات إضافية..."
                className="rounded-xl border-border min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold">رابط (اختياري)</Label>
                <Input
                  value={form.linkUrl}
                  onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))}
                  placeholder="https://..."
                  className="rounded-xl border-border"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">عدد النقاط</Label>
                <Input
                  type="number"
                  value={form.pointsReward}
                  onChange={(e) => setForm((f) => ({ ...f, pointsReward: Number(e.target.value) }))}
                  className="rounded-xl border-border"
                  min={0}
                  max={1000}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                className="rounded-xl font-bold h-10"
                onClick={handleCreate}
                disabled={isCreating || !form.classId || !form.title.trim() || !form.description.trim()}
              >
                {isCreating ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
                ) : (
                  <Plus className="w-4 h-4 ml-2" />
                )}
                نشر التحدي
              </Button>
              <Button
                variant="outline"
                className="rounded-xl font-bold h-10"
                onClick={() => setView("list")}
              >
                إلغاء
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="h-24 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      ) : challenges.length === 0 ? (
        <Card className="rounded-3xl border-border shadow-sm">
          <CardContent className="p-6 text-center text-muted-foreground font-medium">
            لا يوجد تحديات بعد — ابدأ بإنشاء تحدي جديد.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {challenges.map((c) => (
            <Card key={c.id} className="rounded-3xl border-border shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base font-black truncate">{c.title}</CardTitle>
                    <p className="text-sm text-muted-foreground font-medium mt-1">
                      {c.className} · {SUBMISSION_TYPES.find((t) => t.value === c.submissionType)?.label}
                    </p>
                  </div>
                  <Badge className={`rounded-full font-bold ${c.isExpired ? "bg-muted text-muted-foreground" : "bg-accent text-white"}`}>
                    <Clock className="w-3 h-3 ml-1" />
                    {c.isExpired ? "منتهٍ" : "نشط"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground font-medium line-clamp-2">
                  {c.description}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="rounded-full font-bold border-border">
                    {c.pointsReward} نقطة
                  </Badge>
                  <Badge className="rounded-full font-bold bg-[hsl(45,90%,55%)] text-white">
                    {c.counts.pending} قيد المراجعة
                  </Badge>
                  <Badge className="rounded-full font-bold bg-[hsl(150,55%,45%)] text-white">
                    {c.counts.accepted} مقبول
                  </Badge>
                  <Badge className="rounded-full font-bold bg-destructive text-white">
                    {c.counts.rejected} مرفوض
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    className="rounded-xl font-bold h-9 flex-1"
                    onClick={() => setSelectedChallenge(c)}
                  >
                    <Eye className="w-4 h-4 ml-1" />
                    عرض الإجابات
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl h-9 font-bold text-destructive hover:bg-destructive/10 border-border"
                    onClick={() => handleDelete(c.id, c.title)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedChallenge && (
        <Dialog open onOpenChange={(open) => { if (!open) setSelectedChallenge(null); }}>
          <DialogContent className="sm:max-w-3xl rounded-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader className="text-right">
              <DialogTitle className="text-xl font-black flex items-center gap-2">
                <Flame className="w-6 h-6 text-accent" />
                إجابات: {selectedChallenge.title}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {submissionsData?.submissions && submissionsData.submissions.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-bold">الطالب</TableHead>
                        <TableHead className="font-bold">الحالة</TableHead>
                        <TableHead className="font-bold">الإجابة</TableHead>
                        <TableHead className="font-bold text-left">مراجعة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {submissionsData.submissions.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-bold">{s.studentName}</TableCell>
                          <TableCell>
                            <Badge className={`rounded-full font-bold ${STATUS_COLORS[s.status]}`}>
                              {STATUS_LABELS[s.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2 max-w-xs">
                              {s.submissionText && (
                                <p className="text-sm text-muted-foreground font-medium line-clamp-3">
                                  {s.submissionText}
                                </p>
                              )}
                              {s.submissionFiles && s.submissionFiles.length > 0 && (
                                <div className="flex flex-col gap-1">
                                  {s.submissionFiles.map((file, idx) => (
                                    <a
                                      key={idx}
                                      href={file.data}
                                      download={file.name}
                                      className="text-sm text-primary font-bold underline truncate"
                                      dir="ltr"
                                    >
                                      {file.name}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {s.status === "accepted" ? (
                              <span className="text-sm font-bold text-[hsl(150,55%,45%)]">
                                +{s.pointsAwarded} نقطة
                              </span>
                            ) : (
                              <div className="space-y-2">
                                <Textarea
                                  value={feedbackMap[s.id] ?? ""}
                                  onChange={(e) =>
                                    setFeedbackMap((prev) => ({ ...prev, [s.id]: e.target.value }))
                                  }
                                  placeholder="ملاحظة (اختياري)"
                                  className="h-16 rounded-xl border-border text-sm"
                                />
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    className="rounded-xl h-8 font-bold bg-[hsl(150,55%,45%)] hover:bg-[hsl(150,55%,40%)]"
                                    onClick={() => handleReview(s.id, "accepted")}
                                  >
                                    <Check className="w-4 h-4 ml-1" />
                                    قبول
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="rounded-xl h-8 font-bold text-destructive hover:bg-destructive/10 border-border"
                                    onClick={() => handleReview(s.id, "rejected")}
                                  >
                                    <X className="w-4 h-4 ml-1" />
                                    رفض
                                  </Button>
                                </div>
                                {s.teacherFeedback && (
                                  <p className="text-xs text-muted-foreground font-medium">
                                    ملاحظة سابقة: {s.teacherFeedback}
                                  </p>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground font-medium py-8">
                  لا توجد إجابات مرسلة لهذا التحدي بعد.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
