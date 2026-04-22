import React from "react";
import { Text, StyleSheet } from "react-native";
import ScreenWrapper from "../components/ScreenWrapper";
import theme from "../theme";

export default function HomeScreen() {
  return (
    <ScreenWrapper>
      <Text style={theme.Typography.title}>Home</Text>
      <Text style={{ height: theme.Spacing.md }} />
      <Text style={theme.Typography.body}>Parking list will be here.</Text>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({});
