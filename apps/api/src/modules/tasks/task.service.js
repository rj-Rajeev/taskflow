import prisma from "../../lib/prisma.js";
import { taskNotificationQueue } from "../../../../worker/queue.js";

const statusLabels = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "In Review",
  done: "Done",
};

export async function getTasksService({
  orgId,
  status,
  priority,
  assignee,
  dueFrom,
  dueTo,
  page,
  limit,
  userId,
  userRole,
}) {
  const where = {
    project: {
      org_id: orgId,
      ...(userRole === "PROJECT_MANAGER" && { created_by: userId }),
    },
    ...(userRole === "DEVELOPER" && {
      taskAssignments: { some: { user_id: userId } },
    }),
  };

  if (status) {
    where.status = status;
  }

  if (priority) {
    where.priority = priority;
  }

  if (assignee) {
    where.taskAssignments = {
      some: {
        user_id: assignee,
      },
    };
  }

  if (dueFrom || dueTo) {
    where.due_date = {};

    if (dueFrom) {
      where.due_date.gte = new Date(dueFrom);
    }

    if (dueTo) {
      where.due_date.lte = new Date(dueTo);
    }
  }

  const skip = (page - 1) * limit;

  const [tasks, total] = await prisma.$transaction([
    prisma.task.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
      include: {
        taskAssignments: {
          select: {
            user_id: true,
          },
        },
      },
    }),

    prisma.task.count({
      where,
    }),
  ]);

  return {
    data: tasks,
    total,
    page,
    limit,
  };
}

export async function getTaskService(taskId, orgId, userId, userRole) {
  const task = await prisma.task.findUnique({
    where: {
      id: taskId,
    },
    include: {
      project: true,
      taskAssignments: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      comments: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          created_at: "asc",
        },
      },
    },
  });

  if (!task) {
    const error = new Error("Task not found");
    error.code = "TASK_NOT_FOUND";
    throw error;
  }

  if (task.project.org_id !== orgId ||
      (userRole === "PROJECT_MANAGER" && task.project.created_by !== userId) ||
      (userRole === "DEVELOPER" && !task.taskAssignments.some((assignment) => assignment.user_id === userId))) {
    const error = new Error("Forbidden");
    error.code = "TASK_FORBIDDEN";
    throw error;
  }

  return task;
}

export async function createTaskService({
  title,
  description,
  projectId,
  dueDate,
  status,
  priority,
  orgId,
  userId,
  userRole,
}) {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
  });

  if (!project) {
    const error = new Error("Project not found");
    error.code = "PROJECT_NOT_FOUND";
    throw error;
  }

  if (project.org_id !== orgId || (userRole === "PROJECT_MANAGER" && project.created_by !== userId)) {
    const error = new Error("Forbidden");
    error.code = "PROJECT_FORBIDDEN";
    throw error;
  }

  return await prisma.task.create({
    data: {
      title,
      description,
      project_id: projectId,
      due_date: dueDate ? new Date(dueDate) : null,
      status,
      priority,
    },
  });
}

