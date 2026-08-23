import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";

import prisma from "../apps/api/src/lib/prisma.js";
import redis from "../apps/api/src/lib/redis.js";
import { hashPassword } from "../apps/api/src/lib/bcrypt.js";

const BASE_URL = "http://localhost:3000";

let orgA;
let orgB;

let userA;
let userB;
let userBOrgB;

let tokenA;
let tokenB;
let tokenBOrgB;

let projectA;
let projectB;

async function apiRequest(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json();

  return {
    response,
    data,
  };
}

async function login(email, password) {
  const { response, data } = await apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
    }),
  });

  assert.equal(response.status, 200);
  assert.equal(data.success, true);

  return data.accessToken;
}

before(async () => {
  const passwordHash = await hashPassword("password123");

  // =========================
  // Organizations
  // =========================

  orgA = await prisma.organization.create({
    data: {
      name: `Project Test Organization A ${Date.now()}`,
    },
  });

  orgB = await prisma.organization.create({
    data: {
      name: `Project Test Organization B ${Date.now()}`,
    },
  });

  // =========================
  // Users
  // =========================

  // Organization A admin
  userA = await prisma.user.create({
    data: {
      name: "Project Test Admin",
      email: `project_admin_${Date.now()}@example.com`,
      password_hash: passwordHash,
    },
  });

  // Organization A member
  userB = await prisma.user.create({
    data: {
      name: "Project Test Member",
      email: `project_member_${Date.now()}@example.com`,
      password_hash: passwordHash,
    },
  });

  // Organization B admin
  userBOrgB = await prisma.user.create({
    data: {
      name: "Project Test Org B Admin",
      email: `project_orgb_admin_${Date.now()}@example.com`,
      password_hash: passwordHash,
    },
  });

  // =========================
  // Organization memberships
  // =========================

  await prisma.orgMember.createMany({
    data: [
      {
        org_id: orgA.id,
        user_id: userA.id,
        role: "org_admin",
      },
      {
        org_id: orgA.id,
        user_id: userB.id,
        role: "member",
      },
      {
        org_id: orgB.id,
        user_id: userBOrgB.id,
        role: "org_admin",
      },
    ],
  });

  // =========================
  // Projects
  // =========================

  projectA = await prisma.project.create({
    data: {
      name: "Organization A Project",
      description: "Project belonging to organization A",
      org_id: orgA.id,
    },
  });

  projectB = await prisma.project.create({
    data: {
      name: "Organization B Project",
      description: "Project belonging to organization B",
      org_id: orgB.id,
    },
  });

  // =========================
  // Login
  // =========================

  tokenA = await login(userA.email, "password123");

  tokenB = await login(userB.email, "password123");

  tokenBOrgB = await login(userBOrgB.email, "password123");
});

beforeEach(async () => {
  const keys = await redis.keys("rate-limit:auth:*");

  if (keys.length > 0) {
    await redis.del(...keys);
  }
});

after(async () => {
  // Delete projects first
  await prisma.project.deleteMany({
    where: {
      org_id: {
        in: [orgA.id, orgB.id],
      },
    },
  });

  // Delete memberships
  await prisma.orgMember.deleteMany({
    where: {
      org_id: {
        in: [orgA.id, orgB.id],
      },
    },
  });

  // Delete users
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [userA.id, userB.id, userBOrgB.id],
      },
    },
  });

  // Delete organizations
  await prisma.organization.deleteMany({
    where: {
      id: {
        in: [orgA.id, orgB.id],
      },
    },
  });

  await redis.quit();
});

// ============================================================
// CREATE
// ============================================================

test("POST /projects - should create a project", async () => {
  const { response, data } = await apiRequest("/projects", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      name: "Test Project",
      description: "Project description",
    }),
  });

  assert.equal(response.status, 201);
  assert.equal(data.success, true);

  assert.ok(data.data.id);
  assert.equal(data.data.name, "Test Project");
  assert.equal(data.data.description, "Project description");
  assert.equal(data.data.org_id, orgA.id);
});

// ============================================================
// LIST
// ============================================================

test("GET /projects - should list organization projects", async () => {
  const { response, data } = await apiRequest("/projects", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
  });

  assert.equal(response.status, 200);
  assert.equal(data.success, true);

  assert.ok(Array.isArray(data.data));
});

test("GET /projects - should only return projects from user's organization", async () => {
  const { response, data } = await apiRequest("/projects", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
  });

  assert.equal(response.status, 200);
  assert.equal(data.success, true);

  assert.ok(Array.isArray(data.data));

  assert.ok(
    data.data.every((project) => project.org_id === orgA.id),
  );

  assert.equal(
    data.data.some((project) => project.org_id === orgB.id),
    false,
  );
});

// ============================================================
// GET SINGLE
// ============================================================

