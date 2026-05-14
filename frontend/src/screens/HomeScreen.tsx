import React from "react";
import { Text, StyleSheet, View, FlatList, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import ScreenWrapper from "../components/ScreenWrapper";
import Input from "../components/Input";
import Card from "../components/Card";
import SectionTitle from "../components/SectionTitle";
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

const MOCK_PARKINGS = [
  {
    id: "1",
    name: "Central Parking",
    address: "12 Main St",
    spots: 8,
    price: 2.5,
    distance: "0.3 km",
    open: true,
  },
  {
    id: "2",
    name: "City Mall Garage",
    address: "5 Commerce Ave",
    spots: 2,
    price: 3.0,
    distance: "0.8 km",
    open: true,
  },
  {
    id: "3",
    name: "East Side Parking",
    address: "101 East Rd",
    spots: 0,
    price: 1.5,
    distance: "1.2 km",
    open: false,
  },
  {
    id: "4",
    name: "Riverside Lot",
    address: "42 River Ln",
    spots: 5,
    price: 2.0,
    distance: "2.0 km",
    open: true,
  },
];

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();

  function renderItem({ item }: { item: (typeof MOCK_PARKINGS)[number] }) {
    return (
      <Pressable onPress={() => navigation.navigate("ParkingDetails")}>
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
                    backgroundColor: item.open
                      ? "rgba(89,165,117,0.12)"
                      : "rgba(2,6,23,0.06)",
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusDotSmall,
                    {
                      backgroundColor: item.open
                        ? theme.Colors.secondaryGreen
                        : theme.Colors.border,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: item.open
                        ? theme.Colors.secondaryGreen
                        : theme.Colors.textSecondary,
                    },
                  ]}
                >
                  {item.open ? "Open" : "Full"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.rowSpace}>
            <Text style={styles.muted}>{item.spots} spots</Text>
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
        <Text style={theme.Typography.subtitle}>Good evening</Text>
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

      <View style={{ height: theme.Spacing.md }} />

      <View style={styles.searchWrapper}>
        <Feather
          name="search"
          size={16}
          color={theme.Colors.textSecondary}
          style={styles.searchIcon}
        />
        <Input
          placeholder="Search parking or location"
          style={styles.searchInput}
        />
      </View>

      <View style={{ height: theme.Spacing.md }} />

      <SectionTitle>Nearby parking</SectionTitle>

      <FlatList
        data={MOCK_PARKINGS}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => (
          <View style={{ height: theme.Spacing.sm }} />
        )}
        contentContainerStyle={{ paddingBottom: theme.Spacing.xl * 2 }}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
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

  searchWrapper: {
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
  },
});
