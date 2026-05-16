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
  parkingSpots: { id: string }[];
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

const mapParkingSummary = (parking: ParkingSummaryRow) => {
  const totalSpots = parking._count.parkingSpots;
  const availableSpots = parking.parkingSpots.length;

  return {
    id: parking.id,
    name: parking.name,
    address: parking.address,
    city: parking.city,
    latitude: Number(parking.latitude),
    longitude: Number(parking.longitude),
    parkingType: parking.parkingType,
    pricePerHour: Number(parking.pricePerHour),
    totalSpots,
    availableSpots,
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
        where: {
          status: ParkingSpotStatus.AVAILABLE,
          isAvailable: true,
        },
        select: { id: true },
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

  const availableSpots = parking.parkingSpots.filter(
    (spot) => spot.status === ParkingSpotStatus.AVAILABLE && spot.isAvailable
  ).length;
  const occupiedSpots = parking.parkingSpots.filter(
    (spot) => spot.status === ParkingSpotStatus.OCCUPIED
  ).length;
  const reservedSpots = parking.parkingSpots.filter(
    (spot) => spot.status === ParkingSpotStatus.RESERVED
  ).length;
  const outOfServiceSpots = parking.parkingSpots.filter(
    (spot) => spot.status === ParkingSpotStatus.OUT_OF_SERVICE
  ).length;

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
    totalSpots: parking.parkingSpots.length,
    availableSpots,
    availabilitySummary: {
      available: availableSpots,
      occupied: occupiedSpots,
      reserved: reservedSpots,
      outOfService: outOfServiceSpots,
    },
    spots: parking.parkingSpots,
  };
};
