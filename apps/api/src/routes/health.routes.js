import { Router } from "express";
import prisma from "../lib/prisma.js";

const router = Router();

router.get('/',async (req, res)=>{
    await prisma.$queryRaw`SELECT 1`
    res.json({success: true, route: "health", database: "healthy"});
})

export default router;