import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, studentsTable, avatarConfigSchema } from "@workspace/db";
import { desc } from "drizzle-orm";
import { GetLeaderboardResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const TOP_N = 10;

router.get("/leaderboard", async (req, res) => {
  const { userId } = getAuth(req);

  const ranked = await db.query.studentsTable.findMany({
    orderBy: [desc(studentsTable.points), studentsTable.id],
  });

  const clerkUserId = userId ?? null;

  const entries = ranked.map((student, index) => ({
    rank: index + 1,
    name: student.name,
    points: student.points,
    avatarConfig: avatarConfigSchema.parse(student.avatarConfig),
    isMe: student.clerkUserId === clerkUserId,
  }));

  const top = entries.slice(0, TOP_N);
  const meInTop = top.some((entry) => entry.isMe);
  const me = meInTop ? null : entries.find((entry) => entry.isMe) ?? null;

  const data = GetLeaderboardResponse.parse({ top, me });
  res.json(data);
});

export default router;
