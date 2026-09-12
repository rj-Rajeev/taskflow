-- Assignment role and dashboard data model
ALTER TYPE "TaskPriority" ADD VALUE IF NOT EXISTS 'critical';
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'PROJECT_MANAGER', 'DEVELOPER');
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'DEVELOPER';

CREATE TABLE "Client" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Project" ADD COLUMN "client_id" UUID, ADD COLUMN "created_by" UUID;
ALTER TABLE "Task" ADD COLUMN "is_overdue" BOOLEAN NOT NULL DEFAULT false;

CREATE TYPE "ActivityType" AS ENUM ('TASK_STATUS_CHANGED', 'TASK_ASSIGNED', 'TASK_OVERDUE');
CREATE TABLE "ActivityLog" (
  "id" UUID NOT NULL,
  "project_id" UUID NOT NULL,
  "task_id" UUID,
  "actor_id" UUID NOT NULL,
  "type" "ActivityType" NOT NULL,
  "from_status" "TaskStatus",
  "to_status" "TaskStatus",
  "message" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE TYPE "NotificationType" AS ENUM ('TASK_ASSIGNED', 'TASK_MOVED_TO_REVIEW');
CREATE TABLE "Notification" (
  "id" UUID NOT NULL,
  "recipient_id" UUID NOT NULL,
  "task_id" UUID,
  "type" "NotificationType" NOT NULL,
  "message" TEXT NOT NULL,
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Project_client_id_idx" ON "Project"("client_id");
CREATE INDEX "Project_created_by_idx" ON "Project"("created_by");
CREATE INDEX "Task_is_overdue_due_date_idx" ON "Task"("is_overdue", "due_date");
CREATE INDEX "ActivityLog_project_id_created_at_idx" ON "ActivityLog"("project_id", "created_at");
CREATE INDEX "ActivityLog_task_id_created_at_idx" ON "ActivityLog"("task_id", "created_at");
CREATE INDEX "ActivityLog_actor_id_created_at_idx" ON "ActivityLog"("actor_id", "created_at");
CREATE INDEX "Notification_recipient_id_read_at_created_at_idx" ON "Notification"("recipient_id", "read_at", "created_at");

ALTER TABLE "Project" ADD CONSTRAINT "Project_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
