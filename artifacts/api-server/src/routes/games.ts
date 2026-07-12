import { Router, type IRouter } from "express";
import { z } from "zod";
import {
  db,
  studentsTable,
  classesTable,
  gamesTable,
  gameItemsTable,
  studentGameSessionsTable,
  GAME_TYPES,
  type GameType,
} from "@workspace/db";
import { eq, and, sql, desc, inArray, count, avg } from "drizzle-orm";
import {
  resolveIdentity,
  requireIdentity,
  requireTeacher,
} from "../lib/identity";

const router: IRouter = Router();

const MAX_ITEMS_PER_GAME = 100;

const GameTypeSchema = z.enum(GAME_TYPES);

const UpdateGameBody = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().or(z.literal("")),
  imageUrl: z.string().max(5_000_000).optional().or(z.literal("")),
  pointsReward: z.number().int().min(0).max(1000).optional(),
  isActive: z.boolean().optional(),
  classId: z.number().int().optional(),
});

const CompleteGameBody = z.object({
  score: z.number().int().min(0).optional(),
  mistakes: z.number().int().min(0).optional(),
  durationMs: z.number().int().min(0).optional(),
});

const CreateGameBody = z.object({
  slug: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  type: GameTypeSchema,
  description: z.string().max(1000).optional().or(z.literal("")),
  imageUrl: z.string().max(5_000_000).optional().or(z.literal("")),
  pointsReward: z.number().int().min(0).max(1000).optional(),
  classId: z.number().int(),
});

function parseIntParam(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function now(): Date {
  return new Date();
}

const payloadValidators: Record<GameType, z.ZodTypeAny> = {
  "match-sentence-picture": z.object({
    imageUrl: z.string().min(1).max(5_000_000),
    sentence: z.string().min(1).max(500),
  }),
  "arrange-sentence": z.object({
    sentence: z.string().min(1).max(500),
  }),
  "choose-picture": z.object({
    sentence: z.string().min(1).max(500),
    correctImageUrl: z.string().min(1).max(5_000_000),
    wrongImageUrls: z.array(z.string().min(1).max(5_000_000)).length(3),
  }),
  "choose-sentence": z.object({
    imageUrl: z.string().min(1).max(5_000_000),
    correctSentence: z.string().min(1).max(500),
    wrongSentences: z.array(z.string().min(1).max(500)).length(3),
  }),
  "complete-sentence": z.object({
    sentence: z.string().min(1).max(500),
    hiddenWord: z.string().min(1).max(100),
    wrongWords: z.array(z.string().min(1).max(100)).length(3),
  }),
  "arrange-sentences": z.object({
    sentence: z.string().min(1).max(500),
  }),
};

function validateItems(type: GameType, items: unknown[]) {
  const validator = payloadValidators[type];
  const valid: unknown[] = [];
  for (const item of items) {
    valid.push(validator.parse(item));
  }
  return valid;
}

function requireGameOwnership(
  identity: NonNullable<Awaited<ReturnType<typeof resolveIdentity>>>,
  game: { classId: number },
) {
  if (identity.isAdmin) return;
  const allowed = identity.teacherClassIds;
  if (allowed.includes(game.classId)) return;
  const err = new Error("Forbidden") as Error & { status?: number };
  err.status = 403;
  throw err;
}

async function getAccessibleGames(
  identity: NonNullable<Awaited<ReturnType<typeof resolveIdentity>>>,
) {
  const classId = identity.student?.classId ?? null;
  if (classId == null) return [];

  const activeGames = await db.query.gamesTable.findMany({
    where: and(eq(gamesTable.isActive, true), eq(gamesTable.classId, classId)),
    orderBy: [gamesTable.id],
  });

  return activeGames;
}

async function isGameAccessible(
  gameId: number,
  identity: NonNullable<Awaited<ReturnType<typeof resolveIdentity>>>,
): Promise<boolean> {
  const game = await db.query.gamesTable.findFirst({
    where: and(eq(gamesTable.id, gameId), eq(gamesTable.isActive, true)),
  });
  if (!game) return false;

  if (identity.isTeacher || identity.isAdmin) return true;

  const classId = identity.student?.classId ?? null;
  return game.classId === classId;
}

async function getCompletedVersions(
  studentId: number | undefined,
  gameId: number,
): Promise<number[]> {
  if (!studentId) return [];
  const sessions = await db.query.studentGameSessionsTable.findMany({
    where: and(
      eq(studentGameSessionsTable.studentId, studentId),
      eq(studentGameSessionsTable.gameId, gameId),
    ),
  });
  return sessions.map((s) => s.version);
}

async function getGameWithItems(gameId: number) {
  const game = await db.query.gamesTable.findFirst({
    where: eq(gamesTable.id, gameId),
  });
  if (!game) return null;
  const items = await db.query.gameItemsTable.findMany({
    where: eq(gameItemsTable.gameId, gameId),
    orderBy: [gameItemsTable.itemOrder],
  });
  return { game, items: items.map((i) => i.payload) };
}

// Student: list accessible games.
router.get("/games", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);

  const studentId = identity.student?.id;
  const games = await getAccessibleGames(identity);

  const completedVersions = studentId
    ? await db.query.studentGameSessionsTable.findMany({
        where: and(
          inArray(
            studentGameSessionsTable.gameId,
            games.map((g) => g.id),
          ),
          eq(studentGameSessionsTable.studentId, studentId),
        ),
      })
    : [];

  const completedByGame = new Map<number, number[]>();
  for (const c of completedVersions) {
    const list = completedByGame.get(c.gameId) || [];
    list.push(c.version);
    completedByGame.set(c.gameId, list);
  }

  const result = games.map((g) => {
    const completed = completedByGame.get(g.id) || [];
    const isCompleted = completed.includes(g.version);
    return {
      id: g.id,
      slug: g.slug,
      name: g.name,
      type: g.type,
      description: g.description,
      imageUrl: g.imageUrl,
      pointsReward: g.pointsReward,
      isActive: g.isActive,
      version: g.version,
      isCompleted,
      isLocked: false,
    };
  });

  res.json({ games: result });
});

