import {
  pgTable,
  text,
  integer,
  timestamp,
  serial,
  boolean,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";

export const chatMessagesTable = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  classId: integer("class_id"),
  senderId: integer("sender_id")
    .notNull()
    .references(() => studentsTable.id),
  content: text("content").notNull(),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chatMutesTable = pgTable(
  "chat_mutes",
  {
    id: serial("id").primaryKey(),
    classId: integer("class_id"),
    studentId: integer("student_id")
      .notNull()
      .references(() => studentsTable.id),
    mutedUntil: timestamp("muted_until").notNull(),
    reason: text("reason"),
    createdBy: integer("created_by")
      .notNull()
      .references(() => studentsTable.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [unique().on(table.classId, table.studentId)],
);

export const ChatMessageSchema = createSelectSchema(chatMessagesTable, {
  createdAt: z.coerce.date(),
});
export const ChatMuteSchema = createSelectSchema(chatMutesTable, {
  createdAt: z.coerce.date(),
  mutedUntil: z.coerce.date(),
});

export type ChatMessage = typeof chatMessagesTable.$inferSelect;
export type InsertChatMessage = typeof chatMessagesTable.$inferInsert;
export type ChatMute = typeof chatMutesTable.$inferSelect;
export type InsertChatMute = typeof chatMutesTable.$inferInsert;
