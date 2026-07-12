import { Router, type IRouter } from "express";
import { z } from "zod";
import {
  db,
  studentsTable,
  classesTable,
  chatMessagesTable,
  chatMutesTable,
} from "@workspace/db";
import { eq, and, desc, sql, isNull } from "drizzle-orm";
import {
  resolveIdentity,
  requireIdentity,
} from "../lib/identity";

const router: IRouter = Router();

const SendMessageBody = z.object({
  content: z.string().min(1).max(1000),
});

const MuteStudentBody = z.object({
  studentId: z.number().int(),
  durationMinutes: z.number().int().min(1).max(10080), // max 1 week
  reason: z.string().max(500).optional(),
});

function parseIntParam(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function now(): Date {
  return new Date();
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function getRoomClassId(
  classIdParam: string,
): { classId: number | null; isGeneral: boolean } {
  if (classIdParam === "general") {
    return { classId: null, isGeneral: true };
  }
  const id = parseIntParam(classIdParam);
  return { classId: id, isGeneral: false };
}

async function canAccessRoom(
  identity: NonNullable<Awaited<ReturnType<typeof resolveIdentity>>>,
  classId: number | null,
): Promise<boolean> {
  if (identity.isAdmin) return true;
  if (classId == null) return true; // general chat is open to all
  if (identity.isTeacher && identity.teacherClassIds.includes(classId)) return true;
  return identity.student.classId === classId;
}

async function canModerateRoom(
  identity: NonNullable<Awaited<ReturnType<typeof resolveIdentity>>>,
  classId: number | null,
): Promise<boolean> {
  if (identity.isAdmin) return true;
  if (classId == null) return false; // only admins can moderate general chat
  return identity.isTeacher && identity.teacherClassIds.includes(classId);
}

async function isMuted(
  classId: number | null,
  studentId: number,
): Promise<boolean> {
  const mute = await db.query.chatMutesTable.findFirst({
    where: and(
      classId == null ? isNull(chatMutesTable.classId) : eq(chatMutesTable.classId, classId),
      eq(chatMutesTable.studentId, studentId),
    ),
  });
  if (!mute) return false;
  return new Date(mute.mutedUntil) > now();
}

async function getSenderProfile(studentId: number) {
  const student = await db.query.studentsTable.findFirst({
    where: eq(studentsTable.id, studentId),
  });
  if (!student) return null;
  return {
    id: student.id,
    name: student.name,
    points: student.points,
    level: Math.floor(student.points / 100) + 1,
    avatarConfig: student.avatarConfig,
  };
}

function formatMessage(message: typeof chatMessagesTable.$inferSelect, sender: NonNullable<Awaited<ReturnType<typeof getSenderProfile>>>) {
  return {
    id: message.id,
    classId: message.classId,
    senderId: message.senderId,
    senderName: sender.name,
    senderPoints: sender.points,
    senderLevel: sender.level,
    senderAvatarConfig: sender.avatarConfig,
    content: message.isDeleted ? "تم حذف هذه الرسالة" : message.content,
    isDeleted: message.isDeleted,
    createdAt: message.createdAt,
  };
}

// List available chat rooms for the current user.
router.get("/chat/rooms", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);

  const rooms: { id: string; name: string; classId: number | null }[] = [
    { id: "general", name: "الشات العام", classId: null },
  ];

  if (identity.isAdmin) {
    const classes = await db.query.classesTable.findMany({ orderBy: [classesTable.id] });
    for (const cls of classes) {
      rooms.push({ id: String(cls.id), name: cls.name, classId: cls.id });
    }
  } else if (identity.isTeacher) {
    if (identity.teacherClassIds.length > 0) {
      const classes = await db.query.classesTable.findMany({
        where: sql`${classesTable.id} IN (${identity.teacherClassIds})`,
        orderBy: [classesTable.id],
      });
      for (const cls of classes) {
        rooms.push({ id: String(cls.id), name: cls.name, classId: cls.id });
      }
    }
  } else if (identity.student.classId != null) {
    const cls = await db.query.classesTable.findFirst({
      where: eq(classesTable.id, identity.student.classId),
    });
    if (cls) {
      rooms.push({ id: String(cls.id), name: cls.name, classId: cls.id });
    }
  }

  res.json({ rooms });
});

// List messages in a room.
router.get("/chat/rooms/:classId/messages", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);

  const { classId } = getRoomClassId(req.params.classId);
  if (!await canAccessRoom(identity, classId)) {
    res.status(403).json({ error: "لا يمكنك الوصول إلى هذه الغرفة" });
    return;
  }

  const messages = await db.query.chatMessagesTable.findMany({
    where: classId == null
      ? isNull(chatMessagesTable.classId)
      : eq(chatMessagesTable.classId, classId),
    orderBy: [desc(chatMessagesTable.id)],
    limit: 200,
  });

  const result = [];
  for (const message of messages) {
    const sender = await getSenderProfile(message.senderId);
    if (!sender) continue;
    result.push(formatMessage(message, sender));
  }

  res.json({ messages: result.reverse() });
});

