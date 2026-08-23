import "dotenv/config";
import { Worker } from "bullmq";

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

console.log("Task notification worker started");