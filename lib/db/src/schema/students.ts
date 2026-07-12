import {
  pgTable,
  text,
  integer,
  timestamp,
  serial,
  jsonb,
  date,
  unique,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Avatar customization is a small preset system (background color, gender-based
// 3D character model, a set of simultaneously-worn accessories, and one pet
// companion) rather than freeform art, since there's no per-user illustration
// pipeline yet. Accessory and pet choices are gated by student level on the
// server (see student.ts route) — gender and bgColor are always freely
// selectable.
//
// `accessories` replaced the old single-`accessory` string field so kids can
// wear a full outfit instead of one item. Existing rows in the DB still have
// the legacy `accessory` string (jsonb columns don't get their zod schema's
// defaults backfilled — see MEMORY topic drizzle-jsonb-default-backfill), so
// this migrates them into a one-item array on read instead of silently
// discarding the student's old pick.
function migrateLegacyAccessory(value: unknown): unknown {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    if (!("accessories" in obj) && "accessory" in obj) {
      const legacy = obj.accessory;
      const accessories = typeof legacy === "string" && legacy !== "none" ? [legacy] : [];
      return { ...obj, accessories };
    }
  }
  return value;
}

export const avatarConfigSchema = z.preprocess(
  migrateLegacyAccessory,
  z.object({
    bgColor: z.string().default("orange"),
    accessories: z.array(z.string()).default([]),
    gender: z.enum(["male", "female"]).default("male"),
    pet: z.string().default("none"),
  }),
);
export type AvatarConfig = z.infer<typeof avatarConfigSchema>;

// One row per authenticated Clerk user who has landed on the student home page.
// Guests (no Clerk account) never get a row here — their state stays client-side.
//
// This table now represents every platform account, not just students who
// stay students: the platform has no separate "teacher" account type, so
// promoting someone to teacher just flips `role` on their existing row
// rather than creating a parallel identity. The hardcoded admin
// (see api-server's identity helper) is resolved purely from `email` at
// runtime and is never stored as a `role` value here.
export const studentsTable = pgTable("students", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  name: text("name").notNull(),
  // Nullable because rows created before this field existed may not have
  // backfilled it yet — see identity.ts's self-healing fetch-on-read.
  email: text("email"),
  // "student" | "teacher" — admin is resolved from email, not stored here.
  role: text("role").notNull().default("student"),
  // Every new sign-in auto-fills `name` from the Google/Clerk profile but
  // must still ask the user to type their real full name once, so
  // admin/teacher picklists show a name the user actually chose. This
  // stays false until that one-time step completes.
  nameConfirmed: boolean("name_confirmed").notNull().default(false),
  classId: integer("class_id").references((): any => classesTable.id),
  points: integer("points").notNull().default(0),
  avatarConfig: jsonb("avatar_config").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStudentSchema = createInsertSchema(studentsTable).omit({
  id: true,
  createdAt: true,
});
export const selectStudentSchema = createSelectSchema(studentsTable);

export type InsertStudent = typeof studentsTable.$inferInsert;
export type Student = typeof studentsTable.$inferSelect;

// A "class" groups students under one teacher. Admin creates classes and
// assigns a teacher; a class is also auto-created when admin promotes a
// user to teacher so their dashboard has somewhere to claim students into
// immediately. `teacherId` is nullable so admin can create a class before
// picking a teacher, or leave one unowned after a teacher is demoted.
export const classesTable = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  teacherId: integer("teacher_id").references((): any => studentsTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Class = typeof classesTable.$inferSelect;
export type InsertClass = typeof classesTable.$inferInsert;

// A small rotating bank of reading/pronunciation prompts is used to derive
// "today's challenge" deterministically (see student route) instead of
// requiring a teacher to author content — there is no authoring tool yet.
export const dailyChallengesTable = pgTable("daily_challenges", {
  id: serial("id").primaryKey(),
  forDate: date("for_date").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  pointsReward: integer("points_reward").notNull().default(20),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type DailyChallenge = typeof dailyChallengesTable.$inferSelect;

export const studentChallengeCompletionsTable = pgTable(
  "student_challenge_completions",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => studentsTable.id),
    challengeId: integer("challenge_id")
      .notNull()
      .references(() => dailyChallengesTable.id),
    completedAt: timestamp("completed_at").notNull().defaultNow(),
  },
  (table) => [unique().on(table.studentId, table.challengeId)],
);

export type StudentChallengeCompletion =
  typeof studentChallengeCompletionsTable.$inferSelect;
