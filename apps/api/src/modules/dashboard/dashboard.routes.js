import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.js";
import prisma from "../../lib/prisma.js";

const router = Router();
router.get("/", authMiddleware, async (req, res) => {
  const projectWhere = req.userRole === "PROJECT_MANAGER" ? { created_by: req.userId } : {};
  const taskWhere = req.userRole === "DEVELOPER"
    ? { taskAssignments: { some: { user_id: req.userId } } }
    : { project: projectWhere };
  const [projects, tasks, overdue, grouped, notifications] = await prisma.$transaction([
    prisma.project.count({ where: { org_id: req.orgId, ...projectWhere } }),
    prisma.task.count({ where: { project: { org_id: req.orgId, ...projectWhere }, ...taskWhere } }),
    prisma.task.count({ where: { project: { org_id: req.orgId, ...projectWhere }, ...taskWhere, is_overdue: true } }),
    prisma.task.groupBy({ by: ["status"], where: { project: { org_id: req.orgId, ...projectWhere }, ...taskWhere }, _count: { _all: true } }),
    prisma.notification.count({ where: { recipient_id: req.userId, read_at: null } }),
  ]);
  res.json({ success: true, data: { projects, tasks, overdue, unreadNotifications: notifications, tasksByStatus: grouped } });
});
export default router;
