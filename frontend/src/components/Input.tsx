import React from "react";
import { TextInput, StyleSheet, TextInputProps } from "react-native";
import theme from "../theme";
import { useThemeMode } from "../context/ThemeModeContext";

type Props = TextInputProps & {
  placeholder?: string;
};

export default function Input({ style, ...props }: Props) {
  const { themeTokens } = useThemeMode();
  const colors = themeTokens.colors;

  return (
    <TextInput
      style={[
        styles.input,
        {
          backgroundColor: colors.input,
          borderColor: colors.border,
          color: colors.text,
        },
        style,
      ]}
      placeholderTextColor={colors.textMuted}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    width: "100%",
    padding: theme.Spacing.md,
    borderRadius: theme.Radius.sm,
    borderWidth: 1,
    borderColor: theme.Colors.border,
    backgroundColor: theme.Colors.surface,
    color: theme.Colors.textPrimary,
  },
});
