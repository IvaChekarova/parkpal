import React from "react";
import { Text, StyleSheet } from "react-native";
import ScreenWrapper from "../components/ScreenWrapper";
import theme from "../theme";

export default function ReservationsScreen() {
  return (
    <ScreenWrapper>
      <Text style={theme.Typography.title}>Reservations</Text>
      <Text style={{ height: theme.Spacing.md }} />
      <Text style={theme.Typography.body}>
        Your reservations will appear here.
      </Text>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({});
