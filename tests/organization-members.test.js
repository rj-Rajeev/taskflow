import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";

import prisma from "../apps/api/src/lib/prisma.js";
import redis from "../apps/api/src/lib/redis.js";

const BASE_URL = "http://localhost:3000";

let adminUser;
let adminToken;

let memberUser;
let memberToken;

let secondMemberUser;

let organizationId;

async function registerUser(name, email) {
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

async function createOrganization(token, name) {
  const response = await fetch(`${BASE_URL}/organizations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name,
    }),
  });

  assert.equal(response.status, 201);

  const data = await response.json();

  return {
    organization: data.data.organization,
    accessToken: data.data.accessToken,
  };
}

before(async () => {
  const timestamp = Date.now();

  /*
   * Create users
   */
  adminUser = await registerUser(
    "Organization Admin",
    `org_admin_${timestamp}@example.com`,
  );

  memberUser = await registerUser(
    "Organization Member",
    `org_member_${timestamp}@example.com`,
  );

  secondMemberUser = await registerUser(
    "Second Organization Member",
    `org_member2_${timestamp}@example.com`,
  );

  /*
   * Login admin.
   *
   * This token does NOT contain organization context yet.
   */
  adminToken = await loginUser(adminUser.email);

  /*
   * Create organization.
   *
   * The API returns a NEW access token containing:
   *   orgId
   *   role = org_admin
   */
  const organization = await createOrganization(
    adminToken,
    "Members Test Organization",
  );

  organizationId = organization.organization.id;

  /*
   * IMPORTANT:
   *
   * Replace the old token with the organization-aware token.
   */
  adminToken = organization.accessToken;

  /*
   * Add member directly for test setup.
   *
   * The actual API tests will test member management.
   */
  await prisma.orgMember.create({
    data: {
      org_id: organizationId,
      user_id: memberUser.id,
      role: "member",
    },
  });

  /*
   * IMPORTANT:
   *
   * memberUser was logged in before joining the organization.
   * Therefore the old JWT would contain:
   *
   *   orgId: null
   *   role: null
   *
   * Login again after membership exists so the JWT
   * contains the organization context.
   */
  memberToken = await loginUser(memberUser.email);
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


/*
|--------------------------------------------------------------------------
| GET MEMBERS
|--------------------------------------------------------------------------
*/

test(
  "GET /organizations/members - should list organization members",
  async () => {
    const response = await fetch(
      `${BASE_URL}/organizations/members`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.success, true);

    assert.ok(Array.isArray(data.data));

    assert.ok(
      data.data.some(
        (member) =>
          member.user?.id === adminUser.id,
      ),
    );

    assert.ok(
      data.data.some(
        (member) =>
          member.user?.id === memberUser.id,
      ),
    );
  },
);


/*
|--------------------------------------------------------------------------
| ADD MEMBER
|--------------------------------------------------------------------------
*/

test(
  "POST /organizations/members - should add user to organization",
  async () => {
    const response = await fetch(
      `${BASE_URL}/organizations/members`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          userId: secondMemberUser.id,
        }),
      },
    );

    const data = await response.json();

    assert.equal(response.status, 201);
    assert.equal(data.success, true);

    assert.ok(data.data);

    assert.equal(
      data.data.user_id,
      secondMemberUser.id,
    );

    assert.equal(
      data.data.org_id,
      organizationId,
    );

    assert.equal(
      data.data.role,
      "member",
    );
  },
);


test(
  "POST /organizations/members - should reject duplicate member",
  async () => {
    const response = await fetch(
      `${BASE_URL}/organizations/members`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          userId: memberUser.id,
        }),
      },
    );

    const data = await response.json();

    assert.equal(response.status, 409);
    assert.equal(data.success, false);

    assert.equal(
      data.message,
      "User is already a member",
    );
  },
);


test(
  "POST /organizations/members - should reject unknown user",
  async () => {
    const fakeUserId =
      "00000000-0000-0000-0000-000000000000";

    const response = await fetch(
      `${BASE_URL}/organizations/members`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          userId: fakeUserId,
        }),
      },
    );

    const data = await response.json();

    assert.equal(response.status, 404);
    assert.equal(data.success, false);

    assert.equal(
      data.message,
      "User not found",
    );
  },
);


test(
  "POST /organizations/members - should reject missing userId",
  async () => {
    const response = await fetch(
      `${BASE_URL}/organizations/members`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({}),
      },
    );

    const data = await response.json();

    assert.equal(response.status, 400);
    assert.equal(data.success, false);

    assert.equal(
      data.message,
      "userId is required",
    );
  },
);


/*
|--------------------------------------------------------------------------
| MEMBER AUTHORIZATION
|--------------------------------------------------------------------------
*/

test(
  "GET /organizations/members - should allow member to view members",
  async () => {
    const response = await fetch(
      `${BASE_URL}/organizations/members`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${memberToken}`,
        },
      },
    );

    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.success, true);

    assert.ok(Array.isArray(data.data));
  },
);


test(
  "POST /organizations/members - member should not add users",
  async () => {
    const response = await fetch(
      `${BASE_URL}/organizations/members`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          userId: secondMemberUser.id,
        }),
      },
    );

    const data = await response.json();

    assert.equal(response.status, 403);
    assert.equal(data.success, false);

    assert.equal(
      data.message,
      "Only organization admins can manage members",
    );
  },
);


/*
|--------------------------------------------------------------------------
| CHANGE ROLE
|--------------------------------------------------------------------------
*/

