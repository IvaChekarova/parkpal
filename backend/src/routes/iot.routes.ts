import { Router } from "express";

import {
  demoRandomUpdateHandler,
  simulateOccupancyHandler,
} from "../controllers/iot.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.post("/simulate-occupancy", requireAuth, simulateOccupancyHandler);
router.post("/demo-random-update", requireAuth, demoRandomUpdateHandler);

export default router;
