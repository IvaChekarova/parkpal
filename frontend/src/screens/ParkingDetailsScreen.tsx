import React from "react";
import { Text, StyleSheet, View, ScrollView, Pressable } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import ScreenWrapper from "../components/ScreenWrapper";
import Card from "../components/Card";
import Button from "../components/Button";
import theme from "../theme";
import type { RootStackParamList } from "../navigation/types";

type NavProp = NativeStackNavigationProp<RootStackParamList, "ParkingDetails">;

const FALLBACK = {
  id: "1",
  name: "Central Parking",
  address: "12 Main St, Downtown",
  spotsAvailable: 8,
  totalSpots: 50,
  price: 2.5,
  distance: "0.3 km",
  open: true,
  hours: "Mon–Sun 06:00–23:00",
  description:
    "Secure parking close to downtown. Covered levels and easy pedestrian access.",
  amenities: [
    "Covered parking",
    "Security cameras",
    "EV charging",
    "Easy access",
  ],
};

export default function ParkingDetailsScreen() {
  const navigation = useNavigation<NavProp>();
  const route: any = useRoute();
  const data = route.params?.parking ?? FALLBACK;

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
          onPress={() => {
            /* placeholder */
          }}
        />

        <View style={{ height: theme.Spacing.xl }} />
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
});
