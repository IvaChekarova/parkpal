import React from "react";
import {
  FlatList,
  Animated,
  PanResponder,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenWrapper from "../components/ScreenWrapper";
import Card from "../components/Card";
import Button from "../components/Button";
import { Parking, useParking } from "../context/ParkingContext";
import { getBookingDateSummary, getBookingHours } from "../utils/booking";
import theme from "../theme";
import type { RootStackParamList } from "../navigation/types";

type NavProp = NativeStackNavigationProp<RootStackParamList, "SearchResults">;
type RouteProps = RouteProp<RootStackParamList, "SearchResults">;

let Feather: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Feather = require("@expo/vector-icons").Feather;
} catch (e) {
  Feather = null;
}

const PIN_POSITIONS = [
  { top: "22%", left: "18%" },
  { top: "34%", left: "58%" },
  { top: "48%", left: "34%" },
  { top: "58%", left: "70%" },
] as const;

const TOP_BAR_HEIGHT = 52;
const TOP_BAR_BOTTOM_GAP = 20;

type ParkingTypeFilter = "all" | "public" | "private";
type SortOption = "closest" | "lowest-price" | "most-available";

const PARKING_TYPE_OPTIONS: Array<{
  label: string;
  value: ParkingTypeFilter;
}> = [
  { label: "All", value: "all" },
  { label: "Public", value: "public" },
  { label: "Private", value: "private" },
];

const SORT_OPTIONS: Array<{ label: string; value: SortOption }> = [
  { label: "Closest", value: "closest" },
  { label: "Lowest price", value: "lowest-price" },
  { label: "Most available", value: "most-available" },
];

