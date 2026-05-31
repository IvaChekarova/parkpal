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
import { useTranslation } from "react-i18next";
import AppHeader from "../components/AppHeader";
import ScreenWrapper from "../components/ScreenWrapper";
import Button from "../components/Button";
import theme from "../theme";
import { useCurrency } from "../context/CurrencyContext";
import { useAppLocation } from "../context/AppLocationContext";
import type { RootStackParamList, SearchData } from "../navigation/types";
import { parkingApi, ParkingDetails } from "../services/parkingApi";
import { reservationApi, ReservationType } from "../services/reservationApi";
import { useAuth } from "../context/AuthContext";

let Feather: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Feather = require("@expo/vector-icons").Feather;
} catch (e) {
  Feather = null;
}

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
  status: "AVAILABLE" | "LIMITED" | "FULL" | undefined,
  t: (key: string) => string
) => {
  if (status === "LIMITED") {
    return {
      label: t("common.limited"),
      backgroundColor: "rgba(245,158,11,0.13)",
      color: "#b45309",
      dotColor: "#b45309",
    };
  }

  if (status === "FULL") {
    return {
      label: t("common.full"),
      backgroundColor: "rgba(2,6,23,0.06)",
      color: theme.Colors.textSecondary,
      dotColor: theme.Colors.border,
    };
  }

  return {
    label: t("common.available"),
    backgroundColor: "rgba(89,165,117,0.12)",
    color: theme.Colors.secondaryGreen,
    dotColor: theme.Colors.secondaryGreen,
  };
};

