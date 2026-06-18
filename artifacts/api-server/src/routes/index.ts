import { Router, type IRouter } from "express";
import healthRouter from "./health";
import eventsRouter from "./events";
import sourcesRouter from "./sources";
import claimsRouter from "./claims";
import evidenceRouter from "./evidence";
import factCheckRouter from "./fact-check";
import timelineRouter from "./timeline";
import searchRouter from "./search";

const router: IRouter = Router();

router.use(healthRouter);
router.use(eventsRouter);
router.use(sourcesRouter);
router.use(claimsRouter);
router.use(evidenceRouter);
router.use(factCheckRouter);
router.use(timelineRouter);
router.use(searchRouter);

export default router;