export async function updateTaskService({
  taskId,
  orgId,
  title,
  description,
  dueDate,
  status,
  priority,
  userId,
  userRole,
}) {
  const task = await prisma.task.findUnique({
    where: {
      id: taskId,
    },
    include: {
      project: {
        select: {
          org_id: true,
          created_by: true,
        },
      },
      taskAssignments: { select: { user_id: true } },
    },
  });

  if (!task) {
    const error = new Error("Task not found");
    error.code = "TASK_NOT_FOUND";
    throw error;
  }

  if (task.project.org_id !== orgId ||
      (userRole === "PROJECT_MANAGER" && task.project.created_by !== userId) ||
      (userRole === "DEVELOPER" && !task.taskAssignments.some((assignment) => assignment.user_id === userId))) {
    const error = new Error("Forbidden");
    error.code = "TASK_FORBIDDEN";
    throw error;
  }

  const validStatuses = [
    "todo",
    "in_progress",
    "review",
    "done",
  ];

  const validPriorities = [
    "low",
    "medium",
    "high",
    "critical",
    "urgent",
  ];

  if (status !== undefined && !validStatuses.includes(status)) {
    const error = new Error("Invalid task status");
    error.code = "INVALID_STATUS";
    throw error;
  }

  if (priority !== undefined && !validPriorities.includes(priority)) {
    const error = new Error("Invalid task priority");
    error.code = "INVALID_PRIORITY";
    throw error;
  }

  if (userRole === "DEVELOPER" && (title !== undefined || description !== undefined || dueDate !== undefined || priority !== undefined)) {
    const error = new Error("Developers can only update task status");
    error.code = "DEVELOPER_STATUS_ONLY";
    throw error;
  }

  const result = await prisma.$transaction(async (transaction) => {
    const updatedTask = await transaction.task.update({
      where: { id: taskId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(dueDate !== undefined && { due_date: dueDate ? new Date(dueDate) : null }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
      },
    });

    let activity;
    let notification;
    if (status !== undefined && status !== task.status) {
      const actor = await transaction.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      const message = `${actor?.name || "A team member"} moved ${task.title} from ${statusLabels[task.status] || task.status} to ${statusLabels[status] || status}`;
      activity = await transaction.activityLog.create({
        data: {
          project_id: task.project_id,
          task_id: taskId,
          actor_id: userId,
          type: "TASK_STATUS_CHANGED",
          from_status: task.status,
          to_status: status,
          message,
        },
        include: { actor: { select: { id: true, name: true } }, task: { select: { id: true, title: true } } },
      });

      if (status === "review" && task.project.created_by && task.project.created_by !== userId) {
        notification = await transaction.notification.create({
          data: {
            recipient_id: task.project.created_by,
            task_id: taskId,
            type: "TASK_MOVED_TO_REVIEW",
            message: `Task ${taskId} moved to In Review`,
          },
        });
      }
    }

    return { task: updatedTask, activity, notification };
  });

  return result;
}

export async function deleteTaskService(taskId, orgId) {
  const task = await prisma.task.findUnique({
    where: {
      id: taskId,
    },
    include: {
      project: {
        select: {
          org_id: true,
        },
      },
    },
  });

  if (!task) {
    const error = new Error("Task not found");
    error.code = "TASK_NOT_FOUND";
    throw error;
  }

  if (task.project.org_id !== orgId) {
    const error = new Error("Forbidden");
    error.code = "TASK_FORBIDDEN";
    throw error;
  }

  await prisma.task.delete({
    where: {
      id: taskId,
    },
  });
}

export async function assignTaskService({
  taskId,
  userId,
  orgId,
}) {
  const task = await prisma.task.findUnique({
    where: {
      id: taskId,
    },
    include: {
      project: {
        select: {
          org_id: true,
        },
      },
    },
  });

  if (!task) {
    const error = new Error("Task not found");
    error.code = "TASK_NOT_FOUND";
    throw error;
  }

  if (task.project.org_id !== orgId) {
    const error = new Error("Forbidden");
    error.code = "TASK_FORBIDDEN";
    throw error;
  }

  const orgMember = await prisma.orgMember.findFirst({
    where: {
      user_id: userId,
      org_id: orgId,
    },
    include: { user: { select: { role: true } } },
  });

  if (!orgMember) {
    const error = new Error(
      "User does not belong to your organization"
    );
    error.code = "USER_FORBIDDEN";
    throw error;
  }

  if (orgMember.user.role !== "DEVELOPER") {
    const error = new Error("Tasks can only be assigned to developers");
    error.code = "USER_NOT_DEVELOPER";
    throw error;
  }

  const existingAssignment = await prisma.taskAssignment.findUnique({
    where: {
      task_id_user_id: {
        task_id: taskId,
        user_id: userId,
      },
    },
  });

  if (existingAssignment) {
    const error = new Error("User is already assigned");
    error.code = "ALREADY_ASSIGNED";
    throw error;
  }

  const assignment = await prisma.taskAssignment.create({
    data: {
      task_id: taskId,
      user_id: userId,
    },
  });
  const notification = await prisma.notification.create({
    data: {
      recipient_id: userId,
      task_id: taskId,
      type: "TASK_ASSIGNED",
      message: `You were assigned to ${task.title}`,
    },
  });
  try {
    const job = await taskNotificationQueue.add(
      "task-assigned-email",
      {
        taskId,
        userId,
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: false,
        removeOnFail: false,
      }
    );

  return { assignment, notification, jobId: job.id };
  } catch (error) {
    try {
      await prisma.taskAssignment.delete({
        where: {
          task_id_user_id: {
            task_id: taskId,
            user_id: userId,
          },
        },
      });
    } catch (rollbackError) {
      console.error(
        "Failed to rollback task assignment:",
        rollbackError
      );
    }

    error.code = "QUEUE_ERROR";
    throw error;
  }
}

export async function unassignTaskService({
  taskId,
  userId,
  orgId,
}) {
  const task = await prisma.task.findUnique({
    where: {
      id: taskId,
    },
    include: {
      project: {
        select: {
          org_id: true,
        },
      },
    },
  });

  if (!task) {
    const error = new Error("Task not found");
    error.code = "TASK_NOT_FOUND";
    throw error;
  }

  if (task.project.org_id !== orgId) {
    const error = new Error("Forbidden");
    error.code = "TASK_FORBIDDEN";
    throw error;
  }

  const assignment = await prisma.taskAssignment.findUnique({
    where: {
      task_id_user_id: {
        task_id: taskId,
        user_id: userId,
      },
    },
  });

  if (!assignment) {
    const error = new Error("Task assignment not found");
    error.code = "ASSIGNMENT_NOT_FOUND";
    throw error;
  }

  await prisma.taskAssignment.delete({
    where: {
      task_id_user_id: {
        task_id: taskId,
        user_id: userId,
      },
    },
  });
}