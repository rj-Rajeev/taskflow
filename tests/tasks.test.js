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

  // Organization A
  orgA = await prisma.organization.create({
    data: {
      name: `Test Organization A ${Date.now()}`,
    },
  });

  // Organization B
  orgB = await prisma.organization.create({
    data: {
      name: `Test Organization B ${Date.now()}`,
    },
  });

  // User A - Organization A admin
  userA = await prisma.user.create({
    data: {
      name: "Test User A",
      email: `userA_${Date.now()}@example.com`,
      password_hash: passwordHash,
    },
  });

  // User B - Organization A member
  userB = await prisma.user.create({
    data: {
      name: "Test User B",
      email: `userB_${Date.now()}@example.com`,
      password_hash: passwordHash,
    },
  });

  // User C - Organization B admin
  userBOrgB = await prisma.user.create({
    data: {
      name: "Test User B Org",
      email: `userBOrgB_${Date.now()}@example.com`,
      password_hash: passwordHash,
    },
  });

  // Memberships
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

  // Projects
  projectA = await prisma.project.create({
    data: {
      name: "Project A",
      description: "Project belonging to Organization A",
      org_id: orgA.id,
    },
  });

  projectB = await prisma.project.create({
    data: {
      name: "Project B",
      description: "Project belonging to Organization B",
      org_id: orgB.id,
    },
  });

  // Login through the real API
  tokenA = await login(userA.email, "password123");
  tokenB = await login(userB.email, "password123");
  tokenBOrgB = await login(userBOrgB.email, "password123");
});

beforeEach(async () => {
  // Keep auth rate limiter from interfering with API tests.
  const keys = await redis.keys("rate-limit:auth:*");

  if (keys.length > 0) {
    await redis.del(...keys);
  }
});

after(async () => {
  // Delete test data.
  // Tasks are deleted through their project cascade.
  await prisma.project.deleteMany({
    where: {
      id: {
        in: [projectA.id, projectB.id],
      },
    },
  });

  await prisma.orgMember.deleteMany({
    where: {
      org_id: {
        in: [orgA.id, orgB.id],
      },
    },
  });

  await prisma.user.deleteMany({
    where: {
      id: {
        in: [userA.id, userB.id, userBOrgB.id],
      },
    },
  });

  await prisma.organization.deleteMany({
    where: {
      id: {
        in: [orgA.id, orgB.id],
      },
    },
  });

  await redis.quit();
});

test("POST /tasks - should create a task", async () => {
  const { response, data } = await apiRequest("/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      title: "Test Task",
      description: "Task created by integration test",
      project_id: projectA.id,
      status: "todo",
      priority: "high",
    }),
  });

  assert.equal(response.status, 201);
  assert.equal(data.success, true);

  assert.ok(data.data);
  assert.equal(data.data.title, "Test Task");
  assert.equal(data.data.project_id, projectA.id);
  assert.equal(data.data.status, "todo");
  assert.equal(data.data.priority, "high");
});

test("GET /tasks/:id - should get a task", async () => {
  const createResult = await apiRequest("/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      title: "Get Task",
      description: "Task for get test",
      project_id: projectA.id,
      status: "todo",
      priority: "medium",
    }),
  });

  const taskId = createResult.data.data.id;

  const { response, data } = await apiRequest(`/tasks/${taskId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
  });

  assert.equal(response.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.id, taskId);
});

test("PATCH /tasks/:id - should update a task", async () => {
  const createResult = await apiRequest("/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      title: "Original Task",
      description: "Original description",
      project_id: projectA.id,
      status: "todo",
      priority: "low",
    }),
  });

  const taskId = createResult.data.data.id;

  const { response, data } = await apiRequest(`/tasks/${taskId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      title: "Updated Task",
      status: "in_progress",
      priority: "high",
    }),
  });

  assert.equal(response.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.title, "Updated Task");
  assert.equal(data.data.status, "in_progress");
  assert.equal(data.data.priority, "high");
});

test("DELETE /tasks/:id - should delete a task", async () => {
  const createResult = await apiRequest("/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      title: "Delete Task",
      description: "Task for delete test",
      project_id: projectA.id,
      status: "todo",
      priority: "low",
    }),
  });

  const taskId = createResult.data.data.id;

  const { response, data } = await apiRequest(`/tasks/${taskId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
  });

  assert.equal(response.status, 200);
  assert.equal(data.success, true);

  const getResult = await apiRequest(`/tasks/${taskId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
  });

  assert.equal(getResult.response.status, 404);
  assert.equal(getResult.data.success, false);
});

