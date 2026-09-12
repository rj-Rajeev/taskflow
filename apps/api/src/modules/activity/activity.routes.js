import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.js";
import { listActivity } from "./activity.service.js";

const router = Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    const data = await listActivity({
      userId: req.userId,
      userRole: req.userRole,
      projectId: req.query.project_id,
      cursor: req.query.cursor,
    });
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Unable to load activity" } });
  }
});

export default router;
