import React from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import Button from "../components/Button";
import Input from "../components/Input";
import ScreenWrapper from "../components/ScreenWrapper";
import { useCurrency } from "../context/CurrencyContext";
import { parkingApi, ParkingSummary } from "../services/parkingApi";
import theme from "../theme";
import type {
  ParkingTypeFilter,
  RootStackParamList,
  SearchMode,
} from "../navigation/types";

let Feather: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Feather = require("@expo/vector-icons").Feather;
} catch (e) {
  Feather = null;
}

type NavProp = NativeStackNavigationProp<RootStackParamList, "Home">;

const ONE_TIME_DATES = ["Today", "Tomorrow", "May 17"];
const PARKING_TYPES: { label: string; value: ParkingTypeFilter }[] = [
  { label: "All", value: "all" },
  { label: "Public", value: "PUBLIC" },
  { label: "Private", value: "PRIVATE" },
];

const formatDateValue = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (value: Date | null) => {
  if (!value) return "Select date";

  return value.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const addDays = (value: Date, days: number) => {
  const nextDate = new Date(value);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const getDateRangeDays = (startDate: Date, endDate: Date) => {
  return Math.round(
    (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
  );
};

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const { formatPrice } = useCurrency();
  const [modalVisible, setModalVisible] = React.useState(false);
  const [mode, setMode] = React.useState<SearchMode>("one-time");
  const [where, setWhere] = React.useState("");
  const [date, setDate] = React.useState("Today");
  const [fromDate, setFromDate] = React.useState<Date | null>(null);
  const [toDate, setToDate] = React.useState<Date | null>(null);
  const [parkingType, setParkingType] =
    React.useState<ParkingTypeFilter>("all");
  const [activeDatePicker, setActiveDatePicker] = React.useState<
    "from" | "to" | null
  >(null);
  const [nearbyParkings, setNearbyParkings] = React.useState<ParkingSummary[]>(
    []
  );
  const [isLoadingNearby, setIsLoadingNearby] = React.useState(false);
  const [nearbyError, setNearbyError] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const [error, setError] = React.useState("");
  const pickerAnimation = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!activeDatePicker) return;

    pickerAnimation.setValue(0);
    Animated.timing(pickerAnimation, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [activeDatePicker, pickerAnimation]);

  React.useEffect(() => {
    let isMounted = true;

    const loadNearbyParkings = async () => {
      setIsLoadingNearby(true);
      setNearbyError("");

      try {
        const parkings = await parkingApi.getParkings();
        const availableParkings = parkings
          .filter((parking) => parking.availabilityStatus !== "FULL")
          .slice(0, 3);

        if (isMounted) {
          setNearbyParkings(availableParkings);
        }
      } catch (_err) {
        if (isMounted) {
          setNearbyError("Unable to load nearby parking.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingNearby(false);
        }
      }
    };

    loadNearbyParkings();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    if (event.type === "dismissed" || !selectedDate || !activeDatePicker) {
      setActiveDatePicker(null);
      return;
    }

    const normalizedDate = new Date(selectedDate);
    normalizedDate.setHours(0, 0, 0, 0);

    if (activeDatePicker === "from") {
      setFromDate(normalizedDate);

      if (normalizedDate < startOfToday()) {
        setError("From date cannot be in the past.");
      } else if (toDate && toDate <= normalizedDate) {
        setToDate(null);
        setError("Please select a to date after the from date.");
      } else {
        setError("");
      }

      setActiveDatePicker(null);
      return;
    }

    if (fromDate && normalizedDate <= fromDate) {
      setError("To date must be after from date.");
      setActiveDatePicker(null);
      return;
    }

    setToDate(normalizedDate);
    setError("");
    setActiveDatePicker(null);
  };

  const handleSearch = async () => {
    if (isSearching) return;

    setError("");

    if (mode === "long-term") {
      const today = startOfToday();

      if (!fromDate) {
        setError("Please select a from date.");
        return;
      }

      if (!toDate) {
        setError("Please select a to date.");
        return;
      }

      if (fromDate < today) {
        setError("From date cannot be in the past.");
        return;
      }

      if (toDate <= fromDate) {
        setError("To date must be after from date.");
        return;
      }

      const durationDays = getDateRangeDays(fromDate, toDate);

      if (durationDays < 1) {
        setError("Long-term reservations must be at least 1 day.");
        return;
      }

      if (durationDays > 30) {
        setError("Long-term reservations can be up to 30 days.");
        return;
      }
    }

    setIsSearching(true);

    try {
      const selectedParkingType =
        mode === "long-term" ? "PRIVATE" : parkingType;
      const results: ParkingSummary[] = await parkingApi.searchParkings({
        location: where,
        parkingType:
          selectedParkingType === "all" ? undefined : selectedParkingType,
      });

      setModalVisible(false);
      navigation.navigate("SearchResults", {
        results,
        search: {
          mode,
          location: where.trim(),
          parkingType: selectedParkingType,
          date: mode === "one-time" ? date : undefined,
          fromDate:
            mode === "long-term" && fromDate
              ? formatDateValue(fromDate)
              : undefined,
          toDate:
            mode === "long-term" && toDate
              ? formatDateValue(toDate)
              : undefined,
        },
      });
    } catch (_err) {
      setError("Unable to search parking right now. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={theme.Typography.subtitle}>Good evening</Text>
          <Text
            style={[theme.Typography.title, { marginTop: theme.Spacing.xs }]}
          >
            Iva
          </Text>
          <Text style={styles.headerSubtitle}>Find parking near you</Text>
        </View>

        <Pressable
          onPress={() => setModalVisible(true)}
          style={({ pressed }) => [
            styles.searchPill,
            pressed && { opacity: 0.85 },
          ]}
        >
          {Feather ? (
            <Feather name="search" size={18} color={theme.Colors.primary} />
          ) : (
            <Text style={styles.searchFallback}>⌕</Text>
          )}
          <View style={styles.searchTextBlock}>
            <Text style={styles.searchTitle}>Start your search</Text>
            <Text style={styles.searchSubtitle}>
              Choose where, when, and parking type
            </Text>
          </View>
        </Pressable>

        <View style={styles.nearbySection}>
          <View style={styles.sectionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Closest parking near you</Text>
              <Text style={styles.sectionSubtitle}>
                Based on your current location
              </Text>
            </View>
            {isLoadingNearby ? (
              <ActivityIndicator size="small" color={theme.Colors.primary} />
            ) : null}
          </View>

          {nearbyError ? (
            <Text style={styles.emptyText}>{nearbyError}</Text>
          ) : nearbyParkings.length === 0 && !isLoadingNearby ? (
            <Text style={styles.emptyText}>
              No nearby parking available right now.
            </Text>
          ) : (
            <View style={styles.nearbyList}>
              {nearbyParkings.map((parking) => (
                <NearbyParkingCard
                  key={parking.id}
                  parking={parking}
                  formatPrice={formatPrice}
                  onPress={() =>
                    navigation.navigate("ParkingDetails", {
                      parkingId: parking.id,
                    })
                  }
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (activeDatePicker) {
            setActiveDatePicker(null);
            return;
          }

          setModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setModalVisible(false)}
          />
          <View
            style={[
              styles.searchModal,
              activeDatePicker && styles.searchModalDimmed,
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Search parking</Text>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>

            <View style={styles.modeRow}>
              {[
                { label: "One-time", value: "one-time" as const },
                { label: "Long-term", value: "long-term" as const },
              ].map((item) => (
                <Pressable
                  key={item.value}
                  onPress={() => {
                    setMode(item.value);
                    setError("");
                  }}
                  style={[
                    styles.modeButton,
                    mode === item.value && styles.modeButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.modeText,
                      mode === item.value && styles.modeTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Where</Text>
            <Input
              placeholder="City, street, or parking name"
              value={where}
              onChangeText={setWhere}
              autoCapitalize="words"
            />

            {mode === "one-time" ? (
              <>
                <ChipGroup
                  label="When"
                  options={ONE_TIME_DATES}
                  value={date}
                  onChange={setDate}
                />
                <Text style={styles.fieldLabel}>Parking type</Text>
                <View style={styles.chipRow}>
                  {PARKING_TYPES.map((item) => (
                    <Pressable
                      key={item.value}
                      onPress={() => setParkingType(item.value)}
                      style={[
                        styles.chip,
                        parkingType === item.value && styles.chipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          parkingType === item.value && styles.chipTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : (
              <>
                <View style={styles.longTermFields}>
                  <DateField
                    label="From date"
                    value={formatDisplayDate(fromDate)}
                    isSelected={Boolean(fromDate)}
                    onPress={() => {
                      setError("");
                      setActiveDatePicker("from");
                    }}
                  />
                  <DateField
                    label="To date"
                    value={formatDisplayDate(toDate)}
                    isSelected={Boolean(toDate)}
                    onPress={() => {
                      setError("");
                      setActiveDatePicker("to");
                    }}
                  />
                </View>
                <View style={styles.privateNote}>
                  <Text style={styles.privateNoteText}>
                    Long-term parking searches private parking only.
                  </Text>
                </View>
              </>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={{ height: theme.Spacing.md }} />
            <Button
              title={
                isSearching
                  ? "Searching..."
                  : mode === "long-term"
                    ? "Search private parking"
                    : "Search parking"
              }
              disabled={isSearching}
              onPress={handleSearch}
              style={styles.searchButton}
            />
            {isSearching ? (
              <ActivityIndicator
                color={theme.Colors.primary}
                style={{ marginTop: theme.Spacing.sm }}
              />
            ) : null}

          </View>

          {activeDatePicker ? (
            <Animated.View
              style={[
                styles.datePickerOverlay,
                {
                  opacity: pickerAnimation,
                },
              ]}
            >
              <Pressable
                style={styles.datePickerBackdrop}
                onPress={() => setActiveDatePicker(null)}
              />
              <Animated.View
                style={[
                  styles.datePickerPopup,
                  {
                    opacity: pickerAnimation,
                    transform: [
                      {
                        scale: pickerAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.96, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Text style={styles.datePickerTitle}>
                  {activeDatePicker === "from"
                    ? "Select from date"
                    : "Select to date"}
                </Text>
                <DateTimePicker
                  value={
                    activeDatePicker === "from"
                      ? fromDate ?? startOfToday()
                      : toDate ?? (fromDate ? addDays(fromDate, 1) : startOfToday())
                  }
                  mode="date"
                  display="spinner"
                  minimumDate={
                    activeDatePicker === "to"
                      ? fromDate
                        ? addDays(fromDate, 1)
                        : startOfToday()
                      : startOfToday()
                  }
                  onChange={handleDateChange}
                />
              </Animated.View>
            </Animated.View>
          ) : null}
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

function NearbyParkingCard({
  parking,
  formatPrice,
  onPress,
}: {
  parking: ParkingSummary;
  formatPrice: (amountInEur: number) => string;
  onPress: () => void;
}) {
  const statusStyle =
    parking.availabilityStatus === "AVAILABLE"
      ? {
          label: "Available",
          backgroundColor: "rgba(89,165,117,0.12)",
          color: theme.Colors.secondaryGreen,
        }
      : parking.availabilityStatus === "LIMITED"
        ? {
            label: "Limited",
            backgroundColor: "rgba(245,158,11,0.13)",
            color: "#b45309",
          }
        : {
            label: "Full",
            backgroundColor: "rgba(239,68,68,0.1)",
            color: theme.Colors.error,
          };

  const availabilityText =
    parking.availabilityStatus === "FULL"
      ? "No spots available"
      : parking.availabilityStatus === "LIMITED"
        ? `Only ${parking.availableSpots} spot${
            parking.availableSpots === 1 ? "" : "s"
          } left`
        : `${parking.availableSpots} spot${
            parking.availableSpots === 1 ? "" : "s"
          } available`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.nearbyCard,
        pressed && { opacity: 0.86 },
      ]}
    >
      <View style={styles.nearbyCardTop}>
        <View style={styles.nearbyTitleBlock}>
          <Text style={styles.nearbyName} numberOfLines={1}>
            {parking.name}
          </Text>
          <Text style={styles.nearbyDistance} numberOfLines={1}>
            {parking.city} · nearby
          </Text>
        </View>
        <View
          style={[
            styles.nearbyBadge,
            { backgroundColor: statusStyle.backgroundColor },
          ]}
        >
          <Text style={[styles.nearbyBadgeText, { color: statusStyle.color }]}>
            {statusStyle.label}
          </Text>
        </View>
      </View>

      <View style={styles.nearbyMetaRow}>
        <Text style={styles.nearbyAvailability}>{availabilityText}</Text>
        <Text style={styles.nearbyPrice}>
          {formatPrice(parking.pricePerHour)}/hr
        </Text>
      </View>
    </Pressable>
  );
}

function DateField({
  label,
  value,
  isSelected,
  onPress,
}: {
  label: string;
  value: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.dateFieldWrapper}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.dateField,
          pressed && { opacity: 0.82 },
        ]}
      >
        <Text
          style={[
            styles.dateFieldText,
            !isSelected && styles.dateFieldPlaceholder,
          ]}
        >
          {value}
        </Text>
        <Text style={styles.dateFieldIcon}>⌄</Text>
      </Pressable>
    </View>
  );
}

function ChipGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (nextValue: string) => void;
}) {
  return (
    <View style={styles.chipGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((option) => (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={[styles.chip, value === option && styles.chipActive]}
          >
            <Text
              style={[
                styles.chipText,
                value === option && styles.chipTextActive,
              ]}
            >
              {option}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: theme.Spacing.xl * 2 },
  header: { paddingVertical: theme.Spacing.sm },
  headerSubtitle: {
    ...theme.Typography.body,
    color: theme.Colors.textSecondary,
    marginTop: theme.Spacing.xs,
  },
  searchPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.Colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.Colors.border,
    paddingHorizontal: theme.Spacing.md,
    paddingVertical: theme.Spacing.md,
    marginTop: theme.Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  searchFallback: {
    color: theme.Colors.primary,
    fontSize: 20,
    fontWeight: "700",
  },
  searchTextBlock: { marginLeft: theme.Spacing.sm, flex: 1 },
  searchTitle: { ...theme.Typography.body, fontWeight: "700" },
  searchSubtitle: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
    marginTop: 2,
  },
  nearbySection: {
    marginTop: theme.Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.Spacing.sm,
  },
  sectionTitle: { ...theme.Typography.subtitle },
  sectionSubtitle: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
    marginTop: 2,
  },
  nearbyList: {
    gap: theme.Spacing.sm,
  },
  nearbyCard: {
    backgroundColor: theme.Colors.surface,
    borderRadius: theme.Radius.lg,
    borderWidth: 1,
    borderColor: theme.Colors.border,
    padding: theme.Spacing.md,
  },
  nearbyCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  nearbyTitleBlock: {
    flex: 1,
    paddingRight: theme.Spacing.sm,
  },
  nearbyName: {
    ...theme.Typography.body,
    fontWeight: "700",
  },
  nearbyDistance: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
    marginTop: 2,
  },
  nearbyBadge: {
    borderRadius: 999,
    paddingHorizontal: theme.Spacing.sm,
    paddingVertical: 5,
  },
  nearbyBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  nearbyMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: theme.Spacing.sm,
  },
  nearbyAvailability: {
    ...theme.Typography.caption,
    color: theme.Colors.textPrimary,
    fontWeight: "700",
    flex: 1,
    paddingRight: theme.Spacing.sm,
  },
  nearbyPrice: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
    fontWeight: "700",
  },
  emptyText: {
    ...theme.Typography.body,
    color: theme.Colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.Spacing.lg,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  searchModal: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: theme.Colors.surface,
    borderRadius: theme.Radius.lg,
    padding: theme.Spacing.lg,
  },
  searchModalDimmed: {
    opacity: 0.22,
    transform: [{ scale: 0.985 }],
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: { ...theme.Typography.subtitle },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.Colors.background,
  },
  closeText: {
    color: theme.Colors.textSecondary,
    fontSize: 22,
    lineHeight: 24,
  },
  modeRow: {
    flexDirection: "row",
    backgroundColor: theme.Colors.background,
    borderRadius: theme.Radius.lg,
    padding: 4,
    marginVertical: theme.Spacing.md,
  },
  modeButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: theme.Spacing.sm,
    borderRadius: theme.Radius.md,
  },
  modeButtonActive: { backgroundColor: theme.Colors.surface },
  modeText: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
    fontWeight: "700",
  },
  modeTextActive: { color: theme.Colors.primary },
  fieldLabel: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
    fontWeight: "700",
    marginBottom: theme.Spacing.xs,
    marginTop: theme.Spacing.sm,
  },
  chipGroup: { marginTop: theme.Spacing.xs },
  chipRow: { flexDirection: "row", flexWrap: "wrap" },
  chip: {
    paddingHorizontal: theme.Spacing.md,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.Colors.border,
    backgroundColor: theme.Colors.surface,
    marginRight: theme.Spacing.sm,
    marginBottom: theme.Spacing.sm,
  },
  chipActive: {
    backgroundColor: theme.Colors.primary,
    borderColor: theme.Colors.primary,
  },
  chipText: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
    fontWeight: "700",
  },
  chipTextActive: { color: "#fff" },
  longTermFields: { marginTop: theme.Spacing.xs },
  dateFieldWrapper: { marginBottom: theme.Spacing.xs },
  dateField: {
    minHeight: 50,
    borderRadius: theme.Radius.md,
    borderWidth: 1,
    borderColor: theme.Colors.border,
    backgroundColor: theme.Colors.surface,
    paddingHorizontal: theme.Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateFieldText: {
    ...theme.Typography.body,
    color: theme.Colors.textPrimary,
    fontWeight: "600",
  },
  dateFieldPlaceholder: {
    color: theme.Colors.textSecondary,
    fontWeight: "400",
  },
  dateFieldIcon: {
    color: theme.Colors.textSecondary,
    fontSize: 18,
    fontWeight: "700",
  },
  datePickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2,6,23,0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.Spacing.lg,
    zIndex: 20,
    elevation: 20,
  },
  datePickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  datePickerPopup: {
    width: "100%",
    maxWidth: 360,
    borderRadius: theme.Radius.lg,
    backgroundColor: theme.Colors.surface,
    paddingHorizontal: theme.Spacing.md,
    paddingTop: theme.Spacing.md,
    paddingBottom: theme.Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 24,
    overflow: "hidden",
  },
  datePickerTitle: {
    ...theme.Typography.subtitle,
    textAlign: "center",
    marginBottom: theme.Spacing.sm,
    fontWeight: "700",
  },
  privateNote: {
    backgroundColor: "rgba(20,43,108,0.06)",
    borderRadius: theme.Radius.md,
    paddingHorizontal: theme.Spacing.md,
    paddingVertical: theme.Spacing.sm,
    marginTop: theme.Spacing.xs,
  },
  privateNoteText: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
  },
  searchButton: {
    borderRadius: theme.Radius.lg,
    paddingVertical: theme.Spacing.md,
  },
  errorText: {
    ...theme.Typography.caption,
    color: theme.Colors.error,
    textAlign: "center",
    marginTop: theme.Spacing.sm,
  },
});
