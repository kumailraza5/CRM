import { Router, type IRouter } from "express";
import healthRouter from "./health";
import leadsRouter from "./leads";
import notesRouter from "./notes";
import templatesRouter from "./templates";
import dealsRouter from "./deals";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(leadsRouter);
router.use(notesRouter);
router.use(templatesRouter);
router.use(dealsRouter);
router.use(dashboardRouter);
router.use(reportsRouter);

export default router;
