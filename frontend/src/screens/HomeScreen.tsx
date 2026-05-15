import React from "react";
import {
  Text,
  StyleSheet,
  View,
  FlatList,
  Pressable,
  Platform,
  Modal,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import ScreenWrapper from "../components/ScreenWrapper";
import Input from "../components/Input";
import Card from "../components/Card";
import SectionTitle from "../components/SectionTitle";
import Button from "../components/Button";
import { Parking, useParking } from "../context/ParkingContext";
import {
  formatDate,
  formatTime,
  getDateRangeDays,
  isValidTimeRange,
  isValidDateRange,
  SearchMode,
} from "../utils/booking";
// Try to load vector icons if available; fall back to emoji if not installed
let Feather: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Feather = require("@expo/vector-icons").Feather;
} catch (e) {
  Feather = null;
}
import theme from "../theme";
import type { RootStackParamList } from "../navigation/types";

type NavProp = NativeStackNavigationProp<RootStackParamList, "Home">;

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const { parkings } = useParking();
  const [searchMode, setSearchMode] = React.useState<SearchMode>("one-time");
  const [location, setLocation] = React.useState("");
  const [date, setDate] = React.useState(new Date());
  const [toDate, setToDate] = React.useState(() => {
    const value = new Date();
    value.setDate(value.getDate() + 7);
    return value;
  });
  const [startTime, setStartTime] = React.useState(() => {
    const value = new Date();
    value.setHours(10, 0, 0, 0);
    return value;
  });
  const [endTime, setEndTime] = React.useState(() => {
    const value = new Date();
    value.setHours(12, 0, 0, 0);
    return value;
  });
  const [activePicker, setActivePicker] = React.useState<
    "date" | "start" | "end" | "toDate" | null
  >(null);
  const [searchVisible, setSearchVisible] = React.useState(false);

  const startTimeLabel = formatTime(startTime);
  const endTimeLabel = formatTime(endTime);
  const timeRangeValid = isValidTimeRange(startTimeLabel, endTimeLabel);
  const dateRangeValid = isValidDateRange(date, toDate);
  const searchValid =
    searchMode === "one-time" ? timeRangeValid : dateRangeValid;

  function handleSearch() {
    if (!searchValid) {
      return;
    }

    const longTermDays = getDateRangeDays(date, toDate);

    setSearchVisible(false);
    setActivePicker(null);
    navigation.navigate("SearchResults", {
      booking: {
        mode: searchMode,
        location: location.trim() || "Current location",
        date: formatDate(date),
        ...(searchMode === "one-time"
          ? {
              startTime: startTimeLabel,
              endTime: endTimeLabel,
            }
          : {
              toDate: formatDate(toDate),
              durationHours: longTermDays * 24,
            }),
      },
    });
  }

  function renderPickerField(
    label: string,
    value: string,
    picker: "date" | "start" | "end" | "toDate",
  ) {
    return (
      <Pressable
        onPress={() => setActivePicker(activePicker === picker ? null : picker)}
        style={({ pressed }) => [
          styles.pickerField,
          pressed && { opacity: 0.75 },
        ]}
      >
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldValue}>{value}</Text>
      </Pressable>
    );
  }

  function renderItem({ item }: { item: Parking }) {
    const isOpen = item.spotsAvailable > 0;

    return (
      <Pressable
        onPress={() =>
          navigation.navigate("ParkingDetails", { parkingId: item.id })
        }
      >
        <Card style={styles.parkingCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.titleCol}>
              <Text style={theme.Typography.title}>{item.name}</Text>
              <Text
                style={[
                  theme.Typography.caption,
                  {
                    color: theme.Colors.textSecondary,
                    marginTop: theme.Spacing.xs,
                  },
                ]}
              >
                {item.address}
              </Text>
            </View>

            <View style={styles.statusCol}>
              <View
                style={[
                  styles.statusChip,
                  {
                    backgroundColor: isOpen
                      ? "rgba(89,165,117,0.12)"
                      : "rgba(2,6,23,0.06)",
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusDotSmall,
                    {
                      backgroundColor: isOpen
                        ? theme.Colors.secondaryGreen
                        : theme.Colors.border,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: isOpen
                        ? theme.Colors.secondaryGreen
                        : theme.Colors.textSecondary,
                    },
                  ]}
                >
                  {isOpen ? "Open" : "Full"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.rowSpace}>
            <Text style={styles.muted}>{item.spotsAvailable} spots</Text>
            <Text style={styles.muted}>€{item.price.toFixed(2)}/hr</Text>
            <Text style={styles.muted}>{item.distance}</Text>
          </View>

          <View style={styles.cardFooterRow}>
            <Text style={styles.viewDetails}>View details</Text>
          </View>
        </Card>
      </Pressable>
    );
  }

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Text style={theme.Typography.subtitle}>Hello</Text>
        <Text style={[theme.Typography.title, { marginTop: theme.Spacing.xs }]}>
          Iva
        </Text>
        <Text
          style={[
            theme.Typography.body,
            { color: theme.Colors.textSecondary, marginTop: theme.Spacing.xs },
          ]}
        >
          Find parking near you
        </Text>
      </View>

      <Pressable
        onPress={() => setSearchVisible(true)}
        style={({ pressed }) => [
          styles.searchPill,
          pressed && { opacity: 0.82 },
        ]}
      >
        <View style={styles.searchPillIcon}>
          <Feather name="search" size={17} color={theme.Colors.primary} />
        </View>
        <Text style={styles.searchPillText}>Start your search</Text>
      </Pressable>

      <View style={{ height: theme.Spacing.md }} />

      <SectionTitle>Nearby parking</SectionTitle>

      <FlatList
        data={parkings}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => (
          <View style={{ height: theme.Spacing.sm }} />
        )}
        contentContainerStyle={{ paddingBottom: theme.Spacing.xl * 2 }}
      />

      <Modal
        animationType="fade"
        transparent
        visible={searchVisible}
        onRequestClose={() => {
          setSearchVisible(false);
          setActivePicker(null);
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setSearchVisible(false);
            setActivePicker(null);
          }}
        >
          <Pressable style={styles.searchPanel}>
            <View style={styles.panelHeader}>
              <Text style={theme.Typography.title}>Search parking</Text>
              <Pressable
                onPress={() => {
                  setSearchVisible(false);
                  setActivePicker(null);
                }}
                style={styles.closeButton}
                accessibilityLabel="Close search"
              >
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>

            <View style={styles.modeRow}>
              <Pressable
                onPress={() => {
                  setSearchMode("one-time");
                  setActivePicker(null);
                }}
                style={[
                  styles.modeChip,
                  searchMode === "one-time" && styles.modeChipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.modeChipText,
                    searchMode === "one-time" && styles.modeChipTextSelected,
                  ]}
                >
                  One-time
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setSearchMode("long-term");
                  setActivePicker(null);
                }}
                style={[
                  styles.modeChip,
                  searchMode === "long-term" && styles.modeChipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.modeChipText,
                    searchMode === "long-term" && styles.modeChipTextSelected,
                  ]}
                >
                  Long-term
                </Text>
              </Pressable>
            </View>

            <Text style={styles.panelSectionTitle}>Where</Text>
            <View style={styles.searchInputRow}>
              <Feather
                name="map-pin"
                size={16}
                color={theme.Colors.textSecondary}
                style={styles.searchIcon}
              />
              <Input
                placeholder="Location"
                value={location}
                onChangeText={setLocation}
                style={styles.searchInput}
              />
            </View>

            <Text style={styles.panelSectionTitle}>When</Text>
            {searchMode === "one-time" ? (
              <>
                <View style={styles.fieldsRow}>
                  {renderPickerField("Date", formatDate(date), "date")}
                </View>

                <View style={styles.fieldsRow}>
                  {renderPickerField("Start", startTimeLabel, "start")}
                  {renderPickerField("End", endTimeLabel, "end")}
                </View>
              </>
            ) : (
              <>
                <View style={styles.fieldsRow}>
                  {renderPickerField("From date", formatDate(date), "date")}
                </View>
                <View style={styles.fieldsRow}>
                  {renderPickerField("To date", formatDate(toDate), "toDate")}
                </View>
              </>
            )}

            {activePicker === "date" ? (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={(_, selectedDate) => {
                  if (Platform.OS !== "ios") setActivePicker(null);
                  if (selectedDate) setDate(selectedDate);
                }}
              />
            ) : null}

            {activePicker === "toDate" ? (
              <DateTimePicker
                value={toDate}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={(_, selectedDate) => {
                  if (Platform.OS !== "ios") setActivePicker(null);
                  if (selectedDate) setToDate(selectedDate);
                }}
              />
            ) : null}

            {activePicker === "start" ? (
              <DateTimePicker
                value={startTime}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_, selectedTime) => {
                  if (Platform.OS !== "ios") setActivePicker(null);
                  if (selectedTime) setStartTime(selectedTime);
                }}
              />
            ) : null}

            {activePicker === "end" ? (
              <DateTimePicker
                value={endTime}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_, selectedTime) => {
                  if (Platform.OS !== "ios") setActivePicker(null);
                  if (selectedTime) setEndTime(selectedTime);
                }}
              />
            ) : null}

            {searchMode === "one-time" && !timeRangeValid ? (
              <Text style={styles.errorText}>
                End time should be after start time.
              </Text>
            ) : null}

            {searchMode === "long-term" && !dateRangeValid ? (
              <Text style={styles.errorText}>
                To date should be after from date.
              </Text>
            ) : null}

            <Button
              title={
                searchMode === "one-time"
                  ? "Search short parking"
                  : "Search long-term parking"
              }
              onPress={handleSearch}
              style={styles.searchButton}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  searchPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.Colors.surface,
    borderRadius: 999,
    paddingVertical: theme.Spacing.sm,
    paddingHorizontal: theme.Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  searchPillIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(20,43,108,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.Spacing.sm,
  },
  searchPillText: {
    ...theme.Typography.body,
    color: theme.Colors.textPrimary,
    fontWeight: "600",
  },
  header: { paddingVertical: theme.Spacing.sm },
  parkingCard: { marginBottom: theme.Spacing.sm },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.Spacing.sm,
  },
  titleCol: { flex: 1, paddingRight: theme.Spacing.md },
  statusCol: { justifyContent: "flex-start" },
  statusDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: theme.Spacing.xs,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.Spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: { fontSize: 12, fontWeight: "600" },
  rowSpace: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: theme.Spacing.sm,
  },
  muted: { ...theme.Typography.caption, color: theme.Colors.textSecondary },
  cardFooterRow: { marginTop: theme.Spacing.md, alignItems: "flex-start" },
  viewDetails: { color: theme.Colors.primary, fontWeight: "600" },

  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: theme.Spacing.sm,
    paddingVertical: theme.Spacing.xs,
    borderRadius: theme.Radius.md,
  },
  searchIcon: {
    marginRight: theme.Spacing.sm,
  },
  searchInput: {
    backgroundColor: "transparent",
    borderWidth: 0,
    paddingVertical: 6,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.32)",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.Spacing.lg,
  },
  searchPanel: {
    backgroundColor: theme.Colors.surface,
    borderRadius: theme.Radius.lg,
    padding: theme.Spacing.md,
    width: "100%",
    maxWidth: 380,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.Spacing.md,
  },
  modeRow: {
    flexDirection: "row",
    backgroundColor: theme.Colors.background,
    borderRadius: theme.Radius.lg,
    padding: 4,
    marginBottom: theme.Spacing.sm,
  },
  modeChip: {
    flex: 1,
    alignItems: "center",
    borderRadius: theme.Radius.md,
    paddingVertical: theme.Spacing.sm,
  },
  modeChipSelected: {
    backgroundColor: theme.Colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  modeChipText: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
    fontWeight: "600",
  },
  modeChipTextSelected: {
    color: theme.Colors.primary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.Colors.background,
  },
  closeText: {
    color: theme.Colors.textPrimary,
    fontSize: 22,
    lineHeight: 24,
  },
  panelSectionTitle: {
    ...theme.Typography.subtitle,
    marginBottom: theme.Spacing.sm,
    marginTop: theme.Spacing.sm,
  },
  fieldsRow: {
    flexDirection: "row",
    marginTop: theme.Spacing.sm,
  },
  pickerField: {
    flex: 1,
    backgroundColor: theme.Colors.background,
    borderRadius: theme.Radius.md,
    borderWidth: 1,
    borderColor: theme.Colors.border,
    paddingHorizontal: theme.Spacing.sm,
    paddingVertical: theme.Spacing.sm,
    marginRight: theme.Spacing.sm,
  },
  fieldLabel: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
  },
  fieldValue: {
    ...theme.Typography.body,
    marginTop: 2,
  },
  errorText: {
    ...theme.Typography.caption,
    color: "#dc2626",
    marginTop: theme.Spacing.sm,
  },
  searchButton: {
    marginTop: theme.Spacing.md,
  },
});
