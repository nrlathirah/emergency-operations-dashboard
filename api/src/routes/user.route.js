import { Router } from "express";
import { listUsers } from "#controllers/user.controller.js";
import { authenticate } from "#middlewares/auth.middleware.js";

const router = Router();
router.get("/", authenticate, listUsers);

export default router;
