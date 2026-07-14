import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, studentsTable, classesTable, usersTable } from "@workspace/db";
import { eq, isNull, asc, or } from "drizzle-orm";
import {
  resolveIdentity,
  requireIdentity,
  requireAdmin,
  normalizeEmail,
} from "../lib/identity";
import type { AdminUser, AdminUserRole } from "@workspace/api-zod/types";

const router: IRouter = Router();

const ToggleTeacherBody = z.object({
  email: z.string().email(),
  isTeacher: z.boolean(),
});

const CreateClassBody = z.object({
  name: z.string().min(1).max(120),
  teacherId: z.number().int().optional(),
});

const UpdateClassBody = z.object({
  name: z.string().min(1).max(120).optional(),
  teacherId: z.number().int().nullable().optional(),
});

const MoveStudentBody = z.object({
  classId: z.number().int().nullable(),
});

function formatAdminClass(
  cls: typeof classesTable.$inferSelect,
  allStudents: typeof studentsTable.$inferSelect[],
  teachersById: Map<number, typeof studentsTable.$inferSelect>,
) {
  const teacher = cls.teacherId ? teachersById.get(cls.teacherId) ?? null : null;
  return {
    id: cls.id,
    name: cls.name,
    teacherId: cls.teacherId,
    teacherName: teacher?.name ?? null,
    teacherEmail: teacher?.email ?? null,
    isChatEnabled: cls.isChatEnabled,
    students: allStudents
      .filter((s) => s.classId === cls.id)
      .map((s) => ({
        id: s.id,
        replitUserId: s.replitUserId,
        name: s.name,
        email: s.email,
        points: s.points,
        avatarConfig: s.avatarConfig,
      })),
  };
}

async function getOrCreateStudentByEmail(email: string) {
  const normalized = normalizeEmail(email);

  let student = await db.query.studentsTable.findFirst({
    where: eq(studentsTable.email, normalized),
  });

  if (student) return student;

  // Create a placeholder row. When the user signs in with the same email,
  // the Replit Auth callback will link it by email and backfill replitUserId.
  const [created] = await db
    .insert(studentsTable)
    .values({
      name: normalized,
      email: normalized,
      role: "student",
      nameConfirmed: false,
    })
    .returning();
  return created;
}

router.get("/admin/users", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireAdmin(identity);

  const dbStudents = await db.query.studentsTable.findMany();
  const dbUsers = await db.query.usersTable.findMany();

  const studentsByReplitId = new Map(
    dbStudents.filter((s) => s.replitUserId).map((s) => [s.replitUserId!, s]),
  );
  const studentsByEmail = new Map(
    dbStudents.map((s) => [normalizeEmail(s.email || ""), s]),
  );

  // Start with every signed-in Replit Auth user, enriched by their student row.
  const users: AdminUser[] = dbUsers.map((u) => {
    const student =
      studentsByReplitId.get(u.id) ||
      studentsByEmail.get(normalizeEmail(u.email || "")) ||
      null;
    return {
      studentId: student?.id ?? null,
      replitUserId: u.id,
      email: normalizeEmail(u.email || ""),
      name: student?.name ?? u.firstName ?? u.email ?? "",
      imageUrl: student?.imageUrl ?? u.profileImageUrl ?? null,
      role: (student?.role ?? "student") as AdminUserRole,
      nameConfirmed: student?.nameConfirmed ?? false,
      classId: student?.classId ?? null,
      className: null,
    };
  });

  // Also include placeholder students that haven't signed in yet so admin can
  // assign them to classes or promote them before first login.
  for (const s of dbStudents) {
    if (!s.replitUserId) {
      users.push({
        studentId: s.id,
        replitUserId: null,
        email: normalizeEmail(s.email || ""),
        name: s.name,
        imageUrl: s.imageUrl ?? null,
        role: s.role as AdminUserRole,
        nameConfirmed: s.nameConfirmed,
        classId: s.classId ?? null,
        className: null,
      });
    }
  }

  const classes = await db.query.classesTable.findMany();
  const classById = new Map(classes.map((c) => [c.id, c]));
  const usersWithClassName = users.map((u) => {
    if (!u.classId) return u;
    const cls = classById.get(u.classId);
    return { ...u, className: cls?.name ?? null };
  });

  res.json({ users: usersWithClassName });
});

