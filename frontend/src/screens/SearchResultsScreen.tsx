import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import ScreenWrapper from "../components/ScreenWrapper";
import Card from "../components/Card";
import SectionTitle from "../components/SectionTitle";
import { Parking, useParking } from "../context/ParkingContext";
import {
  formatDuration,
  getBookingDateSummary,
  getBookingHours,
  getBookingSummaryLabel,
} from "../utils/booking";
import theme from "../theme";
import type { RootStackParamList } from "../navigation/types";

type NavProp = NativeStackNavigationProp<RootStackParamList, "SearchResults">;
type RouteProps = RouteProp<RootStackParamList, "SearchResults">;

export default function SearchResultsScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const { parkings } = useParking();
  const { booking } = route.params;
  const durationHours = getBookingHours(booking);
  const summaryLabel = getBookingSummaryLabel(booking);
  const dateSummary = getBookingDateSummary(booking);
  const availableParkings = parkings.filter(
    (parking) => parking.spotsAvailable > 0,
  );

  function renderParking({ item }: { item: Parking }) {
    const estimatedTotal = item.price * durationHours;

    return (
      <Pressable
        onPress={() =>
          navigation.navigate("ParkingDetails", {
            parkingId: item.id,
            booking,
          })
        }
      >
        <Card style={styles.card}>
          <View style={styles.rowTop}>
            <View style={styles.titleBlock}>
              <Text style={theme.Typography.subtitle}>{item.name}</Text>
              <Text style={[theme.Typography.caption, styles.muted]}>
                {item.address}
              </Text>
            </View>

            <View style={styles.totalBlock}>
              <Text style={theme.Typography.subtitle}>
                €{estimatedTotal.toFixed(2)}
              </Text>
              <Text style={styles.muted}>est.</Text>
            </View>
          </View>

          <View style={styles.rowBottom}>
            <Text style={styles.muted}>{item.spotsAvailable} spots</Text>
            <Text style={styles.muted}>€{item.price.toFixed(2)}/hr</Text>
            <Text style={styles.viewDetails}>View details</Text>
          </View>
        </Card>
      </Pressable>
    );
  }

  return (
    <ScreenWrapper>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Back"
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <SectionTitle>{summaryLabel}</SectionTitle>
      </View>

      <Card style={styles.summaryCard}>
        <Text style={theme.Typography.subtitle}>{booking.location}</Text>
        <Text style={[theme.Typography.caption, styles.summaryText]}>
          {dateSummary} • {formatDuration(durationHours)}
        </Text>
      </Card>

      <FlatList
        data={availableParkings}
        keyExtractor={(item) => item.id}
        renderItem={renderParking}
        contentContainerStyle={styles.listContent}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    padding: theme.Spacing.sm,
    paddingLeft: 0,
    marginRight: theme.Spacing.xs,
    borderRadius: theme.Radius.sm,
  },
  backIcon: {
    color: theme.Colors.primary,
    fontSize: 18,
    fontWeight: "700",
  },
  summaryCard: {
    marginTop: theme.Spacing.md,
  },
  summaryText: {
    color: theme.Colors.textSecondary,
    marginTop: theme.Spacing.xs,
  },
  listContent: {
    paddingTop: theme.Spacing.md,
    paddingBottom: theme.Spacing.xl * 2,
  },
  card: {
    marginBottom: theme.Spacing.sm,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: theme.Spacing.sm,
  },
  titleBlock: {
    flex: 1,
    paddingRight: theme.Spacing.sm,
  },
  totalBlock: {
    alignItems: "flex-end",
  },
  rowBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  muted: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
  },
  viewDetails: {
    color: theme.Colors.primary,
    fontWeight: "600",
  },
});