// Student: get a single game with items.
router.get("/games/:id", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);

  const gameId = parseIntParam(req.params.id);
  if (gameId === null) {
    res.status(400).json({ error: "معرف اللعبة غير صالح" });
    return;
  }

  if (!(await isGameAccessible(gameId, identity))) {
    res.status(403).json({ error: "لا يمكنك الوصول إلى هذه اللعبة" });
    return;
  }

  const data = await getGameWithItems(gameId);
  if (!data) {
    res.status(404).json({ error: "اللعبة غير موجودة" });
    return;
  }

  const studentId = identity.student?.id;
  const completed = studentId ? await getCompletedVersions(studentId, gameId) : [];

  res.json({
    id: data.game.id,
    slug: data.game.slug,
    name: data.game.name,
    type: data.game.type,
    description: data.game.description,
    imageUrl: data.game.imageUrl,
    pointsReward: data.game.pointsReward,
    version: data.game.version,
    items: data.items,
    isCompleted: completed.includes(data.game.version),
  });
});

// Student: complete a game.
router.post("/games/:id/complete", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);

  const studentId = identity.student?.id;
  if (!studentId) {
    res.status(401).json({ error: "يلزم تسجيل الدخول لحفظ النقاط" });
    return;
  }

  const gameId = parseIntParam(req.params.id);
  if (gameId === null) {
    res.status(400).json({ error: "معرف اللعبة غير صالح" });
    return;
  }

  if (!(await isGameAccessible(gameId, identity))) {
    res.status(403).json({ error: "لا يمكنك الوصول إلى هذه اللعبة" });
    return;
  }

  const body = CompleteGameBody.parse(req.body);

  const game = await db.query.gamesTable.findFirst({
    where: and(eq(gamesTable.id, gameId), eq(gamesTable.isActive, true)),
  });
  if (!game) {
    res.status(404).json({ error: "اللعبة غير موجودة أو غير مفعلة" });
    return;
  }

  const existing = await db.query.studentGameSessionsTable.findFirst({
    where: and(
      eq(studentGameSessionsTable.studentId, studentId),
      eq(studentGameSessionsTable.gameId, gameId),
      eq(studentGameSessionsTable.version, game.version),
    ),
  });
  if (existing) {
    res.status(400).json({ error: "لقد أنهيت هذه النسخة من اللعبة مسبقاً" });
    return;
  }

  const student = await db.query.studentsTable.findFirst({
    where: eq(studentsTable.id, studentId),
  });
  if (!student) {
    res.status(404).json({ error: "الطالب غير موجود" });
    return;
  }

  await db
    .update(studentsTable)
    .set({ points: student.points + game.pointsReward })
    .where(eq(studentsTable.id, studentId));

  const [session] = await db
    .insert(studentGameSessionsTable)
    .values({
      studentId,
      gameId,
      version: game.version,
      status: "completed",
      score: body.score ?? 0,
      mistakes: body.mistakes ?? 0,
      durationMs: body.durationMs ?? null,
      completedAt: now(),
    })
    .returning();

  res.status(201).json({
    id: session.id,
    gameId: session.gameId,
    version: session.version,
    pointsAwarded: game.pointsReward,
    completedAt: session.completedAt,
  });
});

