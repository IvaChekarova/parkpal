import React, { ReactNode } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, ViewStyle } from "react-native";
import theme from "../theme";

type Props = {
  children: ReactNode;
  style?: ViewStyle;
};

export default function ScreenWrapper({ children, style }: Props) {
  return (
    <SafeAreaView style={[styles.container, style]}>{children}</SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.Colors.background,
    padding: theme.Spacing.md,
  },
});
