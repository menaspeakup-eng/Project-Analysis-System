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
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";

// One row for every AI-generated story session. Each student may generate
// one story per calendar day by default; teachers can grant extra allowances
// through `aiStoryDailyAllowances`.
export const aiStorySessionsTable = pgTable("ai_story_sessions", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id")
    .notNull()
    .references(() => studentsTable.id, { onDelete: "cascade" }),
  storyType: text("story_type").notNull(),
  studentName: text("student_name").notNull(),
  title: text("title").notNull(),
  story: text("story").notNull(),
  // Full generated content in JSON form for quizzes and review pages.
  generatedContent: jsonb("generated_content").notNull().default({}),
  forDate: date("for_date").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAiStorySessionSchema = createInsertSchema(aiStorySessionsTable).omit({
  id: true,
  createdAt: true,
});
export const selectAiStorySessionSchema = createSelectSchema(aiStorySessionsTable);

export type AiStorySession = typeof aiStorySessionsTable.$inferSelect;
export type InsertAiStorySession = typeof aiStorySessionsTable.$inferInsert;

// Stores the quiz answers a student submits for a story session. The score is
// computed immediately by comparing each answer to the stored correct answer.
export const aiStoryQuizSubmissionsTable = pgTable(
  "ai_story_quiz_submissions",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id")
      .notNull()
      .references(() => aiStorySessionsTable.id, { onDelete: "cascade" }),
    studentId: integer("student_id")
      .notNull()
      .references(() => studentsTable.id, { onDelete: "cascade" }),
    // Array of { questionIndex, question, selectedAnswer, correctAnswer, isCorrect }
    answers: jsonb("answers").notNull().default([]),
    score: integer("score").notNull().default(0),
    maxScore: integer("max_score").notNull().default(0),
    status: text("status").notNull().default("pending"),
    pointsAwarded: integer("points_awarded"),
    teacherFeedback: text("teacher_feedback"),
    reviewedBy: integer("reviewed_by").references(() => studentsTable.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique().on(table.studentId, table.sessionId),
    index().on(table.studentId, table.createdAt),
  ],
);

export const insertAiStoryQuizSubmissionSchema = createInsertSchema(
  aiStoryQuizSubmissionsTable,
).omit({
  id: true,
  createdAt: true,
});
export const selectAiStoryQuizSubmissionSchema = createSelectSchema(aiStoryQuizSubmissionsTable);

export type AiStoryQuizSubmission = typeof aiStoryQuizSubmissionsTable.$inferSelect;
export type InsertAiStoryQuizSubmission = typeof aiStoryQuizSubmissionsTable.$inferInsert;

// Teacher-granted extra story-generation allowances per student per day.
export const aiStoryDailyAllowancesTable = pgTable(
  "ai_story_daily_allowances",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => studentsTable.id, { onDelete: "cascade" }),
    forDate: date("for_date").notNull().defaultNow(),
    // How many extra stories the student may generate today beyond the default 1.
    extraUses: integer("extra_uses").notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [unique().on(table.studentId, table.forDate)],
);

export const insertAiStoryDailyAllowanceSchema = createInsertSchema(aiStoryDailyAllowancesTable).omit({
  id: true,
  createdAt: true,
});
export const selectAiStoryDailyAllowanceSchema = createSelectSchema(aiStoryDailyAllowancesTable);

export type AiStoryDailyAllowance = typeof aiStoryDailyAllowancesTable.$inferSelect;
export type InsertAiStoryDailyAllowance = typeof aiStoryDailyAllowancesTable.$inferInsert;
