import React from "react";
import {
  Alert,
  FlatList,
  Animated,
  PanResponder,
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
import { Parking, useParking } from "../context/ParkingContext";
import {
  getBookingDateSummary,
  getBookingHours,
} from "../utils/booking";
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

export default function SearchResultsScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { parkings } = useParking();
  const { booking } = route.params;
  const [isSheetExpanded, setIsSheetExpanded] = React.useState(false);
  const collapsedHeight = windowHeight * 0.48;
  const topOffset = insets.top + theme.Spacing.sm + 52 + theme.Spacing.md;
  const expandedHeight = windowHeight - topOffset;
  const sheetHeight = React.useRef(new Animated.Value(collapsedHeight)).current;
  const gestureStartHeight = React.useRef(collapsedHeight);
  const durationHours = getBookingHours(booking);
  const dateSummary = getBookingDateSummary(booking);
  const availableParkings = parkings.filter(
    (parking) => parking.spotsAvailable > 0,
  );

  function goToDetails(parkingId: string) {
    navigation.navigate("ParkingDetails", {
      parkingId,
      booking,
    });
  }

  React.useEffect(() => {
    Animated.spring(sheetHeight, {
      toValue: isSheetExpanded ? expandedHeight : collapsedHeight,
      useNativeDriver: false,
      damping: 24,
      stiffness: 220,
    }).start();
  }, [collapsedHeight, expandedHeight, isSheetExpanded, sheetHeight]);

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > 8,
        onPanResponderGrant: () => {
          gestureStartHeight.current = isSheetExpanded
            ? expandedHeight
            : collapsedHeight;
          sheetHeight.stopAnimation((value) => {
            gestureStartHeight.current = value;
          });
        },
        onPanResponderMove: (_, gestureState) => {
          const nextHeight = gestureStartHeight.current - gestureState.dy;
          const clampedHeight = Math.min(
            Math.max(nextHeight, collapsedHeight),
            expandedHeight,
          );
          sheetHeight.setValue(clampedHeight);
        },
        onPanResponderRelease: (_, gestureState) => {
          const finalHeight = Math.min(
            Math.max(
              gestureStartHeight.current - gestureState.dy,
              collapsedHeight,
            ),
            expandedHeight,
          );
          const midpoint = (collapsedHeight + expandedHeight) / 2;
          const shouldExpand =
            gestureState.vy < -0.5 ||
            (gestureState.vy <= 0.5 && finalHeight > midpoint);

          setIsSheetExpanded(shouldExpand);
          Animated.spring(sheetHeight, {
            toValue: shouldExpand ? expandedHeight : collapsedHeight,
            useNativeDriver: false,
            damping: 24,
            stiffness: 220,
          }).start();
        },
      }),
    [collapsedHeight, expandedHeight, isSheetExpanded, sheetHeight],
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
                <Text style={styles.metaText}>
                  {item.spotsAvailable} spots
                </Text>
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
          onPress={() => Alert.alert("Filters coming soon")}
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
          { height: sheetHeight },
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
    zIndex: 2,
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
});
