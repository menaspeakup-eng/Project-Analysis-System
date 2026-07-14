import { useState, useEffect } from "react";
import { useAuth, useClerk, useUser } from "@clerk/react";
import { useLocation } from "wouter";
import {
  useGetIdentityMe,
  useGetTeacherClasses,
  useGetTeacherUnclaimed,
  useClaimTeacherStudent,
  useUpdateTeacherStudent,
  useRemoveTeacherStudentClass,
  useAllowStudentAiStory,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LogOut,
  ArrowRight,
  GraduationCap,
  Users,
  UserPlus,
  Pencil,
  Trash2,
  Check,
  X,
  Eye,
  Gamepad2,
  Flame,
  MessageCircle,
  Sparkles,
  BookOpen,
  BarChart3,
  Mic,
} from "lucide-react";
import type { TeacherClass, TeacherStudent } from "@workspace/api-client-react";
import TeacherChallenges from "./teacher-challenges";
import TeacherGames from "./teacher-games";
import TeacherAiStories from "./teacher-ai-stories";
import TeacherAnalytics from "./teacher-analytics";
import TeacherReadingCoach from "./teacher-reading-coach";
import { ChatPanel } from "@/components/chat/chat-panel";

function getTeacherIdFromUrl(): number | null {
  const raw = new URLSearchParams(window.location.search).get("teacherId");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export default function Teacher() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const previewTeacherId = getTeacherIdFromUrl();

  const { data: identity, isLoading: isIdentityLoading } = useGetIdentityMe({
    query: { enabled: !!isSignedIn } as never,
  });

  const canPreview = identity?.isAdmin && previewTeacherId != null;
  const teacherIdParam = canPreview ? previewTeacherId : undefined;

  const { data: classesData, isLoading: isClassesLoading } = useGetTeacherClasses(
    teacherIdParam ? { teacherId: teacherIdParam } : undefined,
    { query: { enabled: !!isSignedIn } as never },
  );
  const { data: unclaimedData, isLoading: isUnclaimedLoading } = useGetTeacherUnclaimed(
    teacherIdParam ? { teacherId: teacherIdParam } : undefined,
    { query: { enabled: !!isSignedIn } as never },
  );

  const { mutate: claimStudent } = useClaimTeacherStudent();
  const { mutate: updateStudent } = useUpdateTeacherStudent();
  const { mutate: removeStudent } = useRemoveTeacherStudentClass();
  const { mutate: allowAiStory } = useAllowStudentAiStory();

  const [renaming, setRenaming] = useState<{ id: number; name: string } | null>(null);
  const [editingPoints, setEditingPoints] = useState<{ id: number; points: number } | null>(null);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [allowingAiStory, setAllowingAiStory] = useState<number | null>(null);
  const [selectedClass, setSelectedClass] = useState<TeacherClass | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLocation("/");
      return;
    }
    if (identity && !identity.isTeacher && !identity.isAdmin) {
      setLocation("/portal");
    }
  }, [isLoaded, isSignedIn, identity, setLocation]);

  if (!isLoaded || !isSignedIn || isIdentityLoading || !identity) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!identity.isTeacher && !identity.isAdmin) return null;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/teacher/classes"] });
    queryClient.invalidateQueries({ queryKey: ["/api/teacher/unclaimed"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/classes"] });
  };

  const handleClaim = (studentId: number, classId: number) => {
    claimStudent(
      { id: studentId, data: { classId }, params: teacherIdParam ? { teacherId: teacherIdParam } : undefined },
      { onSuccess: () => {
        setClaiming(null);
        invalidate();
      }},
    );
  };

  const handleRename = (studentId: number, name: string) => {
    updateStudent(
      { id: studentId, data: { name }, params: teacherIdParam ? { teacherId: teacherIdParam } : undefined },
      { onSuccess: () => {
        setRenaming(null);
        invalidate();
      }},
    );
  };

  const handleUpdatePoints = (studentId: number, points: number) => {
    updateStudent(
      { id: studentId, data: { points }, params: teacherIdParam ? { teacherId: teacherIdParam } : undefined },
      { onSuccess: () => {
        setEditingPoints(null);
        invalidate();
      }},
    );
  };

  const handleRemove = (studentId: number) => {
    removeStudent(
      { id: studentId, params: teacherIdParam ? { teacherId: teacherIdParam } : undefined },
      { onSuccess: invalidate },
    );
  };

  const handleAllowAiStory = (studentId: number) => {
    allowAiStory(
      { id: studentId },
      {
        onSuccess: () => {
          setAllowingAiStory(null);
          invalidate();
        },
      },
    );
  };

  const classes = classesData?.classes ?? [];
  const unclaimed = unclaimedData?.students ?? [];
  const [activeTab, setActiveTab] = useState<"students" | "games" | "challenges" | "ai-stories" | "reading-coach" | "analytics" | "chat">("students");

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <header className="w-full p-4 md:px-8 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-border sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            className="rounded-xl text-muted-foreground hover:text-foreground"
            onClick={() => setLocation(identity.isTeacher || identity.isAdmin ? "/" : "/portal")}
          >
            <ArrowRight className="w-5 h-5 ml-1" />
            رجوع
          </Button>
          <h1 className="font-black text-foreground text-lg flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" />
            {canPreview ? "معاينة لوحة المعلم" : "لوحة المعلم"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {identity.isAdmin && (
            <Button
              variant="outline"
              className="rounded-xl font-bold h-9 border-primary text-primary hover:bg-primary hover:text-white"
              onClick={() => setLocation("/admin")}
            >
              لوحة الأدمن
            </Button>
          )}
          <Button
            variant="outline"
            className="rounded-xl font-bold h-9 border-secondary text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground"
            onClick={() => setLocation("/teacher/library")}
          >
            <BookOpen className="w-4 h-4 ml-2" />
            المكتبة
          </Button>
          {canPreview && (
            <Badge variant="outline" className="rounded-full font-bold text-primary border-primary">
              <Eye className="w-4 h-4 ml-1" />
              وضع المعاينة
            </Badge>
          )}
          <span className="hidden sm:inline text-sm font-bold text-muted-foreground">
            {user?.primaryEmailAddress?.emailAddress}
          </span>
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
            onClick={() => signOut({ redirectUrl: "/" })}
          >
            <LogOut className="w-5 h-5 ml-2" />
            <span className="font-bold hidden sm:inline">خروج</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-border shadow-sm">
          <Button
            variant={activeTab === "students" ? "default" : "ghost"}
            className={`rounded-xl font-bold h-11 flex-1 sm:flex-none ${activeTab === "students" ? "bg-primary text-white" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("students")}
          >
            <GraduationCap className="w-4 h-4 ml-2" />
            الطلاب
          </Button>
          <Button
            variant={activeTab === "games" ? "default" : "ghost"}
            className={`rounded-xl font-bold h-11 flex-1 sm:flex-none ${activeTab === "games" ? "bg-accent text-white" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("games")}
          >
            <Gamepad2 className="w-4 h-4 ml-2" />
            الألعاب التعليمية
          </Button>
          <Button
            variant={activeTab === "challenges" ? "default" : "ghost"}
            className={`rounded-xl font-bold h-11 flex-1 sm:flex-none ${activeTab === "challenges" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("challenges")}
          >
            <Flame className="w-4 h-4 ml-2" />
            التحديات
          </Button>
          <Button
            variant={activeTab === "ai-stories" ? "default" : "ghost"}
            className={`rounded-xl font-bold h-11 flex-1 sm:flex-none ${activeTab === "ai-stories" ? "bg-[hsl(265,60%,45%)] text-white" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("ai-stories")}
          >
            <Sparkles className="w-4 h-4 ml-2" />
            قصصي الذكية
          </Button>
          <Button
            variant={activeTab === "reading-coach" ? "default" : "ghost"}
            className={`rounded-xl font-bold h-11 flex-1 sm:flex-none ${activeTab === "reading-coach" ? "bg-[hsl(15,85%,55%)] text-white" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("reading-coach")}
          >
            <Mic className="w-4 h-4 ml-2" />
            تدريب القراءة
          </Button>
          <Button
            variant={activeTab === "analytics" ? "default" : "ghost"}
            className={`rounded-xl font-bold h-11 flex-1 sm:flex-none ${activeTab === "analytics" ? "bg-[hsl(15,85%,55%)] text-white" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("analytics")}
          >
            <BarChart3 className="w-4 h-4 ml-2" />
            التقارير
          </Button>
          <Button
            variant={activeTab === "chat" ? "default" : "ghost"}
            className={`rounded-xl font-bold h-11 flex-1 sm:flex-none ${activeTab === "chat" ? "bg-primary text-white" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("chat")}
          >
            <MessageCircle className="w-4 h-4 ml-2" />
            الشات
          </Button>
        </div>

        {activeTab === "students" && (
          <section className="space-y-4">
            <h2 className="font-black text-foreground text-lg flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              صفوفي
            </h2>
            {isClassesLoading ? (
              <div className="h-24 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
              </div>
            ) : classes.length === 0 ? (
              <Card className="rounded-3xl border-border shadow-sm">
                <CardContent className="p-6 text-center text-muted-foreground font-medium">
                  لا يوجد صفوف مرتبطة بك بعد — تواصل مع الأدمن لإنشاء صف.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classes.map((cls) => (
                  <ClassCard
                    key={cls.id}
                    cls={cls}
                    onOpen={() => setSelectedClass(cls)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "games" && <TeacherGames classes={classes} />}

        {activeTab === "challenges" && <TeacherChallenges teacherIdParam={teacherIdParam} classes={classes} />}

        {activeTab === "ai-stories" && <TeacherAiStories />}

        {activeTab === "reading-coach" && <TeacherReadingCoach />}

        {activeTab === "analytics" && <TeacherAnalytics classes={classes} teacherIdParam={teacherIdParam} />}

        {activeTab === "chat" && (
          <section className="flex flex-col min-h-[70dvh] rounded-3xl border border-border bg-white overflow-hidden shadow-sm">
            <ChatPanel backUrl="/teacher" />
          </section>
        )}
      </main>

      {selectedClass && (
        <ClassStudentsDialog
          cls={selectedClass}
          unclaimed={unclaimed}
          isUnclaimedLoading={isUnclaimedLoading}
          renaming={renaming}
          onStartRename={(s) => setRenaming({ id: s.id, name: s.name })}
          onRename={handleRename}
          onRenameChange={(name) => setRenaming((prev) => (prev ? { ...prev, name } : null))}
          onCancelRename={() => setRenaming(null)}
          editingPoints={editingPoints}
          onStartEditPoints={(s) => setEditingPoints({ id: s.id, points: s.points })}
          onPointsChange={(points) => setEditingPoints((prev) => (prev ? { ...prev, points } : null))}
          onUpdatePoints={handleUpdatePoints}
          onCancelEditPoints={() => setEditingPoints(null)}
          onRemove={handleRemove}
          claiming={claiming}
          onStartClaim={(s) => setClaiming(s.id)}
          onCancelClaim={() => setClaiming(null)}
          onClaim={(studentId) => handleClaim(studentId, selectedClass.id)}
          allowingAiStory={allowingAiStory}
          onStartAllowAiStory={(s) => setAllowingAiStory(s.id)}
          onCancelAllowAiStory={() => setAllowingAiStory(null)}
          onAllowAiStory={handleAllowAiStory}
          onClose={() => setSelectedClass(null)}
        />
      )}
    </div>
  );
}

function ClassCard({
  cls,
  onOpen,
}: {
  cls: TeacherClass;
  onOpen: () => void;
}) {
  const count = cls.students.length;
  return (
    <Card className="rounded-3xl border-border shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-black flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary" />
          {cls.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 text-sm font-bold text-muted-foreground">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Users className="w-5 h-5" />
          </div>
          <span>
            {count === 0 ? "لا يوجد طلاب" : `${count} ${count === 1 ? "طالب" : "طلاب"}`}
          </span>
        </div>
        <Button
          className="w-full rounded-xl font-bold h-10"
          onClick={onOpen}
        >
          <Users className="w-4 h-4 ml-2" />
          عرض الطلاب
        </Button>
      </CardContent>
    </Card>
  );
}

function ClassStudentsDialog({
  cls,
  unclaimed,
  isUnclaimedLoading,
  renaming,
  onStartRename,
  onRename,
  onRenameChange,
  onCancelRename,
  editingPoints,
  onStartEditPoints,
  onPointsChange,
  onUpdatePoints,
  onCancelEditPoints,
  onRemove,
  claiming,
  onStartClaim,
  onCancelClaim,
  onClaim,
  allowingAiStory,
  onStartAllowAiStory,
  onCancelAllowAiStory,
  onAllowAiStory,
  onClose,
}: {
  cls: TeacherClass;
  unclaimed: TeacherStudent[];
  isUnclaimedLoading: boolean;
  renaming: { id: number; name: string } | null;
  onStartRename: (s: TeacherStudent) => void;
  onRename: (id: number, name: string) => void;
  onRenameChange: (name: string) => void;
  onCancelRename: () => void;
  editingPoints: { id: number; points: number } | null;
  onStartEditPoints: (s: TeacherStudent) => void;
  onPointsChange: (points: number) => void;
  onUpdatePoints: (id: number, points: number) => void;
  onCancelEditPoints: () => void;
  onRemove: (id: number) => void;
  claiming: number | null;
  onStartClaim: (s: TeacherStudent) => void;
  onCancelClaim: () => void;
  onClaim: (studentId: number) => void;
  allowingAiStory: number | null;
  onStartAllowAiStory: (s: TeacherStudent) => void;
  onCancelAllowAiStory: () => void;
  onAllowAiStory: (studentId: number) => void;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl rounded-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="text-xl font-black flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" />
            طلاب {cls.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current students */}
          <section className="space-y-3">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              طلاب الصف
            </h3>
            {cls.students.length === 0 ? (
              <p className="text-muted-foreground font-medium text-sm py-4 text-center bg-muted/30 rounded-2xl">
                لا يوجد طلاب في هذا الصف بعد.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-bold">الطالب</TableHead>
                      <TableHead className="font-bold">النقاط</TableHead>
                      <TableHead className="font-bold text-left">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cls.students.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-bold">
                          {renaming?.id === s.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={renaming.name}
                                onChange={(e) => onRenameChange(e.target.value)}
                                className="h-8 w-32 rounded-xl border-border"
                                autoFocus
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-full text-primary"
                                onClick={() => onRename(s.id, renaming.name)}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-full text-muted-foreground"
                                onClick={onCancelRename}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            s.name
                          )}
                        </TableCell>
                        <TableCell>
                          {editingPoints?.id === s.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={editingPoints.points}
                                onChange={(e) => onPointsChange(Number(e.target.value))}
                                className="h-8 w-20 rounded-xl border-border"
                                autoFocus
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-full text-primary"
                                onClick={() => onUpdatePoints(s.id, editingPoints.points)}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-full text-muted-foreground"
                                onClick={onCancelEditPoints}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-black text-secondary-foreground">{s.points}</span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-full text-muted-foreground"
                                onClick={() => onStartEditPoints(s)}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="rounded-xl h-8 font-bold text-muted-foreground"
                              onClick={() => onStartRename(s)}
                            >
                              <Pencil className="w-4 h-4 ml-1" />
                              تعديل
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="rounded-xl h-8 font-bold text-destructive hover:bg-destructive/10"
                              onClick={() => onRemove(s.id)}
                            >
                              <Trash2 className="w-4 h-4 ml-1" />
                              إزالة
                            </Button>
                            {allowingAiStory === s.id ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  className="rounded-xl h-8 font-bold"
                                  onClick={() => onAllowAiStory(s.id)}
                                >
                                  <Check className="w-4 h-4 ml-1" />
                                  سماح
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="rounded-xl h-8 font-bold text-muted-foreground"
                                  onClick={onCancelAllowAiStory}
                                >
                                  <X className="w-4 h-4 ml-1" />
                                  إلغاء
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl h-8 font-bold border-[hsl(265,60%,45%)] text-[hsl(265,60%,45%)] hover:bg-[hsl(265,60%,92%)]"
                                onClick={() => onStartAllowAiStory(s)}
                              >
                                <Sparkles className="w-4 h-4 ml-1" />
                                قصة إضافية
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          {/* Add unclaimed students */}
          <section className="space-y-3 border-t border-border pt-4">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" />
              إضافة طلاب للصف
            </h3>
            {isUnclaimedLoading ? (
              <div className="h-16 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
              </div>
            ) : unclaimed.length === 0 ? (
              <p className="text-muted-foreground font-medium text-sm py-4 text-center bg-muted/30 rounded-2xl">
                لا يوجد طلاب غير مرتبطين حالياً.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-bold">الطالب</TableHead>
                      <TableHead className="font-bold">النقاط</TableHead>
                      <TableHead className="font-bold text-left">إضافة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unclaimed.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-bold">{s.name}</TableCell>
                        <TableCell>{s.points}</TableCell>
                        <TableCell>
                          {claiming === s.id ? (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                className="rounded-xl h-8 font-bold"
                                onClick={() => onClaim(s.id)}
                              >
                                <Check className="w-4 h-4 ml-1" />
                                تأكيد
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="rounded-xl h-8 font-bold text-muted-foreground"
                                onClick={onCancelClaim}
                              >
                                <X className="w-4 h-4 ml-1" />
                                إلغاء
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl h-8 font-bold"
                              onClick={() => onStartClaim(s)}
                            >
                              <UserPlus className="w-4 h-4 ml-1" />
                              إضافة
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
