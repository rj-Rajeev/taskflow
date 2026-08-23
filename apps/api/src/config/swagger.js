import swaggerJsdoc from "swagger-jsdoc";

const swaggerDefinition = {
  openapi: "3.0.3",

  info: {
    title: "TaskFlow API",
    version: "1.0.0",
    description:
      "Multi-tenant task management REST API with authentication, organizations, members, projects, tasks, assignments, Redis and BullMQ.",
  },

  servers: [
    {
      url: "http://localhost:3000",
      description: "Local Docker environment",
    },
  ],

  tags: [
    {
      name: "Health",
      description: "Application health",
    },
    {
      name: "Authentication",
      description: "User authentication and session management",
    },
    {
      name: "Organizations",
      description: "Organization management",
    },
    {
      name: "Organization Members",
      description: "Organization member management",
    },
    {
      name: "Projects",
      description: "Project management",
    },
    {
      name: "Tasks",
      description: "Task management",
    },
    {
      name: "Task Assignments",
      description: "Task assignment management",
    },
  ],

  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT access token",
      },
    },

    schemas: {
      User: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
          },
          name: {
            type: "string",
          },
        },
      },

      Organization: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
          },
          name: {
            type: "string",
          },
          created_at: {
            type: "string",
            format: "date-time",
          },
        },
      },

      OrganizationMember: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
          },
          user_id: {
            type: "string",
            format: "uuid",
          },
          org_id: {
            type: "string",
            format: "uuid",
          },
          role: {
            type: "string",
            enum: ["org_admin", "member"],
          },
          user: {
            $ref: "#/components/schemas/User",
          },
        },
      },

      Project: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
          },
          name: {
            type: "string",
          },
          description: {
            type: "string",
          },
          org_id: {
            type: "string",
            format: "uuid",
          },
          created_at: {
            type: "string",
            format: "date-time",
          },
          updated_at: {
            type: "string",
            format: "date-time",
          },
        },
      },

      Task: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
          },
          title: {
            type: "string",
          },
          description: {
            type: "string",
          },
          project_id: {
            type: "string",
            format: "uuid",
          },
          org_id: {
            type: "string",
            format: "uuid",
          },
          due_date: {
            type: "string",
            format: "date-time",
            nullable: true,
          },
          status: {
            type: "string",
            enum: ["todo", "in_progress", "review", "done"],
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "urgent"],
          },
          created_at: {
            type: "string",
            format: "date-time",
          },
          updated_at: {
            type: "string",
            format: "date-time",
          },
        },
      },

      TaskAssignment: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
          },
          task_id: {
            type: "string",
            format: "uuid",
          },
          user_id: {
            type: "string",
            format: "uuid",
          },
        },
      },

      Error: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: false,
          },
          message: {
            type: "string",
          },
        },
      },

      AuthResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: true,
          },
          data: {
            type: "object",
            properties: {
              accessToken: {
                type: "string",
              },
            },
          },
        },
      },
    },

    responses: {
      Unauthorized: {
        description: "Authentication required or token is invalid",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/Error",
            },
          },
        },
      },

      Forbidden: {
        description: "User does not have permission",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/Error",
            },
          },
        },
      },

      NotFound: {
        description: "Resource not found",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/Error",
            },
          },
        },
      },

      BadRequest: {
        description: "Invalid request",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/Error",
            },
          },
        },
      },

      Conflict: {
        description: "Resource conflict",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/Error",
            },
          },
        },
      },
    },
  },

  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Check API health",
        responses: {
          200: {
            description: "API is healthy",
          },
        },
      },
    },

    "/auth/register": {
      post: {
        tags: ["Authentication"],
        summary: "Register a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: {
                    type: "string",
                    example: "Rajeev Bhardwaj",
                  },
                  email: {
                    type: "string",
                    format: "email",
                    example: "rajeev@example.com",
                  },
                  password: {
                    type: "string",
                    format: "password",
                    example: "Password123!",
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "User registered successfully",
          },
          400: {
            $ref: "#/components/responses/BadRequest",
          },
        },
      },
    },

    "/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Login user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: {
                    type: "string",
                    format: "email",
                    example: "rajeev@example.com",
                  },
                  password: {
                    type: "string",
                    format: "password",
                    example: "Password123!",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Login successful",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AuthResponse",
                },
              },
            },
          },
          401: {
            $ref: "#/components/responses/Unauthorized",
          },
        },
      },
    },

    "/auth/refresh": {
      post: {
        tags: ["Authentication"],
        summary: "Refresh access token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["refreshToken"],
                properties: {
                  refreshToken: {
                    type: "string",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "New access token generated",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AuthResponse",
                },
              },
            },
          },
          401: {
            $ref: "#/components/responses/Unauthorized",
          },
        },
      },
    },

    "/auth/logout": {
      post: {
        tags: ["Authentication"],
        summary: "Logout user",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Logout successful",
          },
          401: {
            $ref: "#/components/responses/Unauthorized",
          },
        },
      },
    },

    "/organizations": {
      post: {
        tags: ["Organizations"],
        summary: "Create organization",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: {
                    type: "string",
                    example: "TaskFlow Organization",
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Organization created successfully",
          },
          400: {
            $ref: "#/components/responses/BadRequest",
          },
          401: {
            $ref: "#/components/responses/Unauthorized",
          },
        },
      },
    },

    "/organizations/members": {
      get: {
        tags: ["Organization Members"],
        summary: "List organization members",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Organization members",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                    },
                    data: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/OrganizationMember",
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            $ref: "#/components/responses/Unauthorized",
          },
        },
      },

      post: {
        tags: ["Organization Members"],
        summary: "Add user to organization",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userId"],
                properties: {
                  userId: {
                    type: "string",
                    format: "uuid",
                  },
                  role: {
                    type: "string",
                    enum: ["member", "org_admin"],
                    default: "member",
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Member added",
          },
          400: {
            $ref: "#/components/responses/BadRequest",
          },
          403: {
            $ref: "#/components/responses/Forbidden",
          },
          404: {
            $ref: "#/components/responses/NotFound",
          },
          409: {
            $ref: "#/components/responses/Conflict",
          },
        },
      },
    },

    "/organizations/members/{userId}": {
      patch: {
        tags: ["Organization Members"],
        summary: "Update organization member role",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "userId",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["role"],
                properties: {
                  role: {
                    type: "string",
                    enum: ["member", "org_admin"],
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Member role updated",
          },
          400: {
            $ref: "#/components/responses/BadRequest",
          },
          403: {
            $ref: "#/components/responses/Forbidden",
          },
          404: {
            $ref: "#/components/responses/NotFound",
          },
        },
      },

      delete: {
        tags: ["Organization Members"],
        summary: "Remove member from organization",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "userId",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Member removed",
          },
          400: {
            $ref: "#/components/responses/BadRequest",
          },
          403: {
            $ref: "#/components/responses/Forbidden",
          },
          404: {
            $ref: "#/components/responses/NotFound",
          },
        },
      },
    },

    "/projects": {
      get: {
        tags: ["Projects"],
        summary: "List organization projects",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Projects returned",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                    },
                    data: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/Project",
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            $ref: "#/components/responses/Unauthorized",
          },
        },
      },

      post: {
        tags: ["Projects"],
        summary: "Create project",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "description"],
                properties: {
                  name: {
                    type: "string",
                    example: "Website Redesign",
                  },
                  description: {
                    type: "string",
                    example: "Redesign the company website",
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Project created",
          },
          400: {
            $ref: "#/components/responses/BadRequest",
          },
          401: {
            $ref: "#/components/responses/Unauthorized",
          },
        },
      },
    },

    "/projects/{id}": {
      get: {
        tags: ["Projects"],
        summary: "Get project",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Project returned",
          },
          403: {
            $ref: "#/components/responses/Forbidden",
          },
          404: {
            $ref: "#/components/responses/NotFound",
          },
        },
      },

      patch: {
        tags: ["Projects"],
        summary: "Update project",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                  },
                  description: {
                    type: "string",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Project updated",
          },
          400: {
            $ref: "#/components/responses/BadRequest",
          },
          403: {
            $ref: "#/components/responses/Forbidden",
          },
          404: {
            $ref: "#/components/responses/NotFound",
          },
        },
      },

      delete: {
        tags: ["Projects"],
        summary: "Delete project",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Project deleted",
          },
          403: {
            $ref: "#/components/responses/Forbidden",
          },
          404: {
            $ref: "#/components/responses/NotFound",
          },
        },
      },
    },

    "/tasks": {
      get: {
        tags: ["Tasks"],
        summary: "List organization tasks",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "page",
            in: "query",
            schema: {
              type: "integer",
              minimum: 1,
              default: 1,
            },
          },
          {
            name: "limit",
            in: "query",
            schema: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 20,
            },
          },
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["todo", "in_progress", "review", "done"],
            },
          },
          {
            name: "priority",
            in: "query",
            schema: {
              type: "string",
              enum: ["low", "medium", "high", "urgent"],
            },
          },
          {
            name: "assignee",
            in: "query",
            schema: {
              type: "string",
              format: "uuid",
            },
          },
          {
            name: "due_from",
            in: "query",
            schema: {
              type: "string",
              format: "date",
            },
          },
          {
            name: "due_to",
            in: "query",
            schema: {
              type: "string",
              format: "date",
            },
          },
        ],
        responses: {
          200: {
            description: "Tasks returned",
          },
          400: {
            $ref: "#/components/responses/BadRequest",
          },
          401: {
            $ref: "#/components/responses/Unauthorized",
          },
        },
      },

      post: {
        tags: ["Tasks"],
        summary: "Create task",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: [
                  "title",
                  "description",
                  "project_id",
                  "status",
                  "priority",
                ],
                properties: {
                  title: {
                    type: "string",
                  },
                  description: {
                    type: "string",
                  },
                  project_id: {
                    type: "string",
                    format: "uuid",
                  },
                  due_date: {
                    type: "string",
                    format: "date-time",
                    nullable: true,
                  },
                  status: {
                    type: "string",
                    enum: ["todo", "in_progress", "review", "done"],
                  },
                  priority: {
                    type: "string",
                    enum: ["low", "medium", "high", "urgent"],
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Task created",
          },
          400: {
            $ref: "#/components/responses/BadRequest",
          },
          403: {
            $ref: "#/components/responses/Forbidden",
          },
          404: {
            $ref: "#/components/responses/NotFound",
          },
        },
      },
    },

    "/tasks/{id}": {
      get: {
        tags: ["Tasks"],
        summary: "Get task",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Task returned",
          },
          403: {
            $ref: "#/components/responses/Forbidden",
          },
          404: {
            $ref: "#/components/responses/NotFound",
          },
        },
      },

      patch: {
        tags: ["Tasks"],
        summary: "Update task",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                  },
                  description: {
                    type: "string",
                  },
                  due_date: {
                    type: "string",
                    format: "date-time",
                    nullable: true,
                  },
                  status: {
                    type: "string",
                    enum: ["todo", "in_progress", "review", "done"],
                  },
                  priority: {
                    type: "string",
                    enum: ["low", "medium", "high", "urgent"],
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Task updated",
          },
          400: {
            $ref: "#/components/responses/BadRequest",
          },
          403: {
            $ref: "#/components/responses/Forbidden",
          },
          404: {
            $ref: "#/components/responses/NotFound",
          },
        },
      },

      delete: {
        tags: ["Tasks"],
        summary: "Delete task",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Task deleted",
          },
          403: {
            $ref: "#/components/responses/Forbidden",
          },
          404: {
            $ref: "#/components/responses/NotFound",
          },
        },
      },
    },

    "/tasks/{id}/assign": {
      post: {
        tags: ["Task Assignments"],
        summary: "Assign user to task",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userId"],
                properties: {
                  userId: {
                    type: "string",
                    format: "uuid",
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "User assigned to task",
          },
          400: {
            $ref: "#/components/responses/BadRequest",
          },
          403: {
            $ref: "#/components/responses/Forbidden",
          },
          404: {
            $ref: "#/components/responses/NotFound",
          },
          409: {
            $ref: "#/components/responses/Conflict",
          },
          503: {
            description: "Unable to queue task notification",
          },
        },
      },

      delete: {
        tags: ["Task Assignments"],
        summary: "Unassign user from task",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userId"],
                properties: {
                  userId: {
                    type: "string",
                    format: "uuid",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "User unassigned from task",
          },
          400: {
            $ref: "#/components/responses/BadRequest",
          },
          403: {
            $ref: "#/components/responses/Forbidden",
          },
          404: {
            $ref: "#/components/responses/NotFound",
          },
        },
      },
    },
  },
};

const swaggerSpec = swaggerJsdoc({
  definition: swaggerDefinition,
  apis: [],
});

export default swaggerSpec;