import { Router } from "express";
import {
  listUsers,
  exportUsersExcel,
  createUserController,
  updateUserStatusController,
  changePasswordController,
  resetPasswordController,
  listAuditLogController,
  listResetRequestsController,
  dismissResetRequestController,
} from "#controllers/user.controller.js";
import { authenticate, requireSuperAdmin } from "#middlewares/auth.middleware.js";

const router = Router();
router.get("/", authenticate, requireSuperAdmin, listUsers);
router.get("/export", authenticate, requireSuperAdmin, exportUsersExcel);
router.get("/audit-log", authenticate, requireSuperAdmin, listAuditLogController);
router.get("/reset-requests", authenticate, requireSuperAdmin, listResetRequestsController);
router.post("/reset-requests/:id/dismiss", authenticate, requireSuperAdmin, dismissResetRequestController);
router.post("/", authenticate, requireSuperAdmin, createUserController);
router.patch("/:id/status", authenticate, requireSuperAdmin, updateUserStatusController);
router.patch("/me/password", authenticate, changePasswordController);
router.patch("/:id/reset-password", authenticate, requireSuperAdmin, resetPasswordController);

export default router;
