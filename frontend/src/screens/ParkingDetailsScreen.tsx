import React from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Modal,
  Platform,
  Text,
  StyleSheet,
  View,
  ScrollView,
  Pressable,
} from "react-native";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenWrapper from "../components/ScreenWrapper";
import Card from "../components/Card";
import Button from "../components/Button";
import theme from "../theme";
import { useCurrency } from "../context/CurrencyContext";
import type { RootStackParamList, SearchData } from "../navigation/types";
import { parkingApi, ParkingDetails } from "../services/parkingApi";
import { reservationApi, ReservationType } from "../services/reservationApi";
import { useAuth } from "../context/AuthContext";

type NavProp = NativeStackNavigationProp<RootStackParamList, "ParkingDetails">;

const FALLBACK_WORKING_HOURS = {
  opensAt: "08:00",
  closesAt: "22:00",
};
const SLOT_INTERVAL_MINUTES = 15;
const MIN_ONE_TIME_DURATION_MINUTES = 60;
const MAX_ONE_TIME_DURATION_MINUTES = 360;

const getSearchDateLabel = (search?: SearchData) => {
  if (search?.mode === "long-term") {
    return `${search.fromDate ?? "From date"} - ${search.toDate ?? "To date"}`;
  }

  return search?.date ?? "Today";
};

const getOneTimeDate = (dateLabel?: string) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);

  if (dateLabel === "Tomorrow") {
    date.setDate(date.getDate() + 1);
  } else if (dateLabel && dateLabel !== "Today") {
    const parsed = new Date(`${dateLabel}, ${date.getFullYear()}`);
    if (!Number.isNaN(parsed.getTime())) {
      date.setMonth(parsed.getMonth(), parsed.getDate());
    }
  }

  return date;
};

const parseDateValue = (value?: string) => {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const getDateRangeDays = (startDate: Date, endDate: Date) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.max(
    Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)),
    0
  );
};

const getDurationHours = (startTime: string, endTime: string) => {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;
  return Math.max((endTotal - startTotal) / 60, 0);
};

const formatTime = (value: Date) => {
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const setTimeOnDate = (date: Date, time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  const nextDate = new Date(date);
  nextDate.setHours(hours, minutes, 0, 0);
  return nextDate;
};

const addMinutes = (value: Date, minutes: number) => {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() + minutes, 0, 0);
  return date;
};

const roundUpToSlot = (value: Date) => {
  const date = new Date(value);
  const minutes = date.getMinutes();
  const roundedMinutes =
    Math.ceil(minutes / SLOT_INTERVAL_MINUTES) * SLOT_INTERVAL_MINUTES;
  date.setMinutes(roundedMinutes, 0, 0);
  return date;
};

const minDate = (left: Date, right: Date) => {
  return left.getTime() <= right.getTime() ? left : right;
};

const buildTimeSlots = (start: Date, end: Date) => {
  const slots: string[] = [];
  const cursor = roundUpToSlot(start);

  while (cursor <= end) {
    slots.push(formatTime(cursor));
    cursor.setMinutes(cursor.getMinutes() + SLOT_INTERVAL_MINUTES);
  }

  return slots;
};

type ToastState = {
  message: string;
  variant: "success" | "error";
};

const getAvailabilityBadge = (
  status: "AVAILABLE" | "LIMITED" | "FULL" | undefined
) => {
  if (status === "LIMITED") {
    return {
      label: "Limited",
      backgroundColor: "rgba(245,158,11,0.13)",
      color: "#b45309",
      dotColor: "#b45309",
    };
  }

  if (status === "FULL") {
    return {
      label: "Full",
      backgroundColor: "rgba(2,6,23,0.06)",
      color: theme.Colors.textSecondary,
      dotColor: theme.Colors.border,
    };
  }

  return {
    label: "Available",
    backgroundColor: "rgba(89,165,117,0.12)",
    color: theme.Colors.secondaryGreen,
    dotColor: theme.Colors.secondaryGreen,
  };
};