test("GET /tasks/:id - should reject cross-tenant access", async () => {
  const createResult = await apiRequest("/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      title: "Private Task",
      description: "Organization A private task",
      project_id: projectA.id,
      status: "todo",
      priority: "high",
    }),
  });

  const taskId = createResult.data.data.id;

  const { response, data } = await apiRequest(`/tasks/${taskId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${tokenBOrgB}`,
    },
  });

  assert.equal(response.status, 403);
  assert.equal(data.success, false);
  assert.equal(data.message, "Forbidden");
});

test("POST /tasks/:id/assign - should assign same-organization user", async () => {
  const createResult = await apiRequest("/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      title: "Assignment Task",
      description: "Task for assignment test",
      project_id: projectA.id,
      status: "todo",
      priority: "medium",
    }),
  });

  const taskId = createResult.data.data.id;

  const { response, data } = await apiRequest(
    `/tasks/${taskId}/assign`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        userId: userB.id,
      }),
    },
  );


    assert.equal(response.status, 201);
    assert.equal(data.success, true);

    assert.ok(data.data.assignment);
    assert.equal(data.data.assignment.task_id, taskId);
    assert.equal(data.data.assignment.user_id, userB.id);
    assert.ok(data.data.jobId);
});

test("POST /tasks/:id/assign - should reject user from another organization", async () => {
  const createResult = await apiRequest("/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      title: "Cross Org Assignment",
      description: "Task for cross organization assignment",
      project_id: projectA.id,
      status: "todo",
      priority: "medium",
    }),
  });

  const taskId = createResult.data.data.id;

  const { response, data } = await apiRequest(
    `/tasks/${taskId}/assign`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        userId: userBOrgB.id,
      }),
    },
  );

  assert.equal(response.status, 403);
  assert.equal(data.success, false);
  assert.equal(
    data.message,
    "User does not belong to your organization",
  );
});

test("POST /tasks/:id/assign - should reject duplicate assignment", async () => {
  const createResult = await apiRequest("/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      title: "Duplicate Assignment",
      description: "Task for duplicate assignment test",
      project_id: projectA.id,
      status: "todo",
      priority: "medium",
    }),
  });

  const taskId = createResult.data.data.id;

  const firstAssignment = await apiRequest(
    `/tasks/${taskId}/assign`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        userId: userB.id,
      }),
    },
  );

  assert.equal(firstAssignment.response.status, 201);

  const secondAssignment = await apiRequest(
    `/tasks/${taskId}/assign`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        userId: userB.id,
      }),
    },
  );

  assert.equal(secondAssignment.response.status, 409);
  assert.equal(secondAssignment.data.success, false);
  assert.equal(
    secondAssignment.data.message,
    "User is already assigned to this task",
  );
});


// Basic Task Listing

test("GET /tasks - should list organization tasks", async () => {
  const task1 = await apiRequest("/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      title: "List Task 1",
      description: "First list task",
      project_id: projectA.id,
      status: "todo",
      priority: "low",
    }),
  });

  const task2 = await apiRequest("/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      title: "List Task 2",
      description: "Second list task",
      project_id: projectA.id,
      status: "done",
      priority: "high",
    }),
  });

  assert.equal(task1.response.status, 201);
  assert.equal(task2.response.status, 201);

  const { response, data } = await apiRequest("/tasks", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
  });

  assert.equal(response.status, 200);
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.data));
  assert.ok(data.total >= 2);
});


// Pagination

test("GET /tasks - should paginate tasks", async () => {
  for (let i = 1; i <= 3; i++) {
    const result = await apiRequest("/tasks", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        title: `Pagination Task ${i}`,
        description: "Pagination test",
        project_id: projectA.id,
        status: "todo",
        priority: "medium",
      }),
    });

    assert.equal(result.response.status, 201);
  }

  const { response, data } = await apiRequest(
    "/tasks?page=1&limit=2",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.page, 1);
  assert.equal(data.limit, 2);
  assert.equal(data.data.length, 2);
  assert.ok(data.total >= 3);
});

// Status Filter