// Send a message to a room.
router.post("/chat/rooms/:classId/messages", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);

  const { classId } = getRoomClassId(req.params.classId);
  if (!await canAccessRoom(identity, classId)) {
    res.status(403).json({ error: "لا يمكنك الوصول إلى هذه الغرفة" });
    return;
  }

  const body = SendMessageBody.parse(req.body);

  if (await isMuted(classId, identity.student.id)) {
    res.status(403).json({ error: "أنت محظور من إرسال الرسائل في هذه الغرفة" });
    return;
  }

  const [message] = await db
    .insert(chatMessagesTable)
    .values({
      classId,
      senderId: identity.student.id,
      content: body.content,
    })
    .returning();

  const sender = await getSenderProfile(message.senderId);
  if (!sender) {
    res.status(404).json({ error: "المرسل غير موجود" });
    return;
  }

  res.status(201).json(formatMessage(message, sender));
});

// Delete a message (soft delete).
router.delete("/chat/messages/:id", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);

  const messageId = parseIntParam(req.params.id);
  if (messageId === null) {
    res.status(400).json({ error: "معرف الرسالة غير صالح" });
    return;
  }

  const message = await db.query.chatMessagesTable.findFirst({
    where: eq(chatMessagesTable.id, messageId),
  });
  if (!message) {
    res.status(404).json({ error: "الرسالة غير موجودة" });
    return;
  }

  const canDelete =
    identity.isAdmin ||
    (await canModerateRoom(identity, message.classId)) ||
    message.senderId === identity.student.id;

  if (!canDelete) {
    res.status(403).json({ error: "لا يمكنك حذف هذه الرسالة" });
    return;
  }

  await db
    .update(chatMessagesTable)
    .set({ isDeleted: true })
    .where(eq(chatMessagesTable.id, messageId));

  res.status(204).send();
});

// Mute a student in a room.
router.post("/chat/rooms/:classId/mute", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);

  const { classId } = getRoomClassId(req.params.classId);
  if (!await canModerateRoom(identity, classId)) {
    res.status(403).json({ error: "لا يمكنك إدارة هذه الغرفة" });
    return;
  }

  const body = MuteStudentBody.parse(req.body);

  const student = await db.query.studentsTable.findFirst({
    where: eq(studentsTable.id, body.studentId),
  });
  if (!student) {
    res.status(404).json({ error: "الطالب غير موجود" });
    return;
  }

  const mutedUntil = addMinutes(now(), body.durationMinutes);

  // Replace any existing mute for this student in the same room so we don't
  // create duplicate rows (especially important for the general room where
  // classId is NULL and the unique constraint allows multiple NULLs).
  await db
    .delete(chatMutesTable)
    .where(
      and(
        classId == null ? isNull(chatMutesTable.classId) : eq(chatMutesTable.classId, classId),
        eq(chatMutesTable.studentId, body.studentId),
      ),
    );

  await db.insert(chatMutesTable).values({
    classId,
    studentId: body.studentId,
    mutedUntil,
    reason: body.reason || undefined,
    createdBy: identity.student.id,
  });

  res.status(201).json({
    studentId: body.studentId,
    mutedUntil,
    reason: body.reason || null,
  });
});

// Unmute a student in a room.
router.delete("/chat/rooms/:classId/mute/:studentId", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);

  const { classId } = getRoomClassId(req.params.classId);
  if (!await canModerateRoom(identity, classId)) {
    res.status(403).json({ error: "لا يمكنك إدارة هذه الغرفة" });
    return;
  }

  const studentId = parseIntParam(req.params.studentId);
  if (studentId === null) {
    res.status(400).json({ error: "معرف الطالب غير صالح" });
    return;
  }

  await db
    .delete(chatMutesTable)
    .where(
      and(
        classId == null ? isNull(chatMutesTable.classId) : eq(chatMutesTable.classId, classId),
        eq(chatMutesTable.studentId, studentId),
      ),
    );

  res.status(204).send();
});

// List muted students in a room.
router.get("/chat/rooms/:classId/mutes", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);

  const { classId } = getRoomClassId(req.params.classId);
  if (!await canModerateRoom(identity, classId)) {
    res.status(403).json({ error: "لا يمكنك إدارة هذه الغرفة" });
    return;
  }

  const mutes = await db.query.chatMutesTable.findMany({
    where: classId == null
      ? isNull(chatMutesTable.classId)
      : eq(chatMutesTable.classId, classId),
  });

  const activeMutes = mutes.filter((m) => new Date(m.mutedUntil) > now());
  const studentIds = activeMutes.map((m) => m.studentId);
  const students = studentIds.length
    ? await db.query.studentsTable.findMany({
        where: sql`${studentsTable.id} IN (${studentIds})`,
      })
    : [];
  const studentById = new Map(students.map((s) => [s.id, s]));

  res.json({
    mutes: activeMutes.map((m) => {
      const student = studentById.get(m.studentId);
      return {
        id: m.id,
        studentId: m.studentId,
        studentName: student?.name ?? "",
        mutedUntil: m.mutedUntil,
        reason: m.reason,
      };
    }),
  });
});

export default router;
