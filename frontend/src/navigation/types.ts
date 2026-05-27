import { ParkingSummary } from "../services/parkingApi";

export type SearchMode = "one-time" | "long-term";
export type ParkingTypeFilter = "all" | "PUBLIC" | "PRIVATE";

export type SearchData = {
  mode: SearchMode;
  location: string;
  parkingType: ParkingTypeFilter;
  date?: string;
  fromDate?: string;
  toDate?: string;
  startTime?: string;
  endTime?: string;
};

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  Home: undefined;
  SearchResults: {
    search: SearchData;
    results: ParkingSummary[];
  };
  ParkingDetails:
    | undefined
     | {
         parkingId?: string;
         search?: SearchData;
         locationLabel?: string;
         parking?: {
          name: string;
          address: string;
          price: number;
        };
      };
  ReservationConfirm: {
    parking: {
      id?: string;
      name: string;
      address: string;
      pricePerHour: number;
    };
  };
  Reservations: undefined;
  ReservationHistory: undefined;
  Profile: undefined;
};

export default {} as RootStackParamList;