// Teacher: list all games with stats.
router.get("/teacher/games", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireTeacher(identity);

  const allowedClassIds = identity.isAdmin
    ? null
    : identity.teacherClassIds;

  const games = await db.query.gamesTable.findMany({
    where: allowedClassIds == null
      ? undefined
      : sql`${gamesTable.classId} IN (${allowedClassIds})`,
    orderBy: [gamesTable.id],
  });

  const gameIds = games.map((g) => g.id);

  const sessions = await db.query.studentGameSessionsTable.findMany({
    where: gameIds.length ? inArray(studentGameSessionsTable.gameId, gameIds) : undefined,
  });

  const statsByGame = new Map<
    number,
    { plays: number; uniqueStudents: number; avgMistakes: number; avgDuration: number }
  >();
  for (const s of sessions) {
    const existing = statsByGame.get(s.gameId) || {
      plays: 0,
      uniqueStudents: 0,
      avgMistakes: 0,
      avgDuration: 0,
    };
    existing.plays++;
    statsByGame.set(s.gameId, existing);
  }

  const result = games.map((g) => ({
    id: g.id,
    slug: g.slug,
    name: g.name,
    type: g.type,
    description: g.description,
    imageUrl: g.imageUrl,
    pointsReward: g.pointsReward,
    isActive: g.isActive,
    version: g.version,
    classId: g.classId,
    stats: statsByGame.get(g.id) || {
      plays: 0,
      uniqueStudents: 0,
      avgMistakes: 0,
      avgDuration: 0,
    },
  }));

  res.json({ games: result });
});

// Teacher: create a new game.
router.post("/teacher/games", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireTeacher(identity);

  const body = CreateGameBody.parse(req.body);

  if (!identity.isAdmin && !identity.teacherClassIds.includes(body.classId)) {
    res.status(403).json({ error: "لا يمكنك إنشاء لعبة لصف لا تملكه" });
    return;
  }

  const cls = await db.query.classesTable.findFirst({
    where: eq(classesTable.id, body.classId),
  });
  if (!cls) {
    res.status(404).json({ error: "الصف غير موجود" });
    return;
  }

  const [game] = await db
    .insert(gamesTable)
    .values({
      slug: body.slug,
      classId: body.classId,
      name: body.name,
      type: body.type,
      description: body.description || undefined,
      imageUrl: body.imageUrl || undefined,
      pointsReward: body.pointsReward ?? 15,
      isActive: true,
      version: 1,
    })
    .returning();

  res.status(201).json({
    id: game.id,
    slug: game.slug,
    name: game.name,
    type: game.type,
    description: game.description,
    imageUrl: game.imageUrl,
    pointsReward: game.pointsReward,
    isActive: game.isActive,
    version: game.version,
    classId: game.classId,
    stats: {
      plays: 0,
      uniqueStudents: 0,
      avgMistakes: 0,
      avgDuration: 0,
    },
  });
});

// Teacher: update game metadata.
router.put("/teacher/games/:id", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireTeacher(identity);

  const gameId = parseIntParam(req.params.id);
  if (gameId === null) {
    res.status(400).json({ error: "معرف اللعبة غير صالح" });
    return;
  }

  const body = UpdateGameBody.parse(req.body);

  const game = await db.query.gamesTable.findFirst({
    where: eq(gamesTable.id, gameId),
  });
  if (!game) {
    res.status(404).json({ error: "اللعبة غير موجودة" });
    return;
  }

  requireGameOwnership(identity, game);

  if (body.classId !== undefined && !identity.isAdmin && !identity.teacherClassIds.includes(body.classId)) {
    res.status(403).json({ error: "لا يمكنك نقل اللعبة إلى صف لا تملكه" });
    return;
  }

  const [updated] = await db
    .update(gamesTable)
    .set({
      name: body.name ?? game.name,
      description: body.description ?? game.description,
      imageUrl: body.imageUrl ?? game.imageUrl,
      pointsReward: body.pointsReward ?? game.pointsReward,
      isActive: body.isActive ?? game.isActive,
      classId: body.classId === undefined ? game.classId : body.classId,
      updatedAt: now(),
    })
    .where(eq(gamesTable.id, gameId))
    .returning();

  res.json({
    id: updated.id,
    slug: updated.slug,
    name: updated.name,
    type: updated.type,
    description: updated.description,
    imageUrl: updated.imageUrl,
    pointsReward: updated.pointsReward,
    isActive: updated.isActive,
    version: updated.version,
    classId: updated.classId,
  });
});

// Teacher: delete a game.
router.delete("/teacher/games/:id", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireTeacher(identity);

  const gameId = parseIntParam(req.params.id);
  if (gameId === null) {
    res.status(400).json({ error: "معرف اللعبة غير صالح" });
    return;
  }

  const game = await db.query.gamesTable.findFirst({
    where: eq(gamesTable.id, gameId),
  });
  if (!game) {
    res.status(404).json({ error: "اللعبة غير موجودة" });
    return;
  }

  requireGameOwnership(identity, game);

  await db.transaction(async (tx) => {
    await tx.delete(studentGameSessionsTable).where(eq(studentGameSessionsTable.gameId, gameId));
    await tx.delete(gameItemsTable).where(eq(gameItemsTable.gameId, gameId));
    await tx.delete(gamesTable).where(eq(gamesTable.id, gameId));
  });

  res.status(204).send();
});

