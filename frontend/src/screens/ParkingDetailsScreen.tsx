import React from "react";
import { Text, StyleSheet } from "react-native";
import Centered from "../components/Centered";

export default function ParkingDetailsScreen() {
  return (
    <Centered>
      <Text style={styles.title}>Parking Details</Text>
    </Centered>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "600", color: "#111" },
});
