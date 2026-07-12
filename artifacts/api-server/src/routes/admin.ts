import { Router, type IRouter } from "express";
import { clerkClient } from "@clerk/express";
import { z } from "zod";
import { db, studentsTable, classesTable } from "@workspace/db";
import { eq, isNull, asc } from "drizzle-orm";
import {
  resolveIdentity,
  requireIdentity,
  requireAdmin,
  normalizeEmail,
} from "../lib/identity";

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
    students: allStudents
      .filter((s) => s.classId === cls.id)
      .map((s) => ({
        id: s.id,
        clerkUserId: s.clerkUserId,
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

  // Row doesn't exist yet — find the Clerk user by email and provision a row.
  const clerkUsers = await clerkClient.users.getUserList({
    emailAddress: [normalized],
    limit: 1,
  });
  const clerkUser = clerkUsers.data?.[0];
  if (!clerkUser) {
    return null;
  }

  const name =
    clerkUser.fullName ||
    clerkUser.firstName ||
    clerkUser.primaryEmailAddress?.emailAddress ||
    "صديقنا البطل";

  const [created] = await db
    .insert(studentsTable)
    .values({
      clerkUserId: clerkUser.id,
      name,
      email: normalized,
      role: "student",
      nameConfirmed: false,
    })
    .returning();
  return created;
}

async function fetchAllClerkUsers() {
  const users: {
    id: string;
    email: string;
    name: string;
    imageUrl?: string;
  }[] = [];

  let offset = 0;
  const limit = 100;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const page = await clerkClient.users.getUserList({
      limit,
      offset,
      orderBy: "-created_at",
    });
    const rawUsers = Array.isArray(page) ? page : page.data;
    if (!rawUsers || rawUsers.length === 0) break;

    for (const u of rawUsers) {
      const email = u.primaryEmailAddress?.emailAddress;
      if (!email) continue;
      users.push({
        id: u.id,
        email: normalizeEmail(email),
        name: u.fullName || u.firstName || email,
        imageUrl: u.imageUrl,
      });
    }

    if (rawUsers.length < limit) break;
    offset += limit;
  }
  return users;
}

router.get("/admin/users", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireAdmin(identity);

  const clerkUsers = await fetchAllClerkUsers();

  const dbStudents = await db.query.studentsTable.findMany();
  const dbByClerkId = new Map(dbStudents.map((s) => [s.clerkUserId, s]));
  const dbByEmail = new Map(dbStudents.map((s) => [normalizeEmail(s.email || ""), s]));

  const users = clerkUsers.map((clerkUser) => {
    const student =
      dbByClerkId.get(clerkUser.id) ||
      dbByEmail.get(clerkUser.email) ||
      null;

    return {
      studentId: student?.id ?? null,
      clerkUserId: clerkUser.id,
      email: clerkUser.email,
      name: student?.name ?? clerkUser.name,
      imageUrl: clerkUser.imageUrl,
      role: student?.role ?? "student",
      nameConfirmed: student?.nameConfirmed ?? false,
      classId: student?.classId ?? null,
      className: null, // filled below if known
    };
  });

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

  // When promoting to teacher, create a default class if they don't have one.
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
    // Demoting: detach this teacher from any classes they owned.
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
    clerkUserId: updated.clerkUserId,
    email: normalizeEmail(updated.email || ""),
    name: updated.name,
    imageUrl: null,
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
