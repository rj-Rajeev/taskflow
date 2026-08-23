# TaskFlow — Security Architecture

## Authentication

TaskFlow uses JWT-based authentication.

The authentication flow contains:

```text
Register/Login
     ↓
Access Token + Refresh Token
     ↓
Protected Request
     ↓
JWT Verification
     ↓
Authenticated User Context
```

## Access Token

The access token is used for authenticated API requests.

It contains user and organization context.

Example:

```json
{
  "id": "user-id",
  "name": "User Name",
  "orgId": "organization-id",
  "role": "member"
}
```

## Refresh Token

Refresh tokens are validated against the stored refresh token and expiration information.

Logout invalidates the stored refresh token so it cannot be reused.

## Role-Based Access Control

Organization roles include:

```text
org_admin
member
```

Administrative operations check the user's organization role.

For example, only an organization administrator can delete projects.

## Multi-Tenant Isolation

Every protected organization resource is checked against the authenticated organization.

Examples:

- Cross-organization task access is rejected.
- Cross-organization project access is rejected.
- Users from another organization cannot be assigned to a task.
- Organization member operations are restricted to the current organization.

## Input Validation

Controllers validate required fields and invalid parameters before calling business services.

Examples include:

- Missing task fields
- Invalid pagination
- Invalid task status
- Invalid task priority
- Missing assignment user ID
- Invalid organization name

## Last Administrator Protection

Organization member management protects the organization from being left without an administrator.

The API prevents:

- Removing the last administrator
- Demoting the last administrator
