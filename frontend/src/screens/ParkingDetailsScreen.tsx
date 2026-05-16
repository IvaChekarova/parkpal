import React from "react";
import {
  ActivityIndicator,
  Text,
  StyleSheet,
  View,
  ScrollView,
  Pressable,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import ScreenWrapper from "../components/ScreenWrapper";
import Card from "../components/Card";
import Button from "../components/Button";
import theme from "../theme";
import type { RootStackParamList } from "../navigation/types";
import { parkingApi, ParkingDetails } from "../services/parkingApi";

type NavProp = NativeStackNavigationProp<RootStackParamList, "ParkingDetails">;

export default function ParkingDetailsScreen() {
  const navigation = useNavigation<NavProp>();
  const route: any = useRoute();
  const parkingId = route.params?.parkingId;
  const legacyParking = route.params?.parking;
  const [parking, setParking] = React.useState<ParkingDetails | null>(null);
  const [isLoading, setIsLoading] = React.useState(Boolean(parkingId));
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!parkingId) return;

    let isMounted = true;

    const loadParking = async () => {
      setIsLoading(true);
      setError("");

      try {
        const result = await parkingApi.getParkingById(parkingId);

        if (isMounted) {
          setParking(result);
        }
      } catch (_err) {
        if (isMounted) {
          setError("Unable to load parking details. Please try again.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadParking();

    return () => {
      isMounted = false;
    };
  }, [parkingId]);

  const data = parking
    ? {
        name: parking.name,
        address: `${parking.address}, ${parking.city}`,
        spotsAvailable: parking.availableSpots,
        totalSpots: parking.totalSpots,
        price: parking.pricePerHour,
        distance: parking.city,
        open: parking.availableSpots > 0,
        hours: "Open daily",
        description:
          parking.description ??
          "Convenient ParkPal parking with real-time spot availability.",
        amenities:
          parking.parkingType === "PRIVATE"
            ? ["Private parking", "Limited access", "Verified location"]
            : ["Public parking", "Easy access", "Verified location"],
      }
    : legacyParking
      ? {
          name: legacyParking.name,
          address: legacyParking.address,
          spotsAvailable: 0,
          totalSpots: 0,
          price: legacyParking.price,
          distance: "",
          open: true,
          hours: "Open daily",
          description:
            "Convenient ParkPal parking with real-time spot availability.",
          amenities: ["Verified location", "Easy access"],
        }
      : null;

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityLabel="Back"
          >
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator color={theme.Colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.stateContainer}>
            <Text style={styles.stateText}>{error}</Text>
            <View style={{ height: theme.Spacing.md }} />
            <Button title="Go back" variant="outline" onPress={navigation.goBack} />
          </View>
        ) : !data ? (
          <View style={styles.stateContainer}>
            <Text style={styles.stateText}>Parking location not found</Text>
          </View>
        ) : (
          <>
            <Text
              style={theme.Typography.title}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {data.name}
            </Text>

            <Text
              style={[theme.Typography.body, styles.address]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {data.address}
            </Text>

        <View style={{ height: theme.Spacing.md }} />

        <Card>
          <View style={styles.cardTopRow}>
            <View style={styles.leftBlock}>
              <Text style={theme.Typography.subtitle}>Availability</Text>
              <Text style={theme.Typography.title}>{data.spotsAvailable}</Text>
              <Text style={[theme.Typography.caption, styles.muted]}>
                of {data.totalSpots}
              </Text>
            </View>

            <View style={styles.rightBlock}>
              <Text style={theme.Typography.subtitle}>Price</Text>
              <Text style={theme.Typography.title}>
                €{data.price.toFixed(2)}/hr
              </Text>
              <Text style={[theme.Typography.caption, styles.muted]}>
                {data.distance}
              </Text>
            </View>
          </View>

          <View style={{ height: theme.Spacing.sm }} />

          <View style={styles.cardBottomRow}>
            <View
              style={[
                styles.statusChip,
                {
                  backgroundColor: data.open
                    ? "rgba(89,165,117,0.12)"
                    : "rgba(2,6,23,0.06)",
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: data.open
                      ? theme.Colors.secondaryGreen
                      : theme.Colors.border,
                  },
                ]}
              />
              <Text
                style={[
                  styles.statusLabel,
                  {
                    color: data.open
                      ? theme.Colors.secondaryGreen
                      : theme.Colors.textSecondary,
                  },
                ]}
              >
                {data.open ? "Open" : "Full"}
              </Text>
            </View>

            <View style={styles.hoursBlock}>
              <Text style={[theme.Typography.caption, styles.muted]}>
                Hours
              </Text>
              <Text style={theme.Typography.body}>{data.hours}</Text>
            </View>
          </View>
        </Card>

        <View style={{ height: theme.Spacing.md }} />

        <Text style={theme.Typography.subtitle}>About</Text>
        <Text style={[theme.Typography.body, { marginTop: theme.Spacing.xs }]}>
          {data.description}
        </Text>

        <View style={{ height: theme.Spacing.md }} />

        <Text style={theme.Typography.subtitle}>Amenities</Text>
        <View style={styles.amenitiesRow}>
          {data.amenities.map((a: string) => (
            <View key={a} style={styles.amenityChip}>
              <Text style={styles.amenityText}>{a}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: theme.Spacing.lg }} />

        <Button
          title="Reserve spot"
          onPress={() =>
            navigation.navigate("ReservationConfirm", {
              parking: {
                name: data.name,
                address: data.address,
                pricePerHour: data.price,
              },
            })
          }
        />

            <View style={{ height: theme.Spacing.xl }} />
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  // make horizontal padding match HomeScreen (more edge-to-edge)
  container: {
    paddingTop: theme.Spacing.lg,
    paddingHorizontal: theme.Spacing.md,
    paddingBottom: theme.Spacing.xl * 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.Spacing.sm,
  },
  backButton: { padding: theme.Spacing.sm, borderRadius: theme.Radius.sm },
  backIcon: { color: theme.Colors.primary, fontSize: 18, fontWeight: "700" },
  address: { color: theme.Colors.textSecondary, marginTop: theme.Spacing.xs },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  leftBlock: { flex: 1, paddingRight: theme.Spacing.sm },
  rightBlock: { width: 100, alignItems: "flex-end" },
  cardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.Spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.Radius.lg,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: theme.Spacing.xs,
  },
  statusLabel: { fontSize: 13, fontWeight: "600" },
  hoursBlock: { alignItems: "flex-end", maxWidth: 140 },
  amenitiesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: theme.Spacing.sm,
  },
  amenityChip: {
    backgroundColor: theme.Colors.background,
    paddingHorizontal: theme.Spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.Radius.md,
    marginRight: theme.Spacing.sm,
    marginTop: theme.Spacing.sm,
  },
  amenityText: { ...theme.Typography.caption, color: theme.Colors.textPrimary },
  muted: { color: theme.Colors.textSecondary },
  stateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.Spacing.xl,
  },
  stateText: {
    ...theme.Typography.body,
    color: theme.Colors.textSecondary,
    textAlign: "center",
  },
});
