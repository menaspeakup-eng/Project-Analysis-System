import { getAuth, clerkClient } from "@clerk/express";
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
 * Resolve the signed-in user's platform identity. Creates a `students` row on
 * first visit if needed, and backfills `email` on existing rows that predate
 * this field. This is the single source of truth for "who is this request" in
 * all staff-facing routes.
 */
export async function resolveIdentity(req: Request): Promise<MaybeIdentity> {
  const { userId } = getAuth(req);
  if (!userId) return null;

  const clerkUser = await clerkClient.users.getUser(userId);
  const email = normalizeEmail(clerkUser.primaryEmailAddress?.emailAddress);
  const imageUrl = clerkUser.imageUrl || null;
  const clerkName =
    clerkUser.fullName ||
    clerkUser.firstName ||
    email ||
    "صديقنا البطل";

  let student = await db.query.studentsTable.findFirst({
    where: eq(studentsTable.clerkUserId, userId),
  });

  if (!student) {
    // First visit: create a row with the Google/Clerk name and image, but mark
    // it as unconfirmed so the UI forces the user to type their real name once.
    const [created] = await db
      .insert(studentsTable)
      .values({
        clerkUserId: userId,
        name: clerkName,
        email: email || undefined,
        imageUrl,
        role: "student",
        nameConfirmed: false,
      })
      .returning();
    student = created;
  } else {
    // Backfill and keep email/image in sync with Clerk.
    const updates: Partial<typeof studentsTable.$inferInsert> = {};
    if (!student.email && email) updates.email = email;
    if (student.email !== email && email) updates.email = email;
    if (student.imageUrl !== imageUrl) updates.imageUrl = imageUrl;

    if (Object.keys(updates).length > 0) {
      const [updated] = await db
        .update(studentsTable)
        .set(updates)
        .where(eq(studentsTable.id, student.id))
        .returning();
      student = updated;
    }
  }

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
