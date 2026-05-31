import React, { ReactNode } from "react";
import { StyleProp, View, StyleSheet, ViewStyle } from "react-native";
import theme from "../theme";
import { useThemeMode } from "../context/ThemeModeContext";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function Card({ children, style }: Props) {
  const { themeTokens } = useThemeMode();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: themeTokens.colors.surface,
          borderColor: themeTokens.colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.Colors.surface,
    borderRadius: theme.Radius.lg,
    borderWidth: 1,
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
