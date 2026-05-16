import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import AuthNavigator from "./AuthNavigator";
import AppTabs from "./AppTabs";
import theme from "../theme";

export default function RootNavigator() {
  const { isAuthenticated, isRestoring } = useAuth();

  if (isRestoring) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={theme.Colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) return <AuthNavigator />;

  return <AppTabs />;
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.Colors.background,
  },
});
