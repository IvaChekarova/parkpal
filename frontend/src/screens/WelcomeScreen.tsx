import React from "react";
import { Text, StyleSheet, Button } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Centered from "../components/Centered";
import type { RootStackParamList } from "../navigation/types";

type NavProp = NativeStackNavigationProp<RootStackParamList, "Welcome">;

export default function WelcomeScreen() {
  const navigation = useNavigation<NavProp>();

  return (
    <Centered>
      <Text style={styles.title}>Welcome to ParkPal</Text>
      <Button title="Login" onPress={() => navigation.navigate("Login")} />
      <Button
        title="Register"
        onPress={() => navigation.navigate("Register")}
      />
      <Button
        title="Continue to Home"
        onPress={() => navigation.navigate("Home")}
      />
    </Centered>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: "#111",
    marginBottom: 16,
  },
});
