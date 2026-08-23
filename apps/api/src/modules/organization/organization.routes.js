import { Router } from "express";

import { authMiddleware } from "../../middleware/auth.js";

import {
  createOrganization,
  getOrganizationMembers,
  addOrganizationMember,
  updateOrganizationMember,
  removeOrganizationMember,
} from "./organization.controller.js";

const router = Router();

// Organization
router.post("/", authMiddleware, createOrganization);

// Members
router.get("/members", authMiddleware, getOrganizationMembers);

router.post("/members", authMiddleware, addOrganizationMember);

router.patch(
  "/members/:userId",
  authMiddleware,
  updateOrganizationMember,
);

router.delete(
  "/members/:userId",
  authMiddleware,
  removeOrganizationMember,
);

export default router;