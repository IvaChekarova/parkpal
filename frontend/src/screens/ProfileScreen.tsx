import React from "react";
import { Text, StyleSheet } from "react-native";
import ScreenWrapper from "../components/ScreenWrapper";
import theme from "../theme";

export default function ProfileScreen() {
  return (
    <ScreenWrapper>
      <Text style={theme.Typography.title}>Profile</Text>
      <Text style={{ height: theme.Spacing.md }} />
      <Text style={theme.Typography.body}>
        Profile information and settings will be here.
      </Text>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({});
