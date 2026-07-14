import { Router, type IRouter } from "express";
import { db, studentsTable, avatarConfigSchema } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { GetLeaderboardResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const TOP_N = 10;

router.get("/leaderboard", async (req, res) => {
  const userId = req.isAuthenticated() ? req.user.id : null;

  const classIdParam = req.query.classId;
  let classId: number | undefined = undefined;
  if (classIdParam && typeof classIdParam === "string") {
    const parsed = Number(classIdParam);
    if (!Number.isNaN(parsed)) classId = parsed;
  }

  // If no explicit class filter is provided and the user is a signed-in student,
  // automatically scope the leaderboard to that student's class.
  if (classId === undefined && userId) {
    const student = await db.query.studentsTable.findFirst({
      where: eq(studentsTable.replitUserId, userId),
    });
    if (student?.classId) {
      classId = student.classId;
    }
  }

  const ranked = await db.query.studentsTable.findMany({
    where: classId !== undefined ? eq(studentsTable.classId, classId) : undefined,
    orderBy: [desc(studentsTable.points), studentsTable.id],
  });

  const replitUserId = userId ?? null;

  const entries = ranked.map((student, index) => ({
    rank: index + 1,
    name: student.name,
    points: student.points,
    avatarConfig: avatarConfigSchema.parse(student.avatarConfig),
    isMe: student.replitUserId === replitUserId,
  }));

  const top = entries.slice(0, TOP_N);
  const meInTop = top.some((entry) => entry.isMe);
  const me = meInTop ? null : entries.find((entry) => entry.isMe) ?? null;

  const data = GetLeaderboardResponse.parse({ top, me });
  res.json(data);
});

export default router;
