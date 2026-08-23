# TaskFlow — Database Architecture

## Database

TaskFlow uses PostgreSQL with Prisma ORM.

## Main Domain Entities

```mermaid
erDiagram
    USER ||--o{ ORG_MEMBER : belongs_to
    ORGANIZATION ||--o{ ORG_MEMBER : contains
    ORGANIZATION ||--o{ PROJECT : owns
    ORGANIZATION ||--o{ TASK : owns
    PROJECT ||--o{ TASK : contains
    TASK ||--o{ TASK_ASSIGNMENT : has
    USER ||--o{ TASK_ASSIGNMENT : assigned_to

    USER {
        uuid id
        string name
    }

    ORGANIZATION {
        uuid id
        string name
    }

    ORG_MEMBER {
        uuid id
        uuid user_id
        uuid org_id
        string role
    }

    PROJECT {
        uuid id
        uuid org_id
        string name
        string description
    }

    TASK {
        uuid id
        uuid project_id
        uuid org_id
        string title
        string status
        string priority
    }

    TASK_ASSIGNMENT {
        uuid id
        uuid task_id
        uuid user_id
    }
```

## Organization Membership

Users belong to organizations through the organization member relationship.

The membership contains the user's organization-specific role.

Supported roles:

```text
org_admin
member
```

## Projects

Projects belong to an organization.

A project cannot be accessed through another organization's context.

## Tasks

Tasks belong to an organization and can also belong to a project.

Tasks support status and priority filtering.

## Task Assignments

A task can be assigned to organization users.

The API validates that the assigned user belongs to the same organization as the task.

## Tenant Boundary

The organization ID is the primary tenant boundary.

Services verify organization ownership before returning or modifying protected resources.
