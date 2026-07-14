import { useState, useMemo, useRef } from "react";
import {
  useGetTeacherAnalytics,
  type TeacherClass,
  type TeacherAnalyticsStudent,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import {
  BarChart3,
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  Users,
  BookOpen,
  Trophy,
  Target,
  TrendingUp,
  Activity,
  HelpCircle,
  Info,
  RefreshCw,
} from "lucide-react";

const LEVEL_COLORS: Record<string, string> = {
  excellent: "#10b981",
  very_good: "#3b82f6",
  good: "#f59e0b",
  needs_improvement: "#f97316",
  needs_follow_up: "#ef4444",
};

type Period = "today" | "7days" | "30days" | "custom";

function formatDateInput(d: Date) {
  return d.toISOString().split("T")[0];
}

function getPeriodRange(period: Period, customFrom?: string, customTo?: string) {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let from: Date;

  switch (period) {
    case "today":
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "7days":
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      break;
    case "30days":
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
      break;
    case "custom":
      from = customFrom ? new Date(customFrom) : new Date(now.getFullYear(), now.getMonth(), now.getDate());
      to.setHours(23, 59, 59, 999);
      break;
  }

  return { from: formatDateInput(from), to: formatDateInput(to) };
}

export default function TeacherAnalytics({
  classes,
  teacherIdParam,
}: {
  classes: TeacherClass[];
  teacherIdParam?: number;
}) {
  const [period, setPeriod] = useState<Period>("30days");
  const [customFrom, setCustomFrom] = useState<string>(formatDateInput(new Date()));
  const [customTo, setCustomTo] = useState<string>(formatDateInput(new Date()));
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"points" | "score" | "stories" | "tests" | "progress">("score");
  const reportRef = useRef<HTMLDivElement>(null);

  const range = useMemo(
    () => getPeriodRange(period, customFrom, customTo),
    [period, customFrom, customTo],
  );

  const params = useMemo(() => {
    const p: { classId?: number; from?: string; to?: string; teacherId?: number } = {
      from: range.from,
      to: range.to,
    };
    if (selectedClassId !== "all") {
      p.classId = Number(selectedClassId);
    }
    if (teacherIdParam) {
      p.teacherId = teacherIdParam;
    }
    return p;
  }, [range, selectedClassId, teacherIdParam]);

  const { data, isLoading, refetch, isFetching } = useGetTeacherAnalytics(params, {
    query: { enabled: classes.length > 0 } as never,
  });

  const filteredStudents = useMemo(() => {
    if (!data) return [];
    let rows = [...data.students];
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      rows = rows.filter((s) => s.name.toLowerCase().includes(term));
    }
    rows.sort((a, b) => {
      switch (sortBy) {
        case "points":
          return b.points - a.points;
        case "score":
          return b.avgScore - a.avgScore;
        case "stories":
          return b.storiesCompleted - a.storiesCompleted;
        case "tests":
          return b.testsCompleted - a.testsCompleted;
        case "progress":
          return b.progress - a.progress;
      }
    });
    return rows;
  }, [data, searchTerm, sortBy]);

  function downloadExcel() {
    if (!data) return;
    const rows = filteredStudents.map((s) => ({
      "الاسم": s.name,
      "المستوى": s.levelLabel,
      "النقاط": s.points,
      "نسبة القراءة الصحيحة": `${s.avgScore}%`,
      "القصص المكتملة": s.storiesCompleted,
      "الاختبارات": s.testsCompleted,
      "نسبة التقدم": `${s.progress}%`,
      "الملاحظات": s.note,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الطلاب");
    XLSX.writeFile(wb, "تقرير-الطلاب.xlsx");
  }

  async function downloadPDF() {
    if (!data || !reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: 1200,
    });
    const imgData = canvas.toDataURL("image/png");
    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pageWidth = 210;
    const pageHeight = 297;
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    doc.setFontSize(14);
    doc.text("تقرير تحليل الطلاب والتقارير", pageWidth / 2, 10, { align: "center" });
    doc.setFontSize(10);
    doc.text(`الفترة: ${range.from} → ${range.to}`, pageWidth / 2, 16, { align: "center" });

    const headerHeight = 22;
    doc.addImage(imgData, "PNG", 0, headerHeight, imgWidth, imgHeight);
    heightLeft -= pageHeight - headerHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight + headerHeight;
      doc.addPage();
      doc.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    doc.save("تقرير-الطلاب.pdf");
  }

  if (classes.length === 0) {
    return (
      <Card className="rounded-3xl border-border shadow-sm">
        <CardContent className="p-8 text-center text-muted-foreground font-medium">
          لا يوجد صفوف مرتبطة بك بعد — تواصل مع الأدمن لإنشاء صف.
        </CardContent>
      </Card>
    );
  }

  const summary = data?.summary;

  return (
    <div ref={reportRef} className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          <h2 className="font-black text-foreground text-lg">تحليل الطلاب والتقارير</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl font-bold gap-2"
            onClick={() => refetch()}
            disabled={isFetching}
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            تحديث البيانات
          </Button>
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-[180px] rounded-xl font-bold">
              <SelectValue placeholder="اختر الصف" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الصفوف</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList className="rounded-xl h-11 bg-white border border-border">
              <TabsTrigger value="today" className="rounded-lg font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
                اليوم
              </TabsTrigger>
              <TabsTrigger value="7days" className="rounded-lg font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
                7 أيام
              </TabsTrigger>
              <TabsTrigger value="30days" className="rounded-lg font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
                شهر
              </TabsTrigger>
              <TabsTrigger value="custom" className="rounded-lg font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
                مخصص
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {period === "custom" && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-36 rounded-xl"
              />
              <span className="text-muted-foreground">→</span>
              <Input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="w-36 rounded-xl"
              />
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="h-40 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        </div>
      )}

      {!isLoading && data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            <SummaryCard icon={<Users className="w-5 h-5" />} label="إجمالي الطلاب" value={summary?.totalStudents ?? 0} color="bg-blue-50 text-blue-600" hint="عدد الطلاب المسجلين في الصف/الصفوف المختارة" />
            <SummaryCard icon={<Activity className="w-5 h-5" />} label="المشاركين" value={summary?.activeStudents ?? 0} color="bg-emerald-50 text-emerald-600" hint="طلاب لديهم أي نشاط في الفترة: قصة، اختبار، أو لعبة" />
            <SummaryCard icon={<Trophy className="w-5 h-5" />} label="متوسط النقاط" value={summary?.avgPoints ?? 0} color="bg-amber-50 text-amber-600" hint="متوسط نقاط جميع الطلاب في الصف/الصفوف" />
            <SummaryCard icon={<Target className="w-5 h-5" />} label="متوسط نسبة القراءة الصحيحة" value={`${summary?.avgScore ?? 0}%`} color="bg-rose-50 text-rose-600" hint="متوسط نتائج اختبارات القصص والمكتبة للطلاب" />
            <SummaryCard icon={<BookOpen className="w-5 h-5" />} label="القصص المكتملة" value={summary?.storiesCompleted ?? 0} color="bg-purple-50 text-purple-600" hint="عدد اختبارات القصص الذكية التي أتمها الطلاب" />
            <SummaryCard icon={<TrendingUp className="w-5 h-5" />} label="الاختبارات المنجزة" value={summary?.testsCompleted ?? 0} color="bg-cyan-50 text-cyan-600" hint="اختبارات القصص الذكية + اختبارات المكتبة" />
            <SummaryCard icon={<Calendar className="w-5 h-5" />} label="نسبة القراءة الصحيحة" value={`${summary?.successRate ?? 0}%`} color="bg-teal-50 text-teal-600" hint="متوسط الإجابات الصحيحة في جميع الاختبارات" />
          </div>

          {/* Methodology */}
          <Card className="rounded-3xl border-border shadow-sm bg-[hsl(40,33%,98%)]">
            <CardHeader className="flex items-center gap-2 pb-2">
              <Info className="w-5 h-5 text-primary" />
              <CardTitle className="font-black text-foreground text-base">كيف تُحسب هذه الأرقام؟</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm font-medium text-muted-foreground">
                <MethodologyItem title="المشاركين" description="طالب له نشاط واحد على الأقل خلال الفترة المختارة." />
                <MethodologyItem title="القصص المكتملة" description="عدد اختبارات القصص الذكية (AI Story) التي أتمها الطلاب." />
                <MethodologyItem title="الاختبارات المنجزة" description="مجموع اختبارات القصص الذكية واختبارات المكتبة." />
                <MethodologyItem title="نسبة القراءة الصحيحة" description="(الإجابات الصحيحة ÷ إجمالي الأسئلة) × 100، بمتوسط جميع الاختبارات." />
                <MethodologyItem title="نسبة التقدم" description="نفس نسبة القراءة الصحيحة للطالب؛ تعكس دقة الإجابات." />
                <MethodologyItem title="تصنيف المستوى" description="ممتاز ≥90% · جيد جداً ≥75% · جيد ≥60% · يحتاج تحسين ≥40% · يحتاج متابعة <40%" />
              </ul>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 rounded-3xl border-border shadow-sm">
              <CardHeader>
                <CardTitle className="font-black text-foreground flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  تطور النشاط اليومي
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.charts.dailyActivity}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }} />
                      <Line type="monotone" dataKey="count" stroke="hsl(15 85% 55%)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-border shadow-sm">
              <CardHeader>
                <CardTitle className="font-black text-foreground flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-accent" />
                  توزيع المستويات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.charts.levelDistribution}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={({ label, count }) => `${label}: ${count}`}
                      >
                        {data.charts.levelDistribution.map((entry) => (
                          <Cell key={entry.level} fill={LEVEL_COLORS[entry.level] || "#94a3b8"} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-3xl border-border shadow-sm">
            <CardHeader>
              <CardTitle className="font-black text-foreground flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-secondary" />
                مقارنة أداء الطلاب
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.studentPerformance} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }} />
                    <Bar dataKey="score" fill="hsl(180 60% 45%)" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Students Table */}
          <Card className="rounded-3xl border-border shadow-sm">
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="font-black text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                تحليل مستوى كل طالب
              </CardTitle>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-48">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث بالاسم..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-9 rounded-xl"
                  />
                </div>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="w-40 rounded-xl font-bold">
                    <SelectValue placeholder="ترتيب حسب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="score">الأفضل مستوى</SelectItem>
                    <SelectItem value="points">الأعلى نقاطاً</SelectItem>
                    <SelectItem value="stories">الأكثر قصصاً</SelectItem>
                    <SelectItem value="tests">الأكثر اختبارات</SelectItem>
                    <SelectItem value="progress">الأكثر تقدماً</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="rounded-xl font-bold border-border" onClick={downloadExcel}>
                  <FileSpreadsheet className="w-4 h-4 ml-2" />
                  Excel
                </Button>
                <Button variant="outline" className="rounded-xl font-bold border-border" onClick={downloadPDF}>
                  <FileText className="w-4 h-4 ml-2" />
                  PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="font-bold text-right">الطالب</TableHead>
                    <TableHead className="font-bold text-right">المستوى</TableHead>
                    <TableHead className="font-bold text-right">النقاط</TableHead>
                    <TableHead className="font-bold text-right">نسبة القراءة الصحيحة</TableHead>
                    <TableHead className="font-bold text-right">القصص المكتملة</TableHead>
                    <TableHead className="font-bold text-right">الاختبارات المنجزة</TableHead>
                    <TableHead className="font-bold text-right">نسبة القراءة الصحيحة</TableHead>
                    <TableHead className="font-bold text-right">التقدم</TableHead>
                    <TableHead className="font-bold text-right">الملاحظات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        لا يوجد طلاب مطابقين للبحث.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((student) => (
                      <StudentRow key={student.id} student={student} />
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  color,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
  hint?: string;
}) {
  return (
    <Card className="rounded-2xl border-border shadow-sm" title={hint}>
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-black text-foreground">{value}</p>
          <p className="text-sm font-bold text-muted-foreground truncate">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MethodologyItem({ title, description }: { title: string; description: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0"></span>
      <span className="text-foreground">
        <span className="font-bold text-foreground">{title}:</span>{" "}
        <span className="text-muted-foreground">{description}</span>
      </span>
    </li>
  );
}

function StudentRow({ student }: { student: TeacherAnalyticsStudent }) {
  return (
    <TableRow className="border-border">
      <TableCell className="font-bold text-foreground">
        <div className="flex items-center gap-3">
          {student.imageUrl ? (
            <img
              src={student.imageUrl}
              alt=""
              className="w-10 h-10 rounded-full object-cover border border-border"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {student.name.charAt(0)}
            </div>
          )}
          {student.name}
        </div>
      </TableCell>
      <TableCell>
        <Badge
          className="rounded-full font-bold text-white"
          style={{ backgroundColor: LEVEL_COLORS[student.level] || "#94a3b8" }}
        >
          {student.levelLabel}
        </Badge>
      </TableCell>
      <TableCell className="font-bold">{student.points}</TableCell>
      <TableCell className="font-bold">{student.avgScore}%</TableCell>
      <TableCell className="font-bold">{student.storiesCompleted}</TableCell>
      <TableCell className="font-bold">{student.testsCompleted}</TableCell>
      <TableCell className="font-bold">{student.progress}%</TableCell>
      <TableCell className="text-muted-foreground">{student.note}</TableCell>
    </TableRow>
  );
}
