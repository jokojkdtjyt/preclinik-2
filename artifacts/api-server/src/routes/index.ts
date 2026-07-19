import { Router, type IRouter } from "express";
import healthRouter from "./health";
import modulesRouter from "./modules";
import lessonsRouter from "./lessons";
import questionsRouter from "./questions";
import progressRouter from "./progress";
import cartRouter from "./cart";
import adminRouter from "./admin";
import adminsMgmtRouter from "./admins-mgmt";
import bunnyRouter from "./bunny";
import purchasesRouter from "./purchases";

const router: IRouter = Router();

router.use(healthRouter);
router.use(modulesRouter);
router.use(lessonsRouter);
router.use(questionsRouter);
router.use(progressRouter);
router.use(cartRouter);
router.use(adminRouter);
router.use(adminsMgmtRouter);
router.use(bunnyRouter);
router.use(purchasesRouter);

export default router;
