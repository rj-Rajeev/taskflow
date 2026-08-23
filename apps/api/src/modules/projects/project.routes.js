import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.js";
import { getProjects, createProject, getProject, updateProject, deleteProject, getProjectDashboard } from "./project.controller.js";

const router = Router();

router.get("/", authMiddleware, getProjects);
router.post("/", authMiddleware, createProject);
router.get("/:id", authMiddleware, getProject);
router.patch("/:id", authMiddleware, updateProject);
router.delete("/:id", authMiddleware, deleteProject);
router.get("/:id/dashboard", authMiddleware, getProjectDashboard);
export default router;