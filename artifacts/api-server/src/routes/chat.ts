import { Router, type IRouter } from "express";
import { z } from "zod";
import {
  db,
  studentsTable,
  classesTable,
  chatMessagesTable,
  chatMutesTable,
} from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
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
  // null = permanent ban; otherwise duration in minutes (max 1 week)
  durationMinutes: z.union([z.number().int().min(1).max(10080), z.null()]),
  reason: z.string().max(500).optional(),
});

const ToggleChatBody = z.object({
  enabled: z.boolean(),
});

function parseIntParam(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) && Number.isInteger(n) ? n : null;
}

function parseClassIdParam(value: string): number | null {
  const id = parseIntParam(value);
  return id != null && id > 0 ? id : null;
}

function now(): Date {
  return new Date();
}

function addMinutes(date: Date, minutes: number | null): Date | null {
  if (minutes == null) return null;
  return new Date(date.getTime() + minutes * 60_000);
}

async function canAccessRoom(
  identity: NonNullable<Awaited<ReturnType<typeof resolveIdentity>>>,
  classId: number,
): Promise<boolean> {
  if (identity.isAdmin) return true;
  if (identity.isTeacher && identity.teacherClassIds.includes(classId)) return true;
  return identity.student.classId === classId;
}

async function canModerateRoom(
  identity: NonNullable<Awaited<ReturnType<typeof resolveIdentity>>>,
  classId: number,
): Promise<boolean> {
  if (identity.isAdmin) return true;
  return identity.isTeacher && identity.teacherClassIds.includes(classId);
}

async function isMuted(classId: number, studentId: number): Promise<boolean> {
  const mute = await db.query.chatMutesTable.findFirst({
    where: and(
      eq(chatMutesTable.classId, classId),
      eq(chatMutesTable.studentId, studentId),
    ),
  });
  if (!mute) return false;
  if (mute.mutedUntil == null) return true;
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

function formatMessage(
  message: typeof chatMessagesTable.$inferSelect,
  sender: NonNullable<Awaited<ReturnType<typeof getSenderProfile>>>,
  isModerator: boolean,
) {
  return {
    id: message.id,
    classId: message.classId,
    senderId: message.senderId,
    senderName: sender.name,
    senderPoints: sender.points,
    senderLevel: sender.level,
    senderAvatarConfig: sender.avatarConfig,
    // Moderators see the original content of deleted messages.
    content: message.isDeleted && !isModerator ? "تم حذف هذه الرسالة" : message.content,
    isDeleted: message.isDeleted,
    createdAt: message.createdAt,
  };
}

// List available class chats for the current user.
router.get("/chat/rooms", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);

  const rooms: { id: string; name: string; classId: number; isChatEnabled: boolean }[] = [];

  if (identity.isAdmin) {
    const classes = await db.query.classesTable.findMany({ orderBy: [classesTable.id] });
    for (const cls of classes) {
      rooms.push({ id: String(cls.id), name: cls.name, classId: cls.id, isChatEnabled: cls.isChatEnabled });
    }
  } else if (identity.isTeacher) {
    if (identity.teacherClassIds.length > 0) {
      const classes = await db.query.classesTable.findMany({
        where: sql`${classesTable.id} IN (${identity.teacherClassIds})`,
        orderBy: [classesTable.id],
      });
      for (const cls of classes) {
        rooms.push({ id: String(cls.id), name: cls.name, classId: cls.id, isChatEnabled: cls.isChatEnabled });
      }
    }
  } else if (identity.student.classId != null) {
    const cls = await db.query.classesTable.findFirst({
      where: eq(classesTable.id, identity.student.classId),
    });
    if (cls) {
      rooms.push({ id: String(cls.id), name: cls.name, classId: cls.id, isChatEnabled: cls.isChatEnabled });
    }
  }

  res.json({ rooms });
});

