import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import ScreenWrapper from "../components/ScreenWrapper";
import theme from "../theme";
import { useAuth } from "../context/AuthContext";
import Button from "../components/Button";
import SectionTitle from "../components/SectionTitle";
import Card from "../components/Card";

export default function ProfileScreen() {
  const { logout } = useAuth();

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => logout() },
    ]);
  };

  const accountInfo = [
    { key: "Member since", value: "Jan 2024" },
    { key: "Total reservations", value: "3" },
    { key: "Favorite area", value: "Downtown" },
  ];

  const actions = [
    { key: "Reservation history" },
    { key: "Notifications" },
    { key: "Support" },
    { key: "Privacy & Terms" },
  ];

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topSection}>
          <View style={styles.avatar} />
          <Text style={[theme.Typography.title, { marginTop: theme.Spacing.sm }]}>Iva Chekarova</Text>
          <Text style={[theme.Typography.caption, { color: theme.Colors.textSecondary, marginTop: theme.Spacing.xs }]}>iva@example.com</Text>
        </View>

        <View style={{ height: theme.Spacing.md }} />

        <SectionTitle>Account info</SectionTitle>
        <Card style={styles.infoCard}>
          {accountInfo.map((row) => (
            <View key={row.key} style={styles.infoRow}>
              <Text style={theme.Typography.caption}>{row.key}</Text>
              <Text style={theme.Typography.body}>{row.value}</Text>
            </View>
          ))}
        </Card>

        <View style={{ height: theme.Spacing.md }} />

        <SectionTitle>Actions</SectionTitle>
        <Card style={styles.actionsCard}>
          {actions.map((a) => (
            <Pressable key={a.key} onPress={() => Alert.alert(a.key)} style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.7 }]}>
              <Text style={theme.Typography.body}>{a.key}</Text>
              <Text style={styles.chev}>›</Text>
            </Pressable>
          ))}
        </Card>

        <View style={{ height: theme.Spacing.lg }} />

        <Button title="Log out" variant="outline" onPress={handleLogout} />

        <View style={{ height: theme.Spacing.xl }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: theme.Spacing.xl },
  topSection: { alignItems: "center", paddingVertical: theme.Spacing.sm },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCard: { marginTop: theme.Spacing.sm },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: theme.Spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.Colors.border },
  actionsCard: { marginTop: theme.Spacing.sm },
  actionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: theme.Spacing.sm },
  chev: { color: theme.Colors.textSecondary, fontSize: 18 },
});
