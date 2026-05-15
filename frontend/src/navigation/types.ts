export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  Home: undefined;
  ParkingDetails:
    | undefined
    | {
        parkingId?: string;
      };
  ReservationConfirm: {
    parking: {
      id: string;
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