router.post("/admin/teachers", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireAdmin(identity);

  const body = ToggleTeacherBody.parse(req.body);
  const student = await getOrCreateStudentByEmail(body.email);
  if (!student) {
    res.status(404).json({ error: "لم يُعثر على مستخدم بهذا البريد" });
    return;
  }

  const newRole = body.isTeacher ? "teacher" : "student";

  let defaultClassId: number | null = null;
  if (body.isTeacher) {
    const existingClasses = await db.query.classesTable.findMany({
      where: eq(classesTable.teacherId, student.id),
    });
    if (existingClasses.length === 0) {
      const [cls] = await db
        .insert(classesTable)
        .values({ name: `فصل ${student.name}`, teacherId: student.id })
        .returning();
      defaultClassId = cls.id;
    }
  } else {
    await db
      .update(classesTable)
      .set({ teacherId: null })
      .where(eq(classesTable.teacherId, student.id));
  }

  const [updated] = await db
    .update(studentsTable)
    .set({ role: newRole, classId: defaultClassId ?? student.classId })
    .where(eq(studentsTable.id, student.id))
    .returning();

  let className: string | null = null;
  if (updated.classId) {
    const cls = await db.query.classesTable.findFirst({
      where: eq(classesTable.id, updated.classId),
    });
    className = cls?.name ?? null;
  }

  res.json({
    studentId: updated.id,
    replitUserId: updated.replitUserId,
    email: normalizeEmail(updated.email || ""),
    name: updated.name,
    imageUrl: updated.imageUrl ?? null,
    role: updated.role,
    nameConfirmed: updated.nameConfirmed,
    classId: updated.classId,
    className,
  });
});

router.get("/admin/classes", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireAdmin(identity);

  const classes = await db.query.classesTable.findMany({
    orderBy: [asc(classesTable.id)],
  });

  const allStudents = await db.query.studentsTable.findMany();
  const teachersById = new Map(
    allStudents
      .filter((s) => s.role === "teacher")
      .map((s) => [s.id, s]),
  );

  res.json({ classes: classes.map((cls) => formatAdminClass(cls, allStudents, teachersById)) });
});

router.post("/admin/classes", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireAdmin(identity);

  const body = CreateClassBody.parse(req.body);
  const [cls] = await db
    .insert(classesTable)
    .values({ name: body.name, teacherId: body.teacherId ?? null })
    .returning();

  const allStudents = await db.query.studentsTable.findMany();
  const teachersById = new Map(
    allStudents
      .filter((s) => s.role === "teacher")
      .map((s) => [s.id, s]),
  );

  res.json(formatAdminClass(cls, allStudents, teachersById));
});

router.patch("/admin/classes/:id", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireAdmin(identity);

  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "معرف الصف غير صالح" });
    return;
  }

  const body = UpdateClassBody.parse(req.body);
  const update: Partial<{ name: string; teacherId: number | null }> = {};
  if (body.name !== undefined) update.name = body.name;
  if (body.teacherId !== undefined) update.teacherId = body.teacherId;

  const [updated] = await db
    .update(classesTable)
    .set(update)
    .where(eq(classesTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "الصف غير موجود" });
    return;
  }

  const allStudents = await db.query.studentsTable.findMany();
  const teachersById = new Map(
    allStudents
      .filter((s) => s.role === "teacher")
      .map((s) => [s.id, s]),
  );

  res.json(formatAdminClass(updated, allStudents, teachersById));
});

router.delete("/admin/classes/:id", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireAdmin(identity);

  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "معرف الصف غير صالح" });
    return;
  }

  const cls = await db.query.classesTable.findFirst({
    where: eq(classesTable.id, id),
  });
  if (!cls) {
    res.status(404).json({ error: "الصف غير موجود" });
    return;
  }

  await db
    .update(studentsTable)
    .set({ classId: null })
    .where(eq(studentsTable.classId, id));

  await db.delete(classesTable).where(eq(classesTable.id, id));

  res.status(204).send();
});

router.patch("/admin/students/:id/class", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireAdmin(identity);

  const studentId = Number(req.params.id);
  if (!Number.isFinite(studentId)) {
    res.status(400).json({ error: "معرف الطالب غير صالح" });
    return;
  }

  const body = MoveStudentBody.parse(req.body);

  if (body.classId) {
    const cls = await db.query.classesTable.findFirst({
      where: eq(classesTable.id, body.classId),
    });
    if (!cls) {
      res.status(404).json({ error: "الصف غير موجود" });
      return;
    }
  }

  const [updated] = await db
    .update(studentsTable)
    .set({ classId: body.classId ?? null })
    .where(eq(studentsTable.id, studentId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "الطالب غير موجود" });
    return;
  }

  res.json({
    id: updated.id,
    classId: updated.classId,
  });
});

export default router;
