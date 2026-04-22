import React from "react";
import { TextInput, StyleSheet, TextInputProps } from "react-native";
import theme from "../theme";

type Props = TextInputProps & {
  placeholder?: string;
};

export default function Input(props: Props) {
  return (
    <TextInput
      style={styles.input}
      placeholderTextColor={theme.Colors.textSecondary}
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
