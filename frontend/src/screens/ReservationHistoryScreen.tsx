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
import { useTranslation } from "react-i18next";

import AppHeader from "../components/AppHeader";
import ScreenWrapper from "../components/ScreenWrapper";
import { useAuth } from "../context/AuthContext";
import { useCurrency } from "../context/CurrencyContext";
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

const formatDuration = (
  minutes: number,
  t: (key: string, options?: Record<string, unknown>) => string
) => {
  if (minutes < 1440) {
    const hours = minutes / 60;
    return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
  }

  const days = Math.ceil(minutes / 1440);
  return t("parking.days", { count: days });
};

const statusStyle = (status: Reservation["status"]) => {
  if (status === "CANCELLED") {
    return {
      backgroundColor: "rgba(239,68,68,0.13)",
      color: "#f87171",
    };
  }

  return {
    backgroundColor: "rgba(148,171,207,0.12)",
    color: "#8ca6c8",
  };
};

const paymentStyle = (status?: ReservationPaymentStatus) => {
  if (status === "PAID") {
    return {
      backgroundColor: "rgba(8,214,163,0.13)",
      color: "#08d6a3",
    };
  }

  if (status === "FAILED") {
    return {
      backgroundColor: "rgba(239,68,68,0.1)",
      color: theme.Colors.error,
    };
  }

  return {
    backgroundColor: "rgba(245,158,11,0.14)",
    color: "#f59e0b",
  };
};

export default function ReservationHistoryScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const { token } = useAuth();
  const { formatPrice } = useCurrency();
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
              err instanceof Error ? err.message : t("reservations.unableLoad")
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
    }, [token, t])
  );

  return (
    <ScreenWrapper style={styles.screen}>
      <AppHeader />

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && { opacity: 0.82 },
            ]}
            accessibilityLabel={t("common.back")}
          >
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <View style={styles.titleBlock}>
            <Text style={styles.screenTitle}>{t("reservations.historyTitle")}</Text>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.empty}>
          <ActivityIndicator color="#38bdf8" />
        </View>
      ) : error ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{error}</Text>
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
              <View style={styles.card}>
                <View style={styles.rowTop}>
                  <View style={styles.cardTitleBlock}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.parking.name}
                    </Text>
                    <Text style={styles.cardAddress} numberOfLines={2}>
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
                      {t(`status.${item.status}`)}
                    </Text>
                  </View>
                </View>

                <View style={styles.rowBottom}>
                  <Text style={styles.cardMeta}>
                    {formatDate(item.startTime)} •{" "}
                    {formatDuration(item.durationMinutes, t)}
                  </Text>
                  <Text style={styles.cardPrice}>
                    {formatPrice(item.pricing.totalPrice)}
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
                      {t(`status.${item.payment?.paymentStatus ?? "PENDING"}`)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={() => <EmptyState />}
        />
      )}
    </ScreenWrapper>
  );
}

function EmptyState() {
  const { t } = useTranslation();

  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Text style={styles.emptyIconText}>P</Text>
      </View>
      <Text style={styles.emptyTitle}>{t("reservations.noHistory")}</Text>
      <Text style={styles.emptySubtitle}>
        {t("reservations.historyEmptyText")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#071426",
    padding: 0,
  },
  content: {
    paddingHorizontal: theme.Spacing.md,
    paddingTop: theme.Spacing.md,
    backgroundColor: "#071426",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.Spacing.sm,
    backgroundColor: "rgba(18,38,69,0.88)",
    borderWidth: 1,
    borderColor: "rgba(148,171,207,0.18)",
  },
  backIcon: {
    color: "#c7d7ee",
    fontSize: 18,
    fontWeight: "900",
  },
  titleBlock: {
    flex: 1,
  },
  screenTitle: {
    color: "#f8fbff",
    fontSize: 25,
    fontWeight: "900",
  },
  listContent: {
    paddingHorizontal: theme.Spacing.md,
    paddingTop: theme.Spacing.lg,
    paddingBottom: theme.Spacing.xl * 2,
    backgroundColor: "#071426",
  },
  card: {
    marginBottom: theme.Spacing.sm,
    borderRadius: 24,
    backgroundColor: "#10223f",
    borderWidth: 1,
    borderColor: "rgba(148,171,207,0.14)",
    padding: theme.Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: theme.Spacing.sm,
  },
  cardTitleBlock: {
    flex: 1,
    paddingRight: theme.Spacing.sm,
  },
  cardTitle: {
    color: "#f8fbff",
    fontSize: 17,
    fontWeight: "900",
  },
  cardAddress: {
    color: "#8ca6c8",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  rowBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: theme.Spacing.xs,
  },
  cardMeta: {
    color: "#8ca6c8",
    fontSize: 12,
    fontWeight: "800",
    flex: 1,
    paddingRight: theme.Spacing.sm,
  },
  cardPrice: {
    color: "#38bdf8",
    fontSize: 17,
    fontWeight: "900",
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
    fontWeight: "900",
  },
  statusChip: {
    paddingHorizontal: theme.Spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "900",
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    backgroundColor: "#071426",
    paddingHorizontal: theme.Spacing.md,
  },
  emptyText: {
    color: "#8ca6c8",
    textAlign: "center",
    fontWeight: "700",
  },
  emptyCard: {
    minHeight: 150,
    borderRadius: 24,
    backgroundColor: "#10223f",
    borderWidth: 1,
    borderColor: "rgba(148,171,207,0.14)",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.Spacing.lg,
  },
  emptyIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(56,189,248,0.13)",
    marginBottom: theme.Spacing.sm,
  },
  emptyIconText: {
    color: "#38bdf8",
    fontSize: 16,
    fontWeight: "900",
  },
  emptyTitle: {
    color: "#f8fbff",
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },
  emptySubtitle: {
    color: "#8ca6c8",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 5,
  },
});