test("GET /tasks - should filter by status", async () => {
  const todoTask = await apiRequest("/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      title: "Todo Filter Task",
      description: "Status filter test",
      project_id: projectA.id,
      status: "todo",
      priority: "medium",
    }),
  });

  const doneTask = await apiRequest("/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      title: "Done Filter Task",
      description: "Status filter test",
      project_id: projectA.id,
      status: "done",
      priority: "medium",
    }),
  });

  assert.equal(todoTask.response.status, 201);
  assert.equal(doneTask.response.status, 201);

  const { response, data } = await apiRequest(
    "/tasks?status=todo",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(data.success, true);

  for (const task of data.data) {
    assert.equal(task.status, "todo");
  }
});

// Priority Filter

test("GET /tasks - should filter by priority", async () => {
  const { response, data } = await apiRequest(
    "/tasks?priority=urgent",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(data.success, true);

  for (const task of data.data) {
    assert.equal(task.priority, "urgent");
  }
});

// Assignee filter

test("GET /tasks - should filter by assignee", async () => {
  const createResult = await apiRequest("/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      title: "Assignee Filter Task",
      description: "Assignee filter test",
      project_id: projectA.id,
      status: "todo",
      priority: "medium",
    }),
  });

  assert.equal(createResult.response.status, 201);

  const taskId = createResult.data.data.id;

  const assignResult = await apiRequest(
    `/tasks/${taskId}/assign`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        userId: userB.id,
      }),
    },
  );

  assert.equal(assignResult.response.status, 201);

  const { response, data } = await apiRequest(
    `/tasks?assignee=${userB.id}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(data.success, true);

  assert.ok(
    data.data.some((task) => task.id === taskId),
  );

  for (const task of data.data) {
    assert.ok(
      task.taskAssignments.some(
        (assignment) => assignment.user_id === userB.id,
      ),
    );
  }
});

// Due Date Filter

test("GET /tasks - should filter by due date", async () => {
  const taskResult = await apiRequest("/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      title: "Due Date Task",
      description: "Due date filter test",
      project_id: projectA.id,
      due_date: "2026-09-15T12:00:00.000Z",
      status: "todo",
      priority: "medium",
    }),
  });

  assert.equal(taskResult.response.status, 201);

  const { response, data } = await apiRequest(
    "/tasks?due_from=2026-09-01&due_to=2026-09-30",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(data.success, true);

  assert.ok(
    data.data.some(
      (task) => task.id === taskResult.data.data.id,
    ),
  );
});

// Invalid Pagination

test("GET /tasks - should reject invalid pagination", async () => {
  const cases = [
    "/tasks?page=0",
    "/tasks?page=-1",
    "/tasks?page=abc",
    "/tasks?limit=0",
    "/tasks?limit=101",
    "/tasks?limit=abc",
  ];

  for (const path of cases) {
    const { response, data } = await apiRequest(path, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    });

    assert.equal(response.status, 400);
    assert.equal(data.success, false);
    assert.equal(data.message, "Invalid pagination parameters");
  }
});

// Tenant isolation in list

test("GET /tasks - should only return tasks from user's organization", async () => {
  const orgBTask = await apiRequest("/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenBOrgB}`,
    },
    body: JSON.stringify({
      title: "Organization B Private Task",
      description: "Should not be visible to Organization A",
      project_id: projectB.id,
      status: "todo",
      priority: "high",
    }),
  });

  assert.equal(orgBTask.response.status, 201);

  const taskId = orgBTask.data.data.id;

  const { response, data } = await apiRequest("/tasks", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
  });

  assert.equal(response.status, 200);
  assert.equal(data.success, true);

  assert.equal(
    data.data.some((task) => task.id === taskId),
    false,
  );
});

// Successful unassign

