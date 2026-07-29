import { Router } from "express";
import { listStations } from "#controllers/station.controller.js";
import { authenticate } from "#middlewares/auth.middleware.js";

const router = Router();
router.get("/", authenticate, listStations);

export default router;
