import React from "react";
import { Text, StyleSheet } from "react-native";
import ScreenWrapper from "../components/ScreenWrapper";
import theme from "../theme";
import { useAuth } from "../context/AuthContext";
import Button from "../components/Button";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";

type NavProp = NativeStackNavigationProp<RootStackParamList, "Profile">;

export default function ProfileScreen() {
  const { logout } = useAuth();
  const navigation = useNavigation<NavProp>();
  return (
    <ScreenWrapper>
      <Text style={theme.Typography.title}>Profile</Text>
      <Text style={{ height: theme.Spacing.md }} />
      <Text style={theme.Typography.body}>
        Profile information and settings will be here.
      </Text>
      <Text style={{ height: theme.Spacing.md }} />
      <Button
        title="Logout"
        variant="outline"
        onPress={() => {
          logout();
        }}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({});
