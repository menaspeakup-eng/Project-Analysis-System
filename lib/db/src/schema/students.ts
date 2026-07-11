import { pgTable, text, integer, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// One row per authenticated Clerk user who has landed on the student home page.
// Guests (no Clerk account) never get a row here — their state stays client-side.
export const studentsTable = pgTable("students", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  name: text("name").notNull(),
  points: integer("points").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStudentSchema = createInsertSchema(studentsTable).omit({
  id: true,
  createdAt: true,
});
export const selectStudentSchema = createSelectSchema(studentsTable);

export type InsertStudent = typeof studentsTable.$inferInsert;
export type Student = typeof studentsTable.$inferSelect;
