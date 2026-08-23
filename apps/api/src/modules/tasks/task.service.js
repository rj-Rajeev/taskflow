import prisma from "../../lib/prisma.js";
import { taskNotificationQueue } from "../../../../worker/queue.js";

export async function getTasksService({
  orgId,
  status,
  priority,
  assignee,
  dueFrom,
  dueTo,
  page,
  limit,
}) {
  const where = {
    project: {
      org_id: orgId,
    },
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

export async function getTaskService(taskId, orgId) {
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

  if (task.project.org_id !== orgId) {
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

  if (project.org_id !== orgId) {
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

  return await prisma.task.update({
    where: {
      id: taskId,
    },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(dueDate !== undefined && {
        due_date: dueDate ? new Date(dueDate) : null,
      }),
      ...(status !== undefined && { status }),
      ...(priority !== undefined && { priority }),
    },
  });
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
  });

  if (!orgMember) {
    const error = new Error(
      "User does not belong to your organization"
    );
    error.code = "USER_FORBIDDEN";
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

  return {assignment, jobId: job.id};
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