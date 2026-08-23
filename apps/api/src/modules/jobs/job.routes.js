import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.js";
import { getJobStatus } from "./job.controller.js";

const router = Router();

router.get("/:id", authMiddleware, getJobStatus);

export default router;