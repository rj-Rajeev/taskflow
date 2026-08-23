import { Router } from "express";
import { login, refresh, register, logout } from "./auth.controller.js";

const router = Router();

router.post("/register", register);
router.get("/login", login);
router.get("/refresh", refresh);
router.get("/logout", logout);

export default router;