// List messages in a class chat.
router.get("/chat/rooms/:classId/messages", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);

  const classId = parseClassIdParam(req.params.classId);
  if (classId === null) {
    res.status(400).json({ error: "معرف الصف غير صالح" });
    return;
  }

  if (!await canAccessRoom(identity, classId)) {
    res.status(403).json({ error: "لا يمكنك الوصول إلى هذه الغرفة" });
    return;
  }

  const messages = await db.query.chatMessagesTable.findMany({
    where: eq(chatMessagesTable.classId, classId),
    orderBy: [desc(chatMessagesTable.id)],
    limit: 200,
  });

  const isModerator = await canModerateRoom(identity, classId);
  const result = [];
  for (const message of messages) {
    const sender = await getSenderProfile(message.senderId);
    if (!sender) continue;
    result.push(formatMessage(message, sender, isModerator));
  }

  res.json({ messages: result.reverse() });
});

// Send a message to a class chat.
router.post("/chat/rooms/:classId/messages", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);

  const classId = parseClassIdParam(req.params.classId);
  if (classId === null) {
    res.status(400).json({ error: "معرف الصف غير صالح" });
    return;
  }

  if (!await canAccessRoom(identity, classId)) {
    res.status(403).json({ error: "لا يمكنك الوصول إلى هذه الغرفة" });
    return;
  }

  const cls = await db.query.classesTable.findFirst({
    where: eq(classesTable.id, classId),
  });
  if (!cls) {
    res.status(404).json({ error: "الصف غير موجود" });
    return;
  }
  if (!cls.isChatEnabled) {
    res.status(403).json({ error: "الشات معطل في هذا الصف" });
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

  res.status(201).json(formatMessage(message, sender, await canModerateRoom(identity, classId)));
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

// Permanently delete a message (admin only).
router.delete("/chat/messages/:id/permanent", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);

  if (!identity.isAdmin) {
    res.status(403).json({ error: "لا يمكنك حذف هذه الرسالة بشكل نهائي" });
    return;
  }

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

  await db.delete(chatMessagesTable).where(eq(chatMessagesTable.id, messageId));

  res.status(204).send();
});

// Toggle class chat on/off.
router.post("/chat/rooms/:classId/toggle", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);

  const classId = parseClassIdParam(req.params.classId);
  if (classId === null) {
    res.status(400).json({ error: "معرف الصف غير صالح" });
    return;
  }

  if (!await canModerateRoom(identity, classId)) {
    res.status(403).json({ error: "لا يمكنك إدارة هذه الغرفة" });
    return;
  }

  const body = ToggleChatBody.parse(req.body);

  const [updated] = await db
    .update(classesTable)
    .set({ isChatEnabled: body.enabled })
    .where(eq(classesTable.id, classId))
    .returning();

  res.json({
    id: updated.id,
    name: updated.name,
    isChatEnabled: updated.isChatEnabled,
  });
});

// Mute/ban a student in a class chat.
router.post("/chat/rooms/:classId/mute", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);

  const classId = parseClassIdParam(req.params.classId);
  if (classId === null) {
    res.status(400).json({ error: "معرف الصف غير صالح" });
    return;
  }

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

  // Replace any existing mute/ban for this student in the same class.
  await db
    .delete(chatMutesTable)
    .where(
      and(
        eq(chatMutesTable.classId, classId),
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

// Unmute/unban a student in a class chat.
router.delete("/chat/rooms/:classId/mute/:studentId", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);

  const classId = parseClassIdParam(req.params.classId);
  if (classId === null) {
    res.status(400).json({ error: "معرف الصف غير صالح" });
    return;
  }

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
        eq(chatMutesTable.classId, classId),
        eq(chatMutesTable.studentId, studentId),
      ),
    );

  res.status(204).send();
});

// List muted/banned students in a class chat.
router.get("/chat/rooms/:classId/mutes", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);

  const classId = parseClassIdParam(req.params.classId);
  if (classId === null) {
    res.status(400).json({ error: "معرف الصف غير صالح" });
    return;
  }

  if (!await canModerateRoom(identity, classId)) {
    res.status(403).json({ error: "لا يمكنك إدارة هذه الغرفة" });
    return;
  }

  const mutes = await db.query.chatMutesTable.findMany({
    where: eq(chatMutesTable.classId, classId),
  });

  const activeMutes = mutes.filter(
    (m) => m.mutedUntil == null || new Date(m.mutedUntil) > now(),
  );
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
