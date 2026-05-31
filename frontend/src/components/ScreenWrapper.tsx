import React, { ReactNode } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import theme from "../theme";
import { useThemeMode } from "../context/ThemeModeContext";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function ScreenWrapper({ children, style }: Props) {
  const { themeTokens } = useThemeMode();

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: themeTokens.colors.background },
        style,
      ]}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.Colors.background,
    padding: theme.Spacing.md,
  },
});