export default function ParkingDetailsScreen() {
  const navigation = useNavigation<NavProp>();
  const route: any = useRoute();
  const insets = useSafeAreaInsets();
  const parkingId = route.params?.parkingId;
  const search = route.params?.search as SearchData | undefined;
  const legacyParking = route.params?.parking;
  const { token } = useAuth();
  const { formatPrice } = useCurrency();
  const [parking, setParking] = React.useState<ParkingDetails | null>(null);
  const [isLoading, setIsLoading] = React.useState(Boolean(parkingId));
  const [isReserving, setIsReserving] = React.useState(false);
  const [isSimulating, setIsSimulating] = React.useState(false);
  const [error, setError] = React.useState("");
  const [reservationError, setReservationError] = React.useState("");
  const [reserveModalVisible, setReserveModalVisible] = React.useState(false);
  const [selectedStartTime, setSelectedStartTime] = React.useState<string | null>(
    null
  );
  const [selectedEndTime, setSelectedEndTime] = React.useState<string | null>(
    null
  );
  const [activeTimePicker, setActiveTimePicker] = React.useState<
    "start" | "end" | null
  >(null);
  const [timeTouched, setTimeTouched] = React.useState({
    start: false,
    end: false,
  });
  const [attemptedConfirm, setAttemptedConfirm] = React.useState(false);
  const [toast, setToast] = React.useState<ToastState | null>(null);
  const reserveRequestInFlightRef = React.useRef(false);

  useFocusEffect(
    React.useCallback(() => {
      if (!parkingId) return undefined;

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
    }, [parkingId])
  );

  const data = parking
    ? {
        name: parking.name,
        address: `${parking.address}, ${parking.city}`,
        spotsAvailable: parking.availableSpots,
        totalSpots: parking.totalSpots,
        occupiedSpots: parking.occupiedSpots,
        occupancyPercentage: parking.occupancyPercentage,
        availabilityStatus: parking.availabilityStatus,
        latitude: parking.latitude,
        longitude: parking.longitude,
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
          occupiedSpots: 0,
          occupancyPercentage: 0,
          availabilityStatus: "AVAILABLE" as const,
          latitude: null,
          longitude: null,
          price: legacyParking.price,
          distance: "",
          open: true,
          hours: "Open daily",
          description:
            "Convenient ParkPal parking with real-time spot availability.",
          amenities: ["Verified location", "Easy access"],
        }
      : null;
  const availabilityBadge = getAvailabilityBadge(data?.availabilityStatus);
  const availabilityPrimaryText =
    data?.availabilityStatus === "FULL"
      ? "No spots available"
      : data?.availabilityStatus === "LIMITED"
        ? `Only ${data.spotsAvailable} spot${
            data.spotsAvailable === 1 ? "" : "s"
          } left`
        : "spots available";

  const isLongTermReservation = search?.mode === "long-term";
  const selectedReservationDate = isLongTermReservation
    ? parseDateValue(search?.fromDate)
    : getOneTimeDate(search?.date);
  const selectedReservationEndDate = isLongTermReservation
    ? parseDateValue(search?.toDate)
    : selectedReservationDate;
  const isTodayReservation =
    selectedReservationDate.toDateString() === new Date().toDateString();
  const opensAtDate = setTimeOnDate(
    selectedReservationDate,
    FALLBACK_WORKING_HOURS.opensAt
  );
  const closesAtDate = setTimeOnDate(
    selectedReservationDate,
    FALLBACK_WORKING_HOURS.closesAt
  );
  const endOpensAtDate = setTimeOnDate(
    selectedReservationEndDate,
    FALLBACK_WORKING_HOURS.opensAt
  );
  const endClosesAtDate = setTimeOnDate(
    selectedReservationEndDate,
    FALLBACK_WORKING_HOURS.closesAt
  );
  const minStartDate = isTodayReservation
    ? roundUpToSlot(
        new Date(
          Math.max(addMinutes(new Date(), 1).getTime(), opensAtDate.getTime())
        )
      )
    : opensAtDate;
  const maxStartDate = isLongTermReservation
    ? closesAtDate
    : addMinutes(closesAtDate, -MIN_ONE_TIME_DURATION_MINUTES);
  const startTimeOptions = buildTimeSlots(minStartDate, maxStartDate);
  const selectedStartDate = selectedStartTime
    ? setTimeOnDate(selectedReservationDate, selectedStartTime)
    : null;
  const selectedEndDate = selectedEndTime
    ? setTimeOnDate(selectedReservationEndDate, selectedEndTime)
    : null;
  const minEndDate = selectedStartDate
    ? isLongTermReservation
      ? endOpensAtDate
      : addMinutes(selectedStartDate, MIN_ONE_TIME_DURATION_MINUTES)
    : null;
  const maxEndDate = selectedStartDate
    ? isLongTermReservation
      ? endClosesAtDate
      : minDate(
          addMinutes(selectedStartDate, MAX_ONE_TIME_DURATION_MINUTES),
          closesAtDate
        )
    : null;
  const endTimeOptions =
    minEndDate && maxEndDate ? buildTimeSlots(minEndDate, maxEndDate) : [];
  const getTimeValidationMessage = () => {
    if (!selectedStartTime || !selectedEndTime) {
      return "Please select start and end time.";
    }

    if (!selectedStartDate || !selectedEndDate) {
      return "Please select valid start and end time.";
    }

    if (selectedEndDate <= selectedStartDate) {
      return "End time must be after start time.";
    }

    if (isLongTermReservation) {
      const days = getDateRangeDays(
        selectedReservationDate,
        selectedReservationEndDate
      );

      if (days < 1) {
        return "Long-term reservations must be at least 1 day.";
      }

      if (days > 30) {
        return "Long-term reservations can be up to 30 days.";
      }

      if (selectedStartDate < minStartDate || selectedStartDate > closesAtDate) {
        return "Reservation is outside parking working hours.";
      }

      if (selectedEndDate < endOpensAtDate || selectedEndDate > endClosesAtDate) {
        return "Reservation is outside parking working hours.";
      }

      return "";
    }

    const duration = getDurationHours(selectedStartTime, selectedEndTime);

    if (duration < 1) {
      return "One-time reservations require at least 1 hour.";
    }

    if (duration > 6) {
      return "One-time reservations can be up to 6 hours.";
    }

    if (selectedStartDate < minStartDate) {
      return `Start time must be ${formatTime(minStartDate)} or later.`;
    }

    if (selectedEndDate > closesAtDate) {
      return `End time must be before ${FALLBACK_WORKING_HOURS.closesAt}.`;
    }

    return "";
  };
  const timeValidationMessage = getTimeValidationMessage();
  const isMissingStartTime = !selectedStartTime;
  const isMissingEndTime = !selectedEndTime;
  const shouldShowTimeError =
    Boolean(timeValidationMessage) &&
    (attemptedConfirm ||
      (isMissingStartTime && timeTouched.start) ||
      (isMissingEndTime && timeTouched.end) ||
      (!isMissingStartTime &&
        !isMissingEndTime &&
        (timeTouched.start || timeTouched.end)));
  const canConfirmReservation = !timeValidationMessage;

  const activeTimeOptions =
    activeTimePicker === "start" ? startTimeOptions : endTimeOptions;
  const activeTimeMessage =
    activeTimePicker === "start" && startTimeOptions.length === 0
      ? "No available time slots for this date."
      : activeTimePicker === "end" && !selectedStartTime
        ? "Select a start time first."
        : activeTimePicker === "end" && endTimeOptions.length === 0
          ? "No available time slots for this date."
          : "";

  const handleTimeSelect = (timeValue: string) => {
    if (!activeTimePicker) return;

    const selectedTimeDate = setTimeOnDate(selectedReservationDate, timeValue);
    setReservationError("");

    if (activeTimePicker === "start") {
      const shouldResetEndTime = selectedEndTime
        ? (() => {
            const currentEndDate = setTimeOnDate(
              selectedReservationEndDate,
              selectedEndTime
            );
            const nextMinEndDate = isLongTermReservation
              ? endOpensAtDate
              : addMinutes(selectedTimeDate, MIN_ONE_TIME_DURATION_MINUTES);
            const nextMaxEndDate = isLongTermReservation
              ? endClosesAtDate
              : minDate(
                  addMinutes(selectedTimeDate, MAX_ONE_TIME_DURATION_MINUTES),
                  closesAtDate
                );

            return currentEndDate < nextMinEndDate || currentEndDate > nextMaxEndDate;
          })()
        : false;

      setSelectedStartTime(timeValue);
      setSelectedEndTime((currentEndTime) =>
        shouldResetEndTime ? null : currentEndTime
      );
      setTimeTouched((current) => ({
        ...current,
        start: true,
        end: shouldResetEndTime ? false : current.end,
      }));
      setActiveTimePicker(null);
      return;
    }

    setSelectedEndTime(timeValue);
    setTimeTouched((current) => ({ ...current, end: true }));
    setActiveTimePicker(null);
  };

  const getReservationTimes = (
    startTimeValue = selectedStartTime ?? "",
    endTimeValue = selectedEndTime ?? ""
  ) => {
    if (search?.mode === "long-term" && search.fromDate && search.toDate) {
      return {
        reservationType: "LONG_TERM" as ReservationType,
        startTime: setTimeOnDate(
          parseDateValue(search.fromDate),
          startTimeValue
        ).toISOString(),
        endTime: setTimeOnDate(
          parseDateValue(search.toDate),
          endTimeValue
        ).toISOString(),
      };
    }

    const now = new Date();
    const startTime = setTimeOnDate(selectedReservationDate, startTimeValue);
    const endTime = setTimeOnDate(selectedReservationDate, endTimeValue);

    if (!search && startTime < now) {
      startTime.setTime(now.getTime());
      endTime.setTime(now.getTime() + 60 * 60 * 1000);
    }

    return {
      reservationType: "ONE_TIME" as ReservationType,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    };
  };

  const handleReserve = async () => {
    setReservationError("");
    setAttemptedConfirm(false);
    setTimeTouched({ start: false, end: false });
    setSelectedStartTime(null);
    setSelectedEndTime(null);

    if (isLongTermReservation && (!search?.fromDate || !search?.toDate)) {
      setReservationError("Please select a valid long-term date range.");
      return;
    }

    setReserveModalVisible(true);
  };

  const simulateUpdate = async () => {
    if (!token || !parkingId || isSimulating) return;

    setIsSimulating(true);

    try {
      const updatedParking = await parkingApi.demoRandomUpdate(token, parkingId);
      setParking(updatedParking);
      setToast({ message: "Availability updated", variant: "success" });
    } catch (err) {
      setToast({
        message:
          err instanceof Error ? err.message : "Unable to simulate update.",
        variant: "error",
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleNavigate = async () => {
    if (!parking) {
      return;
    }

    const latitude = Number(parking.latitude);
    const longitude = Number(parking.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setToast({
        message: "Navigation is unavailable for this parking.",
        variant: "error",
      });
      return;
    }

    const label = encodeURIComponent(parking.name);
    const nativeUrl =
      Platform.OS === "ios"
        ? `http://maps.apple.com/?daddr=${latitude},${longitude}&q=${label}`
        : `google.navigation:q=${latitude},${longitude}`;
    const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;

    try {
      const canOpenNativeUrl = await Linking.canOpenURL(nativeUrl);
      await Linking.openURL(canOpenNativeUrl ? nativeUrl : fallbackUrl);
    } catch (_err) {
      setToast({
        message: "Unable to open maps.",
        variant: "error",
      });
    }
  };

  const confirmReservation = async () => {
    if (reserveRequestInFlightRef.current) {
      return;
    }

    if (!parkingId || !parking) {
      setReservationError("Unable to reserve this parking location.");
      return;
    }

    if (!token) {
      Alert.alert("Sign in required", "Please log in before reserving parking.");
      return;
    }

    setAttemptedConfirm(true);

    if (timeValidationMessage) {
      setToast({ message: timeValidationMessage, variant: "error" });
      return;
    }

    setIsReserving(true);
    reserveRequestInFlightRef.current = true;
    setReservationError("");

    try {
      const reservationTimes = getReservationTimes();
      await reservationApi.createReservation(
        {
          parkingLocationId: parkingId,
          ...reservationTimes,
        },
        token
      );

      setToast({ message: "Reservation confirmed", variant: "success" });
      setReserveModalVisible(false);
      const updatedParking = await parkingApi.getParkingById(parkingId);
      setParking(updatedParking);
    } catch (err) {
      setReservationError(
        err instanceof Error ? err.message : "Unable to reserve spot."
      );
      setToast({
        message: err instanceof Error ? err.message : "Unable to reserve spot.",
        variant: "error",
      });
    } finally {
      reserveRequestInFlightRef.current = false;
      setIsReserving(false);
    }
  };

  const durationHours =
    !isLongTermReservation && selectedStartTime && selectedEndTime
      ? getDurationHours(selectedStartTime, selectedEndTime)
      : 0;
  const longTermDays = isLongTermReservation
    ? getDateRangeDays(selectedReservationDate, selectedReservationEndDate)
    : 0;
  const dailyPrice = data ? data.price * 8 : 0;
  const estimatedTotal = data
    ? isLongTermReservation
      ? longTermDays * dailyPrice
      : durationHours * data.price
    : 0;

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

            <Text style={styles.searchDateText}>
              {search?.mode === "long-term" ? "Long-term" : "Selected date"}:{" "}
              {getSearchDateLabel(search)}
            </Text>

        <View style={{ height: theme.Spacing.md }} />

        <Card>
          <View style={styles.cardTopRow}>
            <View style={styles.leftBlock}>
              <Text style={theme.Typography.subtitle}>Availability</Text>
              {data.availabilityStatus === "AVAILABLE" ? (
                <>
                  <Text style={styles.availabilityNumber}>
                    {data.spotsAvailable}
                  </Text>
                  <Text style={styles.availabilityLabel}>
                    {availabilityPrimaryText}
                  </Text>
                </>
              ) : (
                <Text style={styles.availabilityMessage}>
                  {availabilityPrimaryText}
                </Text>
              )}
              <Text style={styles.availabilityMeta}>
                {data.occupancyPercentage}% occupied
              </Text>
            </View>

            <View style={styles.rightBlock}>
              <Text style={theme.Typography.subtitle}>Price</Text>
              <Text style={theme.Typography.title}>
                {formatPrice(data.price)}/hr
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
                { backgroundColor: availabilityBadge.backgroundColor },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: availabilityBadge.dotColor },
                ]}
              />
              <Text
                style={[
                  styles.statusLabel,
                  { color: availabilityBadge.color },
                ]}
              >
                {availabilityBadge.label}
              </Text>
            </View>

            <View style={styles.hoursBlock}>
              <Text style={[theme.Typography.caption, styles.muted]}>
                Hours
              </Text>
              <Text style={theme.Typography.body}>{data.hours}</Text>
            </View>
          </View>

          {token ? (
            <Pressable
              disabled={isSimulating}
              onPress={simulateUpdate}
              style={({ pressed }) => [
                styles.simulateButton,
                pressed && { opacity: 0.82 },
              ]}
            >
              {isSimulating ? (
                <ActivityIndicator size="small" color={theme.Colors.primary} />
              ) : (
                <Text style={styles.simulateText}>Simulate update</Text>
              )}
            </Pressable>
          ) : null}
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

        <View style={styles.actionRow}>
          <Button
            title={isReserving ? "Reserving..." : "Reserve spot"}
            disabled={isReserving || !data.open}
            onPress={handleReserve}
            style={styles.reserveButton}
          />
          <Button
            title="Navigate"
            variant="outline"
            onPress={handleNavigate}
            style={styles.navigateButton}
          />
        </View>
        {reservationError ? (
          <Text style={styles.reserveErrorText}>{reservationError}</Text>
        ) : null}

            <View style={{ height: theme.Spacing.xl }} />
          </>
        )}
      </ScrollView>

      {toast ? (
        <Toast
          message={toast.message}
          variant={toast.variant}
          topOffset={insets.top + theme.Spacing.sm}
          onHide={() => setToast(null)}
        />
      ) : null}

      {data ? (
        <Modal
          visible={reserveModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setReserveModalVisible(false)}
        >
          <Pressable
            style={styles.reserveOverlay}
            onPress={() => setReserveModalVisible(false)}
          >
            <Pressable style={styles.reserveModal}>
              <Text style={styles.reserveTitle}>Reserve spot</Text>
              <Text style={styles.reserveName}>{data.name}</Text>
              <Text style={styles.reserveMuted}>{data.address}</Text>
              <Text style={styles.reserveMuted}>{getSearchDateLabel(search)}</Text>

              <View style={styles.modalDivider} />

              <TimeField
                label="Start time"
                value={selectedStartTime}
                placeholder="Select start time"
                onPress={() => setActiveTimePicker("start")}
                disabled={startTimeOptions.length === 0}
              />
              <TimeField
                label="End time"
                value={selectedEndTime}
                placeholder={
                  selectedStartTime ? "Select end time" : "Select start time first"
                }
                onPress={() => setActiveTimePicker("end")}
                disabled={!selectedStartTime || endTimeOptions.length === 0}
              />
              {startTimeOptions.length === 0 ? (
                <Text style={styles.reserveErrorText}>
                  No available time slots for this date.
                </Text>
              ) : (
                <Text style={styles.workingHoursText}>
                  {isLongTermReservation
                    ? `Start from ${formatTime(minStartDate)}. End within ${FALLBACK_WORKING_HOURS.opensAt} - ${FALLBACK_WORKING_HOURS.closesAt}.`
                    : `Available ${formatTime(minStartDate)} - ${FALLBACK_WORKING_HOURS.closesAt}`}
                </Text>
              )}

              <View style={styles.priceSummary}>
                {isLongTermReservation ? (
                  <>
                    <View style={styles.summaryRow}>
                      <Text style={styles.reserveMuted}>Days</Text>
                      <Text style={theme.Typography.body}>{longTermDays}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.reserveMuted}>Daily estimate</Text>
                      <Text style={theme.Typography.body}>
                        {formatPrice(dailyPrice)}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.reserveMuted}>Calculation</Text>
                      <Text style={theme.Typography.body}>
                        {formatPrice(data.price)}/hr × 8h
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.summaryRow}>
                      <Text style={styles.reserveMuted}>Price per hour</Text>
                      <Text style={theme.Typography.body}>
                        {formatPrice(data.price)}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.reserveMuted}>Duration</Text>
                      <Text style={theme.Typography.body}>{durationHours}h</Text>
                    </View>
                  </>
                )}
                <View style={styles.summaryRow}>
                  <Text style={theme.Typography.subtitle}>Estimated total</Text>
                  <Text style={theme.Typography.title}>
                    {formatPrice(estimatedTotal)}
                  </Text>
                </View>
              </View>

              {shouldShowTimeError ? (
                <Text style={styles.reserveErrorText}>{timeValidationMessage}</Text>
              ) : reservationError ? (
                <Text style={styles.reserveErrorText}>{reservationError}</Text>
              ) : null}

              <Button
                title={isReserving ? "Confirming..." : "Confirm & Pay"}
                disabled={isReserving || !canConfirmReservation}
                onPress={confirmReservation}
                style={styles.confirmButton}
              />
              <View style={{ height: theme.Spacing.sm }} />
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setReserveModalVisible(false)}
              />
            </Pressable>
            {activeTimePicker ? (
              <Pressable
                style={styles.timePickerOverlay}
                onPress={() => setActiveTimePicker(null)}
              >
                <Pressable style={styles.timePickerPopup}>
                  <Text style={styles.timePickerTitle}>
                    {activeTimePicker === "start"
                      ? "Select start time"
                      : "Select end time"}
                  </Text>
                  {activeTimeOptions.length > 0 ? (
                    <ScrollView
                      style={styles.timeSlotList}
                      contentContainerStyle={styles.timeSlotListContent}
                      showsVerticalScrollIndicator={false}
                    >
                      {activeTimeOptions.map((time) => {
                        const isSelected =
                          activeTimePicker === "start"
                            ? selectedStartTime === time
                            : selectedEndTime === time;

                        return (
                          <Pressable
                            key={time}
                            onPress={() => handleTimeSelect(time)}
                            style={({ pressed }) => [
                              styles.timeSlot,
                              isSelected && styles.timeSlotSelected,
                              pressed && { opacity: 0.82 },
                            ]}
                          >
                            <Text
                              style={[
                                styles.timeSlotText,
                                isSelected && styles.timeSlotTextSelected,
                              ]}
                            >
                              {time}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  ) : (
                    <Text style={styles.timeSlotEmpty}>{activeTimeMessage}</Text>
                  )}
                </Pressable>
              </Pressable>
            ) : null}
          </Pressable>
        </Modal>
      ) : null}
    </ScreenWrapper>
  );
}

