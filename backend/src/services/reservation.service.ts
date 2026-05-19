import {
  ParkingType,
  ParkingSpotStatus,
  PaymentMethod,
  PaymentStatus,
  ReservationStatus,
  ReservationType,
} from "../generated/prisma/client";
import { prisma } from "../config/prisma";

type CreateReservationInput = {
  parkingLocationId?: string;
  reservationType?: string;
  startTime?: string;
  endTime?: string;
};

export class ReservationError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
  }
}

const FALLBACK_WORKING_HOURS = {
  opensAt: "08:00",
  closesAt: "22:00",
};
const ONE_MINUTE_MS = 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;
const ONE_TIME_CANCELLATION_WINDOW_MS = 30 * 60 * 1000;
const LONG_TERM_CANCELLATION_WINDOW_MS = ONE_DAY_MS;
const BOOKABLE_STATUSES = [
  ReservationStatus.ACTIVE,
  ReservationStatus.UPCOMING,
];

const createMockTransactionReference = () => {
  return `MOCK-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)
    .toUpperCase()}`;
};

const isReservationType = (value: string): value is ReservationType => {
  return value === ReservationType.ONE_TIME || value === ReservationType.LONG_TERM;
};

const isSameCalendarDay = (left: Date, right: Date) => {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
};

const setTimeOnDate = (date: Date, time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  const nextDate = new Date(date);
  nextDate.setHours(hours, minutes, 0, 0);
  return nextDate;
};

const getCalendarDayCount = (startTime: Date, endTime: Date) => {
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  return Math.floor((endDate.getTime() - startDate.getTime()) / ONE_DAY_MS) + 1;
};

const getDateSpanDays = (startTime: Date, endTime: Date) => {
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  return Math.floor((endDate.getTime() - startDate.getTime()) / ONE_DAY_MS);
};

const assertFutureReservation = (startTime: Date) => {
  const now = new Date();

  if (startTime <= now) {
    throw new ReservationError("Reservation time must be in the future.", 400);
  }

  if (isSameCalendarDay(startTime, now) && startTime.getTime() < now.getTime() + ONE_MINUTE_MS) {
    throw new ReservationError("Reservation time must be in the future.", 400);
  }
};

const assertOneTimeRules = (startTime: Date, endTime: Date, durationMinutes: number) => {
  if (endTime <= startTime) {
    throw new ReservationError("End time must be after start time.", 400);
  }

  if (durationMinutes < 60) {
    throw new ReservationError("One-time reservations require at least 1 hour.", 400);
  }

  if (durationMinutes > 360) {
    throw new ReservationError("One-time reservations can be up to 6 hours.", 400);
  }
};

const assertLongTermRules = (
  parkingType: ParkingType,
  startTime: Date,
  endTime: Date
) => {
  if (parkingType !== ParkingType.PRIVATE) {
    throw new ReservationError(
      "Long-term reservations are only available for private parking.",
      400
    );
  }

  const dayCount = getDateSpanDays(startTime, endTime);

  if (dayCount < 1) {
    throw new ReservationError("Long-term reservations must be at least 1 day.", 400);
  }

  if (dayCount > 30) {
    throw new ReservationError("Long-term reservations can be up to 30 days.", 400);
  }
};

const assertInsideWorkingHours = (startTime: Date, endTime: Date) => {
  const opensAt = setTimeOnDate(startTime, FALLBACK_WORKING_HOURS.opensAt);
  const closesAt = setTimeOnDate(startTime, FALLBACK_WORKING_HOURS.closesAt);

  if (!isSameCalendarDay(startTime, endTime) || startTime < opensAt || endTime > closesAt) {
    throw new ReservationError(
      "Reservation is outside parking working hours.",
      400
    );
  }
};

const assertEndpointsInsideWorkingHours = (startTime: Date, endTime: Date) => {
  const startOpensAt = setTimeOnDate(startTime, FALLBACK_WORKING_HOURS.opensAt);
  const startClosesAt = setTimeOnDate(startTime, FALLBACK_WORKING_HOURS.closesAt);
  const endOpensAt = setTimeOnDate(endTime, FALLBACK_WORKING_HOURS.opensAt);
  const endClosesAt = setTimeOnDate(endTime, FALLBACK_WORKING_HOURS.closesAt);

  if (
    startTime < startOpensAt ||
    startTime > startClosesAt ||
    endTime < endOpensAt ||
    endTime > endClosesAt
  ) {
    throw new ReservationError(
      "Reservation is outside parking working hours.",
      400
    );
  }
};

