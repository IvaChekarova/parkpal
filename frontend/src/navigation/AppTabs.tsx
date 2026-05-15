import React from "react";
import { Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../screens/HomeScreen";
import ParkingDetailsScreen from "../screens/ParkingDetailsScreen";
import ReservationConfirmScreen from "../screens/ReservationConfirmScreen";
import ReservationHistoryScreen from "../screens/ReservationHistoryScreen";
import ReservationsScreen from "../screens/ReservationsScreen";
import SearchResultsScreen from "../screens/SearchResultsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import theme from "../theme";

// dynamic require for @expo/vector-icons to avoid build errors if not installed
let Ionicons: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Ionicons = require("@expo/vector-icons").Ionicons;
} catch (e) {
  Ionicons = null;
}

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const ReservationsStack = createNativeStackNavigator();

function HomeStackScreen() {
  return (
    <HomeStack.Navigator initialRouteName="Home">
      <HomeStack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="SearchResults"
        component={SearchResultsScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="ParkingDetails"
        component={ParkingDetailsScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="ReservationConfirm"
        component={ReservationConfirmScreen}
        options={{ headerShown: false }}
      />
    </HomeStack.Navigator>
  );
}

function ReservationsStackScreen() {
  return (
    <ReservationsStack.Navigator initialRouteName="Reservations">
      <ReservationsStack.Screen
        name="Reservations"
        component={ReservationsScreen}
        options={{ headerShown: false }}
      />
      <ReservationsStack.Screen
        name="ReservationHistory"
        component={ReservationHistoryScreen}
        options={{ headerShown: false }}
      />
    </ReservationsStack.Navigator>
  );
}

export default function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.Colors.primary,
        tabBarInactiveTintColor: theme.Colors.textSecondary,
        tabBarIcon: ({ color, size }) => {
          const nameMap: Record<string, string> = {
            HomeTab: "home-outline",
            Reservations: "calendar-outline",
            Profile: "person-outline",
          };
          const iconName = nameMap[route.name] || "ellipse";
          if (Ionicons)
            return <Ionicons name={iconName} size={size} color={color} />;
          return <Text style={{ color, fontSize: size }}>•</Text>;
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackScreen}
        options={{ tabBarLabel: "Home" }}
      />
      <Tab.Screen
        name="Reservations"
        component={ReservationsStackScreen}
        options={{ tabBarLabel: "Reservations" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
}
