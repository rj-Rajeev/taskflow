import test, { beforeEach, after } from "node:test";
import assert from "node:assert/strict";

import redis from "../apps/api/src/lib/redis.js";
import prisma from "../apps/api/src/lib/prisma.js";

const BASE_URL = "http://localhost:3000";

beforeEach(async () => {
  const keys = await redis.keys("rate-limit:auth:*");

  if (keys.length > 0) {
    await redis.del(...keys);
  }
});

after(async () => {
  await redis.quit();
});

test("POST /auth/register - should register a user", async () => {
  const email = `test_${Date.now()}@example.com`;

  const response = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Test User",
      email,
      password: "password123",
    }),
  });

  const data = await response.json();

  assert.equal(response.status, 201);
  assert.equal(data.success, true);
});

test("POST /auth/login - should login with valid credentials", async () => {
  const email = `login_${Date.now()}@example.com`;
  const password = "password123";

  const registerResponse = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Login Test User",
      email,
      password,
    }),
  });

  assert.equal(registerResponse.status, 201);

  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.success, true);
  assert.ok(data.accessToken);
  assert.ok(data.refreshToken);
});

test("POST /auth/login - should reject invalid credentials", async () => {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "does-not-exist@example.com",
      password: "wrongpassword",
    }),
  });

  const data = await response.json();

  assert.equal(response.status, 401);
  assert.equal(data.success, false);
  assert.equal(data.message, "Invalid email or password");
});

test("POST /auth/refresh - should generate a new access token", async () => {
  const email = `refresh_${Date.now()}@example.com`;
  const password = "password123";

  await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Refresh Test User",
      email,
      password,
    }),
  });

  const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const loginData = await loginResponse.json();

  assert.equal(loginResponse.status, 200);
  assert.ok(loginData.refreshToken);

  const response = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refreshToken: loginData.refreshToken,
    }),
  });

  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.success, true);
  assert.ok(data.accessToken);
});

test("POST /auth/logout - should logout successfully", async () => {
  const email = `logout_${Date.now()}@example.com`;
  const password = "password123";

  await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Logout Test User",
      email,
      password,
    }),
  });

  const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const loginData = await loginResponse.json();

  assert.equal(loginResponse.status, 200);
  assert.ok(loginData.refreshToken);

  const response = await fetch(`${BASE_URL}/auth/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refreshToken: loginData.refreshToken,
    }),
  });

  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.success, true);
});

test("POST /auth/refresh - should reject refresh token after logout", async () => {
  const email = `revoked_${Date.now()}@example.com`;
  const password = "password123";

  await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Revocation Test User",
      email,
      password,
    }),
  });

  const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const loginData = await loginResponse.json();

  assert.equal(loginResponse.status, 200);
  assert.ok(loginData.refreshToken);

  const logoutResponse = await fetch(`${BASE_URL}/auth/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refreshToken: loginData.refreshToken,
    }),
  });

  const logoutData = await logoutResponse.json();

  assert.equal(logoutResponse.status, 200);
  assert.equal(logoutData.success, true);

  const response = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refreshToken: loginData.refreshToken,
    }),
  });

  const data = await response.json();

  assert.equal(response.status, 401);
  assert.equal(data.success, false);
  assert.equal(data.message, "Invalid Refresh Token");
});

test("POST /auth/refresh - should preserve organization context", async () => {
  const email = `refresh_org_${Date.now()}@example.com`;
  const password = "password123";

  const registerResponse = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Refresh Org User",
      email,
      password,
    }),
  });

  assert.equal(registerResponse.status, 201);

  // The test needs an org membership because registration
  // does not create one.
  const registerData = await registerResponse.json();
  const userId = registerData.user.id;

  const org = await prisma.organization.create({
    data: {
      name: `Refresh Test Org ${Date.now()}`,
    },
  });

  await prisma.orgMember.create({
    data: {
      org_id: org.id,
      user_id: userId,
      role: "member",
    },
  });

  const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const loginData = await loginResponse.json();

  assert.equal(loginResponse.status, 200);
  assert.ok(loginData.refreshToken);

  const refreshResponse = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refreshToken: loginData.refreshToken,
    }),
  });

  const refreshData = await refreshResponse.json();

  assert.equal(refreshResponse.status, 200);
  assert.equal(refreshData.success, true);
  assert.ok(refreshData.accessToken);

  // Decode only for testing the token payload.
  const [, payloadBase64] = refreshData.accessToken.split(".");

  const payload = JSON.parse(
    Buffer.from(payloadBase64, "base64url").toString(),
  );
  
  assert.equal(payload.id, userId);
  assert.equal(payload.orgId, org.id);
  assert.equal(payload.role, "member");

  // Cleanup
  await prisma.orgMember.deleteMany({
    where: {
      user_id: userId,
    },
  });

  await prisma.organization.delete({
    where: {
      id: org.id,
    },
  });

  await prisma.user.delete({
    where: {
      id: userId,
    },
  });
});