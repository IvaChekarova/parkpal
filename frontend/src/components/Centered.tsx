import React, { ReactNode } from "react";
import { SafeAreaView, StyleSheet, ViewStyle } from "react-native";

type Props = {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
};

export default function Centered({ children, style }: Props) {
  return (
    <SafeAreaView style={[styles.container, style as any]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
});
