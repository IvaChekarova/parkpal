import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Modal,
} from "react-native";
import ScreenWrapper from "../components/ScreenWrapper";
import theme from "../theme";
import { useAuth } from "../context/AuthContext";
import Button from "../components/Button";
import SectionTitle from "../components/SectionTitle";
import Card from "../components/Card";

export default function ProfileScreen() {
  const { logout } = useAuth();
  const [language, setLanguage] = React.useState("English");
  const [languageModalVisible, setLanguageModalVisible] = React.useState(false);

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
    { key: "Language", value: language },
    { key: "Notifications" },
    { key: "Support" },
    { key: "Privacy & Terms" },
  ];

  const languages = ["English", "Македонски"];

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topSection}>
          <View style={styles.avatar} />
          <Text
            style={[theme.Typography.title, { marginTop: theme.Spacing.sm }]}
          >
            Iva Chekarova
          </Text>
          <Text
            style={[
              theme.Typography.caption,
              {
                color: theme.Colors.textSecondary,
                marginTop: theme.Spacing.xs,
              },
            ]}
          >
            iva@example.com
          </Text>
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
            <Pressable
              key={a.key}
              onPress={() =>
                a.key === "Language"
                  ? setLanguageModalVisible(true)
                  : Alert.alert(a.key)
              }
              style={({ pressed }) => [
                styles.actionRow,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={theme.Typography.body}>{a.key}</Text>
              <View style={styles.actionRight}>
                {a.value ? (
                  <Text style={styles.actionValue}>{a.value}</Text>
                ) : null}
                <Text style={styles.chev}>›</Text>
              </View>
            </Pressable>
          ))}
        </Card>

        <View style={{ height: theme.Spacing.lg }} />

        <Button title="Log out" variant="outline" onPress={handleLogout} />

        <View style={{ height: theme.Spacing.xl }} />
      </ScrollView>

      <Modal
        animationType="fade"
        transparent
        visible={languageModalVisible}
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setLanguageModalVisible(false)}
        >
          <Pressable style={styles.languageModal}>
            <Text style={styles.modalTitle}>Select language</Text>
            <View style={{ height: theme.Spacing.md }} />

            {languages.map((item) => (
              <Pressable
                key={item}
                onPress={() => {
                  setLanguage(item);
                  setLanguageModalVisible(false);
                }}
                style={({ pressed }) => [
                  styles.languageOption,
                  language === item && styles.languageOptionSelected,
                  pressed && { opacity: 0.75 },
                ]}
              >
                <Text style={theme.Typography.body}>{item}</Text>
                {language === item ? (
                  <Text style={styles.selectedMark}>✓</Text>
                ) : null}
              </Pressable>
            ))}

            <View style={styles.modalDivider} />
            <Pressable
              onPress={() => setLanguageModalVisible(false)}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: theme.Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.Colors.border,
  },
  actionsCard: { marginTop: theme.Spacing.sm },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.Spacing.sm,
  },
  actionRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionValue: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
    marginRight: theme.Spacing.xs,
  },
  chev: { color: theme.Colors.textSecondary, fontSize: 18 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.28)",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.Spacing.lg,
  },
  languageModal: {
    backgroundColor: theme.Colors.surface,
    borderRadius: theme.Radius.lg,
    padding: theme.Spacing.md,
    width: "100%",
    maxWidth: 340,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  modalTitle: {
    ...theme.Typography.subtitle,
    textAlign: "center",
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.Spacing.sm,
    paddingHorizontal: theme.Spacing.sm,
    borderRadius: theme.Radius.md,
  },
  languageOptionSelected: {
    backgroundColor: "rgba(20,43,108,0.06)",
  },
  selectedMark: {
    color: theme.Colors.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  modalDivider: {
    height: 1,
    backgroundColor: theme.Colors.border,
    marginTop: theme.Spacing.sm,
    marginBottom: theme.Spacing.xs,
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: theme.Spacing.sm,
    borderRadius: theme.Radius.md,
  },
  cancelText: {
    color: theme.Colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
});
