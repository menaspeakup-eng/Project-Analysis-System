import { Router, type IRouter } from "express";
import { db, classesTable, studentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { resolveIdentity, requireIdentity } from "../lib/identity";

const router: IRouter = Router();

router.get("/identity/me", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);

  let className: string | null = null;
  let teacherName: string | null = null;
  let teacherEmail: string | null = null;

  if (identity.student.classId) {
    const cls = await db.query.classesTable.findFirst({
      where: eq(classesTable.id, identity.student.classId),
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

  res.json({
    userId: identity.userId,
    email: identity.email,
    name: identity.student.name,
    role: identity.student.role,
    isAdmin: identity.isAdmin,
    isTeacher: identity.isTeacher,
    nameConfirmed: identity.student.nameConfirmed,
    points: identity.student.points,
    avatarConfig: identity.student.avatarConfig,
    studentId: identity.student.id,
    classId: identity.student.classId,
    className,
    teacherName,
    teacherEmail,
  });
});

export default router;
