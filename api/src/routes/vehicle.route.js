import { Router } from "express";
import { listVehicles } from "#controllers/vehicle.controller.js";
import { authenticate } from "#middlewares/auth.middleware.js";

const router = Router();
router.get("/", authenticate, listVehicles);

export default router;