export default function ParkingDetailsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const route: any = useRoute();
  const insets = useSafeAreaInsets();
  const parkingId = route.params?.parkingId;
  const search = route.params?.search as SearchData | undefined;
  const legacyParking = route.params?.parking;
  const { locationLabel } = useAppLocation();
  const { token } = useAuth();
  const { formatPrice } = useCurrency();
  const [parking, setParking] = React.useState<ParkingDetails | null>(null);
  const [isLoading, setIsLoading] = React.useState(Boolean(parkingId));
  const [isReserving, setIsReserving] = React.useState(false);
  const [isSimulating, setIsSimulating] = React.useState(false);
  const [error, setError] = React.useState("");
  const [reservationError, setReservationError] = React.useState("");
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
            setError(t("parking.detailsLoadFailed"));
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
    }, [parkingId, t])
  );

  const data = parking
    ? {
        name: parking.name,
        address: `${parking.address}, ${parking.city}`,
        spotsAvailable: parking.availableSpots,
        totalSpots: parking.totalSpots,
        availabilityStatus: parking.availabilityStatus,
        latitude: parking.latitude,
        longitude: parking.longitude,
        price: parking.pricePerHour,
        distance: parking.city,
        open: parking.availableSpots > 0,
        hours: "",
        description:
          parking.description ??
          t("parking.defaultDescription"),
        amenities:
          parking.parkingType === "PRIVATE"
            ? [t("parking.privateFeature"), t("parking.limitedFeature"), t("parking.verified")]
            : [t("parking.publicFeature"), t("parking.easyFeature"), t("parking.verified")],
      }
    : legacyParking
      ? {
          name: legacyParking.name,
          address: legacyParking.address,
          spotsAvailable: 0,
          totalSpots: 0,
          availabilityStatus: "AVAILABLE" as const,
          latitude: null,
          longitude: null,
          price: legacyParking.price,
          distance: "",
          open: true,
          hours: "",
          description:
            t("parking.defaultDescription"),
          amenities: [t("parking.verified"), t("parking.easyFeature")],
        }
      : null;
  const availabilityBadge = getAvailabilityBadge(data?.availabilityStatus, t);
  const availabilityPrimaryText =
    data?.availabilityStatus === "FULL"
      ? t("search.noSpotsAvailable")
      : data?.availabilityStatus === "LIMITED"
        ? t("search.onlySpotsLeft", { count: data.spotsAvailable })
        : t("search.spotsAvailable", { count: data?.spotsAvailable ?? 0 });

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
      return t("parking.selectTimes");
    }

    if (!selectedStartDate || !selectedEndDate) {
      return t("parking.selectValidTimes");
    }

    if (selectedEndDate <= selectedStartDate) {
      return t("parking.endAfterStart");
    }

    if (isLongTermReservation) {
      const days = getDateRangeDays(
        selectedReservationDate,
        selectedReservationEndDate
      );

      if (days < 1) {
        return t("validation.longTermMin");
      }

      if (days > 30) {
        return t("validation.longTermMax");
      }

      if (selectedStartDate < minStartDate || selectedStartDate > closesAtDate) {
        return t("parking.outsideHours");
      }

      if (selectedEndDate < endOpensAtDate || selectedEndDate > endClosesAtDate) {
        return t("parking.outsideHours");
      }

      return "";
    }

    const duration = getDurationHours(selectedStartTime, selectedEndTime);

    if (duration < 1) {
      return t("parking.oneTimeMin");
    }

    if (duration > 6) {
      return t("parking.oneTimeMax");
    }

    if (selectedStartDate < minStartDate) {
      return t("parking.startAfter", { time: formatTime(minStartDate) });
    }

    if (selectedEndDate > closesAtDate) {
      return t("parking.endBefore", { time: FALLBACK_WORKING_HOURS.closesAt });
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
      ? t("parking.noTimeSlots")
      : activeTimePicker === "end" && !selectedStartTime
        ? t("parking.selectStartFirst")
        : activeTimePicker === "end" && endTimeOptions.length === 0
          ? t("parking.noTimeSlots")
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

  const simulateUpdate = async () => {
    if (!token || !parkingId || isSimulating) return;

    setIsSimulating(true);

    try {
      const updatedParking = await parkingApi.demoRandomUpdate(token, parkingId);
      setParking(updatedParking);
      setToast({ message: t("parking.availabilityUpdated"), variant: "success" });
    } catch (err) {
      setToast({
        message:
          err instanceof Error ? err.message : t("parking.simulateFailed"),
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
        message: t("parking.navigateUnavailable"),
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
        message: t("parking.navigateUnavailable"),
        variant: "error",
      });
    }
  };

  const confirmReservation = async () => {
    if (reserveRequestInFlightRef.current) {
      return;
    }

    if (!parkingId || !parking) {
      setReservationError(t("parking.reservationFailed"));
      return;
    }

    if (!token) {
      Alert.alert(t("parking.signInRequired"), t("parking.signInRequiredBody"));
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

      setToast({ message: t("parking.reservationConfirmed"), variant: "success" });
      setSelectedStartTime(null);
      setSelectedEndTime(null);
      setAttemptedConfirm(false);
      setTimeTouched({ start: false, end: false });
      const updatedParking = await parkingApi.getParkingById(parkingId);
      setParking(updatedParking);
    } catch (err) {
      setReservationError(
        err instanceof Error ? err.message : t("parking.reservationFailed")
      );
      setToast({
        message: err instanceof Error ? err.message : t("parking.reservationFailed"),
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

  const featureChips = Array.from(
    new Set([
      t("parking.verified"),
      parking?.parkingType === "PRIVATE" ? t("parking.privateFeature") : t("parking.publicFeature"),
      parking?.parkingType === "PRIVATE" ? t("parking.limitedFeature") : t("parking.easyFeature"),
    ])
  ).slice(0, 3);
  const durationLabel = isLongTermReservation
    ? t("parking.days", { count: longTermDays })
    : durationHours > 0
      ? `${Math.floor(durationHours)}h${
          durationHours % 1 ? ` ${Math.round((durationHours % 1) * 60)}m` : ""
        }`
      : t("parking.selectTimesPlaceholder");

  return (
    <ScreenWrapper style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        {isLoading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator color={theme.Colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.stateContainer}>
            <Text style={styles.stateText}>{error}</Text>
            <View style={{ height: theme.Spacing.md }} />
            <Button title={t("parking.goBack")} variant="outline" onPress={navigation.goBack} />
          </View>
        ) : !data ? (
          <View style={styles.stateContainer}>
            <Text style={styles.stateText}>{t("parking.locationNotFound")}</Text>
          </View>
        ) : (
          <>
            <AppHeader />
            <View style={styles.hero}>
              <View style={styles.heroImageLayer}>
                <View style={styles.parkingStripeRow}>
                  {Array.from({ length: 8 }).map((_, index) => (
                    <View key={index} style={styles.parkingStripe} />
                  ))}
                </View>
                <View style={styles.carRow}>
                  {Array.from({ length: 7 }).map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.carShape,
                        index % 2 === 0 && styles.carShapeLight,
                      ]}
                    />
                  ))}
                </View>
                <View style={styles.heroLane} />
                <View style={[styles.heroLane, styles.heroLaneSecond]} />
                <View style={styles.heroGlow} />
              </View>
              <View style={styles.heroOverlay} />
              <Pressable
                onPress={() => navigation.goBack()}
                style={styles.backButton}
                accessibilityLabel="Back"
              >
                <Text style={styles.backIcon}>←</Text>
              </Pressable>
              <View style={styles.heroContent}>
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
                <Text style={styles.heroTitle} numberOfLines={2}>
                  {data.name}
                </Text>
                <Text style={styles.heroAddress} numberOfLines={2}>
                  ⌖ {data.address}
                </Text>
              </View>
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>★ 4.8</Text>
              </View>
            </View>

            <View style={styles.content}>
              <View style={styles.quickInfoGrid}>
                <InfoTile
                  label={t("parking.price")}
                  value={`${formatPrice(data.price)}${t("common.perHour")}`}
                  iconName="dollar-sign"
                />
                <InfoTile
                  label={t("parking.availability")}
                  value={
                    data.availabilityStatus === "FULL"
                      ? t("common.full")
                      : t("parking.spots", { count: data.spotsAvailable })
                  }
                  iconName="truck"
                />
                <InfoTile
                  label={t("parking.type")}
                  value={parking?.parkingType === "PRIVATE" ? t("home.covered") : t("home.openAir")}
                  iconName="map-pin"
                />
              </View>

              <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>{t("parking.features")}</Text>
                </View>
                <View style={styles.amenitiesRow}>
                  {featureChips.map((a: string) => (
                    <View key={a} style={styles.amenityChip}>
                      <Text style={styles.amenityText} numberOfLines={1}>
                        {a}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.descriptionText}>{data.description}</Text>
              </View>

              <View style={styles.reservationCard}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>{t("parking.bookSpot")}</Text>
                  </View>
                </View>

                <View style={styles.timeGrid}>
                  <TimeField
                    label={t("parking.startTime")}
                    value={selectedStartTime}
                    placeholder={t("parking.selectStart")}
                    onPress={() => setActiveTimePicker("start")}
                    disabled={startTimeOptions.length === 0}
                  />
                  <TimeField
                    label={t("parking.endTime")}
                    value={selectedEndTime}
                    placeholder={selectedStartTime ? t("parking.selectEnd") : t("parking.startFirst")}
                    onPress={() => setActiveTimePicker("end")}
                    disabled={!selectedStartTime || endTimeOptions.length === 0}
                  />
                </View>

                {startTimeOptions.length === 0 ? (
                  <Text style={styles.reserveErrorText}>
                    {t("parking.noTimeSlots")}
                  </Text>
                ) : (
                  <Text style={styles.workingHoursText}>
                    {isLongTermReservation
                      ? t("parking.startFrom", { time: formatTime(minStartDate) })
                      : t("parking.availableWindow", {
                          start: formatTime(minStartDate),
                          end: FALLBACK_WORKING_HOURS.closesAt,
                        })}
                  </Text>
                )}

                <View style={styles.priceSummary}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.reserveMuted}>{t("parking.duration")}</Text>
                    <Text style={styles.summaryValue}>{durationLabel}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.reserveMuted}>
                      {isLongTermReservation ? t("parking.dailyEstimate") : t("parking.pricePerHour")}
                    </Text>
                    <Text style={styles.summaryValue}>
                      {isLongTermReservation
                        ? formatPrice(dailyPrice)
                        : formatPrice(data.price)}
                    </Text>
                  </View>
                  <View style={styles.summaryTotalRow}>
                    <Text style={styles.totalLabel}>{t("parking.estimatedTotal")}</Text>
                    <Text style={styles.totalValue}>
                      {formatPrice(estimatedTotal)}
                    </Text>
                  </View>
                </View>

                {shouldShowTimeError ? (
                  <Text style={styles.reserveErrorText}>{timeValidationMessage}</Text>
                ) : reservationError ? (
                  <Text style={styles.reserveErrorText}>{reservationError}</Text>
                ) : null}

                <Pressable
                  onPress={handleNavigate}
                  style={({ pressed }) => [
                    styles.viewMapButton,
                    pressed && { opacity: 0.84 },
                  ]}
                >
                  <Text style={styles.viewMapButtonText}>{t("parking.viewOnMap")}</Text>
                </Pressable>

                <Pressable
                  disabled={isReserving || !canConfirmReservation || !data.open}
                  onPress={confirmReservation}
                  style={({ pressed }) => [
                    styles.reserveCta,
                    (isReserving || !canConfirmReservation || !data.open) &&
                      styles.reserveCtaDisabled,
                    pressed && { transform: [{ scale: 0.99 }] },
                  ]}
                >
                  {isReserving ? (
                    <ActivityIndicator color="#071426" />
                  ) : (
                    <Text style={styles.reserveCtaText}>{t("parking.reserveSpot")}</Text>
                  )}
                </Pressable>

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
                      <ActivityIndicator size="small" color="#38bdf8" />
                    ) : (
                      <Text style={styles.simulateText}>{t("parking.simulateUpdate")}</Text>
                    )}
                  </Pressable>
                ) : null}
              </View>
            </View>
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

      {data && activeTimePicker ? (
        <Pressable
          style={styles.timePickerOverlay}
          onPress={() => setActiveTimePicker(null)}
        >
          <Pressable style={styles.timePickerPopup}>
                  <Text style={styles.timePickerTitle}>
                    {activeTimePicker === "start"
                      ? t("parking.selectStartTime")
                      : t("parking.selectEndTime")}
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

function InfoTile({
  label,
  value,
  iconName,
}: {
  label: string;
  value: string;
  iconName?: string;
}) {
  return (
    <View style={styles.infoTile}>
      {iconName && Feather ? (
        <View style={styles.infoTileIcon}>
          <Feather name={iconName} size={17} color="#38bdf8" />
        </View>
      ) : iconName ? (
        <Text style={styles.infoTileAccent}>•</Text>
      ) : null}
      <Text style={styles.infoTileLabel}>{label}</Text>
      <Text
        style={styles.infoTileValue}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
      >
        {value}
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
  screen: {
    backgroundColor: "#071426",
    padding: 0,
  },
  container: {
    backgroundColor: "#071426",
    paddingBottom: theme.Spacing.xl * 2,
  },
  hero: {
    height: 300,
    overflow: "hidden",
    backgroundColor: "#08182d",
  },
  heroImageLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#233448",
  },
  parkingStripeRow: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 22,
    height: 92,
    flexDirection: "row",
    justifyContent: "space-around",
    opacity: 0.42,
  },
  parkingStripe: {
    width: 1,
    height: "100%",
    backgroundColor: "#d4dde8",
    transform: [{ rotate: "12deg" }],
  },
  carRow: {
    position: "absolute",
    left: 38,
    right: 28,
    top: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    opacity: 0.62,
  },
  carShape: {
    width: 24,
    height: 46,
    borderRadius: 7,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  carShapeLight: {
    backgroundColor: "#64748b",
  },
  heroLane: {
    position: "absolute",
    left: -60,
    right: -60,
    top: 126,
    height: 34,
    backgroundColor: "rgba(5,18,34,0.5)",
    transform: [{ rotate: "0deg" }],
  },
  heroLaneSecond: {
    top: 176,
    backgroundColor: "rgba(15,23,42,0.42)",
    transform: [{ rotate: "0deg" }],
  },
  heroGlow: {
    position: "absolute",
    right: -80,
    bottom: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(56,189,248,0.12)",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3,13,29,0.46)",
  },
  heroContent: {
    position: "absolute",
    left: theme.Spacing.md,
    right: theme.Spacing.md,
    bottom: theme.Spacing.lg,
  },
  heroTitle: {
    color: "#f8fbff",
    fontSize: 26,
    fontWeight: "900",
    marginTop: theme.Spacing.sm,
  },
  heroAddress: {
    color: "#c7d7ee",
    fontSize: 14,
    fontWeight: "700",
    marginTop: theme.Spacing.xs,
  },
  ratingBadge: {
    position: "absolute",
    right: theme.Spacing.md,
    bottom: theme.Spacing.lg + 22,
    borderRadius: 999,
    paddingHorizontal: theme.Spacing.sm,
    paddingVertical: 7,
    backgroundColor: "rgba(245,158,11,0.9)",
  },
  ratingText: {
    color: "#fff7ed",
    fontSize: 13,
    fontWeight: "900",
  },
  content: {
    paddingHorizontal: theme.Spacing.md,
    paddingTop: theme.Spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.Spacing.sm,
  },
  backButton: {
    position: "absolute",
    left: theme.Spacing.md,
    top: theme.Spacing.lg,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8,24,45,0.86)",
    borderWidth: 1,
    borderColor: "rgba(148,171,207,0.16)",
    zIndex: 2,
  },
  backIcon: { color: "#f8fbff", fontSize: 20, fontWeight: "900" },
  quickInfoGrid: {
    flexDirection: "row",
    gap: theme.Spacing.sm,
    marginBottom: theme.Spacing.lg,
  },
  infoTile: {
    flex: 1,
    minHeight: 100,
    borderRadius: 18,
    backgroundColor: "#12243f",
    borderWidth: 1,
    borderColor: "rgba(148,171,207,0.16)",
    paddingHorizontal: 10,
    paddingVertical: 13,
    justifyContent: "flex-start",
  },
  infoTileAccent: {
    color: "#38bdf8",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
  },
  infoTileIcon: {
    height: 18,
    marginBottom: 8,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  infoTileLabel: {
    color: "#8ca6c8",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 5,
  },
  infoTileValue: {
    color: "#f8fbff",
    fontSize: 14,
    fontWeight: "900",
    flexShrink: 1,
  },
  sectionCard: {
    marginBottom: theme.Spacing.lg,
  },
  reservationCard: {
    borderRadius: 26,
    backgroundColor: "#10223f",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.2)",
    padding: theme.Spacing.md,
    marginBottom: theme.Spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.24,
    shadowRadius: 24,
    elevation: 10,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: theme.Spacing.sm,
  },
  sectionTitle: {
    color: "#b8cbea",
    fontSize: 14,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0,
  },
  sectionMeta: {
    color: "#8ca6c8",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },
  descriptionText: {
    color: "#8ca6c8",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
    marginTop: theme.Spacing.md,
  },
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
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: theme.Spacing.xs,
  },
  statusLabel: { fontSize: 12, fontWeight: "900" },
  hoursBlock: { alignItems: "flex-end", maxWidth: 140 },
  amenitiesRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: theme.Spacing.xs,
    paddingBottom: 2,
    gap: theme.Spacing.sm,
  },
  amenityChip: {
    flex: 1,
    backgroundColor: "#1d3a63",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.2)",
    paddingHorizontal: theme.Spacing.sm,
    paddingVertical: 9,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  amenityText: { color: "#c7d7ee", fontSize: 12, fontWeight: "900" },
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
    alignSelf: "center",
    minHeight: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148,171,207,0.18)",
    paddingHorizontal: theme.Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8,24,45,0.72)",
    marginTop: theme.Spacing.md,
  },
  simulateText: {
    color: "#8ca6c8",
    fontSize: 12,
    fontWeight: "800",
  },
  viewMapButton: {
    minHeight: 50,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.34)",
    marginBottom: theme.Spacing.sm,
  },
  viewMapButtonText: {
    color: "#38bdf8",
    fontSize: 15,
    fontWeight: "900",
  },
  timeGrid: {
    flexDirection: "row",
    gap: theme.Spacing.sm,
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
    color: "#fca5a5",
    fontSize: 12,
    fontWeight: "800",
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
    flex: 1,
    marginBottom: theme.Spacing.sm,
  },
  timeLabel: {
    color: "#f8fbff",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: theme.Spacing.xs,
  },
  timeField: {
    minHeight: 48,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(148,171,207,0.16)",
    backgroundColor: "rgba(8,24,45,0.92)",
    paddingHorizontal: theme.Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeFieldDisabled: {
    opacity: 0.58,
  },
  timeFieldText: {
    color: "#f8fbff",
    fontSize: 14,
    fontWeight: "900",
  },
  timeFieldPlaceholder: {
    color: "#8ca6c8",
    fontWeight: "800",
  },
  timeFieldIcon: {
    color: "#8ca6c8",
    fontSize: 18,
    fontWeight: "700",
  },
  workingHoursText: {
    color: "#8ca6c8",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: theme.Spacing.sm,
  },
  timePickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2,6,23,0.62)",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.Spacing.lg,
  },
  timePickerPopup: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#10223f",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(148,171,207,0.18)",
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
    color: "#f8fbff",
    fontSize: 18,
    fontWeight: "900",
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
    borderRadius: 16,
    paddingHorizontal: theme.Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.Spacing.xs,
    backgroundColor: "rgba(8,24,45,0.92)",
  },
  timeSlotSelected: {
    backgroundColor: "#38bdf8",
  },
  timeSlotText: {
    color: "#c7d7ee",
    fontSize: 14,
    fontWeight: "900",
  },
  timeSlotTextSelected: {
    color: "#071426",
  },
  timeSlotEmpty: {
    color: "#8ca6c8",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: theme.Spacing.lg,
  },
  priceSummary: {
    backgroundColor: "rgba(8,24,45,0.82)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148,171,207,0.12)",
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
  summaryValue: {
    color: "#f8fbff",
    fontSize: 14,
    fontWeight: "900",
  },
  summaryTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(148,171,207,0.12)",
    paddingTop: theme.Spacing.sm,
  },
  totalLabel: {
    color: "#f8fbff",
    fontSize: 15,
    fontWeight: "900",
  },
  totalValue: {
    color: "#38bdf8",
    fontSize: 21,
    fontWeight: "900",
  },
  reserveCta: {
    minHeight: 56,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#38bdf8",
    shadowColor: "#38bdf8",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 10,
  },
  reserveCtaDisabled: {
    opacity: 0.55,
  },
  reserveCtaText: {
    color: "#071426",
    fontSize: 16,
    fontWeight: "900",
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
