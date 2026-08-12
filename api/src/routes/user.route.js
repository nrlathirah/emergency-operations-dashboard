import { Router } from "express";
import {
  listUsers,
  exportUsersExcel,
  createUserController,
  updateUserStatusController,
  changePasswordController,
  resetPasswordController,
  listAuditLogController,
} from "#controllers/user.controller.js";
import { authenticate, requireSuperAdmin } from "#middlewares/auth.middleware.js";

const router = Router();
router.get("/", authenticate, requireSuperAdmin, listUsers);
router.get("/export", authenticate, requireSuperAdmin, exportUsersExcel);
router.get("/audit-log", authenticate, requireSuperAdmin, listAuditLogController);
router.post("/", authenticate, requireSuperAdmin, createUserController);
router.patch("/:id/status", authenticate, requireSuperAdmin, updateUserStatusController);
router.patch("/me/password", authenticate, changePasswordController);
router.patch("/:id/reset-password", authenticate, requireSuperAdmin, resetPasswordController);

export default router;
