import React from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import AppHeader from "../components/AppHeader";
import ScreenWrapper from "../components/ScreenWrapper";
import { useCurrency } from "../context/CurrencyContext";
import { useAuth } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeModeContext";
import type { RootStackParamList } from "../navigation/types";
import { reservationApi, Reservation } from "../services/reservationApi";
import theme from "../theme";

type NavProp = NativeStackNavigationProp<RootStackParamList, "Reservations">;
type ReservationTypeTab = "ONE_TIME" | "LONG_TERM";
type ReservationPaymentStatus = NonNullable<
  Reservation["payment"]
>["paymentStatus"];

const RESERVATION_TYPE_TABS: { labelKey: string; value: ReservationTypeTab }[] = [
  { labelKey: "reservations.oneTime", value: "ONE_TIME" },
  { labelKey: "reservations.longTerm", value: "LONG_TERM" },
];
const ONE_TIME_CANCELLATION_WINDOW_MS = 30 * 60 * 1000;
const LONG_TERM_CANCELLATION_WINDOW_MS = 24 * 60 * 60 * 1000;

type ToastState = {
  message: string;
  variant: "neutral" | "error";
};

const statusStyle = (status: Reservation["status"]) => {
  if (status === "ACTIVE") {
    return {
      backgroundColor: "rgba(8,214,163,0.13)",
      color: "#08d6a3",
    };
  }

  if (status === "COMPLETED") {
    return {
      backgroundColor: "rgba(148,171,207,0.12)",
      color: "#8ca6c8",
    };
  }

  if (status === "CANCELLED") {
    return {
      backgroundColor: "rgba(239,68,68,0.13)",
      color: "#f87171",
    };
  }

  return {
    backgroundColor: "rgba(56,189,248,0.13)",
    color: "#38bdf8",
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

const canCancelReservation = (reservation: Reservation) => {
  if (reservation.status !== "UPCOMING") return false;

  const cancellationWindowMs =
    reservation.reservationType === "LONG_TERM"
      ? LONG_TERM_CANCELLATION_WINDOW_MS
      : ONE_TIME_CANCELLATION_WINDOW_MS;

  return (
    new Date(reservation.startTime).getTime() - Date.now() >=
    cancellationWindowMs
  );
};

export default function ReservationsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { formatPrice } = useCurrency();
  const { themeTokens } = useThemeMode();
  const colors = themeTokens.colors;
  const [reservations, setReservations] = React.useState<Reservation[]>([]);
  const [selectedType, setSelectedType] =
    React.useState<ReservationTypeTab>("ONE_TIME");
  const [isLoading, setIsLoading] = React.useState(true);
  const [cancellingId, setCancellingId] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<ToastState | null>(null);
  const [error, setError] = React.useState("");

  const loadReservations = React.useCallback(async () => {
    if (!token) {
      setReservations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const results = await reservationApi.getMyReservations(token);
      setReservations(results);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("reservations.unableLoad")
      );
    } finally {
      setIsLoading(false);
    }
  }, [token, t]);

  useFocusEffect(
    React.useCallback(() => {
      loadReservations();
    }, [loadReservations])
  );

  const visibleReservations = reservations.filter(
    (r) => r.reservationType === selectedType
  );
  const active = visibleReservations.filter((r) => r.status === "ACTIVE");
  const upcoming = visibleReservations.filter((r) => r.status === "UPCOMING");

  const cancelReservation = async (reservation: Reservation) => {
    if (!token || cancellingId) return;

    setCancellingId(reservation.id);

    try {
      const cancelled = await reservationApi.cancelReservation(
        reservation.id,
        token
      );

      setReservations((current) =>
        current.map((item) => (item.id === cancelled.id ? cancelled : item))
      );
      setToast({ message: t("reservations.cancelledToast"), variant: "neutral" });
    } catch (err) {
      setToast({
        message:
          err instanceof Error ? err.message : t("reservations.unableCancel"),
        variant: "error",
      });
    } finally {
      setCancellingId(null);
    }
  };

  const confirmCancelReservation = (reservation: Reservation) => {
    Alert.alert(
      t("reservations.cancelTitle"),
      t("reservations.cancelMessage"),
      [
        {
          text: t("reservations.keepReservation"),
          style: "cancel",
        },
        {
          text: t("reservations.cancelReservation"),
          style: "destructive",
          onPress: () => {
            void cancelReservation(reservation);
          },
        },
      ]
    );
  };

  function renderCard(item: Reservation, important = false) {
    const badge = statusStyle(item.status);
    const paymentBadge = paymentStyle(item.payment?.paymentStatus);
    const isUpcoming = item.status === "UPCOMING";
    const isCancellable = canCancelReservation(item);
    const isCancelling = cancellingId === item.id;

    return (
      <View
        style={[
          styles.card,
          important && styles.cardImportant,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.rowTop}>
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.cardTitle, { color: colors.text }]}
              numberOfLines={1}
            >
              {item.parking.name}
            </Text>
            <Text style={[styles.cardAddress, { color: colors.textMuted }]} numberOfLines={2}>
              {item.parking.address}, {item.parking.city}
            </Text>
          </View>
          <View style={styles.statusWrap}>
            <View
              style={[
                styles.statusChip,
                { backgroundColor: badge.backgroundColor },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: badge.color },
                ]}
              >
                {t(`status.${item.status}`)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.rowBottom}>
          <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
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
            <Text style={[styles.paymentText, { color: paymentBadge.color }]}>
              {t(`status.${item.payment?.paymentStatus ?? "PENDING"}`)}
            </Text>
          </View>
        </View>

        {isUpcoming ? (
          <View style={styles.cancelRow}>
            <Pressable
              disabled={!isCancellable || Boolean(cancellingId)}
              onPress={() => confirmCancelReservation(item)}
              style={({ pressed }) => [
                styles.cancelButton,
                !isCancellable && styles.cancelButtonDisabled,
                pressed && { opacity: 0.82 },
              ]}
            >
              <Text
                style={[
                  styles.cancelButtonText,
                  !isCancellable && styles.cancelButtonTextDisabled,
                ]}
              >
                {isCancelling
                  ? t("reservations.cancelling")
                  : isCancellable
                    ? t("reservations.cancel")
                    : t("reservations.cancellationClosed")}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <ScreenWrapper style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppHeader />
      <View style={[styles.content, { backgroundColor: colors.background }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.screenTitle, { color: colors.text }]}>
            {t("reservations.title")}
          </Text>
          <Pressable
            onPress={() => navigation.navigate("ReservationHistory")}
            style={({ pressed }) => [
              styles.historyLink,
              pressed && { opacity: 0.82 },
            ]}
          >
            <Text style={styles.historyText}>{t("reservations.history")}</Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.segmentedControl,
            { backgroundColor: colors.input, borderColor: colors.border },
          ]}
        >
          {RESERVATION_TYPE_TABS.map((item) => {
            const isActive = selectedType === item.value;

            return (
              <Pressable
                key={item.value}
                onPress={() => setSelectedType(item.value)}
                style={({ pressed }) => [
                  styles.segmentButton,
                  isActive && styles.segmentButtonActive,
                  pressed && { opacity: 0.86 },
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    isActive && styles.segmentTextActive,
                  ]}
                >
                  {t(item.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <View style={[styles.empty, { backgroundColor: colors.background }]}>
          <ActivityIndicator color="#38bdf8" />
        </View>
      ) : error ? (
        <View style={[styles.empty, { backgroundColor: colors.background }]}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.listContent,
            { backgroundColor: colors.background },
          ]}
        >
          {active.length > 0 ? (
            <View>
              <Text style={styles.sectionTitle}>{t("reservations.active")}</Text>
              {active.map((item) => (
                <View key={item.id}>{renderCard(item, true)}</View>
              ))}
            </View>
          ) : (
            <View>
              <Text style={styles.sectionTitle}>{t("reservations.active")}</Text>
              <EmptyState title={t("reservations.noActive")} />
            </View>
          )}

          {upcoming.length > 0 ? (
            <View style={{ marginTop: theme.Spacing.md }}>
              <Text style={styles.sectionTitle}>{t("reservations.upcoming")}</Text>
              {upcoming.map((item) => (
                <View key={item.id}>{renderCard(item)}</View>
              ))}
            </View>
          ) : (
            <View style={{ marginTop: theme.Spacing.md }}>
              <Text style={styles.sectionTitle}>{t("reservations.upcoming")}</Text>
              <EmptyState title={t("reservations.noUpcoming")} />
            </View>
          )}
        </ScrollView>
      )}

      {toast ? (
        <Toast
          message={toast.message}
          variant={toast.variant}
          topOffset={insets.top + theme.Spacing.sm}
          onHide={() => setToast(null)}
        />
      ) : null}
    </ScreenWrapper>
  );
}

function EmptyState({ title }: { title: string }) {
  const { themeTokens } = useThemeMode();
  const colors = themeTokens.colors;

  return (
    <View
      style={[
        styles.emptyCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.emptyIcon}>
        <Text style={styles.emptyIconText}>P</Text>
      </View>
      <Text style={[styles.sectionEmptyText, { color: colors.textMuted }]}>
        {title}
      </Text>
    </View>
  );
}

function Toast({
  message,
  variant,
  topOffset,
  onHide,
}: {
  message: string;
  variant: "neutral" | "error";
  topOffset: number;
  onHide: () => void;
}) {
  const translateY = React.useRef(new Animated.Value(-90)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(1800),
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -90,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]),
    ]).start(onHide);
  }, [onHide, opacity, translateY]);

  return (
    <Animated.View
      style={[
        styles.toast,
        { top: topOffset },
        { opacity, transform: [{ translateY }] },
        variant === "error" ? styles.toastError : styles.toastNeutral,
      ]}
    >
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
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
    justifyContent: "space-between",
  },
  screenTitle: {
    color: "#f8fbff",
    fontSize: 26,
    fontWeight: "900",
  },
  historyLink: {
    borderRadius: 999,
    paddingHorizontal: theme.Spacing.sm,
    paddingVertical: 7,
    backgroundColor: "rgba(56,189,248,0.1)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.22)",
  },
  historyText: { color: "#38bdf8", fontWeight: "900", fontSize: 12 },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "rgba(8,24,45,0.92)",
    borderRadius: 999,
    padding: 4,
    marginTop: theme.Spacing.md,
    marginBottom: theme.Spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(148,171,207,0.12)",
  },
  segmentButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    borderRadius: 999,
  },
  segmentButtonActive: {
    backgroundColor: "#38bdf8",
  },
  segmentText: {
    color: "#8ca6c8",
    fontSize: 13,
    fontWeight: "900",
  },
  segmentTextActive: {
    color: "#071426",
  },
  sectionTitle: {
    color: "#b8cbea",
    fontSize: 14,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: theme.Spacing.sm,
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
  listContent: {
    paddingHorizontal: theme.Spacing.md,
    paddingBottom: theme.Spacing.xl * 2,
    backgroundColor: "#071426",
  },
  cardImportant: { borderColor: "rgba(56,189,248,0.28)" },
  rowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: theme.Spacing.sm,
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
  cancelRow: {
    alignItems: "flex-end",
    marginTop: theme.Spacing.sm,
  },
  cancelButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.22)",
    backgroundColor: "rgba(239,68,68,0.08)",
    paddingHorizontal: theme.Spacing.md,
    paddingVertical: 8,
  },
  cancelButtonDisabled: {
    borderColor: "rgba(148,171,207,0.14)",
    backgroundColor: "rgba(148,171,207,0.08)",
  },
  cancelButtonText: {
    color: "#f87171",
    fontSize: 12,
    fontWeight: "900",
  },
  cancelButtonTextDisabled: {
    color: "#8ca6c8",
  },
  statusWrap: { marginLeft: theme.Spacing.sm },
  statusChip: {
    paddingHorizontal: theme.Spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: { fontSize: 12, fontWeight: "900" },
  empty: {
    alignItems: "center",
    marginTop: theme.Spacing.lg,
    backgroundColor: "#071426",
  },
  emptyText: {
    color: "#8ca6c8",
    marginTop: theme.Spacing.sm,
    textAlign: "center",
  },
  emptyCard: {
    minHeight: 112,
    borderRadius: 22,
    backgroundColor: "#10223f",
    borderWidth: 1,
    borderColor: "rgba(148,171,207,0.14)",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.Spacing.md,
  },
  emptyIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(56,189,248,0.13)",
    marginBottom: theme.Spacing.sm,
  },
  emptyIconText: {
    color: "#38bdf8",
    fontSize: 15,
    fontWeight: "900",
  },
  sectionEmptyText: {
    color: "#8ca6c8",
    fontSize: 13,
    fontWeight: "800",
  },
  toast: {
    position: "absolute",
    left: theme.Spacing.lg,
    right: theme.Spacing.lg,
    borderRadius: theme.Radius.lg,
    paddingVertical: theme.Spacing.sm,
    paddingHorizontal: theme.Spacing.md,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  toastNeutral: {
    backgroundColor: theme.Colors.textPrimary,
  },
  toastError: {
    backgroundColor: theme.Colors.error,
  },
  toastText: {
    color: "#fff",
    fontWeight: "700",
  },
});
