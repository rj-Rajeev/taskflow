import prisma from "../../lib/prisma.js";

export async function createOrganizationService({ name, userId }) {
  const organization = await prisma.organization.create({
    data: {
      name,
      members: {
        create: {
          user_id: userId,
          role: "org_admin",
        },
      },
    },
    include: {
      members: {
        select: {
          id: true,
          user_id: true,
          role: true,
        },
      },
    },
  });

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  return {
    organization,
    user,
  };
}

export async function getOrganizationMembersService(orgId) {
  return prisma.orgMember.findMany({
    where: {
      org_id: orgId,
    },
    select: {
      id: true,
      role: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      id: "asc",
    },
  });
}

export async function addOrganizationMemberService({
  orgId,
  userId,
  role = "member",
}) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!user) {
    const error = new Error("User not found");
    error.code = "USER_NOT_FOUND";
    throw error;
  }

  const existingMember = await prisma.orgMember.findUnique({
    where: {
      org_id_user_id: {
        org_id: orgId,
        user_id: userId,
      },
    },
  });

  if (existingMember) {
    const error = new Error("User is already a member");
    error.code = "ALREADY_MEMBER";
    throw error;
  }

  return prisma.orgMember.create({
    data: {
      org_id: orgId,
      user_id: userId,
      role,
    },
    select: {
      id: true,
      org_id: true,
      user_id: true,
      role: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function updateOrganizationMemberService({
  orgId,
  userId,
  role,
}) {
  const member = await prisma.orgMember.findUnique({
    where: {
      org_id_user_id: {
        org_id: orgId,
        user_id: userId,
      },
    },
  });

  if (!member) {
    const error = new Error("Member not found");
    error.code = "MEMBER_NOT_FOUND";
    throw error;
  }

  // Prevent removing the organization's last admin.
  if (member.role === "org_admin" && role === "member") {
    const adminCount = await prisma.orgMember.count({
      where: {
        org_id: orgId,
        role: "org_admin",
      },
    });

    if (adminCount <= 1) {
      const error = new Error(
        "Organization must have at least one admin",
      );
      error.code = "LAST_ADMIN";
      throw error;
    }
  }

  return prisma.orgMember.update({
    where: {
      org_id_user_id: {
        org_id: orgId,
        user_id: userId,
      },
    },
    data: {
      role,
    },
    select: {
      id: true,
      org_id: true,
      user_id: true,
      role: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function removeOrganizationMemberService({
  orgId,
  userId,
}) {
  const member = await prisma.orgMember.findUnique({
    where: {
      org_id_user_id: {
        org_id: orgId,
        user_id: userId,
      },
    },
  });

  if (!member) {
    const error = new Error("Member not found");
    error.code = "MEMBER_NOT_FOUND";
    throw error;
  }

  // Prevent removing the organization's last admin.
  if (member.role === "org_admin") {
    const adminCount = await prisma.orgMember.count({
      where: {
        org_id: orgId,
        role: "org_admin",
      },
    });

    if (adminCount <= 1) {
      const error = new Error(
        "Organization must have at least one admin",
      );
      error.code = "LAST_ADMIN";
      throw error;
    }
  }

  await prisma.orgMember.delete({
    where: {
      org_id_user_id: {
        org_id: orgId,
        user_id: userId,
      },
    },
  });
}