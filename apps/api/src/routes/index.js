import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes.js";
import organizationRoutes from "../modules/organization/organization.routes.js";
import projectRoutes from "../modules/projects/project.routes.js";
import taskRoutes from "../modules/tasks/task.routes.js";
import jobRoutes from "../modules/jobs/job.routes.js";
import activityRoutes from "../modules/activity/activity.routes.js";
import notificationRoutes from "../modules/notifications/notification.routes.js";
import dashboardRoutes from "../modules/dashboard/dashboard.routes.js";

import { authRateLimiter } from "../middleware/authRateLimiter.js";

const router = Router();

router.use('/auth', authRateLimiter, authRoutes);
router.use("/organizations", organizationRoutes);
router.use("/projects", projectRoutes);
router.use("/tasks", taskRoutes);
router.use("/jobs", jobRoutes);
router.use("/activity", activityRoutes);
router.use("/notifications", notificationRoutes);
router.use("/dashboard", dashboardRoutes);

export default router;