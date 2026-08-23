import {
  getTasksService,
  getTaskService,
  createTaskService,
  updateTaskService,
  deleteTaskService,
  assignTaskService,
  unassignTaskService,
} from "./task.service.js";

export async function getTasks(req, res) {
  try {
    if (!req.orgId) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with an organization",
      });
    }

    const {
      status,
      priority,
      assignee,
      due_from,
      due_to,
      page = 1,
      limit = 20,
    } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    if (
      !Number.isInteger(pageNumber) ||
      pageNumber < 1 ||
      !Number.isInteger(limitNumber) ||
      limitNumber < 1 ||
      limitNumber > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination parameters",
      });
    }

    const result = await getTasksService({
      orgId: req.orgId,
      status,
      priority,
      assignee,
      dueFrom: due_from,
      dueTo: due_to,
      page: pageNumber,
      limit: limitNumber,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}

export async function getTask(req, res) {
  try {
    if (!req.orgId) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with an organization",
      });
    }

    const task = await getTaskService(req.params.id, req.orgId);

    return res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    if (error.code === "TASK_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    if (error.code === "TASK_FORBIDDEN") {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}

export async function createTask(req, res) {
  try {
    if (!req.orgId) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with an organization",
      });
    }

    const { title, description, project_id, due_date, status, priority } =
      req.body;

    if (!title || !description || !project_id || !status || !priority) {
      return res.status(400).json({
        success: false,
        message:
          "title, description, project_id, status and priority are required",
      });
    }

    const task = await createTaskService({
      title,
      description,
      projectId: project_id,
      dueDate: due_date,
      status,
      priority,
      orgId: req.orgId,
    });

    return res.status(201).json({
      success: true,
      data: task,
    });
  } catch (error) {
    if (error.code === "PROJECT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    if (error.code === "PROJECT_FORBIDDEN") {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}

export async function updateTask(req, res) {
  try {
    if (!req.orgId) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with an organization",
      });
    }

    const { title, description, due_date, status, priority } = req.body;

    if (
      title === undefined &&
      description === undefined &&
      due_date === undefined &&
      status === undefined &&
      priority === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "At least one field is required",
      });
    }

    const task = await updateTaskService({
      taskId: req.params.id,
      orgId: req.orgId,
      title,
      description,
      dueDate: due_date,
      status,
      priority,
    });

    return res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    if (error.code === "TASK_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    if (error.code === "TASK_FORBIDDEN") {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    if (error.code === "INVALID_STATUS") {
      return res.status(400).json({
        success: false,
        message: "Invalid task status",
      });
    }

    if (error.code === "INVALID_PRIORITY") {
      return res.status(400).json({
        success: false,
        message: "Invalid task priority",
      });
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}

export async function deleteTask(req, res) {
  try {
    if (!req.orgId) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with an organization",
      });
    }

    await deleteTaskService(req.params.id, req.orgId);

    return res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    if (error.code === "TASK_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    if (error.code === "TASK_FORBIDDEN") {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}

export async function assignTask(req, res) {
  try {
    if (!req.orgId) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with an organization",
      });
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const assignment = await assignTaskService({
      taskId: req.params.id,
      userId: userId,
      orgId: req.orgId,
    });

    return res.status(201).json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    if (error.code === "TASK_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    if (error.code === "TASK_FORBIDDEN") {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    if (error.code === "USER_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (error.code === "USER_FORBIDDEN") {
      return res.status(403).json({
        success: false,
        message: "User does not belong to your organization",
      });
    }

    if (error.code === "ALREADY_ASSIGNED") {
      return res.status(409).json({
        success: false,
        message: "User is already assigned to this task",
      });
    }

    if (error.code === "QUEUE_ERROR") {
      return res.status(503).json({
        success: false,
        message: "Unable to queue task notification",
        code: "QUEUE_ERROR",
      });
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}

export async function unassignTask(req, res) {
  try {
    if (!req.orgId) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with an organization",
      });
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    await unassignTaskService({
      taskId: req.params.id,
      userId,
      orgId: req.orgId,
    });

    return res.status(200).json({
      success: true,
      message: "User unassigned from task successfully",
    });
  } catch (error) {
    if (error.code === "TASK_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    if (error.code === "TASK_FORBIDDEN") {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    if (error.code === "ASSIGNMENT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Task assignment not found",
      });
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}
