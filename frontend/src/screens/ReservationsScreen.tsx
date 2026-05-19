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

import Card from "../components/Card";
import ScreenWrapper from "../components/ScreenWrapper";
import SectionTitle from "../components/SectionTitle";
import { useAuth } from "../context/AuthContext";
import type { RootStackParamList } from "../navigation/types";
import { reservationApi, Reservation } from "../services/reservationApi";
import theme from "../theme";

type NavProp = NativeStackNavigationProp<RootStackParamList, "Reservations">;
type ReservationTypeTab = "ONE_TIME" | "LONG_TERM";
type ReservationPaymentStatus = NonNullable<
  Reservation["payment"]
>["paymentStatus"];

const RESERVATION_TYPE_TABS: { label: string; value: ReservationTypeTab }[] = [
  { label: "One-time", value: "ONE_TIME" },
  { label: "Long-term", value: "LONG_TERM" },
];
const ONE_TIME_CANCELLATION_WINDOW_MS = 30 * 60 * 1000;
const LONG_TERM_CANCELLATION_WINDOW_MS = 24 * 60 * 60 * 1000;

type ToastState = {
  message: string;
  variant: "neutral" | "error";
};

const statusLabel = (status: Reservation["status"]) => {
  if (status === "ACTIVE") return "Active";
  if (status === "COMPLETED") return "Completed";
  if (status === "CANCELLED") return "Cancelled";
  return "Upcoming";
};

const statusStyle = (status: Reservation["status"]) => {
  if (status === "ACTIVE") {
    return {
      backgroundColor: "rgba(89,165,117,0.12)",
      color: theme.Colors.secondaryGreen,
    };
  }

  if (status === "COMPLETED") {
    return {
      backgroundColor: "rgba(2,6,23,0.06)",
      color: theme.Colors.textSecondary,
    };
  }

  if (status === "CANCELLED") {
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
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
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
        err instanceof Error ? err.message : "Unable to load reservations."
      );
    } finally {
      setIsLoading(false);
    }
  }, [token]);

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
      setToast({ message: "Reservation cancelled", variant: "neutral" });
    } catch (err) {
      setToast({
        message:
          err instanceof Error ? err.message : "Unable to cancel reservation.",
        variant: "error",
      });
    } finally {
      setCancellingId(null);
    }
  };

  const confirmCancelReservation = (reservation: Reservation) => {
    Alert.alert(
      "Cancel reservation?",
      "This action cannot be undone.",
      [
        {
          text: "Keep reservation",
          style: "cancel",
        },
        {
          text: "Cancel reservation",
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
              {item.parking.name}
            </Text>
            <Text style={[theme.Typography.caption, styles.muted]}>
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
                {statusLabel(item.status)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.rowBottom}>
          <Text style={styles.muted}>
            {formatDate(item.startTime)} • {formatDuration(item.durationMinutes)}
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
            <Text style={[styles.paymentText, { color: paymentBadge.color }]}>
              {paymentLabel(item.payment?.paymentStatus)}
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
                  ? "Cancelling..."
                  : isCancellable
                    ? "Cancel"
                    : "Cancellation closed"}
              </Text>
            </Pressable>
          </View>
        ) : null}
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

      <View style={styles.segmentedControl}>
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
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.empty}>
          <ActivityIndicator color={theme.Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {active.length > 0 ? (
            <View>
              <Text style={styles.sectionTitle}>Active</Text>
              {active.map((item) => (
                <View key={item.id}>{renderCard(item, true)}</View>
              ))}
            </View>
          ) : (
            <View>
              <Text style={styles.sectionTitle}>Active</Text>
              <Text style={styles.sectionEmptyText}>No active reservations</Text>
            </View>
          )}

          {upcoming.length > 0 ? (
            <View style={{ marginTop: theme.Spacing.md }}>
              <Text style={styles.sectionTitle}>Upcoming</Text>
              {upcoming.map((item) => (
                <View key={item.id}>{renderCard(item)}</View>
              ))}
            </View>
          ) : (
            <View style={{ marginTop: theme.Spacing.md }}>
              <Text style={styles.sectionTitle}>Upcoming</Text>
              <Text style={styles.sectionEmptyText}>No upcoming reservations</Text>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  historyLink: { padding: theme.Spacing.xs },
  historyText: { color: theme.Colors.primary, fontWeight: "600" },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: theme.Colors.background,
    borderRadius: theme.Radius.lg,
    padding: 4,
    marginTop: theme.Spacing.md,
    marginBottom: theme.Spacing.lg,
  },
  segmentButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    borderRadius: theme.Radius.md,
  },
  segmentButtonActive: {
    backgroundColor: theme.Colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  segmentText: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
    fontWeight: "700",
  },
  segmentTextActive: {
    color: theme.Colors.primary,
  },
  sectionTitle: {
    ...theme.Typography.subtitle,
    marginBottom: theme.Spacing.sm,
  },
  card: { marginBottom: theme.Spacing.sm },
  listContent: { paddingBottom: theme.Spacing.xl * 2 },
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
    borderColor: theme.Colors.border,
    backgroundColor: theme.Colors.background,
  },
  cancelButtonText: {
    ...theme.Typography.caption,
    color: theme.Colors.error,
    fontWeight: "700",
  },
  cancelButtonTextDisabled: {
    color: theme.Colors.textSecondary,
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
  emptyText: {
    color: theme.Colors.textSecondary,
    marginTop: theme.Spacing.sm,
    textAlign: "center",
  },
  sectionEmptyText: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
    backgroundColor: theme.Colors.surface,
    borderWidth: 1,
    borderColor: theme.Colors.border,
    borderRadius: theme.Radius.md,
    padding: theme.Spacing.md,
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
