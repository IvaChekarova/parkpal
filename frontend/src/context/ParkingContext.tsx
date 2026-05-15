import React, {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";
import { formatDate, formatTime } from "../utils/booking";

export type Parking = {
  id: string;
  name: string;
  address: string;
  spotsAvailable: number;
  totalSpots: number;
  price: number;
  distance: string;
  hours: string;
  description: string;
  amenities: string[];
};

export type ReservationStatus = "active" | "upcoming" | "completed";

export type Reservation = {
  id: string;
  parkingId: string;
  name: string;
  address: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  durationHours: number;
  price: number;
  status: ReservationStatus;
};

type ReservationInput = {
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  durationHours: number;
};

type ParkingContextValue = {
  parkings: Parking[];
  reservations: Reservation[];
  getParkingById: (parkingId: string) => Parking | undefined;
  confirmReservation: (parkingId: string, input: ReservationInput) => void;
};

const MOCK_PARKINGS: Parking[] = [
  {
    id: "1",
    name: "Central Parking",
    address: "12 Main St, Downtown",
    spotsAvailable: 8,
    totalSpots: 50,
    price: 2.5,
    distance: "0.3 km",
    hours: "Mon-Sun 06:00-23:00",
    description:
      "Secure parking close to downtown. Covered levels and easy pedestrian access.",
    amenities: [
      "Covered parking",
      "Security cameras",
      "EV charging",
      "Easy access",
    ],
  },
  {
    id: "2",
    name: "City Mall Garage",
    address: "5 Commerce Ave",
    spotsAvailable: 2,
    totalSpots: 40,
    price: 3,
    distance: "0.8 km",
    hours: "Mon-Sun 08:00-22:00",
    description:
      "Convenient garage parking next to the main shopping entrance.",
    amenities: ["Covered parking", "Security cameras", "Elevator access"],
  },
  {
    id: "3",
    name: "East Side Parking",
    address: "101 East Rd",
    spotsAvailable: 0,
    totalSpots: 24,
    price: 1.5,
    distance: "1.2 km",
    hours: "Mon-Fri 07:00-20:00",
    description: "Simple open-air parking for quick city access.",
    amenities: ["Open-air parking", "Easy access"],
  },
  {
    id: "4",
    name: "Riverside Lot",
    address: "42 River Ln",
    spotsAvailable: 5,
    totalSpots: 30,
    price: 2,
    distance: "2.0 km",
    hours: "Mon-Sun 06:00-23:00",
    description: "Quiet lot near the riverside walking path.",
    amenities: ["Open-air parking", "Security cameras", "Easy access"],
  },
];

const MOCK_RESERVATIONS: Reservation[] = [
  {
    id: "r1",
    parkingId: "1",
    name: "Central Parking",
    address: "12 Main St",
    date: formatDate(new Date()),
    startTime: formatTime(new Date(Date.now() - 60 * 60 * 1000)),
    endTime: formatTime(new Date(Date.now() + 60 * 60 * 1000)),
    duration: "2h",
    durationHours: 2,
    price: 5,
    status: "active",
  },
  {
    id: "r2",
    parkingId: "2",
    name: "City Mall Garage",
    address: "5 Commerce Ave",
    date: formatDate(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)),
    startTime: "10:00",
    endTime: "14:00",
    duration: "4h",
    durationHours: 4,
    price: 12,
    status: "upcoming",
  },
  {
    id: "r3",
    parkingId: "3",
    name: "East Side Parking",
    address: "101 East Rd",
    date: formatDate(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)),
    startTime: "10:00",
    endTime: "11:30",
    duration: "1.5h",
    durationHours: 1.5,
    price: 3.75,
    status: "completed",
  },
  {
    id: "r4",
    parkingId: "4",
    name: "Riverside Lot",
    address: "42 River Ln",
    date: formatDate(new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)),
    startTime: "12:00",
    endTime: "14:00",
    duration: "2h",
    durationHours: 2,
    price: 4,
    status: "completed",
  },
];

function parseReservationDateTime(date: string, time: string) {
  const currentYear = new Date().getFullYear();
  const normalizedDate =
    date === "Today"
      ? formatDate(new Date())
      : date === "Tomorrow"
        ? formatDate(new Date(Date.now() + 24 * 60 * 60 * 1000))
        : date;
  const dateWithYear = /\d{4}/.test(normalizedDate)
    ? normalizedDate
    : `${normalizedDate}, ${currentYear}`;
  const parsed = new Date(`${dateWithYear} ${time}`);

  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function getReservationStatus(reservation: Reservation): ReservationStatus {
  const now = new Date();
  const startsAt = parseReservationDateTime(
    reservation.date,
    reservation.startTime,
  );
  const endsAt = new Date(
    startsAt.getTime() + reservation.durationHours * 60 * 60 * 1000,
  );

  if (now < startsAt) {
    return "upcoming";
  }

  if (now <= endsAt) {
    return "active";
  }

  return "completed";
}

const ParkingContext = createContext<ParkingContextValue | undefined>(
  undefined,
);

export function ParkingProvider({ children }: { children: ReactNode }) {
  const [parkings, setParkings] = useState(MOCK_PARKINGS);
  const [reservations, setReservations] = useState(MOCK_RESERVATIONS);
  const reservationsWithStatus = useMemo(
    () =>
      reservations.map((reservation) => ({
        ...reservation,
        status: getReservationStatus(reservation),
      })),
    [reservations],
  );

  function getParkingById(parkingId: string) {
    return parkings.find((parking) => parking.id === parkingId);
  }

  function confirmReservation(parkingId: string, input: ReservationInput) {
    const parking = getParkingById(parkingId);

    if (!parking || parking.spotsAvailable <= 0) {
      return;
    }

    const reservation: Reservation = {
      id: `r-${Date.now()}`,
      parkingId: parking.id,
      name: parking.name,
      address: parking.address,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      duration: input.duration,
      durationHours: input.durationHours,
      price: parking.price * input.durationHours,
      status: "upcoming",
    };

    setReservations((current) => [reservation, ...current]);
    setParkings((current) =>
      current.map((item) =>
        item.id === parkingId
          ? {
              ...item,
              spotsAvailable: Math.max(item.spotsAvailable - 1, 0),
            }
          : item,
      ),
    );
  }

  return (
    <ParkingContext.Provider
      value={{
        parkings,
        reservations: reservationsWithStatus,
        getParkingById,
        confirmReservation,
      }}
    >
      {children}
    </ParkingContext.Provider>
  );
}

export function useParking() {
  const context = useContext(ParkingContext);

  if (!context) {
    throw new Error("useParking must be used inside ParkingProvider");
  }

  return context;
}
