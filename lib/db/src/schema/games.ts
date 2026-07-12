import {
  pgTable,
  text,
  integer,
  timestamp,
  serial,
  boolean,
  unique,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable, classesTable } from "./students";

export const GAME_TYPES = [
  "match-sentence-picture",
  "arrange-sentence",
  "choose-picture",
  "choose-sentence",
  "complete-sentence",
  "arrange-sentences",
] as const;

export type GameType = (typeof GAME_TYPES)[number];

export const gamesTable = pgTable("games", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  classId: integer("class_id").notNull().references(() => classesTable.id),
  name: text("name").notNull(),
  type: text("type", { enum: GAME_TYPES }).notNull().default("match-sentence-picture"),
  description: text("description"),
  imageUrl: text("image_url"),
  pointsReward: integer("points_reward").notNull().default(15),
  isActive: boolean("is_active").notNull().default(true),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const gameItemsTable = pgTable("game_items", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id")
    .notNull()
    .references(() => gamesTable.id),
  itemOrder: integer("item_order").notNull().default(0),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const studentGameSessionsTable = pgTable(
  "student_game_sessions",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => studentsTable.id),
    gameId: integer("game_id")
      .notNull()
      .references(() => gamesTable.id),
    version: integer("version").notNull(),
    status: text("status").notNull().default("completed"),
    score: integer("score").notNull().default(0),
    mistakes: integer("mistakes").notNull().default(0),
    durationMs: integer("duration_ms"),
    completedAt: timestamp("completed_at").notNull().defaultNow(),
  },
  (table) => [unique().on(table.studentId, table.gameId, table.version)],
);

export const GameSchema = createSelectSchema(gamesTable, {
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const GameItemSchema = createSelectSchema(gameItemsTable, {
  createdAt: z.coerce.date(),
});

export const StudentGameSessionSchema = createSelectSchema(studentGameSessionsTable, {
  completedAt: z.coerce.date(),
});

export type Game = typeof gamesTable.$inferSelect;
export type InsertGame = typeof gamesTable.$inferInsert;
export type GameItem = typeof gameItemsTable.$inferSelect;
export type InsertGameItem = typeof gameItemsTable.$inferInsert;
export type StudentGameSession = typeof studentGameSessionsTable.$inferSelect;
export type InsertStudentGameSession = typeof studentGameSessionsTable.$inferInsert;

// Client-side payload shapes (also used by the backend to validate incoming items).
export const MatchSentencePicturePayloadSchema = z.object({
  imageUrl: z.string().min(1).max(1000),
  sentence: z.string().min(1).max(500),
});

export const ArrangeSentencePayloadSchema = z.object({
  sentence: z.string().min(1).max(500),
});

export const ChoosePicturePayloadSchema = z.object({
  sentence: z.string().min(1).max(500),
  correctImageUrl: z.string().min(1).max(1000),
  wrongImageUrls: z.array(z.string().min(1).max(1000)).length(3),
});

export const ChooseSentencePayloadSchema = z.object({
  imageUrl: z.string().min(1).max(1000),
  correctSentence: z.string().min(1).max(500),
  wrongSentences: z.array(z.string().min(1).max(500)).length(3),
});

export const CompleteSentencePayloadSchema = z.object({
  sentence: z.string().min(1).max(500),
  hiddenWord: z.string().min(1).max(100),
  wrongWords: z.array(z.string().min(1).max(100)).length(3),
});

export const ArrangeSentencesPayloadSchema = z.object({
  sentence: z.string().min(1).max(500),
});

export const GamePayloadSchema = z.union([
  MatchSentencePicturePayloadSchema,
  ArrangeSentencePayloadSchema,
  ChoosePicturePayloadSchema,
  ChooseSentencePayloadSchema,
  CompleteSentencePayloadSchema,
  ArrangeSentencesPayloadSchema,
]);

export type MatchSentencePicturePayload = z.infer<typeof MatchSentencePicturePayloadSchema>;
export type ArrangeSentencePayload = z.infer<typeof ArrangeSentencePayloadSchema>;
export type ChoosePicturePayload = z.infer<typeof ChoosePicturePayloadSchema>;
export type ChooseSentencePayload = z.infer<typeof ChooseSentencePayloadSchema>;
export type CompleteSentencePayload = z.infer<typeof CompleteSentencePayloadSchema>;
export type ArrangeSentencesPayload = z.infer<typeof ArrangeSentencesPayloadSchema>;
export type GamePayload = z.infer<typeof GamePayloadSchema>;
