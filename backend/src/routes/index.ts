import { Router } from "express";

import authRoutes from "./auth.routes";
import healthRoutes from "./healthRoutes";
import iotRoutes from "./iot.routes";
import parkingRoutes from "./parking.routes";
import reservationRoutes from "./reservation.routes";
import userRoutes from "./user.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/health", healthRoutes);
router.use("/iot", iotRoutes);
router.use("/parkings", parkingRoutes);
router.use("/reservations", reservationRoutes);
router.use("/users", userRoutes);

export default router;
