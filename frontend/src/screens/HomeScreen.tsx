import React from "react";
import {
  ActivityIndicator,
  Animated,
  DimensionValue,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import * as Location from "expo-location";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import MapView, { Marker, Region } from "react-native-maps";

import AppHeader from "../components/AppHeader";
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
type UserLocation = {
  latitude: number;
  longitude: number;
};
type NearbyParking = ParkingSummary & {
  distanceKm?: number;
};

const PARKING_TYPES: { label: string; value: ParkingTypeFilter }[] = [
  { label: "All", value: "all" },
  { label: "Public", value: "PUBLIC" },
  { label: "Private", value: "PRIVATE" },
];

const DEFAULT_REGION: Region = {
  latitude: 41.9981,
  longitude: 21.4254,
  latitudeDelta: 0.035,
  longitudeDelta: 0.035,
};

const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#091b31" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8ca6c8" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#071426" }] },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#1e3a5f" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#0f2a47" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#0b2f35" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#173765" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#0c2544" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#214c99" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#061120" }],
  },
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

const hasValidCoordinate = (parking: ParkingSummary) => {
  return (
    Number.isFinite(Number(parking.latitude)) &&
    Number.isFinite(Number(parking.longitude))
  );
};

const getDistanceKm = (
  start: UserLocation,
  end: UserLocation
) => {
  const earthRadiusKm = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latDelta = toRadians(end.latitude - start.latitude);
  const lonDelta = toRadians(end.longitude - start.longitude);
  const startLat = toRadians(start.latitude);
  const endLat = toRadians(end.latitude);
  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(startLat) *
      Math.cos(endLat) *
      Math.sin(lonDelta / 2) *
      Math.sin(lonDelta / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
};

const getParkingCoordinate = (parking: ParkingSummary): UserLocation => ({
  latitude: Number(parking.latitude),
  longitude: Number(parking.longitude),
});

const getMarkerColor = (parking: ParkingSummary) => {
  if (parking.availabilityStatus === "FULL") return "#ef4444";
  if (parking.availabilityStatus === "LIMITED") return "#f59e0b";
  return "#38bdf8";
};

const getAvailabilityLabel = (parking: ParkingSummary) => {
  if (parking.availabilityStatus === "FULL") {
    return "Full";
  }

  if (parking.availabilityStatus === "LIMITED") {
    return parking.availableSpots <= 5 ? "Few spots left" : "Limited";
  }

  return "Available";
};

const formatDistance = (distanceKm?: number) => {
  if (distanceKm === undefined) return "Popular nearby";
  if (distanceKm < 1) return `${distanceKm.toFixed(1)} km away`;
  return `${distanceKm.toFixed(1)} km away`;
};

const formatParkingType = (parkingType: ParkingSummary["parkingType"]) => {
  return parkingType === "PRIVATE" ? "Covered" : "Open Air";
};

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const { formatPrice } = useCurrency();
  const { height: windowHeight } = useWindowDimensions();
  const [modalVisible, setModalVisible] = React.useState(false);
  const [mode, setMode] = React.useState<SearchMode>("one-time");
  const [where, setWhere] = React.useState("");
  const [oneTimeDate, setOneTimeDate] = React.useState<Date | null>(null);
  const [fromDate, setFromDate] = React.useState<Date | null>(null);
  const [toDate, setToDate] = React.useState<Date | null>(null);
  const [parkingType, setParkingType] =
    React.useState<ParkingTypeFilter>("all");
  const [activeDatePicker, setActiveDatePicker] = React.useState<
    "one-time" | "from" | "to" | null
  >(null);
  const [nearbyParkings, setNearbyParkings] = React.useState<NearbyParking[]>(
    []
  );
  const [userLocation, setUserLocation] = React.useState<UserLocation | null>(
    null
  );
  const [locationLabel, setLocationLabel] = React.useState("Skopje");
  const [currentRegion, setCurrentRegion] =
    React.useState<Region>(DEFAULT_REGION);
  const [isLoadingNearby, setIsLoadingNearby] = React.useState(false);
  const [nearbyError, setNearbyError] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const [error, setError] = React.useState("");
  const [attemptedSearch, setAttemptedSearch] = React.useState(false);
  const mapRef = React.useRef<MapView | null>(null);
  const pickerAnimation = React.useRef(new Animated.Value(0)).current;
  const mapHeight = Math.min(350, Math.max(300, windowHeight * 0.42));

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
        const [permission, parkings] = await Promise.all([
          Location.requestForegroundPermissionsAsync(),
          parkingApi.getParkings(),
        ]);
        let currentLocation: UserLocation | null = null;

        if (permission.status === "granted") {
          const position = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          currentLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };

          try {
            const [place] = await Location.reverseGeocodeAsync(
              currentLocation
            );
            const cityParts = [
              place?.district || place?.subregion,
              place?.city,
            ].filter(Boolean);
            const nextLabel = cityParts.length
              ? Array.from(new Set(cityParts)).join(", ")
              : place?.region || "Current area";

            if (isMounted) {
              setLocationLabel(nextLabel);
            }
          } catch (_err) {
            if (isMounted) {
              setLocationLabel("Current area");
            }
          }
        }

        const sortedParkings: NearbyParking[] = currentLocation
          ? parkings
              .filter(hasValidCoordinate)
              .map((parking) => ({
                ...parking,
                distanceKm: getDistanceKm(currentLocation, {
                  latitude: Number(parking.latitude),
                  longitude: Number(parking.longitude),
                }),
              }))
              .sort((left, right) => {
                return (left.distanceKm ?? 0) - (right.distanceKm ?? 0);
              })
          : [...parkings].sort((left, right) => {
              if (left.availabilityStatus === "FULL" && right.availabilityStatus !== "FULL") {
                return 1;
              }

              if (left.availabilityStatus !== "FULL" && right.availabilityStatus === "FULL") {
                return -1;
              }

              return right.availableSpots - left.availableSpots;
            });

        if (isMounted) {
          setUserLocation(currentLocation);
          if (permission.status !== "granted") {
            setLocationLabel("Skopje");
          }
          setNearbyParkings(sortedParkings.slice(0, 3));
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

  const mapRegion = React.useMemo<Region>(() => {
    if (userLocation) {
      return {
        ...userLocation,
        latitudeDelta: 0.022,
        longitudeDelta: 0.022,
      };
    }

    const firstParkingWithCoordinates = nearbyParkings.find(hasValidCoordinate);

    if (firstParkingWithCoordinates) {
      return {
        ...getParkingCoordinate(firstParkingWithCoordinates),
        latitudeDelta: 0.035,
        longitudeDelta: 0.035,
      };
    }

    return DEFAULT_REGION;
  }, [nearbyParkings, userLocation]);

  React.useEffect(() => {
    setCurrentRegion(mapRegion);
    mapRef.current?.animateToRegion(mapRegion, 250);
  }, [mapRegion]);

  const handleZoom = (factor: number) => {
    const nextRegion = {
      ...currentRegion,
      latitudeDelta: Math.max(0.005, currentRegion.latitudeDelta * factor),
      longitudeDelta: Math.max(0.005, currentRegion.longitudeDelta * factor),
    };

    setCurrentRegion(nextRegion);
    mapRef.current?.animateToRegion(nextRegion, 220);
  };

  const handleRecenter = () => {
    const nextRegion = userLocation
      ? {
          ...userLocation,
          latitudeDelta: 0.022,
          longitudeDelta: 0.022,
        }
      : mapRegion;

    setCurrentRegion(nextRegion);
    mapRef.current?.animateToRegion(nextRegion, 250);
  };

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

    if (activeDatePicker === "one-time") {
      if (normalizedDate < startOfToday()) {
        setError("Date cannot be in the past.");
        setActiveDatePicker(null);
        return;
      }

      setOneTimeDate(normalizedDate);
      setActiveDatePicker(null);
      setError("");
      return;
    }

    if (activeDatePicker === "from") {
      setFromDate(normalizedDate);

      if (normalizedDate < startOfToday()) {
        setError("From date cannot be in the past.");
      } else if (toDate && toDate <= normalizedDate) {
        setToDate(null);
        setError("");
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

  const getSearchValidationError = () => {
    const today = startOfToday();

    if (!where.trim()) {
      return "Please enter a location.";
    }

    if (mode === "one-time") {
      if (!oneTimeDate) {
        return "Please select a date.";
      }

      if (oneTimeDate < today) {
        return "Date cannot be in the past.";
      }

      return "";
    }

    if (!fromDate) {
      return "Please select a from date.";
    }

    if (!toDate) {
      return "Please select a to date.";
    }

    if (fromDate < today) {
      return "From date cannot be in the past.";
    }

    if (toDate <= fromDate) {
      return "To date must be after from date.";
    }

    const durationDays = getDateRangeDays(fromDate, toDate);

    if (durationDays < 1) {
      return "Long-term parking must be at least 1 day.";
    }

    if (durationDays > 30) {
      return "Long-term parking can be up to 30 days.";
    }

    return "";
  };

  const handleSearch = async () => {
    if (isSearching) return;

    setAttemptedSearch(true);
    setError("");
    const validationError = getSearchValidationError();

    if (validationError) {
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
          date:
            mode === "one-time" && oneTimeDate
              ? formatDisplayDate(oneTimeDate)
              : undefined,
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

  const visibleError = attemptedSearch
    ? getSearchValidationError() || error
    : error;

  return (
    <ScreenWrapper style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <AppHeader locationLabel={locationLabel} />

        <View style={[styles.hero, { height: mapHeight }]}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={mapRegion}
            customMapStyle={DARK_MAP_STYLE}
            showsUserLocation={Boolean(userLocation)}
            showsMyLocationButton={false}
            toolbarEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
            onRegionChangeComplete={setCurrentRegion}
          >
            {nearbyParkings.filter(hasValidCoordinate).map((parking) => (
              <Marker
                key={parking.id}
                coordinate={getParkingCoordinate(parking)}
                onPress={() =>
                  navigation.navigate("ParkingDetails", {
                    parkingId: parking.id,
                    locationLabel,
                  })
                }
              >
                <View
                  style={[
                    styles.mapPriceMarker,
                    { backgroundColor: getMarkerColor(parking) },
                  ]}
                >
                  <Text style={styles.mapPriceMarkerText}>
                    {formatPrice(parking.pricePerHour)}
                  </Text>
                </View>
              </Marker>
            ))}
          </MapView>
          <View pointerEvents="none" style={styles.mapOverlay} />

          <Pressable
            onPress={() => {
              setAttemptedSearch(false);
              setError("");
              setModalVisible(true);
            }}
            style={({ pressed }) => [
              styles.searchPill,
              pressed && { opacity: 0.9, transform: [{ scale: 0.995 }] },
            ]}
          >
            <View style={styles.searchIconWrap}>
              {Feather ? (
                <Feather name="search" size={22} color="#071b35" />
              ) : (
                <Text style={styles.searchFallback}>⌕</Text>
              )}
            </View>
            <View style={styles.searchTextBlock}>
              <Text style={styles.searchTitle} numberOfLines={1}>
                Search address or location...
              </Text>
            </View>
            <View style={styles.searchActionIcon}>
              {Feather ? (
                <Feather name="map-pin" size={19} color="#38bdf8" />
              ) : (
                <Text style={styles.searchActionText}>›</Text>
              )}
            </View>
          </Pressable>

          <View style={styles.mapControls}>
            <Pressable
              onPress={() => handleZoom(0.65)}
              style={({ pressed }) => [
                styles.mapControlButton,
                pressed && { opacity: 0.84 },
              ]}
            >
              <Text style={styles.mapControlText}>+</Text>
            </Pressable>
            <Pressable
              onPress={() => handleZoom(1.45)}
              style={({ pressed }) => [
                styles.mapControlButton,
                pressed && { opacity: 0.84 },
              ]}
            >
              <Text style={styles.mapControlText}>-</Text>
            </Pressable>
            <Pressable
              onPress={handleRecenter}
              style={({ pressed }) => [
                styles.locateButton,
                pressed && { opacity: 0.86 },
              ]}
            >
              {Feather ? (
                <Feather name="navigation" size={22} color="#071426" />
              ) : (
                <Text style={styles.locateButtonText}>⌖</Text>
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.nearbySection}>
          <View style={styles.sectionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Nearby Parking</Text>
            </View>
            {!isLoadingNearby && nearbyParkings.length > 0 ? (
              <Text style={styles.sectionCount}>
                {nearbyParkings.length} spots found
              </Text>
            ) : null}
            {isLoadingNearby ? (
              <ActivityIndicator size="small" color="#38bdf8" />
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
                      locationLabel,
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
              <Text style={styles.modalTitle}>Start your search</Text>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>

            <View style={styles.progressModeRow}>
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
                    styles.progressModeButton,
                    mode === item.value && styles.progressModeButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.progressModeText,
                      mode === item.value && styles.progressModeTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.formCard}>
              <Text style={styles.formCardTitle}>Where</Text>
              <View style={styles.whereInlineInput}>
                {Feather ? (
                  <Feather name="search" size={16} color="#86a8cf" />
                ) : null}
                <TextInput
                  style={styles.whereInputText}
                  placeholderTextColor="#86a8cf"
                  returnKeyType="search"
                  placeholder="Search address or location"
                  value={where}
                  onChangeText={(value) => {
                    setWhere(value);
                    setError("");
                  }}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.formCardTitle}>
                {mode === "long-term" ? "Dates" : "When"}
              </Text>
              {mode === "one-time" ? (
                <DateField
                  label="Parking date"
                  value={formatDisplayDate(oneTimeDate)}
                  isSelected
                  onPress={() => {
                    setError("");
                    setActiveDatePicker("one-time");
                  }}
                />
              ) : (
                <>
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
                </>
              )}
            </View>

            <View style={styles.formCard}>
              <Text style={styles.formCardTitle}>Type</Text>
              {mode === "long-term" ? (
                <View style={styles.privateOnlyCard}>
                  <Text style={styles.privateOnlyTitle}>
                    Private parking only
                  </Text>
                  <Text style={styles.privateOnlyText}>
                    Long-term searches automatically use private parking.
                  </Text>
                </View>
              ) : (
                <View style={styles.typeOptionRow}>
                  {PARKING_TYPES.map((item) => (
                    <Pressable
                      key={item.value}
                      onPress={() => {
                        setParkingType(item.value);
                        setError("");
                      }}
                      style={[
                        styles.typeOption,
                        parkingType === item.value && styles.typeOptionActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.typeOptionText,
                          parkingType === item.value &&
                            styles.typeOptionTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {visibleError ? (
              <Text style={styles.errorText}>{visibleError}</Text>
            ) : null}

            <Pressable
              disabled={isSearching}
              onPress={handleSearch}
              style={({ pressed }) => [
                styles.formSearchButton,
                pressed && { transform: [{ scale: 0.985 }] },
                isSearching && { opacity: 0.72 },
              ]}
            >
              {isSearching ? (
                <ActivityIndicator size="small" color="#071426" />
              ) : (
                <Text style={styles.formSearchButtonText}>
                  {mode === "long-term"
                    ? "Search private parking"
                    : "Search parking"}
                </Text>
              )}
            </Pressable>
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
                  {activeDatePicker === "one-time"
                    ? "Select parking date"
                    : activeDatePicker === "from"
                      ? "Select from date"
                      : "Select to date"}
                </Text>
                <DateTimePicker
                  value={
                    activeDatePicker === "one-time"
                      ? oneTimeDate ?? startOfToday()
                      : activeDatePicker === "from"
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
  parking: NearbyParking;
  formatPrice: (amountInEur: number) => string;
  onPress: () => void;
}) {
  const label = getAvailabilityLabel(parking);
  const statusStyle =
    label === "Available"
      ? {
          label,
          backgroundColor: "rgba(89,165,117,0.12)",
          color: theme.Colors.secondaryGreen,
        }
      : label === "Limited" || label === "Few spots left"
        ? {
            label,
            backgroundColor: "rgba(245,158,11,0.13)",
            color: "#b45309",
          }
        : {
            label,
            backgroundColor: "rgba(239,68,68,0.1)",
            color: theme.Colors.error,
          };

  const availabilityText =
    parking.availabilityStatus === "FULL"
      ? "Full"
      : parking.availabilityStatus === "LIMITED"
        ? `${parking.availableSpots} free`
        : `${parking.availableSpots} free`;
  const progressWidth = `${Math.max(
    4,
    Math.min(
      100,
      parking.totalSpots > 0
        ? Math.round((parking.availableSpots / parking.totalSpots) * 100)
        : 0
    )
  )}%` as DimensionValue;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.nearbyCard,
        pressed && { opacity: 0.86 },
      ]}
    >
      <View style={styles.nearbyCardContent}>
        <View style={styles.nearbyCardTop}>
          <View style={styles.nearbyTitleBlock}>
            <Text style={styles.nearbyName} numberOfLines={1}>
              {parking.name}
            </Text>
            <Text style={styles.nearbyDistance} numberOfLines={1}>
              {formatDistance(parking.distanceKm)} · {formatParkingType(parking.parkingType)} · ★ 4.8
            </Text>
          </View>
          <Text style={styles.nearbyPrice}>
            {formatPrice(parking.pricePerHour)}/hr
          </Text>
        </View>

        <View style={styles.nearbyBottomRow}>
          <View style={styles.availabilityTrack}>
            <View
              style={[
                styles.availabilityFill,
                {
                  width: progressWidth,
                  backgroundColor:
                    parking.availabilityStatus === "FULL"
                      ? "#ef4444"
                      : parking.availabilityStatus === "LIMITED"
                        ? "#f59e0b"
                        : "#08d6a3",
                },
              ]}
            />
          </View>
          <Text style={styles.nearbyAvailability}>{availabilityText}</Text>
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
      </View>

      <Text style={styles.nearbyChevron}>›</Text>
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

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#071426",
    padding: 0,
  },
  container: {
    flexGrow: 1,
    paddingBottom: theme.Spacing.sm,
    backgroundColor: "#071426",
  },
  hero: {
    paddingHorizontal: theme.Spacing.md,
    backgroundColor: "#08182d",
    overflow: "hidden",
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3,13,29,0.12)",
  },
  heroEyebrow: {
    ...theme.Typography.caption,
    color: "#86a8cf",
    fontWeight: "700",
  },
  searchPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.62)",
    paddingHorizontal: theme.Spacing.md,
    paddingVertical: 7,
    marginTop: theme.Spacing.lg,
    marginHorizontal: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 10,
    zIndex: 2,
  },
  searchIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  searchFallback: {
    color: "#071b35",
    fontSize: 20,
    fontWeight: "700",
  },
  searchTextBlock: { marginLeft: theme.Spacing.md, flex: 1 },
  searchTitle: {
    color: "#8a9ab3",
    fontSize: 16,
    fontWeight: "600",
  },
  searchActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#06213d",
  },
  searchActionText: {
    color: "#eaf7ff",
    fontSize: 22,
    fontWeight: "800",
  },
  mapPriceMarker: {
    minWidth: 56,
    paddingHorizontal: theme.Spacing.sm,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
  mapPriceMarkerText: {
    color: "#061120",
    fontSize: 13,
    fontWeight: "900",
  },
  mapControls: {
    position: "absolute",
    right: theme.Spacing.md,
    bottom: theme.Spacing.md,
    alignItems: "center",
    zIndex: 2,
  },
  mapControlButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.Spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(148,171,207,0.18)",
    backgroundColor: "rgba(8,24,45,0.9)",
  },
  mapControlText: {
    color: "#f8fbff",
    fontSize: 26,
    lineHeight: 28,
    fontWeight: "900",
  },
  locateButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#38bdf8",
    shadowColor: "#38bdf8",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  locateButtonText: {
    color: "#071426",
    fontSize: 22,
    fontWeight: "700",
  },
  nearbySection: {
    paddingTop: theme.Spacing.lg,
    paddingHorizontal: theme.Spacing.md,
    backgroundColor: "#071426",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.Spacing.md,
  },
  sectionTitle: {
    color: "#f8fbff",
    fontSize: 24,
    fontWeight: "800",
  },
  sectionSubtitle: {
    color: "#86a8cf",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  sectionCount: {
    color: "#86a8cf",
    fontSize: 15,
    fontWeight: "700",
    marginLeft: theme.Spacing.md,
  },
  nearbyList: {
    gap: theme.Spacing.sm,
  },
  nearbyCard: {
    minHeight: 118,
    backgroundColor: "#12243f",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(148,171,207,0.14)",
    paddingHorizontal: theme.Spacing.md,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 20,
    elevation: 8,
  },
  nearbyCardContent: {
    flex: 1,
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
    color: "#f8fbff",
    fontSize: 16,
    fontWeight: "800",
  },
  nearbyDistance: {
    color: "#8ca6c8",
    fontSize: 13,
    fontWeight: "800",
    marginTop: theme.Spacing.sm,
  },
  nearbyBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: theme.Spacing.sm,
  },
  nearbyBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  nearbyBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  availabilityTrack: {
    flex: 1,
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(12,45,77,0.86)",
    overflow: "hidden",
  },
  availabilityFill: {
    height: "100%",
    borderRadius: 999,
  },
  nearbyAvailability: {
    color: "#8ca6c8",
    fontSize: 13,
    fontWeight: "800",
    minWidth: 58,
    textAlign: "right",
    marginLeft: theme.Spacing.sm,
  },
  nearbyPrice: {
    color: "#38bdf8",
    fontSize: 15,
    fontWeight: "900",
    marginLeft: theme.Spacing.sm,
  },
  nearbyChevron: {
    color: "#86a8cf",
    fontSize: 30,
    fontWeight: "300",
    marginLeft: theme.Spacing.md,
  },
  emptyText: {
    ...theme.Typography.body,
    color: "#86a8cf",
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
    backgroundColor: "#08182d",
    borderRadius: 28,
    padding: theme.Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(148,171,207,0.16)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.34,
    shadowRadius: 32,
    elevation: 24,
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
  modalTitle: {
    color: "#f8fbff",
    fontSize: 20,
    fontWeight: "800",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(148,171,207,0.12)",
  },
  closeText: {
    color: "#c7d7ee",
    fontSize: 22,
    lineHeight: 24,
  },
  progressModeRow: {
    flexDirection: "row",
    backgroundColor: "rgba(5,18,34,0.9)",
    borderRadius: 999,
    padding: 4,
    marginTop: theme.Spacing.md,
    marginBottom: theme.Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(148,171,207,0.12)",
  },
  progressModeButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 999,
  },
  progressModeButtonActive: {
    backgroundColor: "#38bdf8",
  },
  progressModeText: {
    color: "#86a8cf",
    fontSize: 13,
    fontWeight: "800",
  },
  progressModeTextActive: {
    color: "#071426",
  },
  formCard: {
    borderRadius: 22,
    backgroundColor: "#10223f",
    borderWidth: 1,
    borderColor: "rgba(148,171,207,0.14)",
    padding: theme.Spacing.md,
    marginBottom: theme.Spacing.sm,
  },
  formCardTitle: {
    color: "#f8fbff",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: theme.Spacing.sm,
  },
  whereInlineInput: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148,171,207,0.18)",
    backgroundColor: "rgba(8,24,45,0.92)",
    paddingHorizontal: theme.Spacing.md,
    flexDirection: "row",
    alignItems: "center",
  },
  whereInputText: {
    flex: 1,
    color: "#f8fbff",
    fontSize: 14,
    fontWeight: "700",
    paddingVertical: 9,
    marginLeft: theme.Spacing.sm,
  },
  typeOptionRow: {
    flexDirection: "row",
    gap: theme.Spacing.sm,
  },
  typeOption: {
    flex: 1,
    minHeight: 46,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(148,171,207,0.18)",
    backgroundColor: "rgba(8,24,45,0.92)",
  },
  typeOptionActive: {
    backgroundColor: "#38bdf8",
    borderColor: "#38bdf8",
  },
  typeOptionText: {
    color: "#c7d7ee",
    fontSize: 13,
    fontWeight: "900",
  },
  typeOptionTextActive: {
    color: "#071426",
  },
  privateOnlyCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.24)",
    backgroundColor: "rgba(56,189,248,0.1)",
    padding: theme.Spacing.md,
  },
  privateOnlyTitle: {
    color: "#f8fbff",
    fontSize: 15,
    fontWeight: "900",
  },
  privateOnlyText: {
    color: "#8ca6c8",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  formSearchButton: {
    minHeight: 52,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#38bdf8",
    marginTop: theme.Spacing.xs,
    shadowColor: "#38bdf8",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.26,
    shadowRadius: 18,
    elevation: 10,
  },
  formSearchButtonText: {
    color: "#071426",
    fontSize: 15,
    fontWeight: "900",
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
    color: "#f8fbff",
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
