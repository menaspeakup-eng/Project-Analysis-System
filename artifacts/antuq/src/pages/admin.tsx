import { useState } from "react";
import { useAuth, useClerk, useUser } from "@clerk/react";
import { useLocation, Link } from "wouter";
import { useEffect } from "react";
import {
  useGetIdentityMe,
  useGetAdminUsers,
  useGetAdminClasses,
  useToggleAdminTeacher,
  useCreateAdminClass,
  useUpdateAdminClass,
  useDeleteAdminClass,
  useMoveAdminStudentClass,
  useGetAdminActivityLogs,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LogOut,
  ArrowRight,
  GraduationCap,
  Users,
  Plus,
  Eye,
  School,
  UserCheck,
  UserX,
  Trash2,
  MessageCircle,
  Trophy,
  BookOpen,
  Gamepad2,
  Star,
  CheckCircle,
  Settings,
  Crown,
  Sparkles,
  LogIn,
  Loader2,
} from "lucide-react";
import { ChatPanel } from "@/components/chat/chat-panel";
import type { AdminUser, AdminClass, TeacherStudent } from "@workspace/api-client-react";

const activityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  login: LogIn,
  name_change: Settings,
  email_change: Settings,
  avatar_change: Sparkles,
  story_complete: BookOpen,
  game_complete: Gamepad2,
  challenge_complete: CheckCircle,
  points_earned: Star,
  level_up: Crown,
  quiz_complete: CheckCircle,
  friend_added: Users,
  friend_accepted: Users,
  settings_updated: Settings,
  account_deleted: Settings,
};

const activityColors: Record<string, string> = {
  login: "bg-blue-100 text-blue-600",
  name_change: "bg-purple-100 text-purple-600",
  email_change: "bg-purple-100 text-purple-600",
  avatar_change: "bg-pink-100 text-pink-600",
  story_complete: "bg-emerald-100 text-emerald-600",
  game_complete: "bg-orange-100 text-orange-600",
  challenge_complete: "bg-teal-100 text-teal-600",
  points_earned: "bg-yellow-100 text-yellow-600",
  level_up: "bg-amber-100 text-amber-600",
  quiz_complete: "bg-indigo-100 text-indigo-600",
  friend_added: "bg-rose-100 text-rose-600",
  friend_accepted: "bg-rose-100 text-rose-600",
  settings_updated: "bg-gray-100 text-gray-600",
  account_deleted: "bg-red-100 text-red-600",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" });
}

