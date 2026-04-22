import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import WelcomeScreen from "../screens/WelcomeScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import HomeScreen from "../screens/HomeScreen";
import ParkingDetailsScreen from "../screens/ParkingDetailsScreen";
import ReservationsScreen from "../screens/ReservationsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import type { RootStackParamList } from "./types";
import { useAuth } from "../context/AuthContext";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Stack.Navigator initialRouteName="Welcome">
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="ParkingDetails" component={ParkingDetailsScreen} />
      <Stack.Screen name="Reservations" component={ReservationsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}
