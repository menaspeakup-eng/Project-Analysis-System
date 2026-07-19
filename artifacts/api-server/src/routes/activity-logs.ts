import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, desc, and } from "drizzle-orm";
import { db, studentsTable, activityLogsTable } from "@workspace/db";
import { requireAdmin } from "../lib/identity";
import { getOrCreateStudent } from "./student";

const router: IRouter = Router();

router.get("/activity-logs", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const student = await getOrCreateStudent(userId);
  const logs = await db.query.activityLogsTable.findMany({
    where: eq(activityLogsTable.studentId, student.id),
    orderBy: desc(activityLogsTable.createdAt),
    limit: 100,
  });

  res.json({ logs });
});

router.get("/admin/activity-logs/:studentId", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const student = await getOrCreateStudent(userId);
  requireAdmin({
    userId,
    email: student.email || "",
    student,
    isAdmin: student.email?.toLowerCase() === "menaspeakup@gmail.com" || student.role === "admin",
    isTeacher: student.role === "teacher",
    teacherClassIds: [],
  });

  const targetStudentId = Number(req.params.studentId);
  if (!Number.isFinite(targetStudentId)) {
    res.status(400).json({ error: "معرّف الطالب غير صالح" });
    return;
  }

  const logs = await db.query.activityLogsTable.findMany({
    where: eq(activityLogsTable.studentId, targetStudentId),
    orderBy: desc(activityLogsTable.createdAt),
    limit: 200,
  });

  res.json({ logs });
});

export default router;
