import { comparePassword, hashPassword } from "../../lib/bcrypt.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} from "../../lib/jwt.js";
import prisma from "../../lib/prisma.js";

export async function registerUser(name, email, password) {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      const error = new Error("User already exists");
      error.code = "USER_EXISTS";
      throw error;
    }

    const password_hash = await hashPassword(password);

    return await prisma.user.create({
      data: {
        name: name,
        email: email,
        password_hash: password_hash,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
  } catch (error) {
    throw error;
  }
}

export async function loginUser(email, password) {
  try {
    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        name: true,
        password_hash: true,
      },
    });
    if (!existingUser) {
      const error = new Error("User does not exists");
      error.code = "USER_NOT_EXISTS";
      throw error;
    }

    const isPasswordMatched = await comparePassword(
      password,
      existingUser.password_hash,
    );
    if (!isPasswordMatched) {
      const error = new Error("Incorrect Password");
      error.code = "INCORRECT_PASSWORD";
      throw error;
    }

    const orgMember = await prisma.orgMember.findFirst({
      where: {
        user_id: existingUser.id
      }
    });
    

    const refreshToken = generateRefreshToken({
      id: existingUser.id,
      name: existingUser.name,
    });
    const accessToken = generateAccessToken({
      id: existingUser.id,
      name: existingUser.name,
      orgId: orgMember?.org_id ?? null,
      role: orgMember?.role ?? null
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: {
        id: existingUser.id,
      },
      data: {
        refresh_token: refreshToken,
        refresh_expires_at: expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: existingUser.id,
        name: existingUser.name,
      },
    };
  } catch (error) {
    throw error;
  }
}

export async function renewSession(refreshToken) {
  const user = verifyToken(refreshToken);

  const dbUser = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
    select: {
      id: true,
      name: true,
      refresh_token: true,
      refresh_expires_at: true,
    },
  });

  if (!dbUser) {
    const error = new Error("Invalid refresh token");
    error.code = "INVALID_REFRESH_TOKEN";
    throw error;
  }

  if (
    !dbUser.refresh_expires_at ||
    dbUser.refresh_expires_at <= new Date() ||
    dbUser.refresh_token !== refreshToken
  ) {
    const error = new Error("Invalid refresh token");
    error.code = "INVALID_REFRESH_TOKEN";
    throw error;
  }

  const orgMember = await prisma.orgMember.findFirst({
    where: {
      user_id: dbUser.id,
    },
    select: {
      org_id: true,
      role: true,
    },
  });

  const accessToken = generateAccessToken({
    id: dbUser.id,
    name: dbUser.name,
    orgId: orgMember?.org_id ?? null,
    role: orgMember?.role ?? null,
  });

  return {
    accessToken,
  };
}

export async function logoutUser(refreshToken) {
  const dbUser = await prisma.user.findFirst({
    where: {
      refresh_token: refreshToken,
    }
  });

  if (!dbUser) {
    const error = new Error("Invalid refresh token");
    error.code = "INVALID_REFRESH_TOKEN";
    throw error;
  }

  await prisma.user.update({
    where: {
      id: dbUser.id,
    },
    data: {
      refresh_token: null,
      refresh_expires_at: null
    }
  })
}
