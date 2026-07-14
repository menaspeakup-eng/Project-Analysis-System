import { Router, type IRouter } from "express";
import { z } from "zod";
import {
  db,
  studentsTable,
  classesTable,
  dailyChallengesTable,
  studentChallengeCompletionsTable,
} from "@workspace/db";
import { eq, and, gt, sql, desc, asc, inArray, isNull } from "drizzle-orm";
import {
  resolveIdentity,
  requireIdentity,
  requireTeacher,
} from "../lib/identity";
import { logActivity } from "../lib/activity-logs";

const router: IRouter = Router();

const MAX_FILE_SIZE_BASE64 = 2 * 1024 * 1024; // 2 MB per file
const MAX_FILES_PER_SUBMISSION = 5;
const MAX_SUBMISSION_TEXT_LENGTH = 5000;

const SubmissionFileSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.string().min(1).max(100),
  data: z.string().min(1),
});

const CreateChallengeBody = z.object({
  classId: z.number().int(),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  instructions: z.string().max(2000).optional(),
  linkUrl: z.string().url().max(1000).optional().or(z.literal("")),
  pointsReward: z.number().int().min(0).max(1000),
  submissionType: z.enum(["text", "audio", "image", "file", "mixed"]),
});

const SubmitChallengeBody = z.object({
  submissionText: z.string().max(MAX_SUBMISSION_TEXT_LENGTH).optional().or(z.literal("")),
  submissionFiles: z
    .array(SubmissionFileSchema)
    .max(MAX_FILES_PER_SUBMISSION)
    .optional(),
});

const ReviewSubmissionBody = z.object({
  status: z.enum(["accepted", "rejected", "needs_revision"]),
  feedback: z.string().max(1000).optional().or(z.literal("")),
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
    const id =
      typeof requestedTeacherId === "string"
        ? parseIntParam(requestedTeacherId)
        : Number(requestedTeacherId);
    if (id === null || !Number.isFinite(id)) {
      const err = new Error("معرف المعلم غير صالح") as Error & {
        status?: number;
      };
      err.status = 400;
      throw err;
    }
    return id;
  }
  return identity.student.id;
}

function now(): Date {
  return new Date();
}

// Teacher: create a new challenge for one of their classes.
router.post("/teacher/challenges", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireTeacher(identity);

  const teacherId = getEffectiveTeacherId(identity, req);
  const body = CreateChallengeBody.parse(req.body);

  const cls = await db.query.classesTable.findFirst({
    where: and(eq(classesTable.id, body.classId), eq(classesTable.teacherId, teacherId)),
  });
  if (!cls) {
    res.status(403).json({ error: "لا يمكنك إنشاء تحدي لصف لا تملكه" });
    return;
  }

  const publishedAt = now();
  const expiresAt = new Date(publishedAt.getTime() + 24 * 60 * 60 * 1000);

  const [challenge] = await db
    .insert(dailyChallengesTable)
    .values({
      classId: body.classId,
      teacherId,
      title: body.title,
      description: body.description,
      instructions: body.instructions || null,
      linkUrl: body.linkUrl || null,
      pointsReward: body.pointsReward,
      submissionType: body.submissionType,
      publishedAt,
      expiresAt,
      isDeleted: false,
    })
    .returning();

  res.status(201).json({
    id: challenge.id,
    classId: challenge.classId,
    teacherId: challenge.teacherId,
    title: challenge.title,
    description: challenge.description,
    instructions: challenge.instructions,
    linkUrl: challenge.linkUrl,
    pointsReward: challenge.pointsReward,
    submissionType: challenge.submissionType,
    publishedAt: challenge.publishedAt,
    expiresAt: challenge.expiresAt,
    isDeleted: challenge.isDeleted,
  });
});

