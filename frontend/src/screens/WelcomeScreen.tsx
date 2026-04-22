import React from "react";
import { Text, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import ScreenWrapper from "../components/ScreenWrapper";
import Button from "../components/Button";
import SectionTitle from "../components/SectionTitle";
import type { RootStackParamList } from "../navigation/types";
import theme from "../theme";

type NavProp = NativeStackNavigationProp<RootStackParamList, "Welcome">;

export default function WelcomeScreen() {
  const navigation = useNavigation<NavProp>();

  return (
    <ScreenWrapper>
      <SectionTitle>Welcome to ParkPal</SectionTitle>

      <Button title="Login" onPress={() => navigation.navigate("Login")} />
      <Text style={{ height: theme.Spacing.sm }} />
      <Button
        title="Register"
        variant="outline"
        onPress={() => navigation.navigate("Register")}
      />
      <Text style={{ height: theme.Spacing.sm }} />
      <Button
        title="Continue to Home"
        variant="secondary"
        onPress={() => navigation.navigate("Login")}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  spacer: { marginBottom: theme.Spacing.md },
});
