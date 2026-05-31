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

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LocalizationProvider>
          <CurrencyProvider>
            <AppLocationProvider>
              <AppContent />
            </AppLocationProvider>
          </CurrencyProvider>
        </LocalizationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const { isLanguageReady } = useLocalization();

  if (!isLanguageReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#38bdf8" />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootNavigator />
      <StatusBar style="auto" />
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
