# TaskFlow API

## How to Run

### 1. Clone the Repository

```bash
git clone https://github.com/rj-Rajeev/taskflow.git
cd taskflow
````

### 2. Create `.env`

Create a `.env.docker` file in the project root and add the required environment variables.

### 3. Start the Project

Run:

```bash
docker compose up --build
```

The API will be available at:

```text
http://localhost:3000
```

Swagger documentation:

```text
http://localhost:3000/api-docs
```

Health check:

```text
http://localhost:3000/health
```

---

## Stop the Project

```bash
docker compose down
```

---

## Run Tests

Run all tests:

```bash
npm test
```

Current test result:

```text
69 tests
69 passed
0 failed
```

---

## Features

* User registration and login
* JWT authentication
* Refresh token and logout
* Multi-tenant organizations
* Organization creation
* Organization member management
* Role-based access control
* Project management
* Task management
* Task assignment and unassignment
* Task filtering
* Task pagination
* Cross-organization access protection
* Redis
* BullMQ background jobs
* Swagger/OpenAPI documentation
* Automated API tests

---

## Main API Endpoints

### Authentication

```text
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
```

### Organizations

```text
POST /organizations
```

### Organization Members

```text
GET    /organizations/members
POST   /organizations/members
PATCH  /organizations/members/:userId
DELETE /organizations/members/:userId
```

### Projects

```text
POST   /projects
GET    /projects
GET    /projects/:id
PATCH  /projects/:id
DELETE /projects/:id
```

### Tasks

```text
POST   /tasks
GET    /tasks
GET    /tasks/:id
PATCH  /tasks/:id
DELETE /tasks/:id
```

### Task Assignment

```text
POST   /tasks/:id/assign
DELETE /tasks/:id/assign
```

---

## Technology Stack

* Node.js
* Express.js
* PostgreSQL
* Prisma
* Redis
* BullMQ
* JWT
* Swagger/OpenAPI
* Docker
* Node.js Test Runner