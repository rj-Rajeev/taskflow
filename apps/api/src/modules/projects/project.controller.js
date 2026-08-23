import {
  getProjectsService,
  createProjectService,
  getProjectService,
  updateProjectService,
  deleteProjectService,
  getProjectDashboardService,
} from "./project.service.js";

export async function getProjects(req, res) {
  try {
    const projects = await getProjectsService(req.orgId);

    return res.status(200).json({
      success: true,
      data: projects,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}

export async function createProject(req, res) {
  try {
    const { name, description } = req.body;

    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: "Name and description are required",
      });
    }

    if (!req.orgId) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with an organization",
      });
    }

    const project = await createProjectService({
      name,
      description,
      orgId: req.orgId,
    });

    return res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}

export async function getProject(req, res) {
  try {
    if (!req.orgId) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with an organization",
      });
    }

    const project = await getProjectService(req.params.id, req.orgId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
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

export async function updateProject(req, res) {
  try {
    if (!req.orgId) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with an organization",
      });
    }

    const { name, description } = req.body;

    if (name === undefined && description === undefined) {
      return res.status(400).json({
        success: false,
        message: "Name or description is required",
      });
    }

    const project = await updateProjectService(req.params.id, req.orgId, {
      name,
      description,
    });

    return res.status(200).json({
      success: true,
      data: project,
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

export async function deleteProject(req, res) {
  try {
    if (!req.orgId) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with an organization",
      });
    }

    if (req.role !== "org_admin") {
      return res.status(403).json({
        success: false,
        message: "Only organization admins can delete projects",
      });
    }

    await deleteProjectService(req.params.id, req.orgId);

    return res.status(200).json({
      success: true,
      message: "Project deleted successfully",
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

export async function getProjectDashboard(req, res) {
  try {
    if (!req.orgId) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with an organization",
      });
    }

    const dashboard = await getProjectDashboardService(
      req.params.id,
      req.orgId,
    );

    return res.status(200).json({
      success: true,
      data: dashboard,
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

