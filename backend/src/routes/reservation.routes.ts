import { Router } from "express";

import {
  cancelReservationHandler,
  createReservationHandler,
  getMyReservationsHandler,
  getReservationDetailsHandler,
} from "../controllers/reservation.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.post("/", requireAuth, createReservationHandler);
router.get("/me", requireAuth, getMyReservationsHandler);
router.patch("/:id/cancel", requireAuth, cancelReservationHandler);
router.get("/:id", requireAuth, getReservationDetailsHandler);

export default router;