// Teacher: list all challenges for their classes (including expired ones).
router.get("/teacher/challenges", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireTeacher(identity);

  const teacherId = getEffectiveTeacherId(identity, req);

  const classes = await db.query.classesTable.findMany({
    where: eq(classesTable.teacherId, teacherId),
    orderBy: [asc(classesTable.id)],
  });
  const classIds = classes.map((c) => c.id);

  const challenges = classIds.length
    ? await db.query.dailyChallengesTable.findMany({
        where: and(
          inArray(dailyChallengesTable.classId, classIds),
          eq(dailyChallengesTable.isDeleted, false),
        ),
        orderBy: [desc(dailyChallengesTable.publishedAt)],
      })
    : [];

  const challengeIds = challenges.map((c) => c.id);

  const submissions = challengeIds.length
    ? await db.query.studentChallengeCompletionsTable.findMany({
        where: inArray(studentChallengeCompletionsTable.challengeId, challengeIds),
      })
    : [];

  const countsByChallenge = new Map<number, { pending: number; accepted: number; rejected: number; needsRevision: number }>();
  for (const s of submissions) {
    const existing = countsByChallenge.get(s.challengeId) || { pending: 0, accepted: 0, rejected: 0, needsRevision: 0 };
    if (s.status === "pending") existing.pending++;
    else if (s.status === "accepted") existing.accepted++;
    else if (s.status === "rejected") existing.rejected++;
    else if (s.status === "needs_revision") existing.needsRevision++;
    countsByChallenge.set(s.challengeId, existing);
  }

  const result = challenges.map((c) => ({
    id: c.id,
    classId: c.classId,
    className: classes.find((cls) => cls.id === c.classId)?.name ?? null,
    title: c.title,
    description: c.description,
    instructions: c.instructions,
    linkUrl: c.linkUrl,
    pointsReward: c.pointsReward,
    submissionType: c.submissionType,
    publishedAt: c.publishedAt,
    expiresAt: c.expiresAt,
    isExpired: c.expiresAt < now(),
    counts: countsByChallenge.get(c.id) || { pending: 0, accepted: 0, rejected: 0, needsRevision: 0 },
  }));

  res.json({ challenges: result });
});

// Teacher: soft-delete a challenge.
router.delete("/teacher/challenges/:id", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireTeacher(identity);

  const teacherId = getEffectiveTeacherId(identity, req);
  const challengeId = parseIntParam(req.params.id);
  if (challengeId === null) {
    res.status(400).json({ error: "معرف التحدي غير صالح" });
    return;
  }

  const challenge = await db.query.dailyChallengesTable.findFirst({
    where: eq(dailyChallengesTable.id, challengeId),
  });
  if (!challenge) {
    res.status(404).json({ error: "التحدي غير موجود" });
    return;
  }

  const cls = await db.query.classesTable.findFirst({
    where: and(eq(classesTable.id, challenge.classId), eq(classesTable.teacherId, teacherId)),
  });
  if (!cls) {
    res.status(403).json({ error: "لا يمكنك حذف تحدي لصف لا تملكه" });
    return;
  }

  await db
    .update(dailyChallengesTable)
    .set({ isDeleted: true })
    .where(eq(dailyChallengesTable.id, challengeId));

  res.status(204).send();
});

// Teacher: list all submissions for a challenge.
router.get("/teacher/challenges/:id/submissions", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireTeacher(identity);

  const teacherId = getEffectiveTeacherId(identity, req);
  const challengeId = parseIntParam(req.params.id);
  if (challengeId === null) {
    res.status(400).json({ error: "معرف التحدي غير صالح" });
    return;
  }

  const challenge = await db.query.dailyChallengesTable.findFirst({
    where: and(
      eq(dailyChallengesTable.id, challengeId),
      eq(dailyChallengesTable.isDeleted, false),
    ),
  });
  if (!challenge) {
    res.status(404).json({ error: "التحدي غير موجود" });
    return;
  }

  const cls = await db.query.classesTable.findFirst({
    where: and(eq(classesTable.id, challenge.classId), eq(classesTable.teacherId, teacherId)),
  });
  if (!cls) {
    res.status(403).json({ error: "لا يمكنك مراجعة تحدي لصف لا تملكه" });
    return;
  }

  const submissions = await db.query.studentChallengeCompletionsTable.findMany({
    where: eq(studentChallengeCompletionsTable.challengeId, challengeId),
    orderBy: [desc(studentChallengeCompletionsTable.completedAt)],
  });

  const studentIds = submissions.map((s) => s.studentId);
  const students = studentIds.length
    ? await db.query.studentsTable.findMany({
        where: inArray(studentsTable.id, studentIds),
      })
    : [];
  const studentsById = new Map(students.map((s) => [s.id, s]));

  const result = submissions.map((s) => {
    const student = studentsById.get(s.studentId);
    return {
      id: s.id,
      studentId: s.studentId,
      studentName: student?.name ?? "طالب غير معروف",
      status: s.status,
      submissionText: s.submissionText,
      submissionFiles: s.submissionFiles,
      teacherFeedback: s.teacherFeedback,
      reviewedAt: s.reviewedAt,
      completedAt: s.completedAt,
      pointsAwarded: s.pointsAwarded,
    };
  });

  res.json({ submissions: result });
});

