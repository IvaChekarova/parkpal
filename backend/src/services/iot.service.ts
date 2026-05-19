import {
  DetectedStatus,
  DeviceType,
  ParkingSpotStatus,
  Prisma,
  SensorReadingType,
} from "../generated/prisma/client";
import { prisma } from "../config/prisma";
import { getParkingById } from "./parking.service";

type SpotUpdateInput = {
  spotId?: string;
  status?: string;
};

type SimulateOccupancyInput = {
  parkingLocationId?: string;
  occupiedSpots?: number;
  spotUpdates?: SpotUpdateInput[];
};

export class IotError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
  }
}

const shuffle = <T>(items: T[]) => {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [nextItems[index], nextItems[swapIndex]] = [
      nextItems[swapIndex],
      nextItems[index],
    ];
  }

  return nextItems;
};

const toDetectedStatus = (status: ParkingSpotStatus) => {
  if (status === ParkingSpotStatus.OCCUPIED) return DetectedStatus.OCCUPIED;
  if (status === ParkingSpotStatus.AVAILABLE) return DetectedStatus.AVAILABLE;
  return DetectedStatus.UNKNOWN;
};

const assertWritableStatus = (status?: string) => {
  const normalized = status?.trim().toUpperCase();

  if (
    normalized !== ParkingSpotStatus.AVAILABLE &&
    normalized !== ParkingSpotStatus.OCCUPIED
  ) {
    throw new IotError("status must be AVAILABLE or OCCUPIED", 400);
  }

  return normalized;
};

const recordSensorReading = async (
  tx: Prisma.TransactionClient,
  spot: {
    id: string;
    spotNumber: string;
    parkingLocationId: string;
  },
  status: ParkingSpotStatus
) => {
  const device = await tx.device.upsert({
    where: {
      deviceIdentifier: `demo-sensor-${spot.id}`,
    },
    update: {
      parkingLocationId: spot.parkingLocationId,
      parkingSpotId: spot.id,
      isActive: true,
    },
    create: {
      parkingLocationId: spot.parkingLocationId,
      parkingSpotId: spot.id,
      deviceName: `Demo sensor ${spot.spotNumber}`,
      deviceType: DeviceType.SENSOR,
      deviceIdentifier: `demo-sensor-${spot.id}`,
      isActive: true,
    },
  });

  await tx.sensorReading.create({
    data: {
      deviceId: device.id,
      parkingSpotId: spot.id,
      readingType: SensorReadingType.OCCUPANCY,
      value: status === ParkingSpotStatus.OCCUPIED ? "1" : "0",
      detectedStatus: toDetectedStatus(status),
    },
  });
};

export const simulateOccupancy = async (input: SimulateOccupancyInput) => {
  const parkingLocationId = input.parkingLocationId?.trim();

  if (!parkingLocationId) {
    throw new IotError("parkingLocationId is required", 400);
  }

  await prisma.$transaction(async (tx) => {
    const parking = await tx.parkingLocation.findFirst({
      where: { id: parkingLocationId, isActive: true },
      include: {
        parkingSpots: {
          orderBy: { spotNumber: "asc" },
          select: {
            id: true,
            parkingLocationId: true,
            spotNumber: true,
            status: true,
            isAvailable: true,
          },
        },
      },
    });

    if (!parking) {
      throw new IotError("Parking location not found", 404);
    }

    const writableSpots = parking.parkingSpots.filter(
      (spot) =>
        spot.status !== ParkingSpotStatus.RESERVED &&
        spot.status !== ParkingSpotStatus.OUT_OF_SERVICE
    );

    if (input.spotUpdates?.length) {
      for (const update of input.spotUpdates) {
        const spotId = update.spotId?.trim();
        const status = assertWritableStatus(update.status);
        const spot = writableSpots.find((item) => item.id === spotId);

        if (!spot) {
          throw new IotError(
            "Spot update must reference a non-reserved spot in this parking location",
            400
          );
        }

        await tx.parkingSpot.update({
          where: { id: spot.id },
          data: {
            status,
            isAvailable: status === ParkingSpotStatus.AVAILABLE,
          },
        });
        await recordSensorReading(tx, spot, status);
      }

      return;
    }

    if (typeof input.occupiedSpots !== "number") {
      throw new IotError("occupiedSpots or spotUpdates is required", 400);
    }

    const occupiedCount = Math.max(
      0,
      Math.min(Math.round(input.occupiedSpots), writableSpots.length)
    );
    const occupiedIds = new Set(
      shuffle(writableSpots)
        .slice(0, occupiedCount)
        .map((spot) => spot.id)
    );

    for (const spot of writableSpots) {
      const status = occupiedIds.has(spot.id)
        ? ParkingSpotStatus.OCCUPIED
        : ParkingSpotStatus.AVAILABLE;

      await tx.parkingSpot.update({
        where: { id: spot.id },
        data: {
          status,
          isAvailable: status === ParkingSpotStatus.AVAILABLE,
        },
      });
      await recordSensorReading(tx, spot, status);
    }
  });

  return getParkingById(parkingLocationId);
};

export const demoRandomOccupancyUpdate = async (parkingLocationId?: string) => {
  const parking =
    parkingLocationId?.trim() ??
    (
      await prisma.parkingLocation.findFirst({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true },
      })
    )?.id;

  if (!parking) {
    throw new IotError("Parking location not found", 404);
  }

  const writableSpots = await prisma.parkingSpot.findMany({
    where: {
      parkingLocationId: parking,
      status: { notIn: [ParkingSpotStatus.RESERVED, ParkingSpotStatus.OUT_OF_SERVICE] },
    },
    select: { id: true },
  });

  const occupiedSpots =
    writableSpots.length === 0
      ? 0
      : Math.floor(Math.random() * (writableSpots.length + 1));

  return simulateOccupancy({
    parkingLocationId: parking,
    occupiedSpots,
  });
};