const getComputedStatus = (startTime: Date, endTime: Date) => {
  const now = new Date();

  if (endTime < now) return ReservationStatus.COMPLETED;
  if (startTime <= now && endTime >= now) return ReservationStatus.ACTIVE;
  return ReservationStatus.UPCOMING;
};

const normalizeReservationStatus = <T extends { startTime: Date; endTime: Date; status: ReservationStatus }>(
  reservation: T
) => {
  if (reservation.status === ReservationStatus.CANCELLED) {
    return reservation.status;
  }

  return getComputedStatus(reservation.startTime, reservation.endTime);
};

const formatReservation = (reservation: any) => {
  const status = normalizeReservationStatus(reservation);
  const pricePerHour = Number(reservation.parkingLocation.pricePerHour);
  const totalPrice = Number(reservation.totalPrice);
  const durationHours =
    pricePerHour > 0 ? totalPrice / pricePerHour : reservation.durationMinutes / 60;

  return {
    id: reservation.id,
    reservationType: reservation.reservationType,
    startTime: reservation.startTime,
    endTime: reservation.endTime,
    durationMinutes: reservation.durationMinutes,
    status,
    parking: {
      id: reservation.parkingLocation.id,
      name: reservation.parkingLocation.name,
      address: reservation.parkingLocation.address,
      city: reservation.parkingLocation.city,
      parkingType: reservation.parkingLocation.parkingType,
      pricePerHour,
    },
    spot: {
      id: reservation.parkingSpot.id,
      spotNumber: reservation.parkingSpot.spotNumber,
    },
    pricing: {
      pricePerHour,
      durationHours,
      totalPrice,
      currency: "EUR",
    },
    payment: reservation.payment
      ? {
          id: reservation.payment.id,
          amount: Number(reservation.payment.amount),
          currency: reservation.payment.currency,
          paymentMethod: reservation.payment.paymentMethod,
          paymentStatus: reservation.payment.paymentStatus,
          transactionReference: reservation.payment.transactionReference,
          paidAt: reservation.payment.paidAt,
        }
      : null,
    createdAt: reservation.createdAt,
    updatedAt: reservation.updatedAt,
  };
};

