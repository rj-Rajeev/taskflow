import { generateAccessToken } from "../../lib/jwt.js";

import {
  createOrganizationService,
  getOrganizationMembersService,
  addOrganizationMemberService,
  updateOrganizationMemberService,
  removeOrganizationMemberService,
} from "./organization.service.js";

export async function createOrganization(req, res) {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Organization name is required",
      });
    }

    const result = await createOrganizationService({
      name: name.trim(),
      userId: req.userId,
    });

    const { organization, user } = result;

    const accessToken = generateAccessToken({
      id: user.id,
      name: user.name,
      orgId: organization.id,
      role: "org_admin",
    });

    return res.status(201).json({
      success: true,
      data: {
        organization,
        accessToken,
      },
    });
  } catch (error) {
    console.error("Create organization error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}

export async function getOrganizationMembers(req, res) {
  try {
    if (!req.orgId) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with an organization",
      });
    }

    const members = await getOrganizationMembersService(req.orgId);

    return res.status(200).json({
      success: true,
      data: members,
    });
  } catch (error) {
    console.error("Get organization members error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}

export async function addOrganizationMember(req, res) {
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
        message: "Only organization admins can manage members",
      });
    }

    const { userId, role = "member" } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    if (!["org_admin", "member"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    const member = await addOrganizationMemberService({
      orgId: req.orgId,
      userId,
      role,
    });

    return res.status(201).json({
      success: true,
      data: member,
    });
  } catch (error) {
    if (error.code === "USER_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (error.code === "ALREADY_MEMBER") {
      return res.status(409).json({
        success: false,
        message: "User is already a member",
      });
    }

    console.error("Add organization member error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}

export async function updateOrganizationMember(req, res) {
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
        message: "Only organization admins can manage members",
      });
    }

    const { role } = req.body;

    if (!["org_admin", "member"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    const member = await updateOrganizationMemberService({
      orgId: req.orgId,
      userId: req.params.userId,
      role,
    });

    return res.status(200).json({
      success: true,
      data: member,
    });
  } catch (error) {
    if (error.code === "MEMBER_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    if (error.code === "LAST_ADMIN") {
      return res.status(400).json({
        success: false,
        message: "Organization must have at least one admin",
      });
    }

    console.error("Update organization member error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}

export async function removeOrganizationMember(req, res) {
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
        message: "Only organization admins can manage members",
      });
    }

    await removeOrganizationMemberService({
      orgId: req.orgId,
      userId: req.params.userId,
    });

    return res.status(200).json({
      success: true,
      message: "Member removed successfully",
    });
  } catch (error) {
    if (error.code === "MEMBER_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    if (error.code === "LAST_ADMIN") {
      return res.status(400).json({
        success: false,
        message: "Organization must have at least one admin",
      });
    }

    console.error("Remove organization member error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}