test("GET /projects/:id - should get project", async () => {
  const { response, data } = await apiRequest(
    `/projects/${projectA.id}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(data.success, true);

  assert.equal(data.data.id, projectA.id);
  assert.equal(data.data.org_id, orgA.id);
});

test("GET /projects/:id - should reject cross-tenant access", async () => {
  const { response, data } = await apiRequest(
    `/projects/${projectA.id}`,
    {
      method: "GET",
      headers: {
        // IMPORTANT:
        // tokenBOrgB belongs to Organization B
        // projectA belongs to Organization A
        Authorization: `Bearer ${tokenBOrgB}`,
      },
    },
  );

  assert.equal(response.status, 403);
  assert.equal(data.success, false);
  assert.equal(data.message, "Forbidden");
});

// ============================================================
// UPDATE
// ============================================================

test("PATCH /projects/:id - should update project", async () => {
  const { response, data } = await apiRequest(
    `/projects/${projectA.id}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        name: "Updated Project Name",
      }),
    },
  );

  assert.equal(response.status, 200);
  assert.equal(data.success, true);

  assert.equal(data.data.id, projectA.id);
  assert.equal(data.data.name, "Updated Project Name");
  assert.equal(
    data.data.description,
    "Project belonging to organization A",
  );
});

test("PATCH /projects/:id - should reject cross-tenant update", async () => {
  const { response, data } = await apiRequest(
    `/projects/${projectA.id}`,
    {
      method: "PATCH",
      headers: {
        // IMPORTANT:
        // Organization B trying to update Organization A project
        Authorization: `Bearer ${tokenBOrgB}`,
      },
      body: JSON.stringify({
        name: "Hacked Project",
      }),
    },
  );

  assert.equal(response.status, 403);
  assert.equal(data.success, false);
  assert.equal(data.message, "Forbidden");
});

// ============================================================
// DELETE
// ============================================================

test("DELETE /projects/:id - org admin should delete project", async () => {
  const createResult = await apiRequest("/projects", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      name: "Delete Project",
      description: "Project for delete test",
    }),
  });

  assert.equal(createResult.response.status, 201);

  const projectId = createResult.data.data.id;

  const { response, data } = await apiRequest(
    `/projects/${projectId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(data.success, true);

  assert.equal(
    data.message,
    "Project deleted successfully",
  );
});

test("DELETE /projects/:id - member should not delete project", async () => {
  const createResult = await apiRequest("/projects", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      name: "Member Delete Project",
      description: "Project for role test",
    }),
  });

  assert.equal(createResult.response.status, 201);

  const projectId = createResult.data.data.id;

  const { response, data } = await apiRequest(
    `/projects/${projectId}`,
    {
      method: "DELETE",
      headers: {
        // Same organization, but member role
        Authorization: `Bearer ${tokenB}`,
      },
    },
  );

  assert.equal(response.status, 403);
  assert.equal(data.success, false);

  assert.equal(
    data.message,
    "Only organization admins can delete projects",
  );
});

// ============================================================
// VALIDATION
// ============================================================

test("POST /projects - should reject missing required fields", async () => {
  const { response, data } = await apiRequest("/projects", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      name: "Incomplete Project",
    }),
  });

  assert.equal(response.status, 400);
  assert.equal(data.success, false);

  assert.equal(
    data.message,
    "Name and description are required",
  );
});

test("PATCH /projects/:id - should reject empty update", async () => {
  const { response, data } = await apiRequest(
    `/projects/${projectA.id}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({}),
    },
  );

  assert.equal(response.status, 400);
  assert.equal(data.success, false);

  assert.equal(
    data.message,
    "Name or description is required",
  );
});

// ============================================================
// AUTHORIZATION
// ============================================================

test("GET /projects - should reject unauthenticated request", async () => {
  const { response, data } = await apiRequest("/projects", {
    method: "GET",
  });

  assert.equal(response.status, 401);
  assert.equal(data.error, "Authorization header missing");
});

test("GET /projects/:id - should return 404 for unknown project", async () => {
  const fakeProjectId = "00000000-0000-0000-0000-000000000000";

  const { response, data } = await apiRequest(
    `/projects/${fakeProjectId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    },
  );

  assert.equal(response.status, 404);
  assert.equal(data.success, false);
  assert.equal(data.message, "Project not found");
});

test("PATCH /projects/:id - should return 404 for unknown project", async () => {
  const fakeProjectId = "00000000-0000-0000-0000-000000000000";

  const { response, data } = await apiRequest(
    `/projects/${fakeProjectId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        name: "Updated",
      }),
    },
  );

  assert.equal(response.status, 404);
  assert.equal(data.success, false);
  assert.equal(data.message, "Project not found");
});

test("DELETE /projects/:id - should return 404 for unknown project", async () => {
  const fakeProjectId = "00000000-0000-0000-0000-000000000000";

  const { response, data } = await apiRequest(
    `/projects/${fakeProjectId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    },
  );

  assert.equal(response.status, 404);
  assert.equal(data.success, false);
  assert.equal(data.message, "Project not found");
});