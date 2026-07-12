import { Router, type IRouter } from "express";
import healthRouter from "./health";
import studentRouter from "./student";
import leaderboardRouter from "./leaderboard";
import adminRouter from "./admin";
import teacherRouter from "./teacher";
import challengesRouter from "./challenges";
import identityRouter from "./identity";
import gamesRouter from "./games";
import chatRouter from "./chat";

const router: IRouter = Router();

router.use(healthRouter);
router.use(identityRouter);
router.use(studentRouter);
router.use(leaderboardRouter);
router.use(adminRouter);
router.use(teacherRouter);
router.use(challengesRouter);
router.use(gamesRouter);
router.use(chatRouter);

export default router;
