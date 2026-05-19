import { API_BASE_URL } from "../config/api";

export type ReservationType = "ONE_TIME" | "LONG_TERM";
export type ReservationStatus = "UPCOMING" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export type Reservation = {
  id: string;
  reservationType: ReservationType;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: ReservationStatus;
  parking: {
    id: string;
    name: string;
    address: string;
    city: string;
    parkingType: string;
    pricePerHour: number;
  };
  spot: {
    id: string;
    spotNumber: string;
  };
  pricing: {
    pricePerHour: number;
    durationHours: number;
    totalPrice: number;
    currency: string;
  };
};

type CreateReservationPayload = {
  parkingLocationId: string;
  reservationType: ReservationType;
  startTime: string;
  endTime: string;
};

const request = async <T>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message ?? "Reservation request failed");
  }

  return data as T;
};

export const reservationApi = {
  createReservation: async (
    payload: CreateReservationPayload,
    token: string
  ) => {
    const data = await request<{ reservation: Reservation }>(
      "/reservations",
      token,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return data.reservation;
  },

  getMyReservations: async (token: string) => {
    const data = await request<{ reservations: Reservation[] }>(
      "/reservations/me",
      token
    );
    return data.reservations;
  },

  cancelReservation: async (id: string, token: string) => {
    const data = await request<{ reservation: Reservation }>(
      `/reservations/${id}/cancel`,
      token,
      {
        method: "PATCH",
      }
    );
    return data.reservation;
  },
};
