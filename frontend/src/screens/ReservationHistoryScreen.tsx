import React from "react";
import { View, Text, StyleSheet, Pressable, FlatList } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import ScreenWrapper from "../components/ScreenWrapper";
import Card from "../components/Card";
import { useParking } from "../context/ParkingContext";
import theme from "../theme";
import type { RootStackParamList } from "../navigation/types";

type NavProp = NativeStackNavigationProp<
  RootStackParamList,
  "ReservationHistory"
>;

export default function ReservationHistoryScreen() {
  const navigation = useNavigation<NavProp>();
  const { reservations } = useParking();
  const completedReservations = reservations.filter(
    (reservation) => reservation.status === "Completed",
  );

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
        <Text style={theme.Typography.title}>Reservation history</Text>
      </View>

      <FlatList
        data={completedReservations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.rowTop}>
              <View style={styles.titleBlock}>
                <Text style={theme.Typography.subtitle}>{item.name}</Text>
                <Text style={[theme.Typography.caption, styles.muted]}>
                  {item.address}
                </Text>
              </View>

              <View style={styles.statusChip}>
                <Text style={styles.statusText}>{item.status}</Text>
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
        )}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={theme.Typography.body}>
              No completed reservations yet
            </Text>
          </View>
        )}
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
  listContent: {
    paddingTop: theme.Spacing.md,
    paddingBottom: theme.Spacing.xl * 2,
  },
  card: {
    marginBottom: theme.Spacing.sm,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.Spacing.xs,
  },
  titleBlock: {
    flex: 1,
    paddingRight: theme.Spacing.sm,
  },
  rowBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  muted: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
  },
  statusChip: {
    paddingHorizontal: theme.Spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.Radius.lg,
    backgroundColor: "rgba(2,6,23,0.06)",
  },
  statusText: {
    color: theme.Colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  empty: {
    alignItems: "center",
    marginTop: theme.Spacing.lg,
  },
});
