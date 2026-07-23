import { Router } from "express";
import { listVehicles } from "#controllers/vehicle.controller.js";

const router = Router();
router.get("/", listVehicles);

export default router;
