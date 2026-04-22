import React from "react";
import { Text, StyleSheet } from "react-native";
import ScreenWrapper from "../components/ScreenWrapper";
import theme from "../theme";

export default function ParkingDetailsScreen() {
  return (
    <ScreenWrapper>
      <Text style={theme.Typography.title}>Parking Details</Text>
      <Text style={{ height: theme.Spacing.md }} />
      <Text style={theme.Typography.body}>
        Details about a parking spot will appear here.
      </Text>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({});
