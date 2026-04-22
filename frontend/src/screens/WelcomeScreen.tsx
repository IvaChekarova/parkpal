import React from "react";
import { Text, StyleSheet, Button } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Centered from "../components/Centered";
import type { RootStackParamList } from "../navigation/types";
import theme from "../theme";

type NavProp = NativeStackNavigationProp<RootStackParamList, "Welcome">;

export default function WelcomeScreen() {
  const navigation = useNavigation<NavProp>();

  return (
    <Centered>
      <Text style={[styles.title, theme.Typography.title]}>
        Welcome to ParkPal
      </Text>
      <Text style={{ height: theme.Spacing.md }} />
      <Button title="Login" onPress={() => navigation.navigate("Login")} />
      <Text style={{ height: theme.Spacing.sm }} />
      <Button
        title="Register"
        onPress={() => navigation.navigate("Register")}
      />
      <Text style={{ height: theme.Spacing.sm }} />
      <Button
        title="Continue to Home"
        onPress={() => navigation.navigate("Home")}
      />
    </Centered>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: theme.Spacing.md,
  },
});
