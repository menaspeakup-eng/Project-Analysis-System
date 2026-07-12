import { useState, useEffect } from "react";
import { useAuth, useClerk, useUser } from "@clerk/react";
import { useLocation, Link } from "wouter";
import {
  useGetIdentityMe,
  useGetTeacherClasses,
  useGetTeacherUnclaimed,
  useClaimTeacherStudent,
  useUpdateTeacherStudent,
  useRemoveTeacherStudentClass,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import type { TeacherClass, TeacherStudent } from "@workspace/api-client-react";

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
  // Admin preview passes the teacher's platform student id via URL. The
  // teacher's own view uses the current session (no teacherId param) because the
  // backend resolves it from identity.
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

  const [renaming, setRenaming] = useState<{ id: number; name: string } | null>(null);
  const [editingPoints, setEditingPoints] = useState<{ id: number; points: number } | null>(null);
  const [claiming, setClaiming] = useState<number | null>(null);

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

  const classes = classesData?.classes ?? [];
  const unclaimed = unclaimedData?.students ?? [];

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  لا يوجد صفوف مرتبطة بك بعد — تواصل مع الأدmin لإنشاء صف.
                </CardContent>
              </Card>
            ) : (
              classes.map((cls) => (
                <ClassCard
                  key={cls.id}
                  cls={cls}
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
                />
              ))
            )}
          </section>

          <section className="space-y-4">
            <h2 className="font-black text-foreground text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              طلاب غير مرتبطين بصف
            </h2>
            {isUnclaimedLoading ? (
              <div className="h-24 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
              </div>
            ) : unclaimed.length === 0 ? (
              <Card className="rounded-3xl border-border shadow-sm">
                <CardContent className="p-6 text-center text-muted-foreground font-medium">
                  لا يوجد طلاب غير مرتبطين حالياً.
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-3xl border-border shadow-sm">
                <CardContent className="p-0">
                  <div className="overflow-x-auto rounded-2xl">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-bold">الطالب</TableHead>
                          <TableHead className="font-bold">النقاط</TableHead>
                          <TableHead className="font-bold text-left">إضافة لصف</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unclaimed.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-bold">{s.name}</TableCell>
                            <TableCell>{s.points}</TableCell>
                            <TableCell>
                              {claiming === s.id ? (
                                <Select
                                  onValueChange={(v) => handleClaim(s.id, Number(v))}
                                  defaultValue=""
                                >
                                  <SelectTrigger className="w-36 h-9 rounded-xl border-border bg-[hsl(40,33%,98%)]">
                                    <SelectValue placeholder="اختر صفاً" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl">
                                    {classes.map((c) => (
                                      <SelectItem key={c.id} value={c.id.toString()}>
                                        {c.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-xl h-8 font-bold"
                                  onClick={() => setClaiming(s.id)}
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
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function ClassCard({
  cls,
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
}: {
  cls: TeacherClass;
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
}) {
  return (
    <Card className="rounded-3xl border-border shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-black flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary" />
          {cls.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {cls.students.length === 0 ? (
          <p className="text-muted-foreground font-medium text-sm py-4 text-center">
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
  );
}
