import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, and } from "drizzle-orm";
import { db, studentsTable, avatarConfigSchema } from "@workspace/db";
import { getOrCreateStudent } from "./student";

const router: IRouter = Router();

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

  res.json({
    classmates: classmates
      .filter((c) => c.id !== student.id)
      .map((c) => ({
        id: c.id,
        name: c.name,
        points: c.points,
        avatarConfig: avatarConfigSchema.parse(c.avatarConfig),
        friendship: null,
      })),
  });
});

export default router;
