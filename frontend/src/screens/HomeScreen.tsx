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
const TIMES = ["10:00", "12:00", "14:00", "18:00"];
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

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const [modalVisible, setModalVisible] = React.useState(false);
  const [mode, setMode] = React.useState<SearchMode>("one-time");
  const [where, setWhere] = React.useState("");
  const [date, setDate] = React.useState("Today");
  const [fromDate, setFromDate] = React.useState<Date | null>(null);
  const [toDate, setToDate] = React.useState<Date | null>(null);
  const [startTime, setStartTime] = React.useState("10:00");
  const [endTime, setEndTime] = React.useState("12:00");
  const [parkingType, setParkingType] =
    React.useState<ParkingTypeFilter>("all");
  const [activeDatePicker, setActiveDatePicker] = React.useState<
    "from" | "to" | null
  >(null);
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

      if (toDate && toDate < normalizedDate) {
        setToDate(null);
        setError("Please select a to date after the from date.");
      } else {
        setError("");
      }

      setActiveDatePicker(null);
      return;
    }

    if (fromDate && normalizedDate < fromDate) {
      setError("To date cannot be before from date.");
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

    if (mode === "long-term" && (!fromDate || !toDate)) {
      setError("Please select both from date and to date.");
      return;
    }

    if (mode === "long-term" && fromDate && toDate && toDate < fromDate) {
      setError("To date cannot be before from date.");
      return;
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
          startTime: mode === "one-time" ? startTime : undefined,
          endTime: mode === "one-time" ? endTime : undefined,
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

        <View style={styles.emptyPrompt}>
          <Text style={styles.emptyTitle}>Search parking across Skopje</Text>
          <Text style={styles.emptyText}>
            Use the search panel to find public and private parking from the
            ParkPal backend.
          </Text>
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
                <ChipGroup
                  label="Start time"
                  options={TIMES}
                  value={startTime}
                  onChange={setStartTime}
                />
                <ChipGroup
                  label="End time"
                  options={TIMES}
                  value={endTime}
                  onChange={setEndTime}
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
                      : toDate ?? fromDate ?? startOfToday()
                  }
                  mode="date"
                  display="spinner"
                  minimumDate={
                    activeDatePicker === "to"
                      ? fromDate ?? startOfToday()
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
  emptyPrompt: {
    marginTop: theme.Spacing.xl,
    padding: theme.Spacing.lg,
    borderRadius: theme.Radius.lg,
    backgroundColor: theme.Colors.surface,
    borderWidth: 1,
    borderColor: theme.Colors.border,
  },
  emptyTitle: { ...theme.Typography.subtitle },
  emptyText: {
    ...theme.Typography.body,
    color: theme.Colors.textSecondary,
    marginTop: theme.Spacing.xs,
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
