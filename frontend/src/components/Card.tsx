import React, { ReactNode } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import theme from "../theme";

type Props = {
  children: ReactNode;
  style?: ViewStyle;
};

export default function Card({ children, style }: Props) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.Colors.surface,
    borderRadius: theme.Radius.lg,
    padding: theme.Spacing.md,
    // shadow for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    // elevation for Android
    elevation: 2,
  },
});
