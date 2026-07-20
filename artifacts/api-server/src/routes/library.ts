import { Router, type IRouter } from "express";
import { z } from "zod";
import { eq, and, inArray, asc, desc, sql } from "drizzle-orm";
import { resolveIdentity, requireIdentity, requireTeacher } from "../lib/identity";
import { logActivity } from "../lib/activity-logs";
import {
  db,
  libraryItemsTable,
  libraryQuestionsTable,
  librarySubmissionsTable,
  libraryAnswersTable,
  studentsTable,
  classesTable,
  LIBRARY_ITEM_TYPES,
  LIBRARY_QUESTION_TYPES,
} from "@workspace/db";

const router: IRouter = Router();

router.use((req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  );
  next();
});

const QuestionSchema = z.object({
  id: z.number().int().optional(),
  type: z.enum(LIBRARY_QUESTION_TYPES),
  question: z.string().min(1).max(1000),
  options: z.array(z.string()).default([]),
  correctAnswer: z.string().optional(),
  points: z.number().int().min(0).default(0),
  sortOrder: z.number().int().default(0),
});

const UpsertLibraryItemBody = z.object({
  id: z.number().int().optional(),
  classId: z.number().int(),
  type: z.enum(LIBRARY_ITEM_TYPES),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).default(""),
  coverObjectPath: z.string().optional(),
  contentObjectPath: z.string().optional(),
  bodyText: z.string().optional(),
  externalUrl: z.string().url().optional().or(z.literal("")),
  isPublished: z.boolean().default(false),
  questions: z.array(QuestionSchema).default([]),
});

const SubmitLibraryBody = z.object({
  libraryItemId: z.number().int(),
  answers: z.array(
    z.object({
      questionId: z.number().int(),
      selectedAnswer: z.string().optional(),
      textAnswer: z.string().optional(),
    }),
  ),
});

const ReviewTextAnswerBody = z.object({
  status: z.enum(["accepted", "rejected"]),
});

function parseIntParam(value: string): number | null {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toStorageUrl(objectPath: string | null | undefined): string | null {
  if (!objectPath) return null;
  return `/api/storage${objectPath}`;
}

function ensureItemTeacherAccess(
  identity: NonNullable<Awaited<ReturnType<typeof resolveIdentity>>>,
  item: { teacherId: number; classId: number },
) {
  if (identity.isAdmin) return;
  if (!identity.isTeacher) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
  if (!identity.teacherClassIds.includes(item.classId)) {
    throw Object.assign(new Error("لا يمكنك إدارة محتوى صف آخر"), { status: 403 });
  }
  if (item.teacherId !== identity.student.id) {
    throw Object.assign(new Error("لا يمكنك إدارة محتوى معلم آخر"), { status: 403 });
  }
}

// Teacher: list items for their classes
router.get("/library/items", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireTeacher(identity);

  const type = req.query.type as string | undefined;
  const classId = parseIntParam((req.query.classId as string) ?? "");

  const whereClauses: any[] = [];
  if (identity.isAdmin) {
    // admin sees all
  } else if (identity.isTeacher) {
    whereClauses.push(inArray(libraryItemsTable.classId, identity.teacherClassIds));
  }
  if (type && LIBRARY_ITEM_TYPES.includes(type as typeof LIBRARY_ITEM_TYPES[number])) {
    whereClauses.push(eq(libraryItemsTable.type, type as typeof LIBRARY_ITEM_TYPES[number]));
  }
  if (classId != null) {
    whereClauses.push(eq(libraryItemsTable.classId, classId));
  }

  const items = await db
    .select()
    .from(libraryItemsTable)
    .where(whereClauses.length ? and(...whereClauses) : undefined)
    .orderBy(desc(libraryItemsTable.createdAt));

  const itemIds = items.map((i) => i.id);
  const questions = itemIds.length
    ? await db.query.libraryQuestionsTable.findMany({
        where: inArray(libraryQuestionsTable.libraryItemId, itemIds),
        orderBy: [asc(libraryQuestionsTable.sortOrder)],
      })
    : [];
  const questionsByItem = new Map<number, typeof questions>();
  for (const q of questions) {
    const list = questionsByItem.get(q.libraryItemId) || [];
    list.push(q);
    questionsByItem.set(q.libraryItemId, list);
  }

  res.json({
    items: items.map((i) => ({
      ...i,
      coverUrl: toStorageUrl(i.coverObjectPath),
      contentUrl: toStorageUrl(i.contentObjectPath),
      questions: questionsByItem.get(i.id) || [],
    })),
  });
});

