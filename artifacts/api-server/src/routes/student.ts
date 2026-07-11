import { Router, type IRouter } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { db, studentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetStudentProfileResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/student/me", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const existing = await db.query.studentsTable.findFirst({
    where: eq(studentsTable.clerkUserId, userId),
  });

  if (existing) {
    const data = GetStudentProfileResponse.parse({
      name: existing.name,
      points: existing.points,
    });
    res.json(data);
    return;
  }

  // First visit for this Clerk account — JIT-provision a student row.
  const clerkUser = await clerkClient.users.getUser(userId);
  const name =
    clerkUser.fullName ||
    clerkUser.firstName ||
    clerkUser.primaryEmailAddress?.emailAddress ||
    "صديقنا البطل";

  const [created] = await db
    .insert(studentsTable)
    .values({ clerkUserId: userId, name, points: 0 })
    .returning();

  const data = GetStudentProfileResponse.parse({
    name: created.name,
    points: created.points,
  });
  res.json(data);
});

export default router;
