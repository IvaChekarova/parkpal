import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import ScreenWrapper from "../components/ScreenWrapper";
import Card from "../components/Card";
import Button from "../components/Button";
import theme from "../theme";
import { useCurrency } from "../context/CurrencyContext";
import type { RootStackParamList } from "../navigation/types";

type NavProp = NativeStackNavigationProp<
  RootStackParamList,
  "ReservationConfirm"
>;
type RouteProps = RouteProp<RootStackParamList, "ReservationConfirm">;

export default function ReservationConfirmScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const { formatPrice } = useCurrency();
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
        <Text style={theme.Typography.title}>{t("parking.reserveSpot")}</Text>

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
            <Text style={theme.Typography.caption}>{t("parking.price")}</Text>
            <Text style={theme.Typography.body}>
              {formatPrice(parking.pricePerHour)}
              {t("common.perHour")}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={theme.Typography.caption}>{t("parking.duration")}</Text>
            <Text style={theme.Typography.body}>{durationHours}h</Text>
          </View>

          <View style={styles.row}>
            <Text style={theme.Typography.caption}>{t("parking.estimatedTotal")}</Text>
            <Text style={theme.Typography.title}>{formatPrice(estimated)}</Text>
          </View>
        </Card>

        <View style={{ height: theme.Spacing.md }} />

        <Button title={t("parking.reserveSpot")} onPress={handleConfirm} />
        <View style={{ height: theme.Spacing.sm }} />
        <Button
          title={t("common.cancel")}
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