export const createReservation = async (
  userId: string,
  input: CreateReservationInput
) => {
  const parkingLocationId = input.parkingLocationId?.trim();
  const reservationType = input.reservationType?.trim().toUpperCase();

  if (!parkingLocationId || !reservationType || !input.startTime || !input.endTime) {
    throw new ReservationError(
      "parkingLocationId, reservationType, startTime, and endTime are required",
      400
    );
  }

  if (!isReservationType(reservationType)) {
    throw new ReservationError("reservationType must be ONE_TIME or LONG_TERM", 400);
  }

  const startTime = new Date(input.startTime);
  const endTime = new Date(input.endTime);

  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    throw new ReservationError("startTime and endTime must be valid dates", 400);
  }

  if (endTime <= startTime) {
    throw new ReservationError("End time must be after start time.", 400);
  }

  assertFutureReservation(startTime);

  const durationMinutes = Math.ceil(
    (endTime.getTime() - startTime.getTime()) / 60000
  );

  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new ReservationError("Invalid reservation duration", 400);
  }

  if (reservationType === ReservationType.ONE_TIME) {
    assertOneTimeRules(startTime, endTime, durationMinutes);
    assertInsideWorkingHours(startTime, endTime);
  }

  return prisma.$transaction(async (tx) => {
    const parkingLocation = await tx.parkingLocation.findFirst({
      where: {
        id: parkingLocationId,
        isActive: true,
      },
    });

    if (!parkingLocation) {
      throw new ReservationError("Parking location not found", 404);
    }

    if (reservationType === ReservationType.LONG_TERM) {
      assertLongTermRules(parkingLocation.parkingType, startTime, endTime);
      assertEndpointsInsideWorkingHours(startTime, endTime);
    }

    const duplicateReservation = await tx.reservation.findFirst({
      where: {
        userId,
        parkingLocationId,
        reservationType,
        startTime,
        endTime,
        status: { in: BOOKABLE_STATUSES },
      },
    });

    if (duplicateReservation) {
      throw new ReservationError("Duplicate reservation detected.", 409);
    }

    const overlappingUserReservation = await tx.reservation.findFirst({
      where: {
        userId,
        reservationType,
        status: { in: BOOKABLE_STATUSES },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });

    if (overlappingUserReservation) {
      throw new ReservationError(
        "You already have a reservation during this time.",
        409
      );
    }

    const availableSpot = await tx.parkingSpot.findFirst({
      where: {
        parkingLocationId,
        status: ParkingSpotStatus.AVAILABLE,
        isAvailable: true,
        reservations: {
          none: {
            status: { in: BOOKABLE_STATUSES },
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        },
      },
      orderBy: { spotNumber: "asc" },
    });

    if (!availableSpot) {
      throw new ReservationError("No available spots for this time.", 409);
    }

    const durationHours =
      reservationType === ReservationType.LONG_TERM
        ? getDateSpanDays(startTime, endTime) * 8
        : durationMinutes / 60;
    const totalPrice = Number(parkingLocation.pricePerHour) * durationHours;

    const reservation = await tx.reservation.create({
      data: {
        userId,
        parkingLocationId,
        parkingSpotId: availableSpot.id,
        reservationType,
        startTime,
        endTime,
        durationMinutes,
        totalPrice: totalPrice.toFixed(2),
        status: getComputedStatus(startTime, endTime),
      },
      include: {
        parkingLocation: true,
        parkingSpot: true,
        payment: true,
      },
    });

    const payment = await tx.payment.create({
      data: {
        reservationId: reservation.id,
        userId,
        amount: totalPrice.toFixed(2),
        currency: "EUR",
        paymentMethod: PaymentMethod.CARD,
        paymentStatus: PaymentStatus.PAID,
        transactionReference: createMockTransactionReference(),
        paidAt: new Date(),
      },
    });

    await tx.parkingSpot.update({
      where: { id: availableSpot.id },
      data: {
        status: ParkingSpotStatus.RESERVED,
        isAvailable: false,
      },
    });

    return formatReservation({ ...reservation, payment });
  });
};

export const getMyReservations = async (userId: string) => {
  const reservations = await prisma.reservation.findMany({
    where: { userId },
    orderBy: { startTime: "asc" },
    include: {
      parkingLocation: true,
      parkingSpot: true,
      payment: true,
    },
  });

  return reservations.map(formatReservation);
};

export const getReservationById = async (userId: string, id: string) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      parkingLocation: true,
      parkingSpot: true,
      payment: true,
    },
  });

  if (!reservation) {
    throw new ReservationError("Reservation not found", 404);
  }

  if (reservation.userId !== userId) {
    throw new ReservationError("Forbidden", 403);
  }

  return formatReservation(reservation);
};

export const cancelReservation = async (userId: string, id: string) => {
  if (!id?.trim()) {
    throw new ReservationError("Reservation id is required", 400);
  }

  return prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.findUnique({
      where: { id },
      include: {
        parkingLocation: true,
        parkingSpot: true,
        payment: true,
      },
    });

    if (!reservation) {
      throw new ReservationError("Reservation not found", 404);
    }

    if (reservation.userId !== userId) {
      throw new ReservationError("Forbidden", 403);
    }

    const currentStatus = normalizeReservationStatus(reservation);

    if (currentStatus !== ReservationStatus.UPCOMING) {
      throw new ReservationError(
        "Only upcoming reservations can be cancelled.",
        409
      );
    }

    const now = new Date();
    const cancellationWindowMs =
      reservation.reservationType === ReservationType.LONG_TERM
        ? LONG_TERM_CANCELLATION_WINDOW_MS
        : ONE_TIME_CANCELLATION_WINDOW_MS;

    if (reservation.startTime.getTime() - now.getTime() < cancellationWindowMs) {
      throw new ReservationError(
        "Cancellation is no longer available for this reservation.",
        409
      );
    }

    const cancelledReservation = await tx.reservation.update({
      where: { id },
      data: { status: ReservationStatus.CANCELLED },
      include: {
        parkingLocation: true,
        parkingSpot: true,
        payment: true,
      },
    });

    const activeSpotReservations = await tx.reservation.count({
      where: {
        parkingSpotId: reservation.parkingSpotId,
        id: { not: id },
        status: { in: BOOKABLE_STATUSES },
      },
    });

    if (activeSpotReservations === 0) {
      await tx.parkingSpot.update({
        where: { id: reservation.parkingSpotId },
        data: {
          status: ParkingSpotStatus.AVAILABLE,
          isAvailable: true,
        },
      });
    }

    return formatReservation(cancelledReservation);
  });
};
