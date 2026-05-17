import { Request, Response } from "express";

import {
  cancelReservation,
  createReservation,
  getMyReservations,
  getReservationById,
  ReservationError,
} from "../services/reservation.service";

const handleReservationError = (error: unknown, res: Response) => {
  if (error instanceof ReservationError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  console.error(error);
  return res.status(500).json({ message: "Internal server error" });
};

export const createReservationHandler = async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Authentication token is required" });
    }

    const reservation = await createReservation(req.userId, req.body);
    return res.status(201).json({ reservation });
  } catch (error) {
    return handleReservationError(error, res);
  }
};

export const getMyReservationsHandler = async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Authentication token is required" });
    }

    const reservations = await getMyReservations(req.userId);
    return res.status(200).json({ reservations });
  } catch (error) {
    return handleReservationError(error, res);
  }
};

export const getReservationDetailsHandler = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Authentication token is required" });
    }

    const id = req.params.id;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({ message: "Reservation id is required" });
    }

    const reservation = await getReservationById(req.userId, id);
    return res.status(200).json({ reservation });
  } catch (error) {
    return handleReservationError(error, res);
  }
};

export const cancelReservationHandler = async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Authentication token is required" });
    }

    const id = req.params.id;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({ message: "Reservation id is required" });
    }

    const reservation = await cancelReservation(req.userId, id);
    return res.status(200).json({ reservation });
  } catch (error) {
    return handleReservationError(error, res);
  }
};
