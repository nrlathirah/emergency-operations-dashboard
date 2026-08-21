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
  listResetRequestHistoryController,
} from "#controllers/user.controller.js";
import { authenticate, requireSuperAdmin } from "#middlewares/auth.middleware.js";
import { validateBody } from "#middlewares/validate.middleware.js";
import {
  createUserSchema,
  changeOwnPasswordSchema,
  changeNameSchema,
  updateStatusSchema,
  resetPasswordSchema,
} from "#schemas/user.schema.js";

const router = Router();
router.get("/", authenticate, requireSuperAdmin, listUsers);
router.get("/export", authenticate, requireSuperAdmin, exportUsersExcel);
router.get("/audit-log", authenticate, requireSuperAdmin, listAuditLogController);
router.get("/reset-requests", authenticate, requireSuperAdmin, listResetRequestsController);
router.get("/reset-requests/history", authenticate, requireSuperAdmin, listResetRequestHistoryController);
router.post("/reset-requests/:id/dismiss", authenticate, requireSuperAdmin, dismissResetRequestController);
router.post("/", authenticate, requireSuperAdmin, validateBody(createUserSchema), createUserController);
// Static "/me/..." routes must come before the "/:id/..." ones below —
// otherwise Express matches "me" as the :id param first (see /:id/name)
// and a self-service request incorrectly hits the super-admin gate.
router.patch("/me/password", authenticate, validateBody(changeOwnPasswordSchema), changePasswordController);
router.patch("/me/name", authenticate, validateBody(changeNameSchema), changeNameController);
router.patch("/:id/name", authenticate, requireSuperAdmin, validateBody(changeNameSchema), updateUserNameController);
router.patch("/:id/status", authenticate, requireSuperAdmin, validateBody(updateStatusSchema), updateUserStatusController);
router.patch("/:id/reset-password", authenticate, requireSuperAdmin, validateBody(resetPasswordSchema), resetPasswordController);

export default router;
