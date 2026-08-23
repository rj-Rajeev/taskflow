import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.js";
import { getTasks, getTask, createTask, updateTask, deleteTask, assignTask, unassignTask } from "./task.controller.js";

const router = Router();

router.get("/", authMiddleware, getTasks);
router.get("/:id", authMiddleware, getTask);
router.post("/", authMiddleware, createTask);
router.patch("/:id", authMiddleware, updateTask);
router.delete("/:id", authMiddleware, deleteTask);
router.post("/:id/assign", authMiddleware, assignTask);
router.delete("/:id/assign", authMiddleware, unassignTask);

export default router;