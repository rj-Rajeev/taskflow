import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.js";
import { requireRoles } from "../../middleware/roles.js";
import { getProjects, createProject, getProject, updateProject, deleteProject, getProjectDashboard } from "./project.controller.js";

const router = Router();

router.get("/", authMiddleware, requireRoles("ADMIN", "PROJECT_MANAGER"), getProjects);
router.post("/", authMiddleware, requireRoles("ADMIN", "PROJECT_MANAGER"), createProject);
router.get("/:id", authMiddleware, requireRoles("ADMIN", "PROJECT_MANAGER"), getProject);
router.patch("/:id", authMiddleware, requireRoles("ADMIN", "PROJECT_MANAGER"), updateProject);
router.delete("/:id", authMiddleware, requireRoles("ADMIN", "PROJECT_MANAGER"), deleteProject);
router.get("/:id/dashboard", authMiddleware, requireRoles("ADMIN", "PROJECT_MANAGER"), getProjectDashboard);
export default router;