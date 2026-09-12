import prisma from "../../lib/prisma.js";

function visibilityWhere({ userId, userRole, projectId }) {
  if (userRole === "ADMIN") return projectId ? { project_id: projectId } : {};
  if (userRole === "PROJECT_MANAGER") {
    return {
      ...(projectId ? { project_id: projectId } : {}),
      project: { created_by: userId },
    };
  }
  return {
    ...(projectId ? { project_id: projectId } : {}),
    task: { taskAssignments: { some: { user_id: userId } } },
  };
}

export async function listActivity({ userId, userRole, projectId, cursor }) {
  return prisma.activityLog.findMany({
    where: visibilityWhere({ userId, userRole, projectId }),
    include: { actor: { select: { id: true, name: true } }, task: { select: { id: true, title: true } } },
    orderBy: { created_at: "desc" },
    take: 20,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });
}
