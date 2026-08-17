import { Router } from "express";
import {
  listUsers,
  exportUsersExcel,
  createUserController,
  updateUserNameController,
  updateUserStatusController,
  changePasswordController,
  changeNameController,
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
// Static "/me/..." routes must come before the "/:id/..." ones below —
// otherwise Express matches "me" as the :id param first (see /:id/name)
// and a self-service request incorrectly hits the super-admin gate.
router.patch("/me/password", authenticate, changePasswordController);
router.patch("/me/name", authenticate, changeNameController);
router.patch("/:id/name", authenticate, requireSuperAdmin, updateUserNameController);
router.patch("/:id/status", authenticate, requireSuperAdmin, updateUserStatusController);
router.patch("/:id/reset-password", authenticate, requireSuperAdmin, resetPasswordController);

export default router;
