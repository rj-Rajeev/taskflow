import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.3",

    info: {
      title: "TaskFlow API",
      version: "1.0.0",
      description:
        "Backend API for TaskFlow project management system",
    },

    servers: [
      {
        url: "http://localhost:3000",
        description: "Local development server",
      },
    ],

    tags: [
      {
        name: "Authentication",
        description: "Authentication and session management",
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
        name: "Jobs",
        description: "Background job status",
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },

      schemas: {
        Error: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            message: {
              type: "string",
              example: "Something went wrong",
            },
            code: {
              type: "string",
              example: "TASK_NOT_FOUND",
            },
          },
        },

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
            email: {
              type: "string",
              format: "email",
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
            due_date: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            status: {
              type: "string",
              enum: [
                "todo",
                "in_progress",
                "review",
                "done",
              ],
            },
            priority: {
              type: "string",
              enum: [
                "low",
                "medium",
                "high",
                "urgent",
              ],
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

        Pagination: {
          type: "object",
          properties: {
            total: {
              type: "integer",
              example: 25,
            },
            page: {
              type: "integer",
              example: 1,
            },
            limit: {
              type: "integer",
              example: 20,
            },
          },
        },
      },
    },
  },

    apis: [
    "./apps/api/src/**/*.routes.js",
    "./apps/api/src/**/*.router.js",
    ],

  failOnErrors: true,
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;