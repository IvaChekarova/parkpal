import React from "react";
import { Text, StyleSheet } from "react-native";
import Centered from "../components/Centered";
import theme from "../theme";

export default function HomeScreen() {
  return (
    <Centered>
      <Text style={[styles.title, theme.Typography.title]}>Home</Text>
    </Centered>
  );
}

const styles = StyleSheet.create({
  title: { color: theme.Colors.textPrimary },
});