export default function SearchResultsScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { parkings } = useParking();
  const { booking } = route.params;
  const [isSheetExpanded, setIsSheetExpanded] = React.useState(false);
  const [filtersVisible, setFiltersVisible] = React.useState(false);
  const [parkingTypeFilter, setParkingTypeFilter] =
    React.useState<ParkingTypeFilter>("all");
  const [sortOption, setSortOption] = React.useState<SortOption>("closest");
  const collapsedHeight = windowHeight * 0.48;
  const headerTop = insets.top + theme.Spacing.sm;
  const expandedTop = insets.top + 96;
  const collapsedTranslateY = Math.max(
    windowHeight - expandedTop - collapsedHeight,
    0,
  );
  const sheetTranslateY = React.useRef(
    new Animated.Value(collapsedTranslateY),
  ).current;
  const gestureStartTranslateY = React.useRef(collapsedTranslateY);
  const durationHours = getBookingHours(booking);
  const dateSummary = getBookingDateSummary(booking);
  const availableParkings = React.useMemo(() => {
    const filtered = parkings.filter((parking) => {
      if (parking.spotsAvailable <= 0) {
        return false;
      }

      const parkingType = parking.id === "2" ? "private" : "public";

      return parkingTypeFilter === "all" || parkingType === parkingTypeFilter;
    });

    return [...filtered].sort((a, b) => {
      if (sortOption === "lowest-price") {
        return a.price - b.price;
      }

      if (sortOption === "most-available") {
        return b.spotsAvailable - a.spotsAvailable;
      }

      return Number.parseFloat(a.distance) - Number.parseFloat(b.distance);
    });
  }, [parkingTypeFilter, parkings, sortOption]);

  function goToDetails(parkingId: string) {
    navigation.navigate("ParkingDetails", {
      parkingId,
      booking,
    });
  }

  React.useEffect(() => {
    Animated.spring(sheetTranslateY, {
      toValue: isSheetExpanded ? 0 : collapsedTranslateY,
      useNativeDriver: true,
      damping: 24,
      stiffness: 220,
    }).start();
  }, [collapsedTranslateY, isSheetExpanded, sheetTranslateY]);

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > 8,
        onPanResponderGrant: () => {
          gestureStartTranslateY.current = isSheetExpanded
            ? 0
            : collapsedTranslateY;
          sheetTranslateY.stopAnimation((value) => {
            gestureStartTranslateY.current = value;
          });
        },
        onPanResponderMove: (_, gestureState) => {
          const nextTranslateY =
            gestureStartTranslateY.current + gestureState.dy;
          const clampedTranslateY = Math.min(
            Math.max(nextTranslateY, 0),
            collapsedTranslateY,
          );
          sheetTranslateY.setValue(clampedTranslateY);
        },
        onPanResponderRelease: (_, gestureState) => {
          const finalTranslateY = Math.min(
            Math.max(gestureStartTranslateY.current + gestureState.dy, 0),
            collapsedTranslateY,
          );
          const midpoint = collapsedTranslateY / 2;
          const shouldExpand =
            gestureState.vy < -0.5 ||
            (gestureState.vy <= 0.5 && finalTranslateY < midpoint);

          setIsSheetExpanded(shouldExpand);
          Animated.spring(sheetTranslateY, {
            toValue: shouldExpand ? 0 : collapsedTranslateY,
            useNativeDriver: true,
            damping: 24,
            stiffness: 220,
          }).start();
        },
      }),
    [collapsedTranslateY, isSheetExpanded, sheetTranslateY],
  );

  function renderParking({ item }: { item: Parking }) {
    const estimatedTotal = item.price * durationHours;

    return (
      <Pressable onPress={() => goToDetails(item.id)}>
        <Card style={styles.card}>
          <View style={styles.rowTop}>
            <View style={styles.titleBlock}>
              <Text style={theme.Typography.subtitle}>{item.name}</Text>
              <Text style={[theme.Typography.caption, styles.muted]}>
                {item.address}
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>{item.distance}</Text>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.metaText}>{item.spotsAvailable} spots</Text>
              </View>
            </View>

            <View style={styles.totalBlock}>
              <Text style={theme.Typography.subtitle}>
                €{estimatedTotal.toFixed(2)}
              </Text>
              <Text style={styles.muted}>est.</Text>
            </View>
          </View>

          <View style={styles.rowBottom}>
            <View style={styles.statusChip}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Available</Text>
            </View>
            <Text style={styles.priceText}>€{item.price.toFixed(2)}/hr</Text>
            <Pressable onPress={() => goToDetails(item.id)}>
              <Text style={styles.viewDetails}>View details</Text>
            </Pressable>
          </View>
        </Card>
      </Pressable>
    );
  }

  return (
    <ScreenWrapper style={styles.screen}>
      <View style={styles.mapArea}>
        <View style={styles.mapBlockLarge} />
        <View style={styles.mapBlockTop} />
        <View style={styles.mapBlockRight} />
        <View style={styles.mapRoadPrimary} />
        <View style={styles.mapRoadSecondary} />
        <View style={styles.mapRoadVertical} />

        {availableParkings.slice(0, 4).map((parking, index) => (
          <Pressable
            key={parking.id}
            onPress={() => goToDetails(parking.id)}
            style={[
              styles.pricePin,
              PIN_POSITIONS[index],
              index === 0 && styles.pricePinActive,
            ]}
          >
            <Text
              style={[
                styles.pricePinText,
                index === 0 && styles.pricePinTextActive,
              ]}
            >
              €{parking.price.toFixed(2)}/hr
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.topBar, { top: insets.top + theme.Spacing.sm }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.iconButton}
          accessibilityLabel="Back"
        >
          <Text style={styles.iconText}>←</Text>
        </Pressable>

        <View style={styles.searchPill}>
          <Text
            style={styles.searchLocation}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {booking.location}
          </Text>
          <Text
            style={styles.searchTime}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {dateSummary}
          </Text>
        </View>

        <Pressable
          onPress={() => setFiltersVisible(true)}
          style={styles.iconButton}
          accessibilityLabel="Filters"
        >
          {Feather ? (
            <Feather name="sliders" size={17} color={theme.Colors.primary} />
          ) : (
            <Text style={styles.iconText}>≡</Text>
          )}
        </Pressable>
      </View>

      <Animated.View
        style={[
          styles.resultsPanel,
          {
            top: expandedTop,
            transform: [{ translateY: sheetTranslateY }],
          },
          { paddingBottom: insets.bottom + theme.Spacing.sm },
        ]}
      >
        <View style={styles.sheetHeader} {...panResponder.panHandlers}>
          <View style={styles.dragHandle} />
          <View style={styles.sheetTitleRow}>
            <View style={styles.sheetTitleBlock}>
              <Text style={theme.Typography.title}>Available parking</Text>
              <Text
                style={styles.panelSubtitle}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {availableParkings.length} results near {booking.location} •{" "}
                {dateSummary}
              </Text>
            </View>
          </View>
        </View>

        <FlatList
          data={availableParkings}
          keyExtractor={(item) => item.id}
          renderItem={renderParking}
          showsVerticalScrollIndicator={false}
          scrollEnabled={isSheetExpanded}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + theme.Spacing.xl },
          ]}
        />
      </Animated.View>

      <Modal
        animationType="fade"
        transparent
        visible={filtersVisible}
        onRequestClose={() => setFiltersVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setFiltersVisible(false)}
        >
          <Pressable style={styles.filterModal}>
            <View style={styles.filterHeader}>
              <Text style={theme.Typography.title}>Filters</Text>
              <Pressable
                onPress={() => setFiltersVisible(false)}
                style={styles.closeButton}
                accessibilityLabel="Close filters"
              >
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>

            <Text style={styles.filterSectionTitle}>Parking type</Text>
            <View style={styles.optionRow}>
              {PARKING_TYPE_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => setParkingTypeFilter(option.value)}
                  style={[
                    styles.optionChip,
                    parkingTypeFilter === option.value &&
                      styles.optionChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      parkingTypeFilter === option.value &&
                        styles.optionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.filterSectionTitle}>Sort by</Text>
            {SORT_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setSortOption(option.value)}
                style={styles.sortRow}
              >
                <Text style={theme.Typography.body}>{option.label}</Text>
                {sortOption === option.value ? (
                  <Text style={styles.checkMark}>✓</Text>
                ) : null}
              </Pressable>
            ))}

            <View style={styles.filterActions}>
              <Button
                title="Apply filters"
                onPress={() => setFiltersVisible(false)}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 0,
  },
  mapArea: {
    flex: 1,
    backgroundColor: "#E8EEF1",
    overflow: "hidden",
  },
  mapBlockLarge: {
    position: "absolute",
    width: 180,
    height: 150,
    borderRadius: theme.Radius.lg,
    backgroundColor: "#DCE8DF",
    top: 90,
    left: -35,
    transform: [{ rotate: "-10deg" }],
  },
  mapBlockTop: {
    position: "absolute",
    width: 150,
    height: 110,
    borderRadius: theme.Radius.md,
    backgroundColor: "#EEF2E7",
    top: 65,
    right: 24,
    transform: [{ rotate: "8deg" }],
  },
  mapBlockRight: {
    position: "absolute",
    width: 180,
    height: 170,
    borderRadius: theme.Radius.lg,
    backgroundColor: "#D8E3EA",
    top: 230,
    right: -40,
    transform: [{ rotate: "-14deg" }],
  },
  mapRoadPrimary: {
    position: "absolute",
    height: 20,
    width: "120%",
    backgroundColor: "#FFFFFF",
    top: 210,
    left: -30,
    transform: [{ rotate: "-18deg" }],
  },
  mapRoadSecondary: {
    position: "absolute",
    height: 14,
    width: "110%",
    backgroundColor: "rgba(255,255,255,0.8)",
    top: 145,
    left: -20,
    transform: [{ rotate: "28deg" }],
  },
  mapRoadVertical: {
    position: "absolute",
    height: "70%",
    width: 18,
    backgroundColor: "rgba(255,255,255,0.78)",
    top: 30,
    left: "48%",
    transform: [{ rotate: "8deg" }],
  },
  pricePin: {
    position: "absolute",
    paddingHorizontal: theme.Spacing.sm,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: theme.Colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  pricePinActive: {
    backgroundColor: theme.Colors.primary,
  },
  pricePinText: {
    ...theme.Typography.caption,
    color: theme.Colors.textPrimary,
    fontWeight: "700",
  },
  pricePinTextActive: {
    color: "#fff",
  },
  topBar: {
    position: "absolute",
    left: theme.Spacing.md,
    right: theme.Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 3,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconText: {
    color: theme.Colors.primary,
    fontSize: 18,
    fontWeight: "700",
  },
  searchPill: {
    flex: 1,
    height: 52,
    borderRadius: 999,
    backgroundColor: theme.Colors.surface,
    marginHorizontal: theme.Spacing.sm,
    paddingHorizontal: theme.Spacing.md,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchLocation: {
    ...theme.Typography.body,
    color: theme.Colors.textPrimary,
    fontWeight: "700",
    textAlign: "center",
  },
  searchTime: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
    marginTop: 1,
    textAlign: "center",
  },
  resultsPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    backgroundColor: theme.Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: theme.Spacing.md,
    paddingTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 12,
  },
  sheetHeader: {
    paddingBottom: theme.Spacing.sm,
  },
  dragHandle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.Colors.border,
    alignSelf: "center",
    marginBottom: theme.Spacing.sm,
  },
  sheetTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitleBlock: {
    flex: 1,
    paddingRight: theme.Spacing.sm,
  },
  panelSubtitle: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
    marginTop: theme.Spacing.xs,
  },
  listContent: {
    paddingTop: theme.Spacing.xs,
  },
  card: {
    marginBottom: theme.Spacing.sm,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: theme.Spacing.sm,
  },
  titleBlock: {
    flex: 1,
    paddingRight: theme.Spacing.sm,
  },
  totalBlock: {
    alignItems: "flex-end",
  },
  rowBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.Spacing.xs,
  },
  metaText: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
  },
  metaDot: {
    color: theme.Colors.textSecondary,
    marginHorizontal: theme.Spacing.xs,
  },
  muted: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.Spacing.sm,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(89,165,117,0.12)",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.Colors.secondaryGreen,
    marginRight: theme.Spacing.xs,
  },
  statusText: {
    color: theme.Colors.secondaryGreen,
    fontSize: 12,
    fontWeight: "700",
  },
  priceText: {
    ...theme.Typography.caption,
    color: theme.Colors.textPrimary,
    fontWeight: "700",
  },
  viewDetails: {
    color: theme.Colors.primary,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.32)",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.Spacing.lg,
  },
  filterModal: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: theme.Colors.surface,
    borderRadius: theme.Radius.lg,
    padding: theme.Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.Spacing.md,
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
  filterSectionTitle: {
    ...theme.Typography.subtitle,
    marginBottom: theme.Spacing.sm,
    marginTop: theme.Spacing.sm,
  },
  optionRow: {
    flexDirection: "row",
    marginBottom: theme.Spacing.sm,
  },
  optionChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: theme.Spacing.sm,
    borderRadius: theme.Radius.md,
    borderWidth: 1,
    borderColor: theme.Colors.border,
    marginRight: theme.Spacing.sm,
    backgroundColor: theme.Colors.background,
  },
  optionChipSelected: {
    borderColor: theme.Colors.primary,
    backgroundColor: "rgba(20,43,108,0.06)",
  },
  optionText: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
    fontWeight: "600",
  },
  optionTextSelected: {
    color: theme.Colors.primary,
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.Colors.border,
  },
  checkMark: {
    color: theme.Colors.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  filterActions: {
    marginTop: theme.Spacing.md,
  },
});
