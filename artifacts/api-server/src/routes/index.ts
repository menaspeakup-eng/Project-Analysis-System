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
import storyRouter from "./story";
import activityLogsRouter from "./activity-logs";
import friendsRouter from "./friends";

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
router.use(storyRouter);
router.use(activityLogsRouter);
router.use(friendsRouter);

export default router;
