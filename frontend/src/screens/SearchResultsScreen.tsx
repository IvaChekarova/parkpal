import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import Card from "../components/Card";
import ScreenWrapper from "../components/ScreenWrapper";
import { ParkingSummary } from "../services/parkingApi";
import theme from "../theme";
import type { RootStackParamList, SearchData } from "../navigation/types";

type NavProp = NativeStackNavigationProp<RootStackParamList, "SearchResults">;

export default function SearchResultsScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<any>();
  const results = (route.params?.results ?? []) as ParkingSummary[];
  const search = route.params?.search as SearchData | undefined;

  const title = search?.location?.trim() || "All locations";
  const timing =
    search?.mode === "long-term"
      ? `${search.fromDate ?? "Today"} - ${search.toDate ?? "May 17"}`
      : `${search?.date ?? "Today"} · ${search?.startTime ?? "10:00"} - ${
          search?.endTime ?? "12:00"
        }`;

  const renderItem = ({ item }: { item: ParkingSummary }) => {
    const isOpen = item.availableSpots > 0;

    return (
      <Pressable
        onPress={() =>
          navigation.navigate("ParkingDetails", { parkingId: item.id })
        }
      >
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleBlock}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.address}>{item.address}</Text>
            </View>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: isOpen
                    ? "rgba(89,165,117,0.12)"
                    : "rgba(2,6,23,0.06)",
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  {
                    color: isOpen
                      ? theme.Colors.secondaryGreen
                      : theme.Colors.textSecondary,
                  },
                ]}
              >
                {isOpen ? "Available" : "Full"}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.meta}>{item.city}</Text>
            <Text style={styles.meta}>{item.availableSpots} spots</Text>
            <Text style={styles.price}>€{item.pricePerHour.toFixed(2)}/hr</Text>
          </View>

          <Text style={styles.detailsLink}>View details</Text>
        </Card>
      </Pressable>
    );
  };

  return (
    <ScreenWrapper>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <View style={styles.summaryPill}>
          <Text style={styles.summaryTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.summarySubtitle} numberOfLines={1}>
            {timing}
          </Text>
        </View>
      </View>

      <View style={styles.mapPreview}>
        <View style={[styles.pin, styles.pinOne]}>
          <Text style={styles.pinText}>€0.65/hr</Text>
        </View>
        <View style={[styles.pin, styles.pinTwo]}>
          <Text style={styles.pinText}>€0.90/hr</Text>
        </View>
        <View style={[styles.pin, styles.pinThree]}>
          <Text style={styles.pinText}>€1.20/hr</Text>
        </View>
      </View>

      <View style={styles.resultsHeader}>
        <Text style={theme.Typography.subtitle}>Available parking</Text>
        <Text style={styles.resultCount}>
          {results.length} result{results.length === 1 ? "" : "s"} ·{" "}
          {search?.parkingType === "all" || !search?.parkingType
            ? "All types"
            : search.parkingType}
        </Text>
      </View>

      {results.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No parking options found</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => (
            <View style={{ height: theme.Spacing.sm }} />
          )}
          contentContainerStyle={{ paddingBottom: theme.Spacing.xl * 2 }}
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.Colors.surface,
    borderWidth: 1,
    borderColor: theme.Colors.border,
    marginRight: theme.Spacing.sm,
  },
  backIcon: { color: theme.Colors.primary, fontSize: 18, fontWeight: "700" },
  summaryPill: {
    flex: 1,
    backgroundColor: theme.Colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.Colors.border,
    paddingHorizontal: theme.Spacing.md,
    paddingVertical: 8,
  },
  summaryTitle: { ...theme.Typography.body, fontWeight: "700" },
  summarySubtitle: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
    marginTop: 2,
  },
  mapPreview: {
    height: 180,
    borderRadius: theme.Radius.lg,
    backgroundColor: "#EAF1F4",
    borderWidth: 1,
    borderColor: theme.Colors.border,
    overflow: "hidden",
    marginBottom: theme.Spacing.md,
  },
  pin: {
    position: "absolute",
    backgroundColor: theme.Colors.primary,
    paddingHorizontal: theme.Spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pinOne: { top: 34, left: 26 },
  pinTwo: { top: 78, right: 34 },
  pinThree: { bottom: 36, left: 118 },
  pinText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  resultsHeader: { marginBottom: theme.Spacing.sm },
  resultCount: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
    marginTop: theme.Spacing.xs,
  },
  card: { marginBottom: theme.Spacing.sm },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardTitleBlock: { flex: 1, paddingRight: theme.Spacing.sm },
  cardTitle: { ...theme.Typography.body, fontWeight: "700" },
  address: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
    marginTop: theme.Spacing.xs,
  },
  badge: {
    paddingHorizontal: theme.Spacing.sm,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeText: { fontSize: 12, fontWeight: "700" },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: theme.Spacing.md,
  },
  meta: { ...theme.Typography.caption, color: theme.Colors.textSecondary },
  price: { ...theme.Typography.caption, color: theme.Colors.primary },
  detailsLink: {
    color: theme.Colors.primary,
    fontWeight: "700",
    marginTop: theme.Spacing.md,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.Spacing.xl,
  },
  emptyText: { ...theme.Typography.body, color: theme.Colors.textSecondary },
});
