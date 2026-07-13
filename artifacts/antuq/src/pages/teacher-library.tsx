import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useListLibraryItems,
  useUpsertLibraryItem,
  useDeleteLibraryItem,
  useGetTeacherClasses,
} from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
import { BookOpen, Headphones, Paperclip, Plus, Trash2, X, Edit, ArrowRight, Star, Check } from "lucide-react";
import { toast } from "sonner";

const typeLabels: Record<string, string> = {
  read: "قراءة",
  audio: "مسموع",
  attachment: "ملحق",
};

interface QuestionDraft {
  id?: number;
  type: "mcq" | "text";
  question: string;
  options: string[];
  correctAnswer: string;
  points: number;
  sortOrder: number;
}

const emptyItem = {
  id: undefined as number | undefined,
  classId: 0,
  type: "read" as "read" | "audio" | "attachment",
  title: "",
  description: "",
  coverObjectPath: "",
  contentObjectPath: "",
  bodyText: "",
  externalUrl: "",
  isPublished: false,
  questions: [] as QuestionDraft[],
};

export default function TeacherLibrary() {
  const { isSignedIn, isLoaded } = useAuth();
  const [, setLocation] = useLocation();
  const { data: classesData } = useGetTeacherClasses(undefined, { query: { enabled: isLoaded && isSignedIn } as never });
  const [activeType, setActiveType] = useState("read");
  const { data, isLoading, refetch } = useListLibraryItems({ type: activeType }, { query: { enabled: isLoaded && isSignedIn } as never });
  const upsert = useUpsertLibraryItem();
  const remove = useDeleteLibraryItem();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyItem);
  const [coverUploading, setCoverUploading] = useState(false);
  const [contentUploading, setContentUploading] = useState(false);
  const coverUpload = useUpload({ onSuccess: (res) => setForm((f) => ({ ...f, coverObjectPath: res.objectPath })) });
  const contentUpload = useUpload({ onSuccess: (res) => setForm((f) => ({ ...f, contentObjectPath: res.objectPath })) });

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) setLocation("/");
  }, [isLoaded, isSignedIn, setLocation]);

  const classes = classesData?.classes ?? [];

  const openCreate = (type: string) => {
    setForm({ ...emptyItem, type: type as typeof emptyItem.type, classId: classes[0]?.id || 0 });
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setForm({
      id: item.id,
      classId: item.classId,
      type: item.type,
      title: item.title,
      description: item.description,
      coverObjectPath: item.coverObjectPath || "",
      contentObjectPath: item.contentObjectPath || "",
      bodyText: item.bodyText || "",
      externalUrl: item.externalUrl || "",
      isPublished: item.isPublished,
      questions: (item.questions || []).map((q: any) => ({
        id: q.id,
        type: q.type as "mcq" | "text",
        question: q.question,
        options: q.options || [],
        correctAnswer: q.correctAnswer || "",
        points: q.points,
        sortOrder: q.sortOrder,
      })),
    });
    setDialogOpen(true);
  };

  const addQuestion = () => {
    setForm((f) => ({
      ...f,
      questions: [
        ...f.questions,
        { type: "mcq", question: "", options: ["", ""], correctAnswer: "", points: 1, sortOrder: f.questions.length },
      ],
    }));
  };

  const updateQuestion = (idx: number, patch: Partial<QuestionDraft>) => {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => (i === idx ? { ...q, ...patch } : q)),
    }));
  };

  const removeQuestion = (idx: number) => {
    setForm((f) => ({ ...f, questions: f.questions.filter((_, i) => i !== idx) }));
  };

  const handleSave = async () => {
    if (!form.classId || !form.title.trim()) {
      toast.error("اختر الصف وأدخل العنوان");
      return;
    }
    try {
      await upsert.mutateAsync({
        data: {
          ...form,
          externalUrl: form.externalUrl || undefined,
          bodyText: form.bodyText || undefined,
          coverObjectPath: form.coverObjectPath || undefined,
          contentObjectPath: form.contentObjectPath || undefined,
          questions: form.questions.map((q) => ({ ...q, id: q.id })),
        },
      });
      toast.success("تم حفظ المحتوى");
      setDialogOpen(false);
      refetch();
    } catch (e) {
      toast.error("حدث خطأ أثناء الحفظ");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا المحتوى؟")) return;
    try {
      await remove.mutateAsync({ id });
      toast.success("تم الحذف");
      refetch();
    } catch (e) {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  const handleFileChange = async (field: "cover" | "content", file: File | null) => {
    if (!file) return;
    if (field === "cover") setCoverUploading(true);
    else setContentUploading(true);
    const res = field === "cover" ? await coverUpload.uploadFile(file) : await contentUpload.uploadFile(file);
    if (field === "cover") setCoverUploading(false);
    else setContentUploading(false);
    if (res) toast.success("تم رفع الملف");
    else toast.error("فشل رفع الملف");
  };

  const isRead = form.type === "read";
  const isAudio = form.type === "audio";
  const isAttachment = form.type === "attachment";

  return (
    <div className="min-h-[100dvh] bg-background p-4 md:p-8" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setLocation("/teacher")}>
              ← العودة
            </Button>
            <h1 className="text-2xl md:text-3xl font-black text-foreground">إدارة المكتبة</h1>
          </div>
          <Button variant="outline" className="rounded-xl font-bold" onClick={() => setLocation("/teacher/library/reviews")}>
            مراجعة الإجابات
          </Button>
        </div>

        <Tabs value={activeType} onValueChange={setActiveType}>
          <TabsList className="rounded-xl">
            <TabsTrigger value="read" className="rounded-lg font-bold"><BookOpen className="w-4 h-4 ml-2" /> قراءة</TabsTrigger>
            <TabsTrigger value="audio" className="rounded-lg font-bold"><Headphones className="w-4 h-4 ml-2" /> مسموع</TabsTrigger>
            <TabsTrigger value="attachment" className="rounded-lg font-bold"><Paperclip className="w-4 h-4 ml-2" /> ملحق</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center justify-between">
          <p className="text-muted-foreground font-medium">محتوى {typeLabels[activeType]}</p>
          <Button className="rounded-xl font-bold" onClick={() => openCreate(activeType)}>
            <Plus className="w-4 h-4 ml-2" /> إضافة محتوى
          </Button>
        </div>

        {isLoading ? (
          <div className="h-40 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
        ) : (data?.items || []).length === 0 ? (
          <p className="text-muted-foreground font-medium">لا يوجد محتوى في هذا القسم.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(data?.items || []).map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <div className="flex h-full">
                  {item.coverUrl ? (
                    <div className="w-28 shrink-0 bg-muted">
                      <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-28 shrink-0 bg-muted flex items-center justify-center">
                      <BookOpen className="w-7 h-7 text-muted-foreground" />
                    </div>
                  )}
                  <CardContent className="p-4 flex-1 flex flex-col">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="font-black text-foreground">{item.title}</h2>
                        {item.isPublished ? <Badge className="bg-green-100 text-green-700 font-bold"><Check className="w-3 h-3 ml-1" /> منشور</Badge> : <Badge variant="secondary">مسودة</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Button size="sm" variant="outline" className="rounded-lg font-bold" onClick={() => openEdit(item)}>
                        <Edit className="w-4 h-4 ml-1" /> تعديل
                      </Button>
                      <Button size="sm" variant="destructive" className="rounded-lg font-bold" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="w-4 h-4 ml-1" /> حذف
                      </Button>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="font-black text-foreground">
                {form.id ? "تعديل المحتوى" : "إضافة محتوى جديد"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold">الصف</Label>
                  <Select value={String(form.classId)} onValueChange={(v) => setForm((f) => ({ ...f, classId: Number(v) }))}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="اختر الصف" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">نوع المحتوى</Label>
                  <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as typeof f.type }))}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="read">قراءة</SelectItem>
                      <SelectItem value="audio">مسموع</SelectItem>
                      <SelectItem value="attachment">ملحق</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-bold">العنوان</Label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">الوصف</Label>
                <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="rounded-xl" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold">صورة الغلاف</Label>
                  <Input type="file" accept="image/*" onChange={(e) => handleFileChange("cover", e.target.files?.[0] || null)} disabled={coverUploading || coverUpload.isUploading} className="rounded-xl" />
                  {form.coverObjectPath && <p className="text-xs text-muted-foreground">تم رفع صورة الغلاف</p>}
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">ملف المحتوى (صوت/PDF)</Label>
                  <Input type="file" accept={isAudio ? "audio/*" : isAttachment ? ".pdf,.doc,.docx" : "*"} onChange={(e) => handleFileChange("content", e.target.files?.[0] || null)} disabled={contentUploading || contentUpload.isUploading} className="rounded-xl" />
                  {form.contentObjectPath && <p className="text-xs text-muted-foreground">تم رفع الملف</p>}
                </div>
              </div>

              {isRead && (
                <div className="space-y-2">
                  <Label className="font-bold">نص القصة</Label>
                  <Textarea value={form.bodyText} onChange={(e) => setForm((f) => ({ ...f, bodyText: e.target.value }))} className="rounded-xl min-h-[120px]" />
                </div>
              )}
              {isAttachment && (
                <div className="space-y-2">
                  <Label className="font-bold">رابط خارجي (اختياري)</Label>
                  <Input value={form.externalUrl} onChange={(e) => setForm((f) => ({ ...f, externalUrl: e.target.value }))} className="rounded-xl" dir="ltr" />
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch id="published" checked={form.isPublished} onCheckedChange={(v) => setForm((f) => ({ ...f, isPublished: v }))} />
                <Label htmlFor="published" className="font-bold">منشور للطلاب</Label>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-bold">الأسئلة</Label>
                  <Button type="button" variant="outline" size="sm" className="rounded-lg font-bold" onClick={addQuestion}>
                    <Plus className="w-4 h-4 ml-1" /> سؤال
                  </Button>
                </div>
                {form.questions.map((q, idx) => (
                  <Card key={idx} className="bg-muted/40">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Select value={q.type} onValueChange={(v) => updateQuestion(idx, { type: v as "mcq" | "text" })}>
                          <SelectTrigger className="rounded-xl w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mcq">اختيار</SelectItem>
                            <SelectItem value="text">مقالي</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input type="number" value={q.points} onChange={(e) => updateQuestion(idx, { points: Number(e.target.value) || 0 })} className="rounded-xl w-24" placeholder="نقاط" />
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeQuestion(idx)}>
                          <X className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                      <Textarea placeholder="نص السؤال" value={q.question} onChange={(e) => updateQuestion(idx, { question: e.target.value })} className="rounded-xl" />
                      {q.type === "mcq" && (
                        <div className="space-y-2">
                          <Label className="text-xs font-bold">الخيارات</Label>
                          {q.options.map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <Input value={opt} onChange={(e) => {
                                const opts = [...q.options];
                                opts[i] = e.target.value;
                                updateQuestion(idx, { options: opts });
                              }} className="rounded-xl" placeholder={`الخيار ${i + 1}`} />
                            </div>
                          ))}
                          <Input value={q.correctAnswer} onChange={(e) => updateQuestion(idx, { correctAnswer: e.target.value })} className="rounded-xl" placeholder="الإجابة الصحيحة (نص مطابق لأحد الخيارات)" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button className="w-full rounded-xl font-bold h-12" onClick={handleSave} disabled={upsert.isPending}>
                {upsert.isPending ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
