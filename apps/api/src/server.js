import express from 'express';
import './config/env.js';
import prisma from './lib/prisma.js';

import healthRoutes from './routes/health.routes.js'
import routes from './routes/index.js'


const app = express();
app.use(express.json());

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
    process.exit(1);
  }
}

await connectDB();

app.listen(PORT || 3001, ()=>{
    console.log("App is running on ", PORT);
    
})