// Teacher: create/update item with questions
router.post("/library/items", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireTeacher(identity);

  const body = UpsertLibraryItemBody.parse(req.body);
  if (!identity.isAdmin && !identity.teacherClassIds.includes(body.classId)) {
    res.status(403).json({ error: "لا يمكنك إضافة محتوى لصف آخر" });
    return;
  }

  const { id: existingId, questions, ...itemData } = body;

  let itemId: number | undefined;
  await db.transaction(async (tx) => {
    itemId = existingId;
    if (itemId) {
      const existing = await tx.query.libraryItemsTable.findFirst({
        where: eq(libraryItemsTable.id, itemId),
      });
      if (!existing) {
        throw Object.assign(new Error("العنصر غير موجود"), { status: 404 });
      }
      ensureItemTeacherAccess(identity, existing);
      await tx
        .update(libraryItemsTable)
        .set({ ...itemData, updatedAt: new Date() })
        .where(eq(libraryItemsTable.id, itemId));
      await tx.delete(libraryQuestionsTable).where(eq(libraryQuestionsTable.libraryItemId, itemId));
    } else {
      const [created] = await tx
        .insert(libraryItemsTable)
        .values({
          ...itemData,
          teacherId: identity.student.id,
        })
        .returning();
      itemId = created.id;
    }

    if (questions.length > 0) {
      await tx
        .insert(libraryQuestionsTable)
        .values(
          questions.map((q) => ({
            libraryItemId: itemId!,
            type: q.type,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer || null,
            points: q.points,
            sortOrder: q.sortOrder,
          })),
        );
    }
  });

  res.json({ success: true, id: itemId! });
});

// Teacher: delete item
router.delete("/library/items/:id", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireTeacher(identity);

  const itemId = parseIntParam(req.params.id);
  if (itemId == null) {
    res.status(400).json({ error: "معرّف غير صالح" });
    return;
  }

  const item = await db.query.libraryItemsTable.findFirst({
    where: eq(libraryItemsTable.id, itemId),
  });
  if (!item) {
    res.status(404).json({ error: "العنصر غير موجود" });
    return;
  }
  ensureItemTeacherAccess(identity, item);

  await db.delete(libraryItemsTable).where(eq(libraryItemsTable.id, itemId));
  res.json({ deleted: true });
});

// Student/Teacher: get single item details
router.get("/library/items/:id", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);

  const itemId = parseIntParam(req.params.id);
  if (itemId == null) {
    res.status(400).json({ error: "معرّف غير صالح" });
    return;
  }

  const item = await db.query.libraryItemsTable.findFirst({
    where: eq(libraryItemsTable.id, itemId),
  });
  if (!item) {
    res.status(404).json({ error: "العنصر غير موجود" });
    return;
  }

  // Students can only see published items in their own class.
  if (identity.student.role === "student" && (!item.isPublished || item.classId !== identity.student.classId)) {
    res.status(403).json({ error: "لا يمكنك الوصول لهذا المحتوى" });
    return;
  }
  // Teachers see only their own classes (or admin).
  if (identity.isTeacher && !identity.isAdmin && !identity.teacherClassIds.includes(item.classId)) {
    res.status(403).json({ error: "لا يمكنك الوصول لهذا المحتوى" });
    return;
  }

  const questions = await db.query.libraryQuestionsTable.findMany({
    where: eq(libraryQuestionsTable.libraryItemId, itemId),
    orderBy: [asc(libraryQuestionsTable.sortOrder)],
  });

  let submission = null;
  if (identity.student.role === "student") {
    submission = await db.query.librarySubmissionsTable.findFirst({
      where: and(
        eq(librarySubmissionsTable.libraryItemId, itemId),
        eq(librarySubmissionsTable.studentId, identity.student.id),
      ),
    });
  }

  res.json({
    item: {
      ...item,
      coverUrl: toStorageUrl(item.coverObjectPath),
      contentUrl: toStorageUrl(item.contentObjectPath),
      questions,
    },
    submission,
  });
});

// Student: list items for their class
router.get("/library/class", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);

  if (!identity.student.classId) {
    res.json({ items: [] });
    return;
  }

  const type = req.query.type as string | undefined;
  const whereClauses: any[] = [
    eq(libraryItemsTable.classId, identity.student.classId),
    eq(libraryItemsTable.isPublished, true),
  ];
  if (type && LIBRARY_ITEM_TYPES.includes(type as typeof LIBRARY_ITEM_TYPES[number])) {
    whereClauses.push(eq(libraryItemsTable.type, type as typeof LIBRARY_ITEM_TYPES[number]));
  }

  const items = await db.query.libraryItemsTable.findMany({
    where: and(...whereClauses),
    orderBy: [desc(libraryItemsTable.createdAt)],
  });

  const itemIds = items.map((i) => i.id);
  const questions = itemIds.length
    ? await db.query.libraryQuestionsTable.findMany({
        where: inArray(libraryQuestionsTable.libraryItemId, itemIds),
        orderBy: [asc(libraryQuestionsTable.sortOrder)],
      })
    : [];
  const questionsByItem = new Map<number, number>();
  for (const q of questions) {
    questionsByItem.set(q.libraryItemId, (questionsByItem.get(q.libraryItemId) || 0) + 1);
  }

  const submissions = await db.query.librarySubmissionsTable.findMany({
    where: and(
      inArray(librarySubmissionsTable.libraryItemId, itemIds.length ? itemIds : [-1]),
      eq(librarySubmissionsTable.studentId, identity.student.id),
    ),
  });
  const submissionByItem = new Map(submissions.map((s) => [s.libraryItemId, s]));
  const pointsByItem = new Map<number, number>();
  for (const q of questions) {
    pointsByItem.set(q.libraryItemId, (pointsByItem.get(q.libraryItemId) || 0) + q.points);
  }

  res.json({
    items: items.map((i) => ({
      ...i,
      coverUrl: toStorageUrl(i.coverObjectPath),
      contentUrl: toStorageUrl(i.contentObjectPath),
      questionCount: questionsByItem.get(i.id) || 0,
      totalPoints: pointsByItem.get(i.id) || 0,
      submission: submissionByItem.get(i.id) || null,
    })),
  });
});

// Student: submit answers
router.post("/library/submissions", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);

  if (identity.student.role !== "student") {
    res.status(403).json({ error: "فقط الطلبة يمكنهم تقديم إجابات" });
    return;
  }

  const body = SubmitLibraryBody.parse(req.body);
  const item = await db.query.libraryItemsTable.findFirst({
    where: eq(libraryItemsTable.id, body.libraryItemId),
  });
  if (!item || !item.isPublished || item.classId !== identity.student.classId) {
    res.status(403).json({ error: "لا يمكنك الوصول لهذا المحتوى" });
    return;
  }

  const existingSubmission = await db.query.librarySubmissionsTable.findFirst({
    where: and(
      eq(librarySubmissionsTable.libraryItemId, item.id),
      eq(librarySubmissionsTable.studentId, identity.student.id),
    ),
  });
  if (existingSubmission) {
    res.status(409).json({ error: "لقد أجبت على هذا المحتوى مسبقاً" });
    return;
  }

  const questions = await db.query.libraryQuestionsTable.findMany({
    where: eq(libraryQuestionsTable.libraryItemId, item.id),
  });
  const questionsById = new Map(questions.map((q) => [q.id, q]));

  let score = 0;
  let maxScore = 0;
  const answerRows: Array<{
    questionId: number;
    selectedAnswer: string | null;
    textAnswer: string | null;
    isCorrect: boolean | null;
    pointsAwarded: number;
    status: string;
  }> = [];

  const autoGradedTypes = new Set(["mcq", "true_false", "fill_blank", "classification", "ordering"]);

  function normalizeAnswer(value: string | null | undefined): string {
    return (value || "").trim().replace(/\s+/g, " ");
  }

  for (const q of questions) {
    maxScore += q.points;
    const answer = body.answers.find((a) => a.questionId === q.id);
    if (autoGradedTypes.has(q.type)) {
      const submitted = normalizeAnswer(answer?.selectedAnswer);
      const expected = normalizeAnswer(q.correctAnswer);
      const isCorrect = submitted.length > 0 && submitted === expected;
      const points = isCorrect ? q.points : 0;
      score += points;
      answerRows.push({
        questionId: q.id,
        selectedAnswer: answer?.selectedAnswer || null,
        textAnswer: null,
        isCorrect,
        pointsAwarded: points,
        status: "accepted",
      });
    } else {
      answerRows.push({
        questionId: q.id,
        selectedAnswer: q.type === "irab" ? answer?.selectedAnswer || null : null,
        textAnswer: answer?.textAnswer || null,
        isCorrect: null,
        pointsAwarded: 0,
        status: "pending",
      });
    }
  }

  const [submission] = await db
    .insert(librarySubmissionsTable)
    .values({
      libraryItemId: item.id,
      studentId: identity.student.id,
      score,
      maxScore,
      status: "pending",
    })
    .returning();

  await db.insert(libraryAnswersTable).values(
    answerRows.map((a) => ({ ...a, submissionId: submission.id })),
  );

  await logActivity(identity.student.id, {
    type: "library_submission",
    title: "أكمل محتوى في المكتبة",
    description: `أكمل "${item.title}" وحصل على ${score} من ${maxScore} نقطة`,
    metadata: JSON.stringify({ libraryItemId: item.id, submissionId: submission.id, score, maxScore }),
  });

  res.json({ submission: { ...submission, answers: answerRows } });
});

// Teacher: list text answers pending review
router.get("/library/reviews", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireTeacher(identity);

  const pendingAnswers = await db.query.libraryAnswersTable.findMany({
    where: eq(libraryAnswersTable.status, "pending"),
    orderBy: [desc(libraryAnswersTable.createdAt)],
    limit: 200,
  });

  const textAnswers = pendingAnswers.filter((a) => a.textAnswer && a.textAnswer.trim() !== "");
  if (textAnswers.length === 0) {
    res.json({ reviews: [] });
    return;
  }

  const itemIds = [...new Set(textAnswers.map((a) => a.questionId))];
  const questions = await db.query.libraryQuestionsTable.findMany({
    where: inArray(libraryQuestionsTable.id, itemIds),
  });
  const questionsById = new Map(questions.map((q) => [q.id, q]));

  const itemIds2 = [...new Set(questions.map((q) => q.libraryItemId))];
  const items = await db.query.libraryItemsTable.findMany({
    where: inArray(libraryItemsTable.id, itemIds2),
  });
  const itemsById = new Map(items.map((i) => [i.id, i]));

  const submissionIds = [...new Set(textAnswers.map((a) => a.submissionId))];
  const submissions = await db.query.librarySubmissionsTable.findMany({
    where: inArray(librarySubmissionsTable.id, submissionIds),
  });
  const submissionsById = new Map(submissions.map((s) => [s.id, s]));

  const studentIds = [...new Set(submissions.map((s) => s.studentId))];
  const students = await db.query.studentsTable.findMany({
    where: inArray(studentsTable.id, studentIds),
  });
  const studentsById = new Map(students.map((s) => [s.id, s]));

  const classIds = [...new Set(items.map((i) => i.classId))];
  const classes = await db.query.classesTable.findMany({
    where: inArray(classesTable.id, classIds),
  });
  const classesById = new Map(classes.map((c) => [c.id, c]));

  const filtered = textAnswers.filter((a) => {
    const q = questionsById.get(a.questionId);
    const item = q ? itemsById.get(q.libraryItemId) : undefined;
    if (!item) return false;
    return identity.isAdmin || identity.teacherClassIds.includes(item.classId);
  });

  res.json({
    reviews: filtered.map((a) => {
      const q = questionsById.get(a.questionId)!;
      const item = itemsById.get(q.libraryItemId)!;
      const submission = submissionsById.get(a.submissionId)!;
      const student = studentsById.get(submission.studentId)!;
      const cls = classesById.get(item.classId)!;
      return {
        answerId: a.id,
        question: q.question,
        textAnswer: a.textAnswer,
        points: q.points,
        itemTitle: item.title,
        itemId: item.id,
        submissionId: submission.id,
        studentId: student.id,
        studentName: student.name,
        className: cls.name,
      };
    }),
  });
});