// Teacher: get items for a game.
router.get("/teacher/games/:id/words", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireTeacher(identity);

  const gameId = parseIntParam(req.params.id);
  if (gameId === null) {
    res.status(400).json({ error: "معرف اللعبة غير صالح" });
    return;
  }

  const game = await db.query.gamesTable.findFirst({
    where: eq(gamesTable.id, gameId),
  });
  if (!game) {
    res.status(404).json({ error: "اللعبة غير موجودة" });
    return;
  }

  requireGameOwnership(identity, game);

  const items = await db.query.gameItemsTable.findMany({
    where: eq(gameItemsTable.gameId, gameId),
    orderBy: [gameItemsTable.itemOrder],
  });

  res.json({
    gameId,
    type: game.type,
    version: game.version,
    items: items.map((i) => ({ id: i.id, order: i.itemOrder, payload: i.payload })),
  });
});

// Teacher: replace items and bump version (republish).
router.put("/teacher/games/:id/words", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireTeacher(identity);

  const gameId = parseIntParam(req.params.id);
  if (gameId === null) {
    res.status(400).json({ error: "معرف اللعبة غير صالح" });
    return;
  }

  const game = await db.query.gamesTable.findFirst({
    where: eq(gamesTable.id, gameId),
  });
  if (!game) {
    res.status(404).json({ error: "اللعبة غير موجودة" });
    return;
  }

  requireGameOwnership(identity, game);

  const body = z
    .object({
      items: z.array(z.record(z.any())).max(MAX_ITEMS_PER_GAME),
    })
    .parse(req.body);

  const validItems = validateItems(game.type, body.items);

  await db.transaction(async (tx) => {
    await tx.delete(gameItemsTable).where(eq(gameItemsTable.gameId, gameId));
    if (validItems.length > 0) {
      await tx.insert(gameItemsTable).values(
        validItems.map((payload, idx) => ({
          gameId,
          itemOrder: idx,
          payload,
        })),
      );
    }
    await tx
      .update(gamesTable)
      .set({ version: game.version + 1, updatedAt: now() })
      .where(eq(gamesTable.id, gameId));
  });

  const updatedItems = await db.query.gameItemsTable.findMany({
    where: eq(gameItemsTable.gameId, gameId),
    orderBy: [gameItemsTable.itemOrder],
  });

  res.json({
    gameId,
    version: game.version + 1,
    type: game.type,
    items: updatedItems.map((i) => ({ id: i.id, order: i.itemOrder, payload: i.payload })),
  });
});

// Teacher: stats for a game.
router.get("/teacher/games/:id/stats", async (req, res) => {
  const identity = await resolveIdentity(req);
  requireIdentity(identity);
  requireTeacher(identity);

  const gameId = parseIntParam(req.params.id);
  if (gameId === null) {
    res.status(400).json({ error: "معرف اللعبة غير صالح" });
    return;
  }

  const game = await db.query.gamesTable.findFirst({
    where: eq(gamesTable.id, gameId),
  });
  if (!game) {
    res.status(404).json({ error: "اللعبة غير موجودة" });
    return;
  }

  requireGameOwnership(identity, game);

  const sessions = await db.query.studentGameSessionsTable.findMany({
    where: eq(studentGameSessionsTable.gameId, gameId),
  });

  const studentIds = [...new Set(sessions.map((s) => s.studentId))];
  const students = studentIds.length
    ? await db.query.studentsTable.findMany({
        where: inArray(studentsTable.id, studentIds),
      })
    : [];
  const studentNameById = new Map(students.map((s) => [s.id, s.name]));

  const plays = sessions.length;
  const avgMistakes =
    plays > 0 ? Math.round(sessions.reduce((sum, s) => sum + s.mistakes, 0) / plays) : 0;
  const avgDuration =
    plays > 0
      ? Math.round(
          sessions.reduce((sum, s) => sum + (s.durationMs ?? 0), 0) /
            sessions.filter((s) => s.durationMs).length,
        )
      : 0;

  res.json({
    gameId,
    plays,
    uniqueStudents: studentIds.length,
    avgMistakes,
    avgDuration,
    wordStats: {},
    sessions: sessions.map((s) => ({
      id: s.id,
      studentId: s.studentId,
      studentName: studentNameById.get(s.studentId) ?? "",
      version: s.version,
      score: s.score,
      mistakes: s.mistakes,
      durationMs: s.durationMs,
      completedAt: s.completedAt,
    })),
  });
});

export default router;
