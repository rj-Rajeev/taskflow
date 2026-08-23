import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes.js";
import projectRoutes from "../modules/projects/project.routes.js";


const router = Router();

router.use('/auth', authRoutes);
router.use("/projects", projectRoutes);

export default router;