function TimeField({
  label,
  value,
  placeholder,
  onPress,
  disabled = false,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.timeSection}>
      <Text style={styles.timeLabel}>{label}</Text>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.timeField,
          disabled && styles.timeFieldDisabled,
          pressed && { opacity: 0.82 },
        ]}
      >
        <Text
          style={[
            styles.timeFieldText,
            !value && styles.timeFieldPlaceholder,
          ]}
        >
          {value ?? placeholder}
        </Text>
        <Text style={styles.timeFieldIcon}>⌄</Text>
      </Pressable>
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
  variant: "success" | "error";
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
        variant === "success" ? styles.toastSuccess : styles.toastError,
      ]}
    >
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
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
  searchDateText: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
    marginTop: theme.Spacing.xs,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  leftBlock: { flex: 1, paddingRight: theme.Spacing.md },
  rightBlock: { width: 132, alignItems: "flex-end" },
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
  availabilityNumber: {
    ...theme.Typography.title,
    marginTop: theme.Spacing.xs,
  },
  availabilityLabel: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
    marginTop: 2,
  },
  availabilityMessage: {
    ...theme.Typography.subtitle,
    color: theme.Colors.textPrimary,
    marginTop: theme.Spacing.xs,
  },
  availabilityMeta: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
    marginTop: 4,
  },
  simulateButton: {
    alignSelf: "flex-start",
    minHeight: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.Colors.border,
    paddingHorizontal: theme.Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.Colors.background,
    marginTop: theme.Spacing.md,
  },
  simulateText: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    gap: theme.Spacing.sm,
  },
  reserveButton: {
    flex: 1,
  },
  navigateButton: {
    minWidth: 116,
  },
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
  reserveErrorText: {
    ...theme.Typography.caption,
    color: theme.Colors.error,
    textAlign: "center",
    marginTop: theme.Spacing.sm,
  },
  reserveOverlay: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.Spacing.lg,
  },
  reserveModal: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: theme.Colors.surface,
    borderRadius: theme.Radius.lg,
    padding: theme.Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 10,
  },
  reserveTitle: {
    ...theme.Typography.title,
    marginBottom: theme.Spacing.sm,
  },
  reserveName: {
    ...theme.Typography.subtitle,
  },
  reserveMuted: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
    marginTop: theme.Spacing.xs,
  },
  modalDivider: {
    height: 1,
    backgroundColor: theme.Colors.border,
    marginVertical: theme.Spacing.md,
  },
  timeSection: {
    marginBottom: theme.Spacing.sm,
  },
  timeLabel: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
    fontWeight: "700",
    marginBottom: theme.Spacing.xs,
  },
  timeField: {
    minHeight: 48,
    borderRadius: theme.Radius.md,
    borderWidth: 1,
    borderColor: theme.Colors.border,
    backgroundColor: theme.Colors.surface,
    paddingHorizontal: theme.Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeFieldDisabled: {
    opacity: 0.58,
    backgroundColor: theme.Colors.background,
  },
  timeFieldText: {
    ...theme.Typography.body,
    color: theme.Colors.textPrimary,
    fontWeight: "700",
  },
  timeFieldPlaceholder: {
    color: theme.Colors.textSecondary,
    fontWeight: "400",
  },
  timeFieldIcon: {
    color: theme.Colors.textSecondary,
    fontSize: 18,
    fontWeight: "700",
  },
  workingHoursText: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
    marginBottom: theme.Spacing.sm,
  },
  timePickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2,6,23,0.42)",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.Spacing.lg,
  },
  timePickerPopup: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: theme.Colors.surface,
    borderRadius: theme.Radius.lg,
    paddingHorizontal: theme.Spacing.md,
    paddingTop: theme.Spacing.md,
    paddingBottom: theme.Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 26,
    elevation: 18,
    overflow: "hidden",
  },
  timePickerTitle: {
    ...theme.Typography.subtitle,
    textAlign: "center",
    marginBottom: theme.Spacing.sm,
  },
  timeSlotList: {
    maxHeight: 320,
  },
  timeSlotListContent: {
    paddingBottom: theme.Spacing.xs,
  },
  timeSlot: {
    minHeight: 44,
    borderRadius: theme.Radius.md,
    paddingHorizontal: theme.Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.Spacing.xs,
    backgroundColor: theme.Colors.background,
  },
  timeSlotSelected: {
    backgroundColor: theme.Colors.primary,
  },
  timeSlotText: {
    ...theme.Typography.body,
    color: theme.Colors.textPrimary,
    fontWeight: "700",
  },
  timeSlotTextSelected: {
    color: "#fff",
  },
  timeSlotEmpty: {
    ...theme.Typography.body,
    color: theme.Colors.textSecondary,
    textAlign: "center",
    paddingVertical: theme.Spacing.lg,
  },
  priceSummary: {
    backgroundColor: theme.Colors.background,
    borderRadius: theme.Radius.md,
    padding: theme.Spacing.md,
    marginTop: theme.Spacing.sm,
    marginBottom: theme.Spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.Spacing.sm,
  },
  confirmButton: {
    borderRadius: theme.Radius.lg,
    paddingVertical: theme.Spacing.md,
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
  toastSuccess: {
    backgroundColor: theme.Colors.secondaryGreen,
  },
  toastError: {
    backgroundColor: theme.Colors.error,
  },
  toastText: {
    color: "#fff",
    fontWeight: "700",
  },
});