function StudentActivityLog({ studentId }: { studentId: number }) {
  const { data, isLoading } = useGetAdminActivityLogs(studentId);
  const logs = data?.logs ?? [];

  if (isLoading) {
    return (
      <div className="h-48 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <Card className="rounded-3xl border-border shadow-sm">
        <CardContent className="p-8 text-center text-muted-foreground font-medium">
          <GraduationCap className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
          لا يوجد نشاط مسجل لهذا الطالب بعد.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => {
        const Icon = activityIcons[log.type] ?? Sparkles;
        const color = activityColors[log.type] ?? "bg-muted text-muted-foreground";
        return (
          <Card key={log.id} className="rounded-3xl border-border shadow-sm">
            <CardContent className="p-4 flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-foreground">{log.title}</p>
                  <Badge variant="outline" className="rounded-full text-xs font-medium shrink-0">
                    {formatDate(log.createdAt)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground font-medium mt-1">{log.description}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function Admin() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: identity, isLoading: isIdentityLoading } = useGetIdentityMe({
    query: { enabled: !!isSignedIn } as never,
  });
  const { data: usersData, isLoading: isUsersLoading } = useGetAdminUsers({
    query: { enabled: !!isSignedIn } as never,
  });
  const { data: classesData, isLoading: isClassesLoading } = useGetAdminClasses({
    query: { enabled: !!isSignedIn } as never,
  });

  const { mutate: toggleTeacher } = useToggleAdminTeacher();
  const { mutate: createClass } = useCreateAdminClass();
  const { mutate: updateClass } = useUpdateAdminClass();
  const { mutate: deleteClass } = useDeleteAdminClass();
  const { mutate: moveStudent } = useMoveAdminStudentClass();

  const [newClassName, setNewClassName] = useState("");
  const [renamingClass, setRenamingClass] = useState<{ id: number; name: string } | null>(null);
  const [movingStudent, setMovingStudent] = useState<{
    studentId: number;
    currentClassId: number | null;
  } | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLocation("/");
      return;
    }
    if (identity && !identity.isAdmin) {
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

  if (!identity.isAdmin) return null;

  const users = usersData?.users ?? [];
  const classes = classesData?.classes ?? [];
  const teachers = users.filter((u) => u.role === "teacher");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/classes"] });
    queryClient.invalidateQueries({ queryKey: ["/api/identity/me"] });
  };

  const handleToggleTeacher = (user: AdminUser) => {
    toggleTeacher(
      { data: { email: user.email, isTeacher: user.role !== "teacher" } },
      { onSuccess: invalidate },
    );
  };

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    createClass(
      { data: { name: newClassName.trim() } },
      {
        onSuccess: () => {
          setNewClassName("");
          invalidate();
        },
      },
    );
  };

  const handleAssignTeacher = (classId: number, teacherId: string) => {
    const value = teacherId === "none" ? null : Number(teacherId);
    updateClass(
      { id: classId, data: { teacherId: value } },
      { onSuccess: invalidate },
    );
  };

  const handleRenameClass = (id: number, name: string) => {
    updateClass(
      { id, data: { name } },
      {
        onSuccess: () => {
          setRenamingClass(null);
          invalidate();
        },
      },
    );
  };

  const handleDeleteClass = (id: number, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف الصف "${name}"؟ سيُحذف الصف ويُفصل الطلبة المرتبطون به.`)) {
      return;
    }
    deleteClass({ id }, { onSuccess: invalidate });
  };

  const handleMoveStudent = (studentId: number, classId: string) => {
    const value = classId === "none" ? null : Number(classId);
    moveStudent(
      { id: studentId, data: { classId: value } },
      {
        onSuccess: () => {
          setMovingStudent(null);
          invalidate();
        },
      },
    );
  };

  const handleLogout = () => signOut({ redirectUrl: "/" });

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <header className="w-full p-4 md:px-8 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-border sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            className="rounded-xl text-muted-foreground hover:text-foreground"
            onClick={() => setLocation("/portal")}
          >
            <ArrowRight className="w-5 h-5 ml-1" />
            رجوع
          </Button>
          <h1 className="font-black text-foreground text-lg flex items-center gap-2">
            <School className="w-6 h-6 text-primary" />
            لوحة المسؤول
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-sm font-bold text-muted-foreground">
            {user?.primaryEmailAddress?.emailAddress}
          </span>
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 ml-2" />
            <span className="font-bold hidden sm:inline">خروج</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="rounded-xl h-12 p-1 bg-white border border-border">
            <TabsTrigger value="users" className="rounded-lg px-4 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
              <Users className="w-4 h-4 ml-2" />
              المستخدمين
            </TabsTrigger>
            <TabsTrigger value="classes" className="rounded-lg px-4 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
              <GraduationCap className="w-4 h-4 ml-2" />
              الصفوف
            </TabsTrigger>
            <TabsTrigger value="chat" className="rounded-lg px-4 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
              <MessageCircle className="w-4 h-4 ml-2" />
              الشات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6 space-y-4">
            <Card className="rounded-3xl border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  جميع المستخدمين
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isUsersLoading ? (
                  <div className="h-24 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-bold">الاسم</TableHead>
                          <TableHead className="font-bold">البريد</TableHead>
                          <TableHead className="font-bold">الدور</TableHead>
                          <TableHead className="font-bold">الصف</TableHead>
                          <TableHead className="font-bold text-left">إجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((u) => (
                          <TableRow key={u.clerkUserId}>
                            <TableCell className="font-bold">{u.name}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                            <TableCell>
                              <Badge
                                variant={u.role === "teacher" ? "default" : "secondary"}
                                className={u.role === "teacher" ? "bg-primary text-white" : ""}
                              >
                                {u.role === "teacher" ? "معلم" : "طالب"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              <Select
                                value={u.classId?.toString() ?? "none"}
                                onValueChange={(value) => {
                                  if (u.studentId != null) {
                                    handleMoveStudent(u.studentId, value);
                                  }
                                }}
                              >
                                <SelectTrigger className="w-40 h-8 rounded-xl border-border bg-[hsl(40,33%,98%)] text-sm font-bold">
                                  <SelectValue placeholder="اختر صفاً" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  <SelectItem value="none">بدون صف</SelectItem>
                                  {classes.map((c) => (
                                    <SelectItem key={c.id} value={c.id.toString()}>
                                      {c.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant={u.role === "teacher" ? "outline" : "default"}
                                  className="rounded-xl font-bold h-8"
                                  onClick={() => handleToggleTeacher(u)}
                                >
                                  {u.role === "teacher" ? (
                                    <>
                                      <UserX className="w-4 h-4 ml-1" /> إلغاء المعلم
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="w-4 h-4 ml-1" /> تعيين معلم
                                    </>
                                  )}
                                </Button>
                                {u.studentId != null && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="rounded-xl font-bold h-8"
                                    onClick={() => setSelectedStudentId(u.studentId!)}
                                  >
                                    <Trophy className="w-4 h-4 ml-1" /> الإنجازات
                                  </Button>
                                )}
                                {u.role === "teacher" && u.studentId != null && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="rounded-xl font-bold h-8"
                                    asChild
                                  >
                                    <Link href={`/teacher?teacherId=${u.studentId}`}>
                                      <Eye className="w-4 h-4 ml-1" /> معاينة
                                    </Link>
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="classes" className="mt-6 space-y-4">
            <Card className="rounded-3xl border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary" />
                  صف جديد
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateClass} className="flex flex-col sm:flex-row gap-3">
                  <Input
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="اسم الصف"
                    className="h-12 rounded-xl border-border bg-[hsl(40,33%,98%)] flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={!newClassName.trim()}
                    className="h-12 rounded-xl bg-primary text-white font-bold"
                  >
                    <Plus className="w-5 h-5 ml-2" />
                    إنشاء
                  </Button>
                </form>
              </CardContent>
            </Card>

            {isClassesLoading ? (
              <div className="h-24 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
              </div>
            ) : (
              <div className="grid gap-4">
                {classes.map((cls) => (
                  <ClassCard
                    key={cls.id}
                    cls={cls}
                    teachers={teachers}
                    allClasses={classes}
                    onAssignTeacher={handleAssignTeacher}
                    onRename={handleRenameClass}
                    onDelete={handleDeleteClass}
                    onRenameChange={(name) => setRenamingClass((prev) => (prev ? { ...prev, name } : null))}
                    onStartRename={() => setRenamingClass({ id: cls.id, name: cls.name })}
                    onStartMoveStudent={(studentId) => setMovingStudent({ studentId, currentClassId: cls.id })}
                    onMoveStudent={handleMoveStudent}
                    renamingClass={renamingClass}
                    movingStudent={movingStudent}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="chat" className="mt-6 space-y-4">
            <Card className="rounded-3xl border-border shadow-sm overflow-hidden">
              <div className="flex flex-col h-[70dvh]">
                <ChatPanel backUrl="/admin" />
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={selectedStudentId != null} onOpenChange={(open) => !open && setSelectedStudentId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="text-right">
            <DialogTitle className="text-right">سجل نشاط الطالب</DialogTitle>
            <DialogDescription className="text-right">
              آخر الأنشطة والإنجازات المسجلة للطالب.
            </DialogDescription>
          </DialogHeader>
          {selectedStudentId != null && <StudentActivityLog studentId={selectedStudentId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClassCard({
  cls,
  teachers,
  allClasses,
  onAssignTeacher,
  onRename,
  onDelete,
  onRenameChange,
  onStartRename,
  onStartMoveStudent,
  onMoveStudent,
  renamingClass,
  movingStudent,
}: {
  cls: AdminClass;
  teachers: AdminUser[];
  allClasses: AdminClass[];
  onAssignTeacher: (classId: number, teacherId: string) => void;
  onRename: (id: number, name: string) => void;
  onDelete: (id: number, name: string) => void;
  onRenameChange: (name: string) => void;
  onStartRename: () => void;
  onStartMoveStudent: (studentId: number) => void;
  onMoveStudent: (studentId: number, classId: string) => void;
  renamingClass: { id: number; name: string } | null;
  movingStudent: { studentId: number; currentClassId: number | null } | null;
}) {
  return (
    <Card className="rounded-3xl border-border shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <School className="w-6 h-6 text-primary" />
            {renamingClass?.id === cls.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onRename(cls.id, renamingClass.name);
                }}
                className="flex items-center gap-2"
              >
                <Input
                  value={renamingClass.name}
                  onChange={(e) => onRenameChange(e.target.value)}
                  className="h-9 rounded-xl border-border w-48"
                  autoFocus
                />
                <Button type="submit" size="sm" className="rounded-xl font-bold h-9">
                  حفظ
                </Button>
              </form>
            ) : (
              <CardTitle className="text-lg font-black">{cls.name}</CardTitle>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={cls.teacherId?.toString() ?? "none"}
              onValueChange={(v) => onAssignTeacher(cls.id, v)}
            >
              <SelectTrigger className="w-48 h-9 rounded-xl border-border bg-[hsl(40,33%,98%)]">
                <SelectValue placeholder="اختيار معلم" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="none">بدون معلم</SelectItem>
                {teachers.map((t) => (
                  <SelectItem key={t.clerkUserId} value={t.studentId?.toString() ?? ""} disabled={t.studentId == null}>
                    {t.name} ({t.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-xl font-bold h-9 text-muted-foreground"
              onClick={onStartRename}
            >
              تعديل الاسم
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-xl font-bold h-9 text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(cls.id, cls.name)}
            >
              <Trash2 className="w-4 h-4 ml-1" />
              حذف
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground font-medium">
          المعلم: {cls.teacherName ?? "غير معين"} {cls.teacherEmail ? `(${cls.teacherEmail})` : ""}
        </p>
      </CardHeader>
      <CardContent>
        {cls.students.length === 0 ? (
          <p className="text-muted-foreground font-medium text-sm py-4 text-center">
            لا يوجد طلبة في هذا الصف بعد.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-bold">الطالب</TableHead>
                  <TableHead className="font-bold">النقاط</TableHead>
                  <TableHead className="font-bold text-left">نقل / إزالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cls.students.map((s) => (
                  <StudentRow
                    key={s.id}
                    student={s}
                    cls={cls}
                    allClasses={allClasses}
                    movingStudent={movingStudent}
                    onStartMove={() => onStartMoveStudent(s.id)}
                    onMove={(classId) => onMoveStudent(s.id, classId)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StudentRow({
  student,
  cls,
  allClasses,
  movingStudent,
  onStartMove,
  onMove,
}: {
  student: TeacherStudent;
  cls: AdminClass;
  allClasses: AdminClass[];
  movingStudent: { studentId: number; currentClassId: number | null } | null;
  onStartMove: () => void;
  onMove: (classId: string) => void;
}) {
  if (movingStudent?.studentId === student.id) {
    return (
      <TableRow>
        <TableCell className="font-bold">{student.name}</TableCell>
        <TableCell>{student.points}</TableCell>
        <TableCell>
          <Select onValueChange={onMove} defaultValue="">
            <SelectTrigger className="w-48 h-9 rounded-xl border-border bg-[hsl(40,33%,98%)]">
              <SelectValue placeholder="اختر صفاً" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="none">بدون صف</SelectItem>
              {allClasses
                .filter((c) => c.id !== cls.id)
                .map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell className="font-bold">{student.name}</TableCell>
      <TableCell>{student.points}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="rounded-xl h-8 font-bold" onClick={onStartMove}>
            نقل
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl h-8 font-bold text-destructive hover:bg-destructive/10"
            onClick={() => onMove("none")}
          >
            <Trash2 className="w-4 h-4 ml-1" />
            إزالة
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
