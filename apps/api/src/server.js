import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { createServer } from 'node:http';
import './config/env.js';
import prisma from './lib/prisma.js';

import healthRoutes from './routes/health.routes.js'
import routes from './routes/index.js'

import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";
import { attachRealtime } from "./lib/realtime.js";
import { verifyToken } from "./lib/jwt.js";


const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));

// Swagger documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec),
);

// Raw OpenAPI specification
app.get("/api-docs.json", (req, res) => {
  res.json(swaggerSpec);
});

app.use('/health', healthRoutes);
app.use('/', routes);
app.get('/',(req, res)=>{
    res.json({success : true})
})

const PORT = process.env.PORT || 3000;
const httpServer = createServer(app);

attachRealtime(httpServer, async (token) => {
  const payload = verifyToken(token);
  const user = await prisma.user.findUnique({ where: { id: payload.id }, select: { id: true, role: true } });
  if (!user) throw new Error("User not found");
  return { id: user.id, userRole: user.role };
}, async (user, projectId) => {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { created_by: true, tasks: { select: { taskAssignments: { select: { user_id: true } } } } } });
  if (!project) return false;
  if (user.userRole === "ADMIN") return true;
  if (user.userRole === "PROJECT_MANAGER") return project.created_by === user.id;
  return project.tasks.some((task) => task.taskAssignments.some((assignment) => assignment.user_id === user.id));
});

async function connectDB() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    console.log("Database connected");

  } catch (error) {
    console.error("Database connection failed:", error);
    throw error
  }
}

if (process.env.NODE_ENV !== "test") {
  await connectDB();

  httpServer.listen(PORT, () => {
    console.log("App is running on", PORT);
  });
}