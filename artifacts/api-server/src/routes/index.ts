import { Router, type IRouter } from "express";
import healthRouter from "./health";
import studentRouter from "./student";
import leaderboardRouter from "./leaderboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(studentRouter);
router.use(leaderboardRouter);

export default router;
