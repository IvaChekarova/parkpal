import { API_BASE_URL } from "../config/api";

export type ParkingSummary = {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  parkingType: "PUBLIC" | "PRIVATE";
  pricePerHour: number;
  totalSpots: number;
  availableSpots: number;
  availabilityStatus: "AVAILABLE" | "LIMITED" | "FULL";
};

export type ParkingSpot = {
  id: string;
  spotNumber: string;
  status: string;
  isAvailable: boolean;
};

export type ParkingDetails = ParkingSummary & {
  description?: string | null;
  availabilitySummary: {
    available: number;
    reserved: number;
    outOfService: number;
  };
  spots: ParkingSpot[];
};

type ParkingsResponse = {
  parkings: ParkingSummary[];
};

type ParkingDetailsResponse = {
  parking: ParkingDetails;
};

type SearchParkingsParams = {
  location?: string;
  parkingType?: "PUBLIC" | "PRIVATE";
  availableOnly?: boolean;
};

const request = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error("Unable to load parking data");
  }

  return response.json() as Promise<T>;
};

const authRequest = async <T>(
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
    throw new Error(data.message ?? "Unable to update parking data");
  }

  return data as T;
};

const buildSearchQuery = (params: SearchParkingsParams) => {
  const query = new URLSearchParams();

  if (params.location?.trim()) {
    query.set("location", params.location.trim());
  }

  if (params.parkingType) {
    query.set("parkingType", params.parkingType);
  }

  if (params.availableOnly !== undefined) {
    query.set("availableOnly", String(params.availableOnly));
  }

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
};

export const parkingApi = {
  getParkings: async () => {
    const data = await request<ParkingsResponse>("/parkings");
    return data.parkings;
  },

  searchParkings: async (params: SearchParkingsParams) => {
    const data = await request<ParkingsResponse>(
      `/parkings/search${buildSearchQuery(params)}`
    );
    return data.parkings;
  },

  getParkingById: async (id: string) => {
    const data = await request<ParkingDetailsResponse>(`/parkings/${id}`);
    return data.parking;
  },

  demoRandomUpdate: async (token: string, parkingLocationId?: string) => {
    const data = await authRequest<ParkingDetailsResponse>(
      "/iot/demo-random-update",
      token,
      {
        method: "POST",
        body: JSON.stringify({ parkingLocationId }),
      }
    );
    return data.parking;
  },
};
