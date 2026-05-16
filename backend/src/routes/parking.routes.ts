import { Router } from "express";

import {
  getParkingDetails,
  listParkings,
  searchParkingLocations,
} from "../controllers/parking.controller";

const router = Router();

router.get("/", listParkings);
router.get("/search", searchParkingLocations);
router.get("/:id", getParkingDetails);

export default router;