// Teacher: accept or reject a submission.
router.post("/teacher/submissions/:id/review", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireTeacher(identity);

  const teacherId = getEffectiveTeacherId(identity, req);
  const submissionId = parseIntParam(req.params.id);
  if (submissionId === null) {
    res.status(400).json({ error: "معرف الإجابة غير صالح" });
    return;
  }

  const body = ReviewSubmissionBody.parse(req.body);

  const submission = await db.query.studentChallengeCompletionsTable.findFirst({
    where: eq(studentChallengeCompletionsTable.id, submissionId),
  });
  if (!submission) {
    res.status(404).json({ error: "الإجابة غير موجودة" });
    return;
  }

  const challenge = await db.query.dailyChallengesTable.findFirst({
    where: eq(dailyChallengesTable.id, submission.challengeId),
  });
  if (!challenge) {
    res.status(404).json({ error: "التحدي غير موجود" });
    return;
  }

  const cls = await db.query.classesTable.findFirst({
    where: and(eq(classesTable.id, challenge.classId), eq(classesTable.teacherId, teacherId)),
  });
  if (!cls) {
    res.status(403).json({ error: "لا يمكنك مراجعة إجابة لصف لا تملكه" });
    return;
  }

  if (submission.status === "accepted") {
    res.status(400).json({ error: "لا يمكن مراجعة إجابة تم قبولها مسبقاً" });
    return;
  }

  let pointsAwarded: number | null = null;

  if (body.status === "accepted") {
    const student = await db.query.studentsTable.findFirst({
      where: eq(studentsTable.id, submission.studentId),
    });
    if (!student) {
      res.status(404).json({ error: "الطالب غير موجود" });
      return;
    }

    await db
      .update(studentsTable)
      .set({ points: student.points + challenge.pointsReward })
      .where(eq(studentsTable.id, submission.studentId));

    pointsAwarded = challenge.pointsReward;
  }

  const [updated] = await db
    .update(studentChallengeCompletionsTable)
    .set({
      status: body.status,
      teacherFeedback: body.feedback || null,
      reviewedAt: now(),
      pointsAwarded,
    })
    .where(eq(studentChallengeCompletionsTable.id, submissionId))
    .returning();

  res.json({
    id: updated.id,
    status: updated.status,
    teacherFeedback: updated.teacherFeedback,
    reviewedAt: updated.reviewedAt,
    pointsAwarded: updated.pointsAwarded,
  });
});

// Student: list active challenges for their class.
router.get("/student/challenges", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  const { userId } = identity;

  const student = await db.query.studentsTable.findFirst({
    where: eq(studentsTable.replitUserId, userId),
  });
  if (!student) {
    res.status(404).json({ error: "لم يتم العثور على الطالب" });
    return;
  }
  if (!student.classId) {
    res.status(404).json({ error: "لم يُخصص لك صف بعد — تواصل مع معلمك." });
    return;
  }

  const challenges = await db.query.dailyChallengesTable.findMany({
    where: and(
      eq(dailyChallengesTable.classId, student.classId),
      eq(dailyChallengesTable.isDeleted, false),
      gt(dailyChallengesTable.expiresAt, now()),
    ),
    orderBy: [desc(dailyChallengesTable.publishedAt)],
  });

  const challengeIds = challenges.map((c) => c.id);
  const submissions = challengeIds.length
    ? await db.query.studentChallengeCompletionsTable.findMany({
        where: and(
          eq(studentChallengeCompletionsTable.studentId, student.id),
          inArray(studentChallengeCompletionsTable.challengeId, challengeIds),
        ),
      })
    : [];

  const submissionByChallenge = new Map(submissions.map((s) => [s.challengeId, s]));

  const result = challenges.map((c) => {
    const submission = submissionByChallenge.get(c.id);
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      instructions: c.instructions,
      linkUrl: c.linkUrl,
      pointsReward: c.pointsReward,
      submissionType: c.submissionType,
      publishedAt: c.publishedAt,
      expiresAt: c.expiresAt,
      status: submission?.status ?? "not_started",
      submissionText: submission?.submissionText,
      submissionFiles: submission?.submissionFiles,
      teacherFeedback: submission?.teacherFeedback,
      reviewedAt: submission?.reviewedAt,
    };
  });

  res.json({ challenges: result });
});

