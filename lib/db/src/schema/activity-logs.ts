import { pgTable, text, integer, timestamp, serial, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";

export const ACTIVITY_TYPES = [
  "login",
  "name_change",
  "email_change",
  "avatar_change",
  "story_complete",
  "game_complete",
  "challenge_complete",
  "points_earned",
  "level_up",
  "quiz_complete",
  "library_submission",
  "friend_added",
  "friend_accepted",
  "settings_updated",
  "account_deleted",
] as const;

export const activityLogsTable = pgTable(
  "activity_logs",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => studentsTable.id, { onDelete: "cascade" }),
    type: text("type", { enum: ACTIVITY_TYPES }).notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    metadata: text("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index().on(table.studentId, table.createdAt)],
);

export const insertActivityLogSchema = createInsertSchema(activityLogsTable).omit({
  id: true,
  createdAt: true,
});
export const selectActivityLogSchema = createSelectSchema(activityLogsTable);

export type ActivityLog = typeof activityLogsTable.$inferSelect;
export type InsertActivityLog = typeof activityLogsTable.$inferInsert;
