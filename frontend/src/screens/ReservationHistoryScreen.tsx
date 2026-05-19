import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import Card from "../components/Card";
import ScreenWrapper from "../components/ScreenWrapper";
import { useAuth } from "../context/AuthContext";
import type { RootStackParamList } from "../navigation/types";
import { reservationApi, Reservation } from "../services/reservationApi";
import theme from "../theme";

type NavProp = NativeStackNavigationProp<
  RootStackParamList,
  "ReservationHistory"
>;
type ReservationPaymentStatus = NonNullable<
  Reservation["payment"]
>["paymentStatus"];

const formatDate = (value: string) => {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDuration = (minutes: number) => {
  if (minutes < 1440) {
    const hours = minutes / 60;
    return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
  }

  const days = Math.ceil(minutes / 1440);
  return `${days} day${days === 1 ? "" : "s"}`;
};

const statusLabel = (status: Reservation["status"]) => {
  if (status === "CANCELLED") return "Cancelled";
  return "Completed";
};

const statusStyle = (status: Reservation["status"]) => {
  if (status === "CANCELLED") {
    return {
      backgroundColor: "rgba(239,68,68,0.1)",
      color: theme.Colors.error,
    };
  }

  return {
    backgroundColor: "rgba(2,6,23,0.06)",
    color: theme.Colors.textSecondary,
  };
};

const paymentLabel = (status?: ReservationPaymentStatus) => {
  if (status === "PAID") return "Paid";
  if (status === "FAILED") return "Failed";
  return "Pending";
};

const paymentStyle = (status?: ReservationPaymentStatus) => {
  if (status === "PAID") {
    return {
      backgroundColor: "rgba(89,165,117,0.12)",
      color: theme.Colors.secondaryGreen,
    };
  }

  if (status === "FAILED") {
    return {
      backgroundColor: "rgba(239,68,68,0.1)",
      color: theme.Colors.error,
    };
  }

  return {
    backgroundColor: "rgba(59,130,246,0.08)",
    color: "#3b82f6",
  };
};

export default function ReservationHistoryScreen() {
  const navigation = useNavigation<NavProp>();
  const { token } = useAuth();
  const [history, setHistory] = React.useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;

      const loadHistory = async () => {
        if (!token) {
          setHistory([]);
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        setError("");

        try {
          const reservations = await reservationApi.getMyReservations(token);

          if (isMounted) {
            setHistory(
              reservations.filter(
                (r) => r.status === "COMPLETED" || r.status === "CANCELLED"
              )
            );
          }
        } catch (err) {
          if (isMounted) {
            setError(
              err instanceof Error ? err.message : "Unable to load history."
            );
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      };

      loadHistory();

      return () => {
        isMounted = false;
      };
    }, [token])
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

      {isLoading ? (
        <View style={styles.empty}>
          <ActivityIndicator color={theme.Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.empty}>
          <Text style={theme.Typography.body}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const badge = statusStyle(item.status);
            const paymentBadge = paymentStyle(item.payment?.paymentStatus);

            return (
              <Card style={styles.card}>
                <View style={styles.rowTop}>
                  <View style={styles.titleBlock}>
                    <Text style={theme.Typography.subtitle}>
                      {item.parking.name}
                    </Text>
                    <Text style={[theme.Typography.caption, styles.muted]}>
                      {item.parking.address}, {item.parking.city}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusChip,
                      { backgroundColor: badge.backgroundColor },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: badge.color }]}>
                      {statusLabel(item.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.rowBottom}>
                  <Text style={styles.muted}>
                    {formatDate(item.startTime)} •{" "}
                    {formatDuration(item.durationMinutes)}
                  </Text>
                  <Text style={theme.Typography.subtitle}>
                    €{item.pricing.totalPrice.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.paymentRow}>
                  <View
                    style={[
                      styles.paymentChip,
                      { backgroundColor: paymentBadge.backgroundColor },
                    ]}
                  >
                    <Text
                      style={[styles.paymentText, { color: paymentBadge.color }]}
                    >
                      {paymentLabel(item.payment?.paymentStatus)}
                    </Text>
                  </View>
                </View>
              </Card>
            );
          }}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Text style={theme.Typography.body}>
                No completed reservations yet
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
  paymentRow: {
    flexDirection: "row",
    marginTop: theme.Spacing.sm,
  },
  paymentChip: {
    borderRadius: 999,
    paddingHorizontal: theme.Spacing.sm,
    paddingVertical: 5,
  },
  paymentText: {
    fontSize: 12,
    fontWeight: "700",
  },
  muted: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
  },
  statusChip: {
    paddingHorizontal: theme.Spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.Radius.lg,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  empty: {
    alignItems: "center",
    marginTop: theme.Spacing.lg,
  },
});
