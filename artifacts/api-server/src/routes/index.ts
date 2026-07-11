import { Router, type IRouter } from "express";
import healthRouter from "./health";
import studentRouter from "./student";

const router: IRouter = Router();

router.use(healthRouter);
router.use(studentRouter);

export default router;
