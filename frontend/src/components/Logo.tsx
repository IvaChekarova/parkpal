import React from "react";
import { Image, ImageStyle, StyleSheet } from "react-native";

type Props = {
  size?: number;
  style?: ImageStyle;
};

export default function Logo({ size = 72, style }: Props) {
  return (
    <Image
      source={require("../../assets/logo-parkpal.png")}
      resizeMode="contain"
      style={[styles.logo, { width: size, height: size }, style]}
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    alignSelf: "center",
  },
});
