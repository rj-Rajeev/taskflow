import prisma from "../../lib/prisma.js";

export async function getProjectsService({ orgId, userId, userRole }) {
  return await prisma.project.findMany({
    where: {
      org_id: orgId,
      ...(userRole === "PROJECT_MANAGER" && { created_by: userId }),
    },
    orderBy: {
      created_at: "desc",
    },
  });
}


export async function createProjectService({ name, description, orgId, userId }) {
  return await prisma.project.create({
    data: {
      name,
      description,
      org_id: orgId,
      created_by: userId,
    },
  });
}

export async function getProjectService(projectId, orgId, userId, userRole) {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
  });

  if (!project) {
    return null;
  }

  if (project.org_id !== orgId || (userRole === "PROJECT_MANAGER" && project.created_by !== userId)) {
    const error = new Error("Project does not belong to your organization");
    error.code = "PROJECT_FORBIDDEN";
    throw error;
  }

  return project;
}

export async function updateProjectService(projectId, orgId, userId, userRole, data) {
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

  return await prisma.project.update({
    where: {
      id: projectId,
    },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && {
        description: data.description,
      }),
    },
  });
}

export async function deleteProjectService(projectId, orgId, userId, userRole) {
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

  await prisma.project.delete({
    where: {
      id: projectId,
    },
  });
}

export async function getProjectDashboardService(projectId, orgId, userId, userRole) {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      id: true,
      org_id: true,
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

  const groupedTasks = await prisma.task.groupBy({
    by: ["status"],
    where: {
      project_id: projectId,
    },
    _count: {
      _all: true,
    },
  });

  const dashboard = {
    todo: 0,
    in_progress: 0,
    review: 0,
    done: 0,
  };

  for (const item of groupedTasks) {
    dashboard[item.status] = item._count._all;
  }

  return dashboard;
}