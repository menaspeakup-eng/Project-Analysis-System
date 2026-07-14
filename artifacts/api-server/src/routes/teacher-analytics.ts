import { Router, type IRouter } from "express";
import { z } from "zod";
import {
  db,
  studentsTable,
  classesTable,
  activityLogsTable,
  aiStoryQuizSubmissionsTable,
  librarySubmissionsTable,
  studentGameSessionsTable,
} from "@workspace/db";
import { eq, inArray, and, gte, lte, sql, count, avg, asc } from "drizzle-orm";
import {
  resolveIdentity,
  requireIdentity,
  requireTeacher,
} from "../lib/identity";

const router: IRouter = Router();

const DateRangeQuery = z.object({
  classId: z.coerce.number().int().optional(),
  from: z.coerce.string().optional(),
  to: z.coerce.string().optional(),
});

function parseDateRange(query: z.infer<typeof DateRangeQuery>) {
  const now = new Date();
  let from: Date;
  let to: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (query.from && query.to) {
    from = new Date(query.from);
    to = new Date(query.to);
    to.setHours(23, 59, 59, 999);
  } else {
    // Default to last 30 days if no range provided.
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
  }

  return { from, to };
}

export function classifyStudentLevel(avgScore: number) {
  if (avgScore >= 90) return "excellent" as const;
  if (avgScore >= 75) return "very_good" as const;
  if (avgScore >= 60) return "good" as const;
  if (avgScore >= 40) return "needs_improvement" as const;
  return "needs_follow_up" as const;
}

export function levelLabel(level: ReturnType<typeof classifyStudentLevel>) {
  switch (level) {
    case "excellent": return "ممتاز";
    case "very_good": return "جيد جداً";
    case "good": return "جيد";
    case "needs_improvement": return "يحتاج تحسين";
    case "needs_follow_up": return "يحتاج متابعة";
  }
}

export function levelNote(level: ReturnType<typeof classifyStudentLevel>) {
  switch (level) {
    case "excellent": return "أداء ممتاز";
    case "very_good": return "أداء قوي";
    case "good": return "أداء جيد";
    case "needs_improvement": return "يحتاج إلى مزيد من التمرين";
    case "needs_follow_up": return "يحتاج إلى تدريب إضافي";
  }
}

router.get("/teacher/analytics", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireTeacher(identity);

  const query = DateRangeQuery.parse(req.query);
  const { from, to } = parseDateRange(query);

  const requestedClassId = query.classId;
  const teacherId =
    identity.isAdmin && req.query.teacherId
      ? Number(req.query.teacherId)
      : identity.student.id;

  // Resolve which classes the teacher can see.
  const classesQuery = await db.query.classesTable.findMany({
    where: eq(classesTable.teacherId, teacherId),
    orderBy: [asc(classesTable.id)],
  });
  const classIds = requestedClassId
    ? classesQuery.filter((c) => c.id === requestedClassId).map((c) => c.id)
    : classesQuery.map((c) => c.id);

  if (classIds.length === 0) {
    res.json({
      summary: {
        totalStudents: 0,
        activeStudents: 0,
        avgPoints: 0,
        avgScore: 0,
        storiesCompleted: 0,
        testsCompleted: 0,
        successRate: 0,
      },
      charts: { dailyActivity: [], studentPerformance: [], levelDistribution: [] },
      students: [],
      period: { from: from.toISOString(), to: to.toISOString() },
    });
    return;
  }

  const students = await db.query.studentsTable.findMany({
    where: inArray(studentsTable.classId, classIds),
  });
  const studentIds = students.map((s) => s.id);

  // Activity in the selected period.
  const activityInPeriod = studentIds.length
    ? await db.query.activityLogsTable.findMany({
        where: and(
          inArray(activityLogsTable.studentId, studentIds),
          gte(activityLogsTable.createdAt, from),
          lte(activityLogsTable.createdAt, to),
        ),
      })
    : [];

  const activeStudentIds = new Set(activityInPeriod.map((a) => a.studentId));

  // AI story quizzes in period.
  const storyQuizzes = studentIds.length
    ? await db.query.aiStoryQuizSubmissionsTable.findMany({
        where: and(
          inArray(aiStoryQuizSubmissionsTable.studentId, studentIds),
          gte(aiStoryQuizSubmissionsTable.createdAt, from),
          lte(aiStoryQuizSubmissionsTable.createdAt, to),
        ),
      })
    : [];

  // Library submissions in period.
  const librarySubmissions = studentIds.length
    ? await db.query.librarySubmissionsTable.findMany({
        where: and(
          inArray(librarySubmissionsTable.studentId, studentIds),
          gte(librarySubmissionsTable.createdAt, from),
          lte(librarySubmissionsTable.createdAt, to),
        ),
      })
    : [];

  // Game sessions in period.
  const gameSessions = studentIds.length
    ? await db.query.studentGameSessionsTable.findMany({
        where: and(
          inArray(studentGameSessionsTable.studentId, studentIds),
          gte(studentGameSessionsTable.completedAt, from),
          lte(studentGameSessionsTable.completedAt, to),
        ),
      })
    : [];

  // Story completions from activity logs (fallback to quizzes when no explicit log).
  const storyCompleteLogs = activityInPeriod.filter((a) => a.type === "story_complete");
  const storiesCompleted = storyCompleteLogs.length || new Set(storyQuizzes.map((q) => q.sessionId)).size;

  // Tests = quizzes + library submissions + quiz_complete activity logs.
  const quizCompleteLogs = activityInPeriod.filter((a) => a.type === "quiz_complete");
  const testsCompleted = quizCompleteLogs.length + storyQuizzes.length + librarySubmissions.length;

  // Score aggregates.
  const allScores = [
    ...storyQuizzes.map((q) => ({ max: q.maxScore, score: q.score })),
    ...librarySubmissions.map((s) => ({ max: s.maxScore, score: s.score })),
  ];
  const successRate = allScores.length
    ? Math.round((allScores.reduce((sum, s) => sum + (s.max > 0 ? (s.score / s.max) * 100 : 0), 0) / allScores.length))
    : 0;

  // Per-student metrics.
  const studentsById = new Map(students.map((s) => [s.id, s]));
  const metricsByStudent = new Map<
    number,
    {
      stories: number;
      quizzes: number;
      librarySubmissions: number;
      games: number;
      scoreSum: number;
      scoreMaxSum: number;
    }
  >();

  function initMetrics(studentId: number) {
    if (!metricsByStudent.has(studentId)) {
      metricsByStudent.set(studentId, {
        stories: 0,
        quizzes: 0,
        librarySubmissions: 0,
        games: 0,
        scoreSum: 0,
        scoreMaxSum: 0,
      });
    }
    return metricsByStudent.get(studentId)!;
  }

  storyCompleteLogs.forEach((log) => {
    initMetrics(log.studentId).stories += 1;
  });
  storyQuizzes.forEach((q) => {
    const m = initMetrics(q.studentId);
    m.quizzes += 1;
    m.scoreSum += q.score;
    m.scoreMaxSum += q.maxScore;
  });
  librarySubmissions.forEach((s) => {
    const m = initMetrics(s.studentId);
    m.librarySubmissions += 1;
    m.scoreSum += s.score;
    m.scoreMaxSum += s.maxScore;
  });
  quizCompleteLogs.forEach((log) => {
    initMetrics(log.studentId).quizzes += 1;
  });
  gameSessions.forEach((g) => {
    initMetrics(g.studentId).games += 1;
  });

  // Daily activity (all activity logs grouped by date).
  const dailyMap = new Map<string, number>();
  for (const log of activityInPeriod) {
    const date = new Date(log.createdAt).toISOString().split("T")[0];
    dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
  }
  const dailyActivity = Array.from(dailyMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const studentRows = students.map((student) => {
    const m = metricsByStudent.get(student.id) || {
      stories: 0,
      quizzes: 0,
      librarySubmissions: 0,
      games: 0,
      scoreSum: 0,
      scoreMaxSum: 0,
    };
    const totalTests = m.quizzes + m.librarySubmissions;
    const avgScore = m.scoreMaxSum > 0 ? Math.round((m.scoreSum / m.scoreMaxSum) * 100) : 0;
    const progress = avgScore; // Progress proxy: correctness rate.
    const level = classifyStudentLevel(avgScore);

    return {
      id: student.id,
      name: student.name,
      imageUrl: student.imageUrl,
      points: student.points,
      storiesCompleted: m.stories,
      testsCompleted: totalTests,
      avgScore,
      progress,
      level,
      levelLabel: levelLabel(level),
      note: levelNote(level),
    };
  });

  const levelDistribution = [
    { level: "excellent", label: "ممتاز", count: 0 },
    { level: "very_good", label: "جيد جداً", count: 0 },
    { level: "good", label: "جيد", count: 0 },
    { level: "needs_improvement", label: "يحتاج تحسين", count: 0 },
    { level: "needs_follow_up", label: "يحتاج متابعة", count: 0 },
  ];
  for (const row of studentRows) {
    const bucket = levelDistribution.find((b) => b.level === row.level);
    if (bucket) bucket.count += 1;
  }

  const studentPerformance = studentRows
    .map((s) => ({ studentId: s.id, name: s.name, score: s.avgScore }))
    .sort((a, b) => b.score - a.score);

  const avgPoints = students.length
    ? Math.round(students.reduce((sum, s) => sum + s.points, 0) / students.length)
    : 0;
  const avgScore = studentRows.length
    ? Math.round(studentRows.reduce((sum, s) => sum + s.avgScore, 0) / studentRows.length)
    : 0;

  const summary = {
    totalStudents: students.length,
    activeStudents: activeStudentIds.size,
    avgPoints,
    avgScore,
    storiesCompleted,
    testsCompleted,
    successRate,
  };

  res.json({
    summary,
    charts: {
      dailyActivity,
      studentPerformance,
      levelDistribution,
    },
    students: studentRows,
    period: { from: from.toISOString(), to: to.toISOString() },
  });
});

export default router;
