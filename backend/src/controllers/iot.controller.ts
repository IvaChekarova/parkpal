import { Request, Response } from "express";

import {
  demoRandomOccupancyUpdate,
  IotError,
  simulateOccupancy,
} from "../services/iot.service";

const handleIotError = (error: unknown, res: Response) => {
  if (error instanceof IotError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  console.error(error);
  return res.status(500).json({ message: "Internal server error" });
};

export const simulateOccupancyHandler = async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Authentication token is required" });
    }

    const parking = await simulateOccupancy(req.body);
    return res.status(200).json({ parking });
  } catch (error) {
    return handleIotError(error, res);
  }
};

export const demoRandomUpdateHandler = async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Authentication token is required" });
    }

    const parkingLocationId =
      typeof req.body?.parkingLocationId === "string"
        ? req.body.parkingLocationId
        : undefined;
    const parking = await demoRandomOccupancyUpdate(parkingLocationId);
    return res.status(200).json({ parking });
  } catch (error) {
    return handleIotError(error, res);
  }
};
