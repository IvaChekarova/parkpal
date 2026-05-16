import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";

import {
  ParkingSpotStatus,
  ParkingType,
  PrismaClient,
  UserRole,
} from "../../src/generated/prisma/client";

type ParkingCsvRow = {
  name: string;
  address: string;
  city: string;
  latitude: string;
  longitude: string;
  parkingType: ParkingType;
  pricePerHour: string;
  totalSpots: string;
  source: string;
};

const DATABASE_URL = process.env.DATABASE_URL;
const SEED_OWNER_EMAIL = "seed-owner@parkpal.local";

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: DATABASE_URL }),
});

const parseCsvLine = (line: string) => {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (const char of line) {
    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
};

const readParkingRows = () => {
  const csvPath = path.join(__dirname, "parkpal_seed_parkings.csv");
  const csv = fs.readFileSync(csvPath, "utf8").trim();
  const [headerLine, ...lines] = csv.split(/\r?\n/);
  const headers = parseCsvLine(headerLine);

  return lines.map((line) => {
    const values = parseCsvLine(line);

    return headers.reduce((row, header, index) => {
      return {
        ...row,
        [header]: values[index],
      };
    }, {} as ParkingCsvRow);
  });
};

const getSpotStatus = (locationIndex: number, spotIndex: number) => {
  const patternValue = (locationIndex * 17 + spotIndex * 11) % 100;

  if (patternValue < 68) {
    return ParkingSpotStatus.AVAILABLE;
  }

  if (patternValue < 90) {
    return ParkingSpotStatus.OCCUPIED;
  }

  if (patternValue < 96) {
    return ParkingSpotStatus.RESERVED;
  }

  return ParkingSpotStatus.OUT_OF_SERVICE;
};

const seed = async () => {
  const rows = readParkingRows();
  const passwordHash = await bcrypt.hash("parkpal_seed_owner", 12);

  const owner = await prisma.user.upsert({
    where: { email: SEED_OWNER_EMAIL },
    update: {
      fullName: "ParkPal Seed Owner",
      role: UserRole.OWNER,
    },
    create: {
      fullName: "ParkPal Seed Owner",
      email: SEED_OWNER_EMAIL,
      passwordHash,
      role: UserRole.OWNER,
    },
  });

  await prisma.parkingLocation.deleteMany({
    where: { ownerId: owner.id },
  });

  for (const [locationIndex, row] of rows.entries()) {
    const totalSpots = Number(row.totalSpots);

    const parkingLocation = await prisma.parkingLocation.create({
      data: {
        ownerId: owner.id,
        name: row.name,
        description: row.source,
        address: row.address,
        city: row.city,
        latitude: row.latitude,
        longitude: row.longitude,
        parkingType: row.parkingType,
        pricePerHour: row.pricePerHour,
        isActive: true,
      },
    });

    await prisma.parkingSpot.createMany({
      data: Array.from({ length: totalSpots }, (_, index) => {
        const spotNumber = `${String.fromCharCode(65 + (index % 4))}-${String(
          index + 1
        ).padStart(3, "0")}`;
        const status = getSpotStatus(locationIndex, index);

        return {
          parkingLocationId: parkingLocation.id,
          spotNumber,
          status,
          isAvailable: status === ParkingSpotStatus.AVAILABLE,
        };
      }),
    });
  }

  console.log(`Seeded ${rows.length} parking locations.`);
};

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
