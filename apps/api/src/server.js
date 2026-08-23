import express from 'express';
import './config/env.js';
import prisma from './lib/prisma.js';

import healthRoutes from './routes/health.routes.js'
import routes from './routes/index.js'

import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";


const app = express();
app.use(express.json());

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

const PORT = process.env.PORT;

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

  app.listen(PORT, () => {
    console.log("App is running on", PORT);
  });
}