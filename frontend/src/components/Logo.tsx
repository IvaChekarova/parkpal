import React from "react";
import { Image, StyleSheet, View, ViewStyle } from "react-native";

type Props = {
  size?: number;
  style?: ViewStyle;
};

export default function Logo({ size = 72, style }: Props) {
  return (
    <View
      style={[
        styles.logoFrame,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
    >
      <Image
        source={require("../../assets/logo-parkpal.png")}
        resizeMode="cover"
        style={[
          styles.logoImage,
          {
            width: size * 1.18,
            height: size * 1.18,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  logoFrame: {
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImage: {
    borderRadius: 999,
  },
});
