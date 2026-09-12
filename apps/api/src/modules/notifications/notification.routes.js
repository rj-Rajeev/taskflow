import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.js";
import prisma from "../../lib/prisma.js";
import { publishNotificationCount } from "../../lib/realtime.js";

const router = Router();
router.use(authMiddleware);

router.get("/", async (req, res) => {
  const [data, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({ where: { recipient_id: req.userId }, orderBy: { created_at: "desc" }, take: 30 }),
    prisma.notification.count({ where: { recipient_id: req.userId, read_at: null } }),
  ]);
  res.json({ success: true, data, unreadCount });
});

router.patch("/:id/read", async (req, res) => {
  const notification = await prisma.notification.updateMany({ where: { id: req.params.id, recipient_id: req.userId }, data: { read_at: new Date() } });
  const unreadCount = await prisma.notification.count({ where: { recipient_id: req.userId, read_at: null } });
  publishNotificationCount(req.userId, unreadCount);
  res.json({ success: true, data: notification });
});

router.post("/read-all", async (req, res) => {
  await prisma.notification.updateMany({ where: { recipient_id: req.userId, read_at: null }, data: { read_at: new Date() } });
  publishNotificationCount(req.userId, 0);
  res.json({ success: true });
});

export default router;
