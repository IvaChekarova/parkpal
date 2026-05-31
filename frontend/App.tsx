import React from "react";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import RootNavigator from "./src/navigation/RootNavigator";
import { AuthProvider } from "./src/context/AuthContext";
import { CurrencyProvider } from "./src/context/CurrencyContext";
import { AppLocationProvider } from "./src/context/AppLocationContext";
import {
  LocalizationProvider,
  useLocalization,
} from "./src/context/LocalizationContext";
import { ThemeModeProvider, useThemeMode } from "./src/context/ThemeModeContext";

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LocalizationProvider>
          <ThemeModeProvider>
            <CurrencyProvider>
              <AppLocationProvider>
                <AppContent />
              </AppLocationProvider>
            </CurrencyProvider>
          </ThemeModeProvider>
        </LocalizationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const { isLanguageReady } = useLocalization();
  const { isThemeReady, themeTokens } = useThemeMode();

  if (!isLanguageReady || !isThemeReady) {
    return (
      <View
        style={[
          styles.loading,
          { backgroundColor: themeTokens.colors.background },
        ]}
      >
        <ActivityIndicator color={themeTokens.colors.accent} />
        <StatusBar style={themeTokens.mode === "dark" ? "light" : "dark"} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootNavigator />
      <StatusBar style={themeTokens.mode === "dark" ? "light" : "dark"} />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#071426",
  },
});
