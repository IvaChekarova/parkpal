import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import ScreenWrapper from "../components/ScreenWrapper";
import Card from "../components/Card";
import Button from "../components/Button";
import theme from "../theme";
import type { RootStackParamList } from "../navigation/types";

type NavProp = NativeStackNavigationProp<
  RootStackParamList,
  "ReservationConfirm"
>;
type RouteProps = RouteProp<RootStackParamList, "ReservationConfirm">;

export default function ReservationConfirmScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const parking = route.params?.parking ?? {
    name: "Central Parking",
    address: "12 Main St",
    pricePerHour: 2.5,
  };

  const durationHours = 1;
  const estimated = parking.pricePerHour * durationHours;

  function handleConfirm() {
    navigation.getParent()?.navigate("Reservations");
  }

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <Text style={theme.Typography.title}>Confirm reservation</Text>

        <View style={{ height: theme.Spacing.md }} />

        <Card>
          <Text style={theme.Typography.subtitle}>{parking.name}</Text>
          <Text
            style={[
              theme.Typography.caption,
              {
                color: theme.Colors.textSecondary,
                marginTop: theme.Spacing.xs,
              },
            ]}
          >
            {parking.address}
          </Text>

          <View style={{ height: theme.Spacing.md }} />

          <View style={styles.row}>
            <Text style={theme.Typography.caption}>Price</Text>
            <Text style={theme.Typography.body}>
              €{parking.pricePerHour.toFixed(2)}/hr
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={theme.Typography.caption}>Duration</Text>
            <Text style={theme.Typography.body}>{durationHours} hour</Text>
          </View>

          <View style={styles.row}>
            <Text style={theme.Typography.caption}>Estimated total</Text>
            <Text style={theme.Typography.title}>€{estimated.toFixed(2)}</Text>
          </View>
        </Card>

        <View style={{ height: theme.Spacing.md }} />

        <Button title="Confirm reservation" onPress={handleConfirm} />
        <View style={{ height: theme.Spacing.sm }} />
        <Button
          title="Cancel"
          variant="outline"
          onPress={() => navigation.goBack()}
        />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.Spacing.md,
    paddingTop: theme.Spacing.md,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: theme.Spacing.sm,
  },
});
