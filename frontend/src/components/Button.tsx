import React from "react";
import { Pressable, Text, StyleSheet, ViewStyle } from "react-native";
import theme from "../theme";
import { useThemeMode } from "../context/ThemeModeContext";

type Props = {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "outline";
  disabled?: boolean;
  style?: ViewStyle;
};

export default function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  style,
}: Props) {
  const { themeTokens } = useThemeMode();
  const colors = themeTokens.colors;
  const bg =
    variant === "primary"
      ? colors.accentStrong
      : variant === "secondary"
        ? colors.success
        : "transparent";

  const textColor = variant === "outline" ? colors.accent : "#fff";

  const border =
    variant === "outline"
      ? { borderWidth: 1, borderColor: colors.accent }
      : {};

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.9 : 1 },
        border,
        style,
      ]}
    >
      <Text style={[styles.text, { color: textColor }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: theme.Spacing.sm,
    paddingHorizontal: theme.Spacing.lg,
    borderRadius: theme.Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
  },
});
