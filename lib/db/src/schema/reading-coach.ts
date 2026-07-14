import {
  pgTable,
  text,
  integer,
  timestamp,
  serial,
  jsonb,
  date,
  boolean,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";

// Sentences previously shown to a student so the daily generator can avoid
// repeating them in the near term.
export const readingCoachSentencesTable = pgTable("reading_coach_sentences", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id")
    .notNull()
    .references(() => studentsTable.id, { onDelete: "cascade" }),
  sentence: text("sentence").notNull(),
  difficulty: integer("difficulty").notNull().default(1),
  forDate: date("for_date").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertReadingCoachSentenceSchema = createInsertSchema(
  readingCoachSentencesTable,
).omit({ id: true, createdAt: true });
export const selectReadingCoachSentenceSchema = createSelectSchema(
  readingCoachSentencesTable,
);

export type ReadingCoachSentence = typeof readingCoachSentencesTable.$inferSelect;
export type InsertReadingCoachSentence = typeof readingCoachSentencesTable.$inferInsert;

// One daily reading-coach attempt per student. The audio file is stored in object
// storage and referenced by objectPath. The transcription and AI analysis are
// cached so the teacher review page can display them without re-running the
// model.
export const readingCoachAttemptsTable = pgTable(
  "reading_coach_attempts",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => studentsTable.id, { onDelete: "cascade" }),
    sentence: text("sentence").notNull(),
    audioObjectPath: text("audio_object_path").notNull(),
    transcription: text("transcription"),
    // AI analysis: { accuracy, missingWords, wrongWords, addedWords, fluency, tips, score, summary }
    analysis: jsonb("analysis").notNull().default({}),
    score: integer("score").notNull().default(0),
    maxScore: integer("max_score").notNull().default(100),
    status: text("status").notNull().default("pending"),
    pointsAwarded: integer("points_awarded"),
    teacherFeedback: text("teacher_feedback"),
    reviewedBy: integer("reviewed_by").references(() => studentsTable.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at"),
    forDate: date("for_date").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [unique().on(table.studentId, table.forDate)],
);

export const insertReadingCoachAttemptSchema = createInsertSchema(
  readingCoachAttemptsTable,
).omit({ id: true, createdAt: true });
export const selectReadingCoachAttemptSchema = createSelectSchema(
  readingCoachAttemptsTable,
);

export type ReadingCoachAttempt = typeof readingCoachAttemptsTable.$inferSelect;
export type InsertReadingCoachAttempt = typeof readingCoachAttemptsTable.$inferInsert;

// Teacher-granted extra reading-coach allowances per student per day.
export const readingCoachDailyAllowancesTable = pgTable(
  "reading_coach_daily_allowances",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => studentsTable.id, { onDelete: "cascade" }),
    forDate: date("for_date").notNull().defaultNow(),
    extraUses: integer("extra_uses").notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [unique().on(table.studentId, table.forDate)],
);

export const insertReadingCoachDailyAllowanceSchema = createInsertSchema(
  readingCoachDailyAllowancesTable,
).omit({ id: true, createdAt: true });
export const selectReadingCoachDailyAllowanceSchema = createSelectSchema(
  readingCoachDailyAllowancesTable,
);

export type ReadingCoachDailyAllowance =
  typeof readingCoachDailyAllowancesTable.$inferSelect;
export type InsertReadingCoachDailyAllowance =
  typeof readingCoachDailyAllowancesTable.$inferInsert;