// Teacher: accept/reject a text answer
router.post("/library/answers/:id/review", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireTeacher(identity);

  const answerId = parseIntParam(req.params.id);
  if (answerId == null) {
    res.status(400).json({ error: "معرّف غير صالح" });
    return;
  }

  const body = ReviewTextAnswerBody.parse(req.body);

  const answer = await db.query.libraryAnswersTable.findFirst({
    where: eq(libraryAnswersTable.id, answerId),
  });
  if (!answer) {
    res.status(404).json({ error: "الإجابة غير موجودة" });
    return;
  }

  const question = await db.query.libraryQuestionsTable.findFirst({
    where: eq(libraryQuestionsTable.id, answer.questionId),
  });
  if (!question) {
    res.status(404).json({ error: "السؤال غير موجود" });
    return;
  }

  const item = await db.query.libraryItemsTable.findFirst({
    where: eq(libraryItemsTable.id, question.libraryItemId),
  });
  if (!item) {
    res.status(404).json({ error: "العنصر غير موجود" });
    return;
  }

  if (!identity.isAdmin && !identity.teacherClassIds.includes(item.classId)) {
    res.status(403).json({ error: "لا يمكنك مراجعة إجابات صف آخر" });
    return;
  }

  const pointsAwarded = body.status === "accepted" ? question.points : 0;
  const [updatedAnswer] = await db
    .update(libraryAnswersTable)
    .set({ status: body.status, pointsAwarded })
    .where(eq(libraryAnswersTable.id, answerId))
    .returning();

  // Recalculate submission score and update student points
  const submission = await db.query.librarySubmissionsTable.findFirst({
    where: eq(librarySubmissionsTable.id, answer.submissionId),
  });
  if (submission) {
    const allAnswers = await db.query.libraryAnswersTable.findMany({
      where: eq(libraryAnswersTable.submissionId, submission.id),
    });
    const totalAwarded = allAnswers.reduce((sum, a) => sum + (a.pointsAwarded || 0), 0);
    const allReviewed = allAnswers.every((a) => a.status !== "pending");
    await db
      .update(librarySubmissionsTable)
      .set({
        score: totalAwarded,
        status: allReviewed ? "accepted" : "pending",
      })
      .where(eq(librarySubmissionsTable.id, submission.id));

    const student = await db.query.studentsTable.findFirst({
      where: eq(studentsTable.id, submission.studentId),
    });
    if (student && totalAwarded > 0) {
      await db
        .update(studentsTable)
        .set({ points: student.points + pointsAwarded })
        .where(eq(studentsTable.id, student.id));
    }
  }

  res.json({ answer: updatedAnswer });
});

export default router;
