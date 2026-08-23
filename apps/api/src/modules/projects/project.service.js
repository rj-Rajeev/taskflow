import prisma from "../../lib/prisma.js";

export async function getProjectsService(orgId) {
  return await prisma.project.findMany({
    where: {
      org_id: orgId,
    },
    orderBy: {
      created_at: "desc",
    },
  });
}


export async function createProjectService({ name, description, orgId }) {
  return await prisma.project.create({
    data: {
      name,
      description,
      org_id: orgId,
    },
  });
}

export async function getProjectService(projectId, orgId) {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
  });

  if (!project) {
    return null;
  }

  if (project.org_id !== orgId) {
    const error = new Error("Project does not belong to your organization");
    error.code = "PROJECT_FORBIDDEN";
    throw error;
  }

  return project;
}

export async function updateProjectService(projectId, orgId, data) {
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

export async function deleteProjectService(projectId, orgId) {
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

  await prisma.project.delete({
    where: {
      id: projectId,
    },
  });
}