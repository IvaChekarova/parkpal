import React from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import ScreenWrapper from "../components/ScreenWrapper";
import Card from "../components/Card";
import SectionTitle from "../components/SectionTitle";
import theme from "../theme";
import type { RootStackParamList } from "../navigation/types";

type NavProp = NativeStackNavigationProp<RootStackParamList, "Reservations">;

const MOCK_RESERVATIONS = [
  {
    id: "r1",
    name: "Central Parking",
    address: "12 Main St",
    date: "May 20, 2026",
    duration: "2h",
    price: 5.0,
    status: "Active",
  },
  {
    id: "r2",
    name: "City Mall Garage",
    address: "5 Commerce Ave",
    date: "Jun 02, 2026",
    duration: "4h",
    price: 12.0,
    status: "Upcoming",
  },
  {
    id: "r3",
    name: "East Side Parking",
    address: "101 East Rd",
    date: "Apr 10, 2026",
    duration: "1.5h",
    price: 3.75,
    status: "Completed",
  },
];

export default function ReservationsScreen() {
  const navigation = useNavigation<NavProp>();
  const active = MOCK_RESERVATIONS.filter((r) => r.status === "Active");
  const upcoming = MOCK_RESERVATIONS.filter((r) => r.status === "Upcoming");

  function renderCard(
    item: (typeof MOCK_RESERVATIONS)[number],
    important = false,
  ) {
    const cardStyle = StyleSheet.flatten([
      styles.card,
      important ? styles.cardImportant : {},
    ]);
    return (
      <Card style={cardStyle}>
        <View style={styles.rowTop}>
          <View style={{ flex: 1 }}>
            <Text
              style={
                important ? theme.Typography.title : theme.Typography.subtitle
              }
            >
              {item.name}
            </Text>
            <Text style={[theme.Typography.caption, styles.muted]}>
              {item.address}
            </Text>
          </View>
          <View style={styles.statusWrap}>
            <View
              style={[
                styles.statusChip,
                item.status === "Active"
                  ? { backgroundColor: "rgba(89,165,117,0.12)" }
                  : { backgroundColor: "rgba(59,130,246,0.08)" },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  item.status === "Active"
                    ? { color: theme.Colors.secondaryGreen }
                    : { color: "#3b82f6" },
                ]}
              >
                {item.status}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.rowBottom}>
          <Text style={styles.muted}>
            {item.date} • {item.duration}
          </Text>
          <Text style={theme.Typography.subtitle}>
            €{item.price.toFixed(2)}
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <ScreenWrapper>
      <View style={styles.headerRow}>
        <SectionTitle>Your reservations</SectionTitle>
        <Pressable
          onPress={() => navigation.navigate("ReservationHistory")}
          style={styles.historyLink}
        >
          <Text style={styles.historyText}>View history</Text>
        </Pressable>
      </View>

      {active.length > 0 ? (
        <View>
          <Text style={styles.sectionTitle}>Active</Text>
          {active.map((r) => (
            <View key={r.id} style={{ marginBottom: theme.Spacing.sm }}>
              {renderCard(r, true)}
            </View>
          ))}
        </View>
      ) : null}

      {upcoming.length > 0 ? (
        <View style={{ marginTop: theme.Spacing.md }}>
          <Text style={styles.sectionTitle}>Upcoming</Text>
          {upcoming.map((r) => (
            <View key={r.id} style={{ marginBottom: theme.Spacing.sm }}>
              {renderCard(r)}
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={[]}
          renderItem={() => null}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text
                style={[theme.Typography.body, { marginTop: theme.Spacing.sm }]}
              >
                No reservations yet
              </Text>
            </View>
          )}
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  historyLink: { padding: theme.Spacing.xs },
  historyText: { color: theme.Colors.primary, fontWeight: "600" },
  sectionTitle: {
    ...theme.Typography.subtitle,
    marginBottom: theme.Spacing.sm,
  },
  card: { marginBottom: theme.Spacing.sm },
  cardImportant: { borderWidth: 1, borderColor: "rgba(20,43,108,0.06)" },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.Spacing.xs,
  },
  rowBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  muted: { ...theme.Typography.caption, color: theme.Colors.textSecondary },
  statusWrap: { marginLeft: theme.Spacing.sm },
  statusChip: {
    paddingHorizontal: theme.Spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.Radius.lg,
  },
  statusText: { fontSize: 12, fontWeight: "600" },
  empty: { alignItems: "center", marginTop: theme.Spacing.lg },
  emptyIcon: { fontSize: 40 },
});
