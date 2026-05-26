import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import MapView, { Marker, Region } from "react-native-maps";

import Card from "../components/Card";
import ScreenWrapper from "../components/ScreenWrapper";
import { useAuth } from "../context/AuthContext";
import { useCurrency } from "../context/CurrencyContext";
import {
  parkingApi,
  ParkingDetails,
  ParkingSummary,
} from "../services/parkingApi";
import theme from "../theme";
import type { RootStackParamList, SearchData } from "../navigation/types";

type NavProp = NativeStackNavigationProp<RootStackParamList, "SearchResults">;

const DEFAULT_REGION: Region = {
  latitude: 41.9981,
  longitude: 21.4254,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const hasValidCoordinate = (parking: ParkingSummary) => {
  return (
    Number.isFinite(Number(parking.latitude)) &&
    Number.isFinite(Number(parking.longitude))
  );
};

const getCoordinate = (parking: ParkingSummary) => ({
  latitude: Number(parking.latitude),
  longitude: Number(parking.longitude),
});

const getMarkerColor = (
  status: ParkingSummary["availabilityStatus"],
  isSelected: boolean
) => {
  if (isSelected) return theme.Colors.primary;
  if (status === "FULL") return theme.Colors.error;
  if (status === "LIMITED") return "#b45309";
  return theme.Colors.secondaryGreen;
};

export default function SearchResultsScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<any>();
  const initialResults = (route.params?.results ?? []) as ParkingSummary[];
  const search = route.params?.search as SearchData | undefined;
  const { token } = useAuth();
  const { formatPrice } = useCurrency();
  const mapRef = React.useRef<MapView | null>(null);
  const listRef = React.useRef<FlatList<ParkingSummary> | null>(null);
  const [results, setResults] = React.useState<ParkingSummary[]>(initialResults);
  const [isSimulating, setIsSimulating] = React.useState(false);
  const [selectedParkingId, setSelectedParkingId] = React.useState<string | null>(
    initialResults[0]?.id ?? null
  );

  const title = search?.location?.trim() || "All locations";
  const selectedType =
    search?.parkingType && search.parkingType !== "all"
      ? search.parkingType === "PUBLIC"
        ? "Public"
        : "Private"
      : "All types";
  const timing =
    search?.mode === "long-term"
      ? `${search.fromDate ?? "From date"} - ${search.toDate ?? "To date"} · ${selectedType}`
      : `${search?.date ?? "Today"} · ${selectedType}`;

  const refreshResults = React.useCallback(async () => {
    try {
      const latestResults = await parkingApi.searchParkings({
        location: search?.location,
        parkingType:
          search?.parkingType && search.parkingType !== "all"
            ? search.parkingType
            : undefined,
      });
      setResults(latestResults);
    } catch (_err) {
      // Keep the already-rendered backend results if a silent refresh fails.
    }
  }, [search?.location, search?.parkingType]);

  useFocusEffect(
    React.useCallback(() => {
      refreshResults();
    }, [refreshResults])
  );

  React.useEffect(() => {
    if (results.length === 0) {
      setSelectedParkingId(null);
      return;
    }

    if (!selectedParkingId || !results.some((item) => item.id === selectedParkingId)) {
      setSelectedParkingId(results[0].id);
    }
  }, [results, selectedParkingId]);

  const mapRegion = React.useMemo<Region>(() => {
    const firstParkingWithCoordinates = results.find(hasValidCoordinate);

    if (!firstParkingWithCoordinates) {
      return DEFAULT_REGION;
    }

    const coordinate = getCoordinate(firstParkingWithCoordinates);

    return {
      ...coordinate,
      latitudeDelta: 0.035,
      longitudeDelta: 0.035,
    };
  }, [results]);

  React.useEffect(() => {
    mapRef.current?.animateToRegion(mapRegion, 250);
  }, [mapRegion]);

  const selectedParking = React.useMemo(() => {
    return results.find((item) => item.id === selectedParkingId) ?? null;
  }, [results, selectedParkingId]);

  const handleMarkerPress = (parking: ParkingSummary) => {
    const coordinate = getCoordinate(parking);
    const listIndex = results.findIndex((item) => item.id === parking.id);

    setSelectedParkingId(parking.id);
    mapRef.current?.animateToRegion(
      {
        ...coordinate,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      },
      220
    );

    if (listIndex >= 0) {
      listRef.current?.scrollToIndex({
        index: listIndex,
        animated: true,
        viewPosition: 0.12,
      });
    }
  };

  const updateResultFromDetails = (parking: ParkingDetails) => {
    setResults((current) =>
      current.map((item) =>
        item.id === parking.id
          ? {
              ...item,
              totalSpots: parking.totalSpots,
              availableSpots: parking.availableSpots,
              occupiedSpots: parking.occupiedSpots,
              occupancyPercentage: parking.occupancyPercentage,
              availabilityStatus: parking.availabilityStatus,
            }
          : item
      )
    );
  };

  const simulateUpdate = async () => {
    if (!token || isSimulating) return;

    setIsSimulating(true);

    try {
      const parking = await parkingApi.demoRandomUpdate(token, results[0]?.id);
      updateResultFromDetails(parking);
    } catch (_err) {
      // Demo-only action. Keep the existing results if the backend is unavailable.
    } finally {
      setIsSimulating(false);
    }
  };

  const renderItem = ({ item }: { item: ParkingSummary }) => {
    const isFull = item.availabilityStatus === "FULL";
    const badge =
      item.availabilityStatus === "AVAILABLE"
        ? {
            label: "Available",
            backgroundColor: "rgba(89,165,117,0.12)",
            color: theme.Colors.secondaryGreen,
          }
        : item.availabilityStatus === "LIMITED"
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
      item.availabilityStatus === "FULL"
        ? "No spots available"
        : item.availabilityStatus === "LIMITED"
          ? `Only ${item.availableSpots} spot${
              item.availableSpots === 1 ? "" : "s"
            } left`
          : `${item.availableSpots} spot${
              item.availableSpots === 1 ? "" : "s"
            } available`;

    return (
      <Pressable
        disabled={isFull}
        onPress={() =>
          navigation.navigate("ParkingDetails", { parkingId: item.id, search })
        }
        style={isFull ? styles.disabledCardPressable : undefined}
      >
        <Card
          style={
            selectedParkingId === item.id ? styles.selectedCard : styles.card
          }
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleBlock}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.address}>{item.address}</Text>
            </View>
            <View
              style={[
                styles.badge,
                { backgroundColor: badge.backgroundColor },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: badge.color },
                ]}
              >
                {badge.label}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.availabilityText}>{availabilityText}</Text>
            <Text style={styles.price}>{formatPrice(item.pricePerHour)}/hr</Text>
          </View>

          <Text style={[styles.detailsLink, isFull && styles.detailsLinkDisabled]}>
            {isFull ? "No spots available" : "View details"}
          </Text>
        </Card>
      </Pressable>
    );
  };

  return (
    <ScreenWrapper>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <View style={styles.summaryPill}>
          <Text style={styles.summaryTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.summarySubtitle} numberOfLines={1}>
            {timing}
          </Text>
        </View>
      </View>

      <View style={styles.mapPreview}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={mapRegion}
          showsUserLocation={false}
          showsMyLocationButton={false}
          toolbarEnabled={false}
        >
          {results.filter(hasValidCoordinate).map((item) => {
            const isSelected = selectedParkingId === item.id;
            const markerColor = getMarkerColor(
              item.availabilityStatus,
              isSelected
            );

            return (
              <Marker
                key={item.id}
                coordinate={getCoordinate(item)}
                onPress={() => handleMarkerPress(item)}
              >
                <View
                  style={[
                    styles.priceMarker,
                    {
                      backgroundColor: markerColor,
                      transform: [{ scale: isSelected ? 1.08 : 1 }],
                    },
                  ]}
                >
                  <Text style={styles.priceMarkerText}>
                    {formatPrice(item.pricePerHour)}/hr
                  </Text>
                </View>
              </Marker>
            );
          })}
        </MapView>

        {selectedParking ? (
          <Pressable
            disabled={selectedParking.availabilityStatus === "FULL"}
            onPress={() =>
              navigation.navigate("ParkingDetails", {
                parkingId: selectedParking.id,
                search,
              })
            }
            style={styles.mapPreviewCard}
          >
            <Text style={styles.mapPreviewTitle} numberOfLines={1}>
              {selectedParking.name}
            </Text>
            <Text style={styles.mapPreviewSubtitle} numberOfLines={1}>
              {selectedParking.availabilityStatus === "FULL"
                ? "No spots available"
                : `${selectedParking.availableSpots} spots available`}{" "}
              · {formatPrice(selectedParking.pricePerHour)}/hr
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.resultsHeader}>
        <View style={styles.resultsHeaderRow}>
          <Text style={theme.Typography.subtitle}>Available parking</Text>
          {token ? (
            <Pressable
              disabled={isSimulating || results.length === 0}
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
        </View>
        <Text style={styles.resultCount}>
          {results.length} result{results.length === 1 ? "" : "s"} ·{" "}
          {search?.parkingType === "all" || !search?.parkingType
            ? "All types"
            : search.parkingType}
        </Text>
      </View>

      {results.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No parking options found</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          extraData={selectedParkingId}
          onScrollToIndexFailed={() => undefined}
          ItemSeparatorComponent={() => (
            <View style={{ height: theme.Spacing.sm }} />
          )}
          contentContainerStyle={{ paddingBottom: theme.Spacing.xl * 2 }}
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.Colors.surface,
    borderWidth: 1,
    borderColor: theme.Colors.border,
    marginRight: theme.Spacing.sm,
  },
  backIcon: { color: theme.Colors.primary, fontSize: 18, fontWeight: "700" },
  summaryPill: {
    flex: 1,
    backgroundColor: theme.Colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.Colors.border,
    paddingHorizontal: theme.Spacing.md,
    paddingVertical: 8,
  },
  summaryTitle: { ...theme.Typography.body, fontWeight: "700" },
  summarySubtitle: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
    marginTop: 2,
  },
  mapPreview: {
    height: 220,
    borderRadius: theme.Radius.lg,
    backgroundColor: "#EAF1F4",
    borderWidth: 1,
    borderColor: theme.Colors.border,
    overflow: "hidden",
    marginBottom: theme.Spacing.md,
  },
  priceMarker: {
    paddingHorizontal: theme.Spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 6,
  },
  priceMarkerText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  mapPreviewCard: {
    position: "absolute",
    left: theme.Spacing.md,
    right: theme.Spacing.md,
    bottom: theme.Spacing.md,
    backgroundColor: theme.Colors.surface,
    borderRadius: theme.Radius.lg,
    paddingHorizontal: theme.Spacing.md,
    paddingVertical: theme.Spacing.sm,
    borderWidth: 1,
    borderColor: theme.Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  mapPreviewTitle: {
    ...theme.Typography.body,
    fontWeight: "700",
  },
  mapPreviewSubtitle: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
    marginTop: 2,
  },
  resultsHeader: { marginBottom: theme.Spacing.sm },
  resultsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  simulateButton: {
    minHeight: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.Colors.border,
    paddingHorizontal: theme.Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.Colors.surface,
  },
  simulateText: {
    ...theme.Typography.caption,
    color: theme.Colors.primary,
    fontWeight: "700",
  },
  resultCount: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
    marginTop: theme.Spacing.xs,
  },
  card: { marginBottom: theme.Spacing.sm },
  selectedCard: {
    marginBottom: theme.Spacing.sm,
    borderColor: theme.Colors.primary,
    borderWidth: 1,
  },
  disabledCardPressable: { opacity: 0.72 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardTitleBlock: { flex: 1, paddingRight: theme.Spacing.sm },
  cardTitle: { ...theme.Typography.body, fontWeight: "700" },
  address: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
    marginTop: theme.Spacing.xs,
  },
  badge: {
    paddingHorizontal: theme.Spacing.sm,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeText: { fontSize: 12, fontWeight: "700" },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: theme.Spacing.md,
  },
  availabilityText: {
    ...theme.Typography.caption,
    color: theme.Colors.textPrimary,
    fontWeight: "700",
    flex: 1,
    paddingRight: theme.Spacing.sm,
  },
  price: { ...theme.Typography.caption, color: theme.Colors.textSecondary },
  detailsLink: {
    color: theme.Colors.primary,
    fontWeight: "700",
    marginTop: theme.Spacing.md,
  },
  detailsLinkDisabled: {
    color: theme.Colors.textSecondary,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.Spacing.xl,
  },
  emptyText: { ...theme.Typography.body, color: theme.Colors.textSecondary },
});
