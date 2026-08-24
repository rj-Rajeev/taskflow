# TaskFlow API

TaskFlow is a multi-tenant project management backend built with Node.js and Express.

---

## How to Run

### 1. Clone the Repository

```bash
git clone https://github.com/rj-Rajeev/taskflow.git

cd taskflow
````

### 2. Create `.env.docker`

Create a `.env.docker` file in the project root.

Add the required environment variables used by the Docker environment.

```
PORT=3000

# POSTGRES
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=taskflow

# REDIS
REDIS_HOST=redis
REDIS_PORT=6379

# JWT
JWT_SECRET=your_jwt_secret

# DATABASE
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/taskflow?schema=public

```

### 3. Start the Project

Run:

```bash
docker compose up --build
```

Docker Compose starts the required application services:

* API
* Worker
* PostgreSQL
* Redis

### 4. Seed the Database

After the database and application services are running, execute the Prisma seed script:

```bash
npx prisma db seed
```

The seed script creates the required sample data for development and API testing.

The seed data includes:

* Organizations
* Users
* Projects
* Tasks
* Different task statuses
* Different task priorities
* Task assignments

---

## Application URLs

API:

```text
http://localhost:3000
```

Swagger UI:

```text
http://localhost:3000/api-docs
```

Health Check:

```text
http://localhost:3000/health
```

---

## Stop the Project

```bash
docker compose down
```

To remove containers, networks, and associated volumes:

```bash
docker compose down -v
```

Use the volume removal command only when a fresh database is required.

---

# Testing

Run the complete automated test suite:

```bash
npm test
```

Current test result:

```text
69 tests
69 passed
0 failed
```

The test suite covers:

* User registration
* User login
* Invalid credentials
* Access token refresh
* Logout
* Refresh token revocation
* Organization context
* Organization member management
* Organization RBAC
* Project CRUD
* Project tenant isolation
* Task CRUD
* Task tenant isolation
* Task assignment
* Duplicate assignment prevention
* Task unassignment
* Task filtering
* Task pagination
* Validation
* Authentication protection
* Cross-organization access protection

---

# Features

## Authentication

* User registration
* User login
* Password hashing
* JWT access tokens
* Refresh tokens
* Refresh token revocation
* Logout
* Authentication middleware
* Organization context in authentication

## Organizations

* Organization creation
* Creator automatically becomes organization admin
* Organization-level membership
* Organization member listing
* Add existing users to an organization
* Promote members to organization admin
* Remove organization members
* Prevent removing the last organization admin
* Prevent demoting the last organization admin

## Role-Based Access Control

Supported roles:

* `org_admin`
* `member`

Organization admins can:

* Manage organization members
* Promote members
* Remove members
* Delete projects

Members can:

* View organization members
* Create and manage projects/tasks according to the API permissions
* Work with tasks within their organization

## Projects

* Create project
* List organization projects
* Get project
* Update project
* Delete project
* Organization-level access protection
* Admin-only project deletion
* Project dashboard

## Tasks

* Create task
* List tasks
* Get task
* Update task
* Delete task
* Task status
* Task priority
* Due date
* Project association
* Task filtering
* Pagination
* Task assignment
* Task unassignment
* Duplicate assignment prevention

## Multi-Tenant Security

The application enforces organization-level data isolation.

Resources such as projects and tasks are scoped to the authenticated user's organization.

The API does not rely on a client-provided organization ID for authorization.

Cross-organization access attempts are rejected.

---

# Background Jobs

TaskFlow uses:

* Redis
* BullMQ
* Worker service

Task assignment can trigger an asynchronous notification job.

The API and worker are separated so background processing does not block the API request.

The worker processes queued jobs asynchronously.

---

# API Documentation

Swagger/OpenAPI documentation is available at:

```text
http://localhost:3000/api-docs
```

Swagger UI can be used to explore and test the API endpoints.

---

# Main API Endpoints

## Authentication

```text
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
```

## Organizations

```text
POST /organizations
```

## Organization Members

```text
GET    /organizations/members
POST   /organizations/members
PATCH  /organizations/members/:userId
DELETE /organizations/members/:userId
```

## Projects

```text
POST   /projects
GET    /projects
GET    /projects/:id
PATCH  /projects/:id
DELETE /projects/:id
```

## Project Dashboard

```text
GET /projects/:id/dashboard
```

## Tasks

```text
POST   /tasks
GET    /tasks
GET    /tasks/:id
PATCH  /tasks/:id
DELETE /tasks/:id
```

## Task Assignment

```text
POST   /tasks/:id/assign
DELETE /tasks/:id/assign
```

## Jobs

```text
GET /jobs/:id
```

---

# Task Filters

The task listing endpoint supports filtering by:

```text
status
priority
assignee
due_from
due_to
```

Example:

```text
GET /tasks?status=in_progress
```

Pagination uses offset-based pagination.

Example:

```text
GET /tasks?page=1&limit=20
```

The response contains:

```json
{
  "data": [],
  "total": 0,
  "page": 1,
  "limit": 20
}
```

---

# Database

TaskFlow uses:

* PostgreSQL
* Prisma ORM

Main entities include:

```text
users
organizations
org_members
projects
tasks
task_assignments
```

The database uses relationships between organizations, projects, tasks, users, and task assignments.

Prisma migrations are used for database schema management.

The database can be seeded using:

```bash
npx prisma db seed
```

---

# Architecture

The application follows a layered backend architecture:

```text
Client
  |
  v
