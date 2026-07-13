import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, or, and, desc, sql } from "drizzle-orm";
import { db, studentsTable, friendshipsTable, avatarConfigSchema, type InsertFriendship } from "@workspace/db";
import { getOrCreateStudent } from "./student";

const router: IRouter = Router();

router.get("/friends", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const student = await getOrCreateStudent(userId);
  const accepted = await db.query.friendshipsTable.findMany({
    where: and(
      or(eq(friendshipsTable.requesterId, student.id), eq(friendshipsTable.addresseeId, student.id)),
      eq(friendshipsTable.status, "accepted"),
    ),
  });

  const friendIds = accepted.map((f) => (f.requesterId === student.id ? f.addresseeId : f.requesterId));
  const friends =
    friendIds.length > 0
      ? await db.query.studentsTable.findMany({
          where: sql`${studentsTable.id} IN (${sql.join(friendIds.map(String), sql`,`)})`,
        })
      : [];

  res.json({
    friends: friends.map((f) => ({
      id: f.id,
      name: f.name,
      points: f.points,
      avatarConfig: avatarConfigSchema.parse(f.avatarConfig),
    })),
  });
});

router.get("/friends/classmates", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const student = await getOrCreateStudent(userId);
  if (!student.classId) {
    res.json({ classmates: [] });
    return;
  }

  const classmates = await db.query.studentsTable.findMany({
    where: and(eq(studentsTable.classId, student.classId), eq(studentsTable.role, "student")),
  });

  const friendships = await db.query.friendshipsTable.findMany({
    where: or(eq(friendshipsTable.requesterId, student.id), eq(friendshipsTable.addresseeId, student.id)),
  });

  const classmatesWithStatus = classmates
    .filter((c) => c.id !== student.id)
    .map((c) => {
      const friendship = friendships.find(
        (f) => f.requesterId === c.id || f.addresseeId === c.id,
      );
      return {
        id: c.id,
        name: c.name,
        points: c.points,
        avatarConfig: avatarConfigSchema.parse(c.avatarConfig),
        friendship: friendship
          ? { id: friendship.id, status: friendship.status, requesterId: friendship.requesterId }
          : null,
      };
    });

  res.json({ classmates: classmatesWithStatus });
});

router.post("/friends/request", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const addresseeId = Number(req.body.addresseeId);
  if (!Number.isFinite(addresseeId)) {
    res.status(400).json({ error: "معرّف الطالب غير صالح" });
    return;
  }

  const student = await getOrCreateStudent(userId);
  if (student.id === addresseeId) {
    res.status(400).json({ error: "لا يمكن إرسال طلب صداقة لنفسك" });
    return;
  }

  const addressee = await db.query.studentsTable.findFirst({ where: eq(studentsTable.id, addresseeId) });
  if (!addressee) {
    res.status(404).json({ error: "الطالب غير موجود" });
    return;
  }
  if (student.classId && addressee.classId !== student.classId) {
    res.status(403).json({ error: "يمكن إرسال طلبات الصداقة لطلاب الصف فقط" });
    return;
  }

  const existing = await db.query.friendshipsTable.findFirst({
    where: or(
      and(eq(friendshipsTable.requesterId, student.id), eq(friendshipsTable.addresseeId, addresseeId)),
      and(eq(friendshipsTable.requesterId, addresseeId), eq(friendshipsTable.addresseeId, student.id)),
    ),
  });
  if (existing) {
    res.status(400).json({ error: "طلب الصداقة موجود مسبقاً" });
    return;
  }

  const [friendship] = await db
    .insert(friendshipsTable)
    .values({ requesterId: student.id, addresseeId, status: "pending" } as InsertFriendship)
    .returning();

  res.json({ friendship });
});

router.post("/friends/:id/accept", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const student = await getOrCreateStudent(userId);
  const friendshipId = Number(req.params.id);
  const friendship = await db.query.friendshipsTable.findFirst({
    where: eq(friendshipsTable.id, friendshipId),
  });
  if (!friendship || friendship.addresseeId !== student.id) {
    res.status(403).json({ error: "لا يمكنك قبول هذا الطلب" });
    return;
  }

  const [updated] = await db
    .update(friendshipsTable)
    .set({ status: "accepted", updatedAt: new Date() })
    .where(eq(friendshipsTable.id, friendshipId))
    .returning();

  res.json({ friendship: updated });
});

router.post("/friends/:id/reject", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const student = await getOrCreateStudent(userId);
  const friendshipId = Number(req.params.id);
  const friendship = await db.query.friendshipsTable.findFirst({
    where: eq(friendshipsTable.id, friendshipId),
  });
  if (!friendship || friendship.addresseeId !== student.id) {
    res.status(403).json({ error: "لا يمكنك رفض هذا الطلب" });
    return;
  }

  const [updated] = await db
    .update(friendshipsTable)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(eq(friendshipsTable.id, friendshipId))
    .returning();

  res.json({ friendship: updated });
});

router.delete("/friends/:id", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const student = await getOrCreateStudent(userId);
  const friendshipId = Number(req.params.id);
  const friendship = await db.query.friendshipsTable.findFirst({
    where: eq(friendshipsTable.id, friendshipId),
  });
  if (!friendship || (friendship.requesterId !== student.id && friendship.addresseeId !== student.id)) {
    res.status(403).json({ error: "لا يمكنك حذف هذه الصداقة" });
    return;
  }

  await db.delete(friendshipsTable).where(eq(friendshipsTable.id, friendshipId));
  res.json({ deleted: true });
});

export default router;
