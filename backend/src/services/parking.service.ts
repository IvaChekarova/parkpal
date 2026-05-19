import { ParkingSpotStatus, ParkingType } from "../generated/prisma/client";
import { prisma } from "../config/prisma";

type ParkingSearchParams = {
  location?: string;
  parkingType?: string;
  availableOnly?: string;
};

type ParkingSummaryRow = {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude: unknown;
  longitude: unknown;
  parkingType: ParkingType;
  pricePerHour: unknown;
  parkingSpots: {
    id: string;
    status: ParkingSpotStatus;
    isAvailable: boolean;
  }[];
  _count: { parkingSpots: number };
};

export class ParkingError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
  }
}

const isValidParkingType = (value: string): value is ParkingType => {
  return value === ParkingType.PUBLIC || value === ParkingType.PRIVATE;
};

const parseAvailableOnly = (value?: string) => {
  if (!value) return false;
  return value.toLowerCase() === "true";
};

const getLocationSearchFilter = (location?: string) => {
  const searchTerm = location?.trim();

  if (!searchTerm) return {};

  return {
    OR: [
      { name: { contains: searchTerm, mode: "insensitive" as const } },
      { address: { contains: searchTerm, mode: "insensitive" as const } },
      { city: { contains: searchTerm, mode: "insensitive" as const } },
    ],
  };
};

export const getAvailabilitySummary = (
  spots: { status: ParkingSpotStatus; isAvailable: boolean }[]
) => {
  const totalSpots = spots.length;
  const availableSpots = spots.filter(
    (spot) => spot.status === ParkingSpotStatus.AVAILABLE && spot.isAvailable
  ).length;
  const occupiedSpots = spots.filter(
    (spot) => spot.status === ParkingSpotStatus.OCCUPIED
  ).length;
  const reservedSpots = spots.filter(
    (spot) => spot.status === ParkingSpotStatus.RESERVED
  ).length;
  const outOfServiceSpots = spots.filter(
    (spot) => spot.status === ParkingSpotStatus.OUT_OF_SERVICE
  ).length;
  const occupancyPercentage =
    totalSpots > 0
      ? Math.round(((totalSpots - availableSpots) / totalSpots) * 100)
      : 0;
  const availabilityStatus =
    availableSpots === 0
      ? "FULL"
      : occupancyPercentage >= 80
        ? "LIMITED"
        : "AVAILABLE";

  return {
    totalSpots,
    availableSpots,
    occupiedSpots,
    reservedSpots,
    outOfServiceSpots,
    occupancyPercentage,
    availabilityStatus,
  };
};

const mapParkingSummary = (parking: ParkingSummaryRow) => {
  const availability = getAvailabilitySummary(parking.parkingSpots);

  return {
    id: parking.id,
    name: parking.name,
    address: parking.address,
    city: parking.city,
    latitude: Number(parking.latitude),
    longitude: Number(parking.longitude),
    parkingType: parking.parkingType,
    pricePerHour: Number(parking.pricePerHour),
    totalSpots: availability.totalSpots,
    availableSpots: availability.availableSpots,
    occupiedSpots: availability.occupiedSpots,
    occupancyPercentage: availability.occupancyPercentage,
    availabilityStatus: availability.availabilityStatus,
  };
};

const getParkingRows = async (params: ParkingSearchParams = {}) => {
  const requestedParkingType = params.parkingType?.trim().toUpperCase();
  const availableOnly = parseAvailableOnly(params.availableOnly);

  if (requestedParkingType && !isValidParkingType(requestedParkingType)) {
    throw new ParkingError("parkingType must be PUBLIC or PRIVATE", 400);
  }

  const parkingType = requestedParkingType as ParkingType | undefined;

  return prisma.parkingLocation.findMany({
    where: {
      isActive: true,
      ...getLocationSearchFilter(params.location),
      ...(parkingType ? { parkingType } : {}),
      ...(availableOnly
        ? {
            parkingSpots: {
              some: {
                status: ParkingSpotStatus.AVAILABLE,
                isAvailable: true,
              },
            },
          }
        : {}),
    },
    orderBy: [{ city: "asc" }, { name: "asc" }],
    include: {
      parkingSpots: {
        select: { id: true, status: true, isAvailable: true },
      },
      _count: {
        select: { parkingSpots: true },
      },
    },
  });
};

export const getParkings = async () => {
  const parkings = await getParkingRows();
  return parkings.map(mapParkingSummary);
};

export const searchParkings = async (params: ParkingSearchParams) => {
  const parkings = await getParkingRows(params);
  return parkings.map(mapParkingSummary);
};

export const getParkingById = async (id: string) => {
  const parking = await prisma.parkingLocation.findFirst({
    where: {
      id,
      isActive: true,
    },
    include: {
      parkingSpots: {
        orderBy: { spotNumber: "asc" },
        select: {
          id: true,
          spotNumber: true,
          status: true,
          isAvailable: true,
        },
      },
    },
  });

  if (!parking) {
    throw new ParkingError("Parking location not found", 404);
  }

  const availability = getAvailabilitySummary(parking.parkingSpots);

  return {
    id: parking.id,
    name: parking.name,
    description: parking.description,
    address: parking.address,
    city: parking.city,
    latitude: Number(parking.latitude),
    longitude: Number(parking.longitude),
    parkingType: parking.parkingType,
    pricePerHour: Number(parking.pricePerHour),
    totalSpots: availability.totalSpots,
    availableSpots: availability.availableSpots,
    occupiedSpots: availability.occupiedSpots,
    occupancyPercentage: availability.occupancyPercentage,
    availabilityStatus: availability.availabilityStatus,
    availabilitySummary: {
      available: availability.availableSpots,
      occupied: availability.occupiedSpots,
      reserved: availability.reservedSpots,
      outOfService: availability.outOfServiceSpots,
    },
    spots: parking.parkingSpots,
  };
};
