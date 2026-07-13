import { pgTable, text, integer, timestamp, serial, unique, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";

export const FRIENDSHIP_STATUSES = ["pending", "accepted", "rejected"] as const;

export const friendshipsTable = pgTable(
  "friendships",
  {
    id: serial("id").primaryKey(),
    requesterId: integer("requester_id")
      .notNull()
      .references(() => studentsTable.id, { onDelete: "cascade" }),
    addresseeId: integer("addressee_id")
      .notNull()
      .references(() => studentsTable.id, { onDelete: "cascade" }),
    status: text("status", { enum: FRIENDSHIP_STATUSES }).notNull().default("pending"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique().on(table.requesterId, table.addresseeId),
    index().on(table.addresseeId, table.status),
  ],
);

export const insertFriendshipSchema = createInsertSchema(friendshipsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectFriendshipSchema = createSelectSchema(friendshipsTable);

export type Friendship = typeof friendshipsTable.$inferSelect;
export type InsertFriendship = typeof friendshipsTable.$inferInsert;
