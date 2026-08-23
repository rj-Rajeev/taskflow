import { taskNotificationQueue } from "../../../../worker/queue.js";

export async function getJobStatusService(jobId) {
  const job = await taskNotificationQueue.getJob(jobId);

  if (!job) {
    return null;
  }

  const state = await job.getState();

  return {
    id: job.id,
    name: job.name,
    state,
    data: job.data,
    attemptsMade: job.attemptsMade,
    failedReason: job.failedReason || null,
  };
}