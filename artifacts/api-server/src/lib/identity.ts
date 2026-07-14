import type { Request } from "express";
import { db, studentsTable, classesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// The platform owner email. Anyone signing in with this address is treated as
// an admin, regardless of anything stored in the database. This keeps the
// admin identity explicit and avoids inventing a full RBAC system.
export const ADMIN_EMAIL = "menaspeakup@gmail.com";

export type Identity = {
  userId: string;
  email: string;
  student: typeof studentsTable.$inferSelect;
  isAdmin: boolean;
  isTeacher: boolean;
  teacherClassIds: number[];
};

export type MaybeIdentity = Identity | null;

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export function isAdminEmail(email: string): boolean {
  return normalizeEmail(email) === normalizeEmail(ADMIN_EMAIL);
}

/**
 * Resolve the signed-in user's platform identity from the Replit Auth session.
 * The auth callback already creates/updates the `students` row, so this just
 * loads it by the Replit user id stored in the session cookie.
 */
export async function resolveIdentity(req: Request): Promise<MaybeIdentity> {
  if (!req.isAuthenticated()) return null;

  const userId = req.user.id;
  const email = normalizeEmail(req.user.email);

  const student = await db.query.studentsTable.findFirst({
    where: eq(studentsTable.replitUserId, userId),
  });

  if (!student) return null;

  const isAdmin = isAdminEmail(email || student.email || "");
  const isTeacher = student.role === "teacher";

  let teacherClassIds: number[] = [];
  if (isTeacher || isAdmin) {
    const classes = await db.query.classesTable.findMany({
      where: eq(classesTable.teacherId, student.id),
    });
    teacherClassIds = classes.map((c) => c.id);
  }

  return {
    userId,
    email: email || student.email || "",
    student,
    isAdmin,
    isTeacher,
    teacherClassIds,
  };
}

export function requireIdentity(identity: MaybeIdentity): asserts identity is Identity {
  if (!identity) {
    const err = new Error("Unauthorized") as Error & { status?: number };
    err.status = 401;
    throw err;
  }
}

export function requireAdmin(identity: Identity): void {
  if (!identity.isAdmin) {
    const err = new Error("Forbidden") as Error & { status?: number };
    err.status = 403;
    throw err;
  }
}

export function requireTeacher(identity: Identity): void {
  if (!identity.isTeacher && !identity.isAdmin) {
    const err = new Error("Forbidden") as Error & { status?: number };
    err.status = 403;
    throw err;
  }
}

export function requireTeacherOrAdmin(identity: Identity): void {
  requireTeacher(identity);
}