test(
  "PATCH /organizations/members/:userId - should promote member to admin",
  async () => {
    const response = await fetch(
      `${BASE_URL}/organizations/members/${memberUser.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          role: "org_admin",
        }),
      },
    );

    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.success, true);

    assert.equal(
      data.data.user_id,
      memberUser.id,
    );

    assert.equal(
      data.data.role,
      "org_admin",
    );

    /*
     * The member's old token still has role=member.
     *
     * We don't use it for admin operations.
     * The DB role is what we're testing here.
     */
  },
);


test(
  "PATCH /organizations/members/:userId - should reject invalid role",
  async () => {
    const response = await fetch(
      `${BASE_URL}/organizations/members/${memberUser.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          role: "super_admin",
        }),
      },
    );

    const data = await response.json();

    assert.equal(response.status, 400);
    assert.equal(data.success, false);

    assert.equal(
      data.message,
      "Invalid role",
    );
  },
);


/*
|--------------------------------------------------------------------------
| REMOVE MEMBER
|--------------------------------------------------------------------------
*/

test(
  "DELETE /organizations/members/:userId - should remove member",
  async () => {
    /*
     * Create a temporary user because previous tests
     * may have changed memberUser's role.
     */

    const temporaryUser = await registerUser(
      "Temporary Member",
      `temporary_${Date.now()}@example.com`,
    );

    await prisma.orgMember.create({
      data: {
        org_id: organizationId,
        user_id: temporaryUser.id,
        role: "member",
      },
    });

    const response = await fetch(
      `${BASE_URL}/organizations/members/${temporaryUser.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.success, true);

    assert.equal(
      data.message,
      "Member removed successfully",
    );

    const membership =
      await prisma.orgMember.findUnique({
        where: {
          org_id_user_id: {
            org_id: organizationId,
            user_id: temporaryUser.id,
          },
        },
      });

    assert.equal(membership, null);
  },
);


test(
  "DELETE /organizations/members/:userId - member should not remove users",
  async () => {
    const response = await fetch(
      `${BASE_URL}/organizations/members/${adminUser.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${memberToken}`,
        },
      },
    );

    const data = await response.json();

    assert.equal(response.status, 403);
    assert.equal(data.success, false);

    assert.equal(
      data.message,
      "Only organization admins can manage members",
    );
  },
);


/*
|--------------------------------------------------------------------------
| LAST ADMIN PROTECTION
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| LAST ADMIN PROTECTION
|--------------------------------------------------------------------------
*/

test(
  "DELETE /organizations/members/:userId - should not remove last admin",
  async () => {
    /*
     * Make sure there is exactly ONE admin.
     *
     * The previous role-promotion test may have promoted
     * memberUser to org_admin.
     */
    await prisma.orgMember.update({
      where: {
        org_id_user_id: {
          org_id: organizationId,
          user_id: memberUser.id,
        },
      },
      data: {
        role: "member",
      },
    });

    /*
     * Now:
     *
     * adminUser  -> org_admin
     * memberUser -> member
     *
     * Therefore adminUser is the ONLY admin.
     */

    const response = await fetch(
      `${BASE_URL}/organizations/members/${adminUser.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    const data = await response.json();

    assert.equal(response.status, 400);
    assert.equal(data.success, false);

    assert.equal(
      data.message,
      "Organization must have at least one admin",
    );
  },
);


test(
  "PATCH /organizations/members/:userId - should not demote last admin",
  async () => {
    /*
     * Ensure adminUser exists and is the ONLY admin.
     *
     * The previous test must not be allowed to remove it,
     * but we explicitly normalize the database state here.
     */

    await prisma.orgMember.update({
      where: {
        org_id_user_id: {
          org_id: organizationId,
          user_id: memberUser.id,
        },
      },
      data: {
        role: "member",
      },
    });

    /*
     * Verify the admin exists before testing.
     */
    const adminMembership =
      await prisma.orgMember.findUnique({
        where: {
          org_id_user_id: {
            org_id: organizationId,
            user_id: adminUser.id,
          },
        },
      });

    assert.ok(adminMembership);
    assert.equal(adminMembership.role, "org_admin");

    const response = await fetch(
      `${BASE_URL}/organizations/members/${adminUser.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          role: "member",
        }),
      },
    );

    const data = await response.json();

    assert.equal(response.status, 400);
    assert.equal(data.success, false);

    assert.equal(
      data.message,
      "Organization must have at least one admin",
    );
  },
);


/*
|--------------------------------------------------------------------------
| UNKNOWN MEMBER
|--------------------------------------------------------------------------
*/

test(
  "PATCH /organizations/members/:userId - should return 404 for non-member",
  async () => {
    const temporaryUser = await registerUser(
      "Non Member",
      `nonmember_${Date.now()}@example.com`,
    );

    const response = await fetch(
      `${BASE_URL}/organizations/members/${temporaryUser.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          role: "org_admin",
        }),
      },
    );

    const data = await response.json();

    assert.equal(response.status, 404);
    assert.equal(data.success, false);

    assert.equal(
      data.message,
      "Member not found",
    );
  },
);


test(
  "DELETE /organizations/members/:userId - should return 404 for non-member",
  async () => {
    const temporaryUser = await registerUser(
      "Another Non Member",
      `nonmember2_${Date.now()}@example.com`,
    );

    const response = await fetch(
      `${BASE_URL}/organizations/members/${temporaryUser.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    const data = await response.json();

    assert.equal(response.status, 404);
    assert.equal(data.success, false);

    assert.equal(
      data.message,
      "Member not found",
    );
  },
);


/*
|--------------------------------------------------------------------------
| UNAUTHENTICATED
|--------------------------------------------------------------------------
*/

test(
  "GET /organizations/members - should reject unauthenticated request",
  async () => {
    const response = await fetch(
      `${BASE_URL}/organizations/members`,
      {
        method: "GET",
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