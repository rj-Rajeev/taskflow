import { Queue } from "bullmq";

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT || 6379),
};

export const taskNotificationQueue = new Queue("task-notifications", {
  connection,
});

export const overdueTaskQueue = new Queue("overdue-tasks", {
  connection,
});