import React from "react";
import { Text, StyleSheet } from "react-native";
import theme from "../theme";

type Props = {
  children: React.ReactNode;
  small?: boolean;
};

export default function SectionTitle({ children, small = false }: Props) {
  return <Text style={[styles.title, small && styles.small]}>{children}</Text>;
}

const styles = StyleSheet.create({
  title: {
    ...theme.Typography.subtitle,
    marginBottom: theme.Spacing.md,
    color: theme.Colors.textPrimary,
  },
  small: {
    ...theme.Typography.body,
    marginBottom: theme.Spacing.sm,
  },
});
