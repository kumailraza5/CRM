import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import leadsRouter from "./leads";
import notesRouter from "./notes";
import templatesRouter from "./templates";
import dealsRouter from "./deals";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";

import { isAuthenticated } from "../middleware/auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);

// Protected data routes
router.use(isAuthenticated);
router.use(leadsRouter);
router.use(notesRouter);
router.use(templatesRouter);
router.use(dealsRouter);
router.use(dashboardRouter);
router.use(reportsRouter);

export default router;
