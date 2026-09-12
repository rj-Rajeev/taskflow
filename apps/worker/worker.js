import "dotenv/config";
import { Worker } from "bullmq";
import prisma from "../api/src/lib/prisma.js";
import { overdueTaskQueue } from "./queue.js";

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT || 6379),
};

const worker = new Worker(
  "task-notifications",
  async (job) => {
    const { taskId, userId } = job.data;

    console.log(`Processing job ${job.id}`);
    console.log(
      `Sending task assignment email to user ${userId} for task ${taskId}`
    );

    // Mock email processing
    await new Promise((resolve) => setTimeout(resolve, 500));

    console.log(`Email sent successfully for job ${job.id}`);

    return {
      taskId,
      userId,
      sent: true,
    };
  },
  {
    connection,
    concurrency: 5,
  }
);

const overdueWorker = new Worker(
  "overdue-tasks",
  async () => {
    const admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
    if (!admin) return { flagged: 0 };

    const tasks = await prisma.task.findMany({
      where: { due_date: { lt: new Date() }, is_overdue: false, status: { not: "done" } },
      select: { id: true, project_id: true, title: true },
    });

    for (const task of tasks) {
      await prisma.$transaction([
        prisma.task.update({ where: { id: task.id }, data: { is_overdue: true } }),
        prisma.activityLog.create({
          data: {
            project_id: task.project_id,
            task_id: task.id,
            actor_id: admin.id,
            type: "TASK_OVERDUE",
            message: `Task ${task.title} is overdue`,
          },
        }),
      ]);
    }
    return { flagged: tasks.length };
  },
  { connection, concurrency: 1 },
);

await overdueTaskQueue.upsertJobScheduler("overdue-task-scheduler", { every: 60_000 }, { name: "flag-overdue" });

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
  console.error(
    `Job ${job?.id} failed: ${error.message}`
  );
});

worker.on("error", (error) => {
  console.error("Worker error:", error);
});

overdueWorker.on("error", (error) => console.error("Overdue worker error:", error));

console.log("Task notification worker started");