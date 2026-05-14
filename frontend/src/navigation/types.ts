export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  Home: undefined;
  ParkingDetails:
    | undefined
    | {
        parking?: {
          name: string;
          address: string;
          price: number;
        };
      };
  ReservationConfirm: {
    parking: {
      name: string;
      address: string;
      pricePerHour: number;
    };
  };
  Reservations: undefined;
  Profile: undefined;
};

export default {} as RootStackParamList;
