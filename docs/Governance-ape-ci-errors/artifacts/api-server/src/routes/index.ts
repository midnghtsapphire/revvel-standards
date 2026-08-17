import { Router, type IRouter } from "express";
import healthRouter from "./health";
import flowsRouter from "./flows";

const router: IRouter = Router();

router.use(healthRouter);
router.use(flowsRouter);

export default router;