test("DELETE /tasks/:id/assign - should unassign user", async () => {
  const createResult = await apiRequest("/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      title: "Unassign Task",
      description: "Task for unassign test",
      project_id: projectA.id,
      status: "todo",
      priority: "medium",
    }),
  });

  assert.equal(createResult.response.status, 201);

  const taskId = createResult.data.data.id;

  const assignResult = await apiRequest(`/tasks/${taskId}/assign`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      userId: userB.id,
    }),
  });

  assert.equal(assignResult.response.status, 201);

  const { response, data } = await apiRequest(
    `/tasks/${taskId}/assign`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        userId: userB.id,
      }),
    },
  );

  assert.equal(response.status, 200);
  assert.equal(data.success, true);
  assert.equal(
    data.message,
    "User unassigned from task successfully",
  );

  const task = await apiRequest(`/tasks/${taskId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
  });

  assert.equal(task.response.status, 200);

  assert.equal(
    task.data.data.taskAssignments.some(
      (assignment) => assignment.user.id === userB.id,
    ),
    false,
  );
});

// Unassign non-existing assignment

test("DELETE /tasks/:id/assign - should reject missing assignment", async () => {
  const createResult = await apiRequest("/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      title: "Missing Assignment Task",
      description: "Task for missing assignment test",
      project_id: projectA.id,
      status: "todo",
      priority: "low",
    }),
  });

  const taskId = createResult.data.data.id;

  const { response, data } = await apiRequest(
    `/tasks/${taskId}/assign`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        userId: userB.id,
      }),
    },
  );

  assert.equal(response.status, 404);
  assert.equal(data.success, false);
  assert.equal(data.message, "Task assignment not found");
});

// Missing userId when assigning

test("POST /tasks/:id/assign - should require userId", async () => {
  const createResult = await apiRequest("/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      title: "Missing User Task",
      description: "Task for validation",
      project_id: projectA.id,
      status: "todo",
      priority: "medium",
    }),
  });

  const taskId = createResult.data.data.id;

  const { response, data } = await apiRequest(
    `/tasks/${taskId}/assign`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({}),
    },
  );

  assert.equal(response.status, 400);
  assert.equal(data.success, false);
  assert.equal(data.message, "userId is required");
});

// Missing userId when unassigning

test("DELETE /tasks/:id/assign - should require userId", async () => {
  const createResult = await apiRequest("/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      title: "Missing Unassign User Task",
      description: "Task for validation",
      project_id: projectA.id,
      status: "todo",
      priority: "medium",
    }),
  });

  const taskId = createResult.data.data.id;

  const { response, data } = await apiRequest(
    `/tasks/${taskId}/assign`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({}),
    },
  );

  assert.equal(response.status, 400);
  assert.equal(data.success, false);
  assert.equal(data.message, "userId is required");
});

// Invalid status

test("PATCH /tasks/:id - should reject invalid status", async () => {
  const createResult = await apiRequest("/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      title: "Invalid Status Task",
      description: "Task validation",
      project_id: projectA.id,
      status: "todo",
      priority: "medium",
    }),
  });

  const taskId = createResult.data.data.id;

  const { response, data } = await apiRequest(`/tasks/${taskId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      status: "invalid_status",
    }),
  });

  assert.equal(response.status, 400);
  assert.equal(data.success, false);
  assert.equal(data.message, "Invalid task status");
});

// Invalid priority

test("PATCH /tasks/:id - should reject invalid priority", async () => {
  const createResult = await apiRequest("/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      title: "Invalid Priority Task",
      description: "Task validation",
      project_id: projectA.id,
      status: "todo",
      priority: "medium",
    }),
  });

  const taskId = createResult.data.data.id;

  const { response, data } = await apiRequest(`/tasks/${taskId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      priority: "invalid_priority",
    }),
  });

  assert.equal(response.status, 400);
  assert.equal(data.success, false);
  assert.equal(data.message, "Invalid task priority");
});

// Missing create fields

test("POST /tasks - should reject missing required fields", async () => {
  const { response, data } = await apiRequest("/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      title: "Incomplete Task",
    }),
  });

  assert.equal(response.status, 400);
  assert.equal(data.success, false);
  assert.equal(
    data.message,
    "title, description, project_id, status and priority are required",
  );
});

// Empty update

test("PATCH /tasks/:id - should reject empty update", async () => {
  const createResult = await apiRequest("/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      title: "Empty Update Task",
      description: "Task validation",
      project_id: projectA.id,
      status: "todo",
      priority: "medium",
    }),
  });

  const taskId = createResult.data.data.id;

  const { response, data } = await apiRequest(`/tasks/${taskId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({}),
  });

  assert.equal(response.status, 400);
  assert.equal(data.success, false);
  assert.equal(data.message, "At least one field is required");
});

// Unauthenticated task request

test("GET /tasks - should reject unauthenticated request", async () => {
  const { response, data } = await apiRequest("/tasks", {
    method: "GET",
  });

  assert.equal(response.status, 401);
  assert.equal(data.error, "Authorization header missing");
});