Express Routes
  |
  v
Authentication / Authorization Middleware
  |
  v
Controllers
  |
  v
Services
  |
  v
Prisma ORM
  |
  v
PostgreSQL
```

Background processing:

```text
API
 |
 v
Task Assignment
 |
 v
BullMQ
 |
 v
Redis
 |
 v
Worker
 |
 v
Background Notification Processing
```

The architecture separates HTTP handling, business logic, database access, and background processing.

---

# Multi-Tenant Request Flow

A protected request follows this flow:

```text
Client
  |
  v
JWT
  |
  v
Authentication Middleware
  |
  +--> userId
  +--> orgId
  +--> role
  |
  v
Controller
  |
  v
Service Layer
  |
  v
Organization-scoped Database Query
  |
  v
PostgreSQL
```

For organization-owned resources, the service layer verifies that the requested resource belongs to the authenticated organization.

This prevents users from accessing resources belonging to another organization.

---

# Technology Stack

* Node.js
* Express.js
* PostgreSQL
* Prisma
* Redis
* BullMQ
* JWT
* bcrypt
* Swagger/OpenAPI
* Docker
* Docker Compose
* Node.js Test Runner

---

# Docker Services

The Docker Compose environment contains:

```text
API
Worker
PostgreSQL
Redis
```

The API handles HTTP requests.

The Worker processes asynchronous background jobs.

PostgreSQL stores application data.

Redis is used by BullMQ for queue and job management.

---

# Project Structure

The backend is organized into separate modules for:

```text
Authentication
Organizations
Organization Members
Projects
Tasks
Jobs
```

The main backend flow follows:

```text
Route
  ->
Controller
  ->
Service
  ->
Prisma
  ->
PostgreSQL
```

Background jobs follow:

```text
Service
  ->
BullMQ
  ->
Redis
  ->
Worker
```

---

# Security

The application implements:

* JWT authentication
* Password hashing
* Refresh token revocation
* Organization-level authorization
* Role-based access control
* Tenant isolation
* Cross-organization access protection
* Server-side organization context
* Protected API routes

Client-provided organization IDs are not trusted for authorization.

---

# Assignment Requirements Covered

The implementation addresses the major requirements from the TaskFlow backend assignment:

* Node.js backend
* Express API
* PostgreSQL
* Prisma ORM
* Redis
* BullMQ
* Docker Compose
* API service
* Worker service
* Authentication
* JWT access tokens
* Refresh tokens
* Logout
* Organization management
* Organization-level RBAC
* Multi-tenant isolation
* Project CRUD
* Task CRUD
* Task assignment
* Task unassignment
* Task filtering
* Offset pagination
* Project dashboard
* Background job processing
* Swagger/OpenAPI documentation
* Automated integration tests
* Database seed script
* Docker-based setup
* README documentation
* Architecture documentation

---

# Current Test Status

```text
69 tests
69 passed
0 failed
```
