import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.js";
import { requireRoles } from "../../middleware/roles.js";
import { getTasks, getTask, createTask, updateTask, deleteTask, assignTask, unassignTask } from "./task.controller.js";

const router = Router();

router.get("/", authMiddleware, requireRoles("ADMIN", "PROJECT_MANAGER", "DEVELOPER"), getTasks);
router.get("/:id", authMiddleware, requireRoles("ADMIN", "PROJECT_MANAGER", "DEVELOPER"), getTask);
router.post("/", authMiddleware, requireRoles("ADMIN", "PROJECT_MANAGER"), createTask);
router.patch("/:id", authMiddleware, requireRoles("ADMIN", "PROJECT_MANAGER", "DEVELOPER"), updateTask);
router.delete("/:id", authMiddleware, requireRoles("ADMIN", "PROJECT_MANAGER"), deleteTask);
router.post("/:id/assign", authMiddleware, requireRoles("ADMIN", "PROJECT_MANAGER"), assignTask);
router.delete("/:id/assign", authMiddleware, requireRoles("ADMIN", "PROJECT_MANAGER"), unassignTask);

export default router;