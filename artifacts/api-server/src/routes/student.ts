import { Router, type IRouter } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { z } from "zod";
import {
  db,
  studentsTable,
  classesTable,
  dailyChallengesTable,
  studentChallengeCompletionsTable,
  avatarConfigSchema,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  GetStudentProfileResponse,
  UpdateStudentAvatarBody,
  UpdateStudentAvatarResponse,
  GetDailyChallengeResponse,
  CompleteDailyChallengeResponse,
} from "@workspace/api-zod";
import { dailyChallengeBank, bankIndexForDate } from "../lib/dailyChallengeBank";
import { isAccessoriesUnlocked, isPetUnlocked } from "../lib/avatarUnlocks";

const router: IRouter = Router();

const UpdateStudentNameBody = z.object({
  name: z.string().min(1).max(120),
});

async function getOrCreateStudent(userId: string) {
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

  const [created] = await db
    .insert(studentsTable)
    .values({
      clerkUserId: userId,
      name,
      email,
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
    name: student.name,
    points: student.points,
    avatarConfig: avatarConfigSchema.parse(student.avatarConfig),
    classId: student.classId,
    className,
    teacherName,
    teacherEmail,
  };
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

async function getOrCreateTodayChallenge(classId: number) {
  const forDate = todayDateString();
  const existing = await db.query.dailyChallengesTable.findFirst({
    where: and(
      eq(dailyChallengesTable.classId, classId),
      eq(dailyChallengesTable.forDate, forDate),
    ),
  });
  if (existing) return existing;

  const bankEntry = dailyChallengeBank[bankIndexForDate(new Date(), classId)];
  const [created] = await db
    .insert(dailyChallengesTable)
    .values({ forDate, classId, ...bankEntry })
    .onConflictDoNothing()
    .returning();

  if (created) return created;

  // Lost a race with a concurrent request — read back the row it created.
  const raceWinner = await db.query.dailyChallengesTable.findFirst({
    where: and(
      eq(dailyChallengesTable.classId, classId),
      eq(dailyChallengesTable.forDate, forDate),
    ),
  });
  return raceWinner!;
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

  const profile = await enrichStudentProfile(updated);
  const data = GetStudentProfileResponse.parse(profile);
  res.json(data);
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

  const profile = await enrichStudentProfile(updated);
  const data = UpdateStudentAvatarResponse.parse(profile);
  res.json(data);
});

router.get("/student/daily-challenge", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const student = await getOrCreateStudent(userId);
  if (!student.classId) {
    res.status(404).json({ error: "لم يُخصص لك صف بعد — تواصل مع معلمك." });
    return;
  }

  const challenge = await getOrCreateTodayChallenge(student.classId);

  const completion = await db.query.studentChallengeCompletionsTable.findFirst({
    where: and(
      eq(studentChallengeCompletionsTable.studentId, student.id),
      eq(studentChallengeCompletionsTable.challengeId, challenge.id),
    ),
  });

  const data = GetDailyChallengeResponse.parse({
    title: challenge.title,
    description: challenge.description,
    pointsReward: challenge.pointsReward,
    completed: !!completion,
  });
  res.json(data);
});

router.post("/student/daily-challenge/complete", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const student = await getOrCreateStudent(userId);
  if (!student.classId) {
    res.status(404).json({ error: "لم يُخصص لك صف بعد — تواصل مع معلمك." });
    return;
  }

  const challenge = await getOrCreateTodayChallenge(student.classId);

  const existingCompletion = await db.query.studentChallengeCompletionsTable.findFirst({
    where: and(
      eq(studentChallengeCompletionsTable.studentId, student.id),
      eq(studentChallengeCompletionsTable.challengeId, challenge.id),
    ),
  });

  if (existingCompletion) {
    const data = CompleteDailyChallengeResponse.parse({
      alreadyCompleted: true,
      pointsAwarded: 0,
      totalPoints: student.points,
    });
    res.json(data);
    return;
  }

  const [insertedCompletion] = await db
    .insert(studentChallengeCompletionsTable)
    .values({ studentId: student.id, challengeId: challenge.id })
    .onConflictDoNothing()
    .returning();

  if (!insertedCompletion) {
    // Lost a race with a concurrent completion request for the same challenge.
    const data = CompleteDailyChallengeResponse.parse({
      alreadyCompleted: true,
      pointsAwarded: 0,
      totalPoints: student.points,
    });
    res.json(data);
    return;
  }

  const [updatedStudent] = await db
    .update(studentsTable)
    .set({ points: student.points + challenge.pointsReward })
    .where(eq(studentsTable.id, student.id))
    .returning();

  const data = CompleteDailyChallengeResponse.parse({
    alreadyCompleted: false,
    pointsAwarded: challenge.pointsReward,
    totalPoints: updatedStudent.points,
  });
  res.json(data);
});

export default router;
