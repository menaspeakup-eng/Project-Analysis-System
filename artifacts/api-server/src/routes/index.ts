import { Router, type IRouter } from "express";
import healthRouter from "./health";
import studentRouter from "./student";
import leaderboardRouter from "./leaderboard";
import adminRouter from "./admin";
import teacherRouter from "./teacher";
import identityRouter from "./identity";

const router: IRouter = Router();

router.use(healthRouter);
router.use(identityRouter);
router.use(studentRouter);
router.use(leaderboardRouter);
router.use(adminRouter);
router.use(teacherRouter);

export default router;
