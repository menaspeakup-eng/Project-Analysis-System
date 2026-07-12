import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetStudentChallenges,
  useSubmitStudentChallenge,
} from "@workspace/api-client-react";
import type { StudentChallenge } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
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
import { Flame, Play, Check, X, Clock, Upload, Paperclip, Star } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  not_started: "لم يبدأ",
  pending: "بانتظار المراجعة",
  accepted: "تم قبوله",
  rejected: "مرفوض",
};

const STATUS_COLORS: Record<string, string> = {
  not_started: "bg-muted text-muted-foreground",
  pending: "bg-[hsl(45,90%,55%)] text-white",
  accepted: "bg-[hsl(150,55%,45%)] text-white",
  rejected: "bg-destructive text-white",
};

const SUBMISSION_TYPE_LABELS: Record<string, string> = {
  text: "نص",
  audio: "تسجيل صوتي",
  image: "صورة",
  file: "ملف",
  mixed: "نص + ملفات",
};

interface SubmissionFile {
  name: string;
  type: string;
  data: string;
}

function readFileAsBase64(file: File): Promise<SubmissionFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as string;
      resolve({ name: file.name, type: file.type, data });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatRemainingTime(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "انتهى الوقت";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours} ساعة ${minutes} دقيقة`;
  return `${minutes} دقيقة`;
}

export default function StudentChallenges() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<StudentChallenge | null>(null);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<SubmissionFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useGetStudentChallenges({
    query: { enabled: true } as never,
  });
  const { mutate: submit, isPending: isSubmitting } = useSubmitStudentChallenge();

  const challenges = data?.challenges ?? [];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;
    setIsUploading(true);
    try {
      const newFiles: SubmissionFile[] = [];
      for (const file of Array.from(selectedFiles)) {
        const base64 = await readFileAsBase64(file);
        newFiles.push(base64);
      }
      setFiles((prev) => [...prev, ...newFiles].slice(0, 5));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    if (!selected) return;
    const trimmedText = text.trim();
    if (!trimmedText && files.length === 0) return;

    submit(
      {
        id: selected.id,
        data: {
          submissionText: trimmedText || undefined,
          submissionFiles: files.length > 0 ? files : undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/student/challenges"] });
          queryClient.invalidateQueries({ queryKey: ["/api/student/me"] });
          queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
          setText("");
          setFiles([]);
          setSelected(null);
        },
      },
    );
  };

  const openChallenge = (c: StudentChallenge) => {
    setSelected(c);
    setText(c.submissionText ?? "");
    setFiles(c.submissionFiles ?? []);
  };

  return (
    <section className="bg-gradient-to-l from-accent/10 to-primary/10 rounded-3xl border border-accent/20 p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-accent text-white flex items-center justify-center shrink-0">
          <Flame className="w-6 h-6" />
        </div>
        <h3 className="font-black text-foreground text-lg">التحديات اليومية</h3>
      </div>

      {isLoading ? (
        <div className="h-16 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      ) : challenges.length === 0 ? (
        <p className="text-muted-foreground font-medium text-sm">
          لا يوجد تحديات نشطة حالياً — عد غداً لتحدٍ جديد.
        </p>
      ) : (
        <div className="space-y-3">
          {challenges.map((c) => (
            <Card
              key={c.id}
              className="rounded-2xl border-border bg-white/80 shadow-sm"
            >
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-foreground">{c.title}</h4>
                      <Badge className={`rounded-full font-bold ${STATUS_COLORS[c.status]}`}>
                        {STATUS_LABELS[c.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground font-medium mt-1 line-clamp-1">
                      {c.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs font-bold text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-secondary text-secondary" />
                        {c.pointsReward} نقطة
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        ينتهي خلال {formatRemainingTime(c.expiresAt)}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="rounded-xl font-bold h-9"
                    onClick={() => openChallenge(c)}
                    disabled={c.status === "accepted"}
                  >
                    {c.status === "accepted" ? (
                      <>
                        <Check className="w-4 h-4 ml-1" /> تم
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 ml-1" /> ابدأ
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selected && (
        <Dialog open onOpenChange={(open) => { if (!open) setSelected(null); }}>
          <DialogContent className="sm:max-w-2xl rounded-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader className="text-right">
              <DialogTitle className="text-xl font-black flex items-center gap-2">
                <Flame className="w-6 h-6 text-accent" />
                {selected.title}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <p className="text-muted-foreground font-medium">{selected.description}</p>

              {selected.instructions && (
                <div className="bg-muted/30 rounded-2xl p-4">
                  <p className="font-bold text-sm mb-1">تعليمات:</p>
                  <p className="text-sm text-muted-foreground font-medium whitespace-pre-wrap">
                    {selected.instructions}
                  </p>
                </div>
              )}

              {selected.linkUrl && (
                <a
                  href={selected.linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-primary font-bold underline break-all"
                  dir="ltr"
                >
                  {selected.linkUrl}
                </a>
              )}

              <div className="flex items-center gap-3 text-sm font-bold text-muted-foreground">
                <Badge variant="outline" className="rounded-full font-bold border-border">
                  {SUBMISSION_TYPE_LABELS[selected.submissionType]}
                </Badge>
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-secondary text-secondary" />
                  {selected.pointsReward} نقطة
                </span>
              </div>

              {selected.status === "rejected" && selected.teacherFeedback && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4">
                  <p className="font-bold text-destructive text-sm flex items-center gap-1">
                    <X className="w-4 h-4" />
                    ملاحظة المعلم:
                  </p>
                  <p className="text-sm text-muted-foreground font-medium mt-1">
                    {selected.teacherFeedback}
                  </p>
                </div>
              )}

              {selected.status === "accepted" ? (
                <div className="bg-[hsl(150,55%,95%)] border border-[hsl(150,55%,45%)]/20 rounded-2xl p-4 text-center">
                  <p className="font-bold text-[hsl(150,55%,45%)] flex items-center justify-center gap-2">
                    <Check className="w-5 h-5" />
                    تم قبول التحدي! حصلت على {selected.pointsReward} نقطة.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-bold">إجابتك</Label>
                    <Textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="اكتب إجابتك هنا..."
                      className="rounded-xl border-border min-h-[100px]"
                      disabled={selected.status === "pending"}
                    />
                  </div>

                  {selected.status !== "pending" && (
                    <div className="space-y-2">
                      <Label className="font-bold">ملفات أو تسجيلات</Label>
                      <div className="flex flex-wrap gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept="image/*,audio/*,video/*,.pdf,.doc,.docx"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl h-10 font-bold border-border"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading || files.length >= 5}
                        >
                          <Upload className="w-4 h-4 ml-1" />
                          {isUploading ? "جاري الرفع..." : "إرفاق ملف"}
                        </Button>
                      </div>

                      {files.length > 0 && (
                        <div className="space-y-2">
                          {files.map((file, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-3 bg-muted/30 rounded-xl p-2"
                            >
                              <Paperclip className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-medium flex-1 truncate">{file.name}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-destructive font-bold"
                                onClick={() => handleRemoveFile(idx)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {selected.status === "pending" ? (
                    <p className="text-sm font-bold text-muted-foreground text-center">
                      الإجابة مرسلة بانتظار مراجعة المعلم.
                    </p>
                  ) : (
                    <Button
                      className="w-full rounded-xl font-bold h-11"
                      onClick={handleSubmit}
                      disabled={isSubmitting || isUploading || (!text.trim() && files.length === 0)}
                    >
                      {isSubmitting ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
                      ) : null}
                      إرسال التحدي
                    </Button>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
