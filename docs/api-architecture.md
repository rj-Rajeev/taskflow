# TaskFlow — API Architecture

## Layered Architecture

TaskFlow follows a simple layered API architecture:

```text
Route
  ↓
Middleware
  ↓
Controller
  ↓
Service
  ↓
Prisma
  ↓
PostgreSQL
```

## Routes

Routes define HTTP methods, URL paths, and middleware.

Examples:

```text
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout

POST   /organizations
GET    /organizations/members
POST   /organizations/members
PATCH  /organizations/members/:userId
DELETE /organizations/members/:userId

POST   /projects
GET    /projects
GET    /projects/:id
PATCH  /projects/:id
DELETE /projects/:id

POST   /tasks
GET    /tasks
GET    /tasks/:id
PATCH  /tasks/:id
DELETE /tasks/:id

POST   /tasks/:id/assign
DELETE /tasks/:id/assign
```

## Controllers

Controllers are responsible for HTTP-level concerns.

Typical responsibilities:

- Read request body and query parameters
- Validate required fields
- Check organization context
- Call the appropriate service
- Return the correct HTTP status
- Convert known service errors into API responses

## Services

Services contain business rules and database operations.

Examples include:

- Creating organizations
- Managing organization members
- Creating projects
- Updating projects
- Creating tasks
- Assigning tasks
- Filtering tasks
- Enforcing tenant boundaries

## Authentication

Protected routes use the authentication middleware.

The access token contains user and organization context such as:

```json
{
  "id": "user-id",
  "name": "User Name",
  "orgId": "organization-id",
  "role": "member"
}
```

The middleware makes this context available to controllers.

## Error Handling

Services use error codes for known business errors.

Controllers translate those errors into appropriate HTTP responses such as:

```text
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
500 Internal Server Error
```
