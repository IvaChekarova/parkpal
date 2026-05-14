import React, { useState } from "react";
import {
  Text,
  StyleSheet,
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import ScreenWrapper from "../components/ScreenWrapper";
import Button from "../components/Button";
import SectionTitle from "../components/SectionTitle";
import Input from "../components/Input";
import type { RootStackParamList } from "../navigation/types";
import theme from "../theme";
import { useAuth } from "../context/AuthContext";

type NavProp = NativeStackNavigationProp<RootStackParamList, "Welcome">;

export default function WelcomeScreen() {
  const navigation = useNavigation<NavProp>();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const canSubmit = email.trim().length > 0 && password.length > 0;

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.outer}
      >
        <View style={styles.middle}>
          <View style={styles.topSection}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>P</Text>
            </View>

            <SectionTitle small>{"ParkPal"}</SectionTitle>
            <Text style={styles.subtitle}>
              Smart parking discovery and reservation
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardInner}>
              <Input
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <View style={{ height: theme.Spacing.sm }} />

              <Input
                placeholder="Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              <View style={{ height: theme.Spacing.sm }} />

              <Button
                title="Log In"
                onPress={() => {
                  if (canSubmit) login();
                }}
                style={{ borderRadius: theme.Radius.lg, paddingVertical: theme.Spacing.md }}
              />

              <View style={{ height: theme.Spacing.md }} />

              <View style={styles.dividerRow}>
                <View style={styles.line} />
                <Text style={styles.orText}>or</Text>
                <View style={styles.line} />
              </View>

              <View style={{ height: theme.Spacing.md }} />

              <Button
                title="Continue with Google"
                variant="outline"
                onPress={() => {
                  login();
                }}
                style={{ borderRadius: theme.Radius.lg, paddingVertical: theme.Spacing.md }}
              />
            </View>
          </View>

          <View style={styles.bottomRowInline}>
            <Text style={styles.bottomText}>Still don’t have an account? </Text>
            <Pressable onPress={() => navigation.navigate("Register")}>
              <Text style={styles.registerLink}>Register now</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, justifyContent: "center" },
  middle: { marginHorizontal: theme.Spacing.lg },
  topSection: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.Spacing.md,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.Spacing.md,
  },
  logoText: { color: "#fff", fontSize: 24, fontWeight: "700" },
  subtitle: {
    ...theme.Typography.body,
    color: theme.Colors.textSecondary,
    textAlign: "center",
    marginTop: theme.Spacing.sm,
  },
  card: {
    justifyContent: "center",
  },
  cardInner: {
    backgroundColor: theme.Colors.surface,
    borderRadius: theme.Radius.lg,
    padding: theme.Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 6,
  },
  dividerRow: { flexDirection: "row", alignItems: "center" },
  line: { flex: 1, height: 1, backgroundColor: theme.Colors.border },
  orText: { marginHorizontal: theme.Spacing.sm, color: theme.Colors.textSecondary },
  bottomRowInline: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: theme.Spacing.md,
  },
  bottomText: { color: theme.Colors.textSecondary },
  registerLink: { color: theme.Colors.primary, fontWeight: "600" },
});
