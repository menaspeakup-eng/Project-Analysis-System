import {
  pgTable,
  text,
  integer,
  timestamp,
  serial,
  jsonb,
  boolean,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";

export const LIBRARY_ITEM_TYPES = ["read", "audio", "attachment"] as const;
export const LIBRARY_QUESTION_TYPES = ["mcq", "text"] as const;

export const libraryItemsTable = pgTable("library_items", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").notNull(),
  teacherId: integer("teacher_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // read | audio | attachment
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  coverObjectPath: text("cover_object_path"),
  contentObjectPath: text("content_object_path"), // audio or PDF
  bodyText: text("body_text"), // for read stories
  externalUrl: text("external_url"), // for attachments
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const libraryQuestionsTable = pgTable("library_questions", {
  id: serial("id").primaryKey(),
  libraryItemId: integer("library_item_id").notNull().references(() => libraryItemsTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // mcq | text
  question: text("question").notNull(),
  options: jsonb("options").notNull().default([]), // for mcq: string[]
  correctAnswer: text("correct_answer"), // for mcq
  points: integer("points").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const librarySubmissionsTable = pgTable(
  "library_submissions",
  {
    id: serial("id").primaryKey(),
    libraryItemId: integer("library_item_id").notNull().references(() => libraryItemsTable.id, { onDelete: "cascade" }),
    studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
    score: integer("score").notNull().default(0), // auto-scored points for mcq
    maxScore: integer("max_score").notNull().default(0), // total possible points
    status: text("status").notNull().default("pending"), // pending | accepted | rejected
    teacherFeedback: text("teacher_feedback"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    uniqueStudentItem: unique().on(t.libraryItemId, t.studentId),
  }),
);

export const libraryAnswersTable = pgTable("library_answers", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull().references(() => librarySubmissionsTable.id, { onDelete: "cascade" }),
  questionId: integer("question_id").notNull().references(() => libraryQuestionsTable.id, { onDelete: "cascade" }),
  selectedAnswer: text("selected_answer"), // for mcq
  textAnswer: text("text_answer"), // for text
  isCorrect: boolean("is_correct"), // for mcq
  pointsAwarded: integer("points_awarded").default(0),
  status: text("status").default("pending"), // pending | accepted | rejected
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLibraryItemSchema = createInsertSchema(libraryItemsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectLibraryItemSchema = createSelectSchema(libraryItemsTable);
export const insertLibraryQuestionSchema = createInsertSchema(libraryQuestionsTable).omit({
  id: true,
  createdAt: true,
});
export const selectLibraryQuestionSchema = createSelectSchema(libraryQuestionsTable);
export const insertLibrarySubmissionSchema = createInsertSchema(librarySubmissionsTable).omit({
  id: true,
  createdAt: true,
});
export const selectLibrarySubmissionSchema = createSelectSchema(librarySubmissionsTable);
export const insertLibraryAnswerSchema = createInsertSchema(libraryAnswersTable).omit({
  id: true,
  createdAt: true,
});
export const selectLibraryAnswerSchema = createSelectSchema(libraryAnswersTable);

export type LibraryItem = typeof libraryItemsTable.$inferSelect;
export type InsertLibraryItem = typeof libraryItemsTable.$inferInsert;
export type LibraryQuestion = typeof libraryQuestionsTable.$inferSelect;
export type InsertLibraryQuestion = typeof libraryQuestionsTable.$inferInsert;
export type LibrarySubmission = typeof librarySubmissionsTable.$inferSelect;
export type InsertLibrarySubmission = typeof librarySubmissionsTable.$inferInsert;
export type LibraryAnswer = typeof libraryAnswersTable.$inferSelect;
export type InsertLibraryAnswer = typeof libraryAnswersTable.$inferInsert;
