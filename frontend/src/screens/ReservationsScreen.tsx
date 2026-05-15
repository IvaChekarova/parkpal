import React from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import ScreenWrapper from "../components/ScreenWrapper";
import Card from "../components/Card";
import SectionTitle from "../components/SectionTitle";
import { Reservation, useParking } from "../context/ParkingContext";
import theme from "../theme";
import type { RootStackParamList } from "../navigation/types";

type NavProp = NativeStackNavigationProp<RootStackParamList, "Reservations">;

export default function ReservationsScreen() {
  const navigation = useNavigation<NavProp>();
  const { reservations } = useParking();
  const active = reservations.filter((r) => r.status === "active");
  const upcoming = reservations.filter((r) => r.status === "upcoming");
  const completed = reservations.filter((r) => r.status === "completed");
  const hasReservations = reservations.length > 0;

  function getStatusLabel(status: Reservation["status"]) {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  function renderCard(item: Reservation, important = false) {
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
                item.status === "active"
                  ? { backgroundColor: "rgba(89,165,117,0.12)" }
                  : item.status === "upcoming"
                    ? { backgroundColor: "rgba(59,130,246,0.08)" }
                    : { backgroundColor: "rgba(2,6,23,0.06)" },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  item.status === "active"
                    ? { color: theme.Colors.secondaryGreen }
                    : item.status === "upcoming"
                      ? { color: "#3b82f6" }
                      : { color: theme.Colors.textSecondary },
                ]}
              >
                {getStatusLabel(item.status)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.rowBottom}>
          <Text style={styles.muted}>
            {item.date} • {item.startTime}-{item.endTime} • {item.duration}
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
      ) : null}

      {completed.length > 0 ? (
        <View style={{ marginTop: theme.Spacing.md }}>
          <Text style={styles.sectionTitle}>Completed</Text>
          {completed.slice(0, 2).map((r) => (
            <View key={r.id} style={{ marginBottom: theme.Spacing.sm }}>
              {renderCard(r)}
            </View>
          ))}
        </View>
      ) : null}

      {!hasReservations ? (
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
      ) : null}
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
