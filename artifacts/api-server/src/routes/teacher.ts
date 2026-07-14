import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, studentsTable, classesTable } from "@workspace/db";
import { eq, isNull, and, asc, inArray } from "drizzle-orm";
import {
  resolveIdentity,
  requireIdentity,
  requireTeacher,
} from "../lib/identity";

const router: IRouter = Router();

const UpdateTeacherStudentBody = z.object({
  name: z.string().min(1).max(120).optional(),
  points: z.number().int().optional(),
}).refine(
  (data) => data.name !== undefined || data.points !== undefined,
  { message: "يجب توفير اسم أو نقاط" },
);

const ClaimStudentBody = z.object({
  classId: z.number().int(),
});

function parseIntParam(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function getEffectiveTeacherId(
  identity: NonNullable<Awaited<ReturnType<typeof resolveIdentity>>>,
  req: { query?: Record<string, unknown> },
): number {
  const requestedTeacherId = req.query?.teacherId;
  if (identity.isAdmin && requestedTeacherId) {
    const id = typeof requestedTeacherId === "string" ? parseIntParam(requestedTeacherId) : Number(requestedTeacherId);
    if (id === null || !Number.isFinite(id)) {
      const err = new Error("معرف المعلم غير صالح") as Error & { status?: number };
      err.status = 400;
      throw err;
    }
    return id;
  }
  return identity.student.id;
}

router.get("/teacher/classes", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireTeacher(identity);

  const teacherId = getEffectiveTeacherId(identity, req);

  const classes = await db.query.classesTable.findMany({
    where: eq(classesTable.teacherId, teacherId),
    orderBy: [asc(classesTable.id)],
  });

  const classIds = classes.map((c) => c.id);
  const students = classIds.length
    ? await db.query.studentsTable.findMany({
        where: inArray(studentsTable.classId, classIds),
      })
    : [];

  const studentsByClass = new Map<number, typeof students>();
  for (const s of students) {
    if (!s.classId) continue;
    const list = studentsByClass.get(s.classId) || [];
    list.push(s);
    studentsByClass.set(s.classId, list);
  }

  const result = classes.map((cls) => ({
    id: cls.id,
    name: cls.name,
    teacherId: cls.teacherId,
    isChatEnabled: cls.isChatEnabled,
    students: (studentsByClass.get(cls.id) || []).map((s) => ({
      id: s.id,
      replitUserId: s.replitUserId,
      name: s.name,
      email: s.email,
      points: s.points,
      avatarConfig: s.avatarConfig,
    })),
  }));

  res.json({ classes: result });
});

router.get("/teacher/unclaimed", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireTeacher(identity);

  const unclaimed = await db.query.studentsTable.findMany({
    where: and(eq(studentsTable.role, "student"), isNull(studentsTable.classId)),
    orderBy: [asc(studentsTable.id)],
  });

  res.json({
    students: unclaimed.map((s) => ({
      id: s.id,
      replitUserId: s.replitUserId,
      name: s.name,
      email: s.email,
      points: s.points,
      avatarConfig: s.avatarConfig,
    })),
  });
});

router.post("/teacher/students/:id/claim", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireTeacher(identity);

  const teacherId = getEffectiveTeacherId(identity, req);
  const studentId = parseIntParam(req.params.id);
  if (studentId === null) {
    res.status(400).json({ error: "معرف الطالب غير صالح" });
    return;
  }

  const body = ClaimStudentBody.parse(req.body);

  const cls = await db.query.classesTable.findFirst({
    where: and(eq(classesTable.id, body.classId), eq(classesTable.teacherId, teacherId)),
  });
  if (!cls) {
    res.status(404).json({ error: "الصف غير موجود أو لا ينتمي لهذا المعلم" });
    return;
  }

  const student = await db.query.studentsTable.findFirst({
    where: eq(studentsTable.id, studentId),
  });
  if (!student) {
    res.status(404).json({ error: "الطالب غير موجود" });
    return;
  }
  if (student.classId) {
    res.status(400).json({ error: "الطالب مرتبط بصف آخر بالفعل" });
    return;
  }

  const [updated] = await db
    .update(studentsTable)
    .set({ classId: body.classId })
    .where(eq(studentsTable.id, studentId))
    .returning();

  res.json({
    id: updated.id,
    replitUserId: updated.replitUserId,
    name: updated.name,
    email: updated.email,
    points: updated.points,
    avatarConfig: updated.avatarConfig,
  });
});

router.patch("/teacher/students/:id", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireTeacher(identity);

  const teacherId = getEffectiveTeacherId(identity, req);
  const studentId = parseIntParam(req.params.id);
  if (studentId === null) {
    res.status(400).json({ error: "معرف الطالب غير صالح" });
    return;
  }

  const body = UpdateTeacherStudentBody.parse(req.body);

  const student = await db.query.studentsTable.findFirst({
    where: eq(studentsTable.id, studentId),
  });
  if (!student || !student.classId) {
    res.status(404).json({ error: "الطالب غير موجود أو غير مرتبط بصف" });
    return;
  }

  const cls = await db.query.classesTable.findFirst({
    where: and(eq(classesTable.id, student.classId), eq(classesTable.teacherId, teacherId)),
  });
  if (!cls) {
    res.status(403).json({ error: "لا يمكنك تعديل طالب من صف آخر" });
    return;
  }

  const update: Partial<{ name: string; points: number }> = {};
  if (body.name !== undefined) update.name = body.name;
  if (body.points !== undefined) update.points = body.points;

  const [updated] = await db
    .update(studentsTable)
    .set(update)
    .where(eq(studentsTable.id, studentId))
    .returning();

  res.json({
    id: updated.id,
    replitUserId: updated.replitUserId,
    name: updated.name,
    email: updated.email,
    points: updated.points,
    avatarConfig: updated.avatarConfig,
  });
});

router.delete("/teacher/students/:id/class", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireTeacher(identity);

  const teacherId = getEffectiveTeacherId(identity, req);
  const studentId = parseIntParam(req.params.id);
  if (studentId === null) {
    res.status(400).json({ error: "معرف الطالب غير صالح" });
    return;
  }

  const student = await db.query.studentsTable.findFirst({
    where: eq(studentsTable.id, studentId),
  });
  if (!student || !student.classId) {
    res.status(404).json({ error: "الطالب غير موجود أو غير مرتبط بصف" });
    return;
  }

  const cls = await db.query.classesTable.findFirst({
    where: and(eq(classesTable.id, student.classId), eq(classesTable.teacherId, teacherId)),
  });
  if (!cls) {
    res.status(403).json({ error: "لا يمكنك إزالة طالب من صف آخر" });
    return;
  }

  const [updated] = await db
    .update(studentsTable)
    .set({ classId: null })
    .where(eq(studentsTable.id, studentId))
    .returning();

  res.json({
    id: updated.id,
    classId: updated.classId,
  });
});

export default router;
