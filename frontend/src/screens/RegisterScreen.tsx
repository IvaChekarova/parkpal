import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import ScreenWrapper from "../components/ScreenWrapper";
import Input from "../components/Input";
import Button from "../components/Button";
import SectionTitle from "../components/SectionTitle";
import Logo from "../components/Logo";
import type { RootStackParamList } from "../navigation/types";
import theme from "../theme";
import { useAuth } from "../context/AuthContext";

type NavProp = NativeStackNavigationProp<RootStackParamList, "Register">;

export default function RegisterScreen() {
  const navigation = useNavigation<NavProp>();
  const { register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const canCreate =
    fullName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length > 0 &&
    password === confirmPassword;

  const handleRegister = async () => {
    if (!canCreate || isLoading) return;

    setError("");
    setIsLoading(true);

    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to register");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.outer}
      >
        <View style={styles.topSection}>
          <Logo size={72} style={styles.logo} />
          <SectionTitle small>{"ParkPal"}</SectionTitle>
          <Text style={styles.subtitle}>Create your account</Text>
          <Text style={styles.support}>
            Join ParkPal and reserve parking with less stress.
          </Text>
        </View>

        <View style={styles.cardWrapper}>
          <View style={styles.cardInner}>
            <Input
              placeholder="Full name"
              value={fullName}
              onChangeText={setFullName}
            />
            <View style={{ height: theme.Spacing.sm }} />
            <Input
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={{ height: theme.Spacing.sm }} />
            <Input
              placeholder="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <View style={{ height: theme.Spacing.sm }} />
            <Input
              placeholder="Confirm password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <View style={{ height: theme.Spacing.md }} />

            <Button
              title={isLoading ? "Creating account..." : "Create Account"}
              disabled={!canCreate || isLoading}
              onPress={handleRegister}
              style={{
                borderRadius: theme.Radius.lg,
                paddingVertical: theme.Spacing.md,
              }}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>Already have an account? </Text>
            <Pressable onPress={() => navigation.navigate("Welcome")}>
              <Text style={styles.loginLink}>Log in</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, justifyContent: "center" },
  topSection: {
    alignItems: "center",
    paddingHorizontal: theme.Spacing.lg,
    marginBottom: theme.Spacing.md,
  },
  logo: { marginBottom: theme.Spacing.md },
  subtitle: {
    ...theme.Typography.subtitle,
    color: theme.Colors.textSecondary,
    marginTop: theme.Spacing.xs,
  },
  support: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
    textAlign: "center",
    marginTop: theme.Spacing.xs,
  },
  cardWrapper: { paddingHorizontal: theme.Spacing.lg },
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
  bottomRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: theme.Spacing.md,
  },
  bottomText: { color: theme.Colors.textSecondary },
  loginLink: { color: theme.Colors.primary, fontWeight: "600" },
  errorText: {
    ...theme.Typography.caption,
    color: theme.Colors.error,
    textAlign: "center",
    marginTop: theme.Spacing.sm,
  },
});
