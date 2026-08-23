import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";

import prisma from "../apps/api/src/lib/prisma.js";
import redis from "../apps/api/src/lib/redis.js";

const BASE_URL = "http://localhost:3000";

let userA;
let tokenA;

async function registerUser(email, name = "Test User") {
  const response = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      email,
      password: "password123",
    }),
  });

  assert.equal(response.status, 201);

  const data = await response.json();

  return data.user;
}

async function loginUser(email) {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password: "password123",
    }),
  });

  assert.equal(response.status, 200);

  const data = await response.json();

  return data.accessToken;
}

before(async () => {
  const email = `org_test_${Date.now()}@example.com`;

  userA = await registerUser(
    email,
    "Organization Test User",
  );

  tokenA = await loginUser(email);
});

beforeEach(async () => {
  const keys = await redis.keys("rate-limit:auth:*");

  if (keys.length > 0) {
    await redis.del(...keys);
  }
});

after(async () => {
  await prisma.$disconnect();
  await redis.quit();
});


test("POST /organizations - should create organization", async () => {
  const response = await fetch(`${BASE_URL}/organizations`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenA}`,
    },

    body: JSON.stringify({
      name: "Test Organization",
    }),
  });

  const data = await response.json();

  assert.equal(response.status, 201);
  assert.equal(data.success, true);

  assert.ok(data.data.organization);
  assert.ok(data.data.organization.id);

  assert.equal(
    data.data.organization.name,
    "Test Organization",
  );

  assert.ok(data.data.accessToken);
});


test("POST /organizations - should make creator org_admin", async () => {
  const response = await fetch(`${BASE_URL}/organizations`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenA}`,
    },

    body: JSON.stringify({
      name: "Admin Organization",
    }),
  });

  const data = await response.json();

  assert.equal(response.status, 201);
  assert.equal(data.success, true);

  const organization = data.data.organization;

  assert.equal(
    organization.members.length,
    1,
  );

  assert.equal(
    organization.members[0].user_id,
    userA.id,
  );

  assert.equal(
    organization.members[0].role,
    "org_admin",
  );
});


test(
  "POST /organizations - should return access token with organization context",
  async () => {
    const response = await fetch(`${BASE_URL}/organizations`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },

      body: JSON.stringify({
        name: "Context Organization",
      }),
    });

    const data = await response.json();

    assert.equal(response.status, 201);
    assert.equal(data.success, true);

    assert.ok(data.data.accessToken);

    const newToken = data.data.accessToken;

    /*
     * The newly generated token should contain
     * the organization context.
     *
     * Verify it by creating a project using
     * the new token without logging in again.
     */

    const projectResponse = await fetch(
      `${BASE_URL}/projects`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${newToken}`,
        },

        body: JSON.stringify({
          name: "Context Project",
          description: "Organization context test",
        }),
      },
    );

    const projectData = await projectResponse.json();

    assert.equal(projectResponse.status, 201);
    assert.equal(projectData.success, true);

    assert.equal(
      projectData.data.org_id,
      data.data.organization.id,
    );
  },
);


test("POST /organizations - should reject missing name", async () => {
  const response = await fetch(`${BASE_URL}/organizations`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenA}`,
    },

    body: JSON.stringify({}),
  });

  const data = await response.json();

  assert.equal(response.status, 400);
  assert.equal(data.success, false);

  assert.equal(
    data.message,
    "Organization name is required",
  );
});


test("POST /organizations - should reject empty name", async () => {
  const response = await fetch(`${BASE_URL}/organizations`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenA}`,
    },

    body: JSON.stringify({
      name: "   ",
    }),
  });

  const data = await response.json();

  assert.equal(response.status, 400);
  assert.equal(data.success, false);

  assert.equal(
    data.message,
    "Organization name is required",
  );
});


test(
  "POST /organizations - should reject unauthenticated request",
  async () => {
    const response = await fetch(
      `${BASE_URL}/organizations`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          name: "Unauthorized Organization",
        }),
      },
    );

    const data = await response.json();

    assert.equal(response.status, 401);

    assert.equal(
      data.error,
      "Authorization header missing",
    );
  },
);