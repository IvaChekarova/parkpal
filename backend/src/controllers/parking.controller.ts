import { Request, Response } from "express";

import {
  getParkingById,
  getParkings,
  ParkingError,
  searchParkings,
} from "../services/parking.service";

const handleParkingError = (error: unknown, res: Response) => {
  if (error instanceof ParkingError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  console.error(error);
  return res.status(500).json({ message: "Internal server error" });
};

const getQueryValue = (value: unknown) => {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
};

export const listParkings = async (_req: Request, res: Response) => {
  try {
    const parkings = await getParkings();
    return res.status(200).json({ parkings });
  } catch (error) {
    return handleParkingError(error, res);
  }
};

export const searchParkingLocations = async (req: Request, res: Response) => {
  try {
    const parkings = await searchParkings({
      location: getQueryValue(req.query.location),
      parkingType: getQueryValue(req.query.parkingType),
      availableOnly: getQueryValue(req.query.availableOnly),
    });

    return res.status(200).json({ parkings });
  } catch (error) {
    return handleParkingError(error, res);
  }
};

export const getParkingDetails = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({ message: "Parking id is required" });
    }

    const parking = await getParkingById(id);
    return res.status(200).json({ parking });
  } catch (error) {
    return handleParkingError(error, res);
  }
};