// Student: get a single active challenge.
router.get("/student/challenges/:id", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  const { userId } = identity;

  const student = await db.query.studentsTable.findFirst({
    where: eq(studentsTable.replitUserId, userId),
  });
  if (!student || !student.classId) {
    res.status(404).json({ error: "لم يُخصص لك صف بعد — تواصل مع معلمك." });
    return;
  }

  const challengeId = parseIntParam(req.params.id);
  if (challengeId === null) {
    res.status(400).json({ error: "معرف التحدي غير صالح" });
    return;
  }

  const challenge = await db.query.dailyChallengesTable.findFirst({
    where: and(
      eq(dailyChallengesTable.id, challengeId),
      eq(dailyChallengesTable.classId, student.classId),
      eq(dailyChallengesTable.isDeleted, false),
      gt(dailyChallengesTable.expiresAt, now()),
    ),
  });
  if (!challenge) {
    res.status(404).json({ error: "التحدي غير موجود أو انتهت صلاحيته" });
    return;
  }

  const submission = await db.query.studentChallengeCompletionsTable.findFirst({
    where: and(
      eq(studentChallengeCompletionsTable.studentId, student.id),
      eq(studentChallengeCompletionsTable.challengeId, challenge.id),
    ),
  });

  res.json({
    id: challenge.id,
    title: challenge.title,
    description: challenge.description,
    instructions: challenge.instructions,
    linkUrl: challenge.linkUrl,
    pointsReward: challenge.pointsReward,
    submissionType: challenge.submissionType,
    publishedAt: challenge.publishedAt,
    expiresAt: challenge.expiresAt,
    status: submission?.status ?? "not_started",
    submissionText: submission?.submissionText,
    submissionFiles: submission?.submissionFiles,
    teacherFeedback: submission?.teacherFeedback,
    reviewedAt: submission?.reviewedAt,
  });
});

// Student: submit or resubmit a challenge.
router.post("/student/challenges/:id/submit", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  const { userId } = identity;

  const student = await db.query.studentsTable.findFirst({
    where: eq(studentsTable.replitUserId, userId),
  });
  if (!student || !student.classId) {
    res.status(404).json({ error: "لم يُخصص لك صف بعد — تواصل مع معلمك." });
    return;
  }

  const challengeId = parseIntParam(req.params.id);
  if (challengeId === null) {
    res.status(400).json({ error: "معرف التحدي غير صالح" });
    return;
  }

  const challenge = await db.query.dailyChallengesTable.findFirst({
    where: and(
      eq(dailyChallengesTable.id, challengeId),
      eq(dailyChallengesTable.classId, student.classId),
      eq(dailyChallengesTable.isDeleted, false),
      gt(dailyChallengesTable.expiresAt, now()),
    ),
  });
  if (!challenge) {
    res.status(404).json({ error: "التحدي غير موجود أو انتهت صلاحيته" });
    return;
  }

  const body = SubmitChallengeBody.parse(req.body);

  const files = body.submissionFiles ?? [];
  for (const file of files) {
    if (file.data.length > MAX_FILE_SIZE_BASE64) {
      res.status(400).json({ error: `الملف "${file.name}" كبير جداً. الحد الأقصى 2 ميجابايت.` });
      return;
    }
  }

  const existing = await db.query.studentChallengeCompletionsTable.findFirst({
    where: and(
      eq(studentChallengeCompletionsTable.studentId, student.id),
      eq(studentChallengeCompletionsTable.challengeId, challenge.id),
    ),
  });

  if (existing && existing.status === "accepted") {
    res.status(400).json({ error: "لا يمكن تعديل إجابة تم قبولها" });
    return;
  }

  const submissionText = body.submissionText?.trim() || null;

  if (!submissionText && files.length === 0) {
    res.status(400).json({ error: "يجب إرسال نص أو ملف واحد على الأقل" });
    return;
  }

  if (existing) {
    const [updated] = await db
      .update(studentChallengeCompletionsTable)
      .set({
        status: "pending",
        submissionText,
        submissionFiles: files as any,
        teacherFeedback: null,
        reviewedAt: null,
        pointsAwarded: null,
        completedAt: now(),
      })
      .where(eq(studentChallengeCompletionsTable.id, existing.id))
      .returning();

    res.json({
      id: updated.id,
      status: updated.status,
      submissionText: updated.submissionText,
      submissionFiles: updated.submissionFiles,
      completedAt: updated.completedAt,
    });
    return;
  }

  const [created] = await db
    .insert(studentChallengeCompletionsTable)
    .values({
      studentId: student.id,
      challengeId: challenge.id,
      status: "pending",
      submissionText,
      submissionFiles: files as any,
    })
    .onConflictDoNothing()
    .returning();

  if (!created) {
    res.status(409).json({ error: "لقد أرسلت إجابة لهذا التحدي مسبقاً" });
    return;
  }

  await logActivity(student.id, {
    type: "challenge_complete",
    title: "أنهى تحدٍ يومي",
    description: `أرسل إجابة للتحدي "${challenge.title}"`,
    metadata: JSON.stringify({ challengeId: challenge.id }),
  });

  res.status(201).json({
    id: created.id,
    status: created.status,
    submissionText: created.submissionText,
    submissionFiles: created.submissionFiles,
    completedAt: created.completedAt,
  });
});

export default router;
