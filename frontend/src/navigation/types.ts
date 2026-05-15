import type { BookingParams } from "../utils/booking";

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  Home: undefined;
  SearchResults: {
    booking: BookingParams;
  };
  ParkingDetails:
    | undefined
    | {
        parkingId?: string;
        booking?: BookingParams;
      };
  ReservationConfirm: {
    parking: {
      id: string;
      name: string;
      address: string;
      pricePerHour: number;
    };
    booking?: BookingParams;
  };
  Reservations: undefined;
  ReservationHistory: undefined;
  Profile: undefined;
};

export default {} as RootStackParamList;
