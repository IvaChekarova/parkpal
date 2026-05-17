import { Router } from "express";

import authRoutes from "./auth.routes";
import healthRoutes from "./healthRoutes";
import parkingRoutes from "./parking.routes";
import reservationRoutes from "./reservation.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/health", healthRoutes);
router.use("/parkings", parkingRoutes);
router.use("/reservations", reservationRoutes);

export default router;
