import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import ScreenWrapper from "../components/ScreenWrapper";
import Card from "../components/Card";
import Button from "../components/Button";
import { useParking } from "../context/ParkingContext";
import {
  BookingParams,
  getBookingDateSummary,
  getBookingHours,
  getBookingSummaryLabel,
  formatDuration,
} from "../utils/booking";
import theme from "../theme";
import type { RootStackParamList } from "../navigation/types";

type NavProp = NativeStackNavigationProp<
  RootStackParamList,
  "ReservationConfirm"
>;
type RouteProps = RouteProp<RootStackParamList, "ReservationConfirm">;

const FALLBACK_BOOKING: BookingParams = {
  mode: "one-time",
  location: "Current location",
  date: "Today",
  startTime: "10:00",
  endTime: "11:00",
};

export default function ReservationConfirmScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const { confirmReservation } = useParking();
  const booking = route.params?.booking ?? FALLBACK_BOOKING;
  const parking = route.params?.parking ?? {
    id: "1",
    name: "Central Parking",
    address: "12 Main St",
    pricePerHour: 2.5,
  };

  const durationHours = getBookingHours(booking);
  const duration = formatDuration(durationHours);
  const estimated = parking.pricePerHour * durationHours;

  function handleConfirm() {
    confirmReservation(parking.id, {
      date: booking.date,
      startTime: booking.startTime ?? "00:00",
      endTime: booking.endTime ?? "23:59",
      duration,
      durationHours,
    });
    navigation.getParent()?.navigate("Reservations");
  }

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={theme.Typography.title}>Confirm reservation</Text>

        <View style={{ height: theme.Spacing.md }} />

        <Card>
          <Text style={[theme.Typography.caption, styles.modeLabel]}>
            {getBookingSummaryLabel(booking)}
          </Text>
          <Text style={theme.Typography.subtitle}>{parking.name}</Text>
          <Text
            style={[
              theme.Typography.caption,
              {
                color: theme.Colors.textSecondary,
                marginTop: theme.Spacing.xs,
              },
            ]}
          >
            {parking.address}
          </Text>

          <View style={{ height: theme.Spacing.md }} />

          <View style={styles.row}>
            <Text style={theme.Typography.caption}>Price</Text>
            <Text style={theme.Typography.body}>
              €{parking.pricePerHour.toFixed(2)}/hr
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={theme.Typography.caption}>When</Text>
            <Text style={theme.Typography.body}>
              {getBookingDateSummary(booking)}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={theme.Typography.caption}>Duration</Text>
            <Text style={theme.Typography.body}>{duration}</Text>
          </View>

          <View style={styles.row}>
            <Text style={theme.Typography.caption}>Estimated total</Text>
            <Text style={theme.Typography.title}>€{estimated.toFixed(2)}</Text>
          </View>
        </Card>

        <View style={{ height: theme.Spacing.md }} />
        <Button title="Confirm reservation" onPress={handleConfirm} />
        <View style={{ height: theme.Spacing.sm }} />
        <Button
          title="Cancel"
          variant="outline"
          onPress={() => navigation.goBack()}
        />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.Spacing.md,
    paddingTop: theme.Spacing.md,
    paddingBottom: theme.Spacing.xl,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: theme.Spacing.sm,
  },
  modeLabel: {
    color: theme.Colors.primary,
    fontWeight: "600",
    marginBottom: theme.Spacing.xs,
  },
});
