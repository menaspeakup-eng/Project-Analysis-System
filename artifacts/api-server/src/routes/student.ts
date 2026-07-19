import { Router, type IRouter } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { z } from "zod";
import {
  db,
  studentsTable,
  classesTable,
  avatarConfigSchema,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  GetStudentProfileResponse,
  UpdateStudentAvatarBody,
  UpdateStudentAvatarResponse,
} from "@workspace/api-zod";
import { isAccessoriesUnlocked, isPetUnlocked } from "../lib/avatarUnlocks";
import { logActivity } from "../lib/activity-logs";

const router: IRouter = Router();

const UpdateStudentNameBody = z.object({
  name: z.string().min(1).max(120),
});

export async function getOrCreateStudent(userId: string) {
  const existing = await db.query.studentsTable.findFirst({
    where: eq(studentsTable.clerkUserId, userId),
  });
  if (existing) return existing;

  // First visit for this Clerk account — JIT-provision a student row.
  const clerkUser = await clerkClient.users.getUser(userId);
  const name =
    clerkUser.fullName ||
    clerkUser.firstName ||
    clerkUser.primaryEmailAddress?.emailAddress ||
    "صديقنا البطل";
  const email = clerkUser.primaryEmailAddress?.emailAddress || null;
  const imageUrl = clerkUser.imageUrl || null;

  const [created] = await db
    .insert(studentsTable)
    .values({
      clerkUserId: userId,
      name,
      email,
      imageUrl,
      role: "student",
      nameConfirmed: false,
      points: 0,
    })
    .returning();
  return created;
}

async function enrichStudentProfile(student: typeof studentsTable.$inferSelect) {
  let className: string | null = null;
  let teacherName: string | null = null;
  let teacherEmail: string | null = null;

  if (student.classId) {
    const cls = await db.query.classesTable.findFirst({
      where: eq(classesTable.id, student.classId),
    });
    if (cls) {
      className = cls.name;
      if (cls.teacherId) {
        const teacher = await db.query.studentsTable.findFirst({
          where: eq(studentsTable.id, cls.teacherId),
        });
        if (teacher) {
          teacherName = teacher.name;
          teacherEmail = teacher.email;
        }
      }
    }
  }

  return {
    id: student.id,
    name: student.name,
    points: student.points,
    avatarConfig: avatarConfigSchema.parse(student.avatarConfig),
    classId: student.classId,
    className,
    teacherName,
    teacherEmail,
    imageUrl: student.imageUrl,
  };
}

router.get("/student/me", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const student = await getOrCreateStudent(userId);
  const profile = await enrichStudentProfile(student);
  const data = GetStudentProfileResponse.parse(profile);
  res.json(data);
});

router.patch("/student/me", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body = UpdateStudentNameBody.parse(req.body);
  const student = await getOrCreateStudent(userId);

  const [updated] = await db
    .update(studentsTable)
    .set({ name: body.name, nameConfirmed: true })
    .where(eq(studentsTable.id, student.id))
    .returning();

  await logActivity(student.id, {
    type: "name_change",
    title: "غيّر الاسم",
    description: `تم تحديث الاسم إلى "${body.name}"`,
  });

  const profile = await enrichStudentProfile(updated);
  const data = GetStudentProfileResponse.parse(profile);
  res.json(data);
});

router.delete("/student/me", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const student = await getOrCreateStudent(userId);
  try {
    await clerkClient.users.deleteUser(userId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "فشل حذف حساب المستخدم";
    res.status(500).json({ error: message });
    return;
  }

  await db.delete(studentsTable).where(eq(studentsTable.id, student.id));
  res.json({ deleted: true });
});

router.patch("/student/avatar", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body = UpdateStudentAvatarBody.parse(req.body);
  const student = await getOrCreateStudent(userId);

  if (!isAccessoriesUnlocked(body.accessories, student.points)) {
    res.status(400).json({ error: "هذا الإكسسوار غير مفتوح بعد" });
    return;
  }
  if (!isPetUnlocked(body.pet, student.points)) {
    res.status(400).json({ error: "هذا الحيوان الأليف غير مفتوح بعد" });
    return;
  }

  const [updated] = await db
    .update(studentsTable)
    .set({ avatarConfig: body })
    .where(eq(studentsTable.id, student.id))
    .returning();

  await logActivity(student.id, {
    type: "avatar_change",
    title: "غيّر الشخصية الكرتونية",
    description: "تم تحديث مظهر الشخصية",
    metadata: JSON.stringify({ gender: body.gender }),
  });

  const profile = await enrichStudentProfile(updated);
  const data = UpdateStudentAvatarResponse.parse(profile);
  res.json(data);
});

export default router;
