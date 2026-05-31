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
import { useTranslation } from "react-i18next";
import ScreenWrapper from "../components/ScreenWrapper";
import Button from "../components/Button";
import SectionTitle from "../components/SectionTitle";
import Input from "../components/Input";
import Logo from "../components/Logo";
import type { RootStackParamList } from "../navigation/types";
import theme from "../theme";
import { useAuth } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeModeContext";

type NavProp = NativeStackNavigationProp<RootStackParamList, "Welcome">;

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const { login } = useAuth();
  const { themeTokens } = useThemeMode();
  const colors = themeTokens.colors;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = email.trim().length > 0 && password.length > 0;

  const handleLogin = async () => {
    if (!canSubmit || isLoading) return;

    setError("");
    setIsLoading(true);

    try {
      await login({ email: email.trim(), password });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.unableToLogIn"));
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
        <View style={styles.middle}>
          <View style={styles.topSection}>
            <Logo size={72} style={styles.logo} />

            <SectionTitle small>{"ParkPal"}</SectionTitle>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {t("auth.subtitle")}
            </Text>
          </View>

          <View style={styles.card}>
            <View
              style={[
                styles.cardInner,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Input
                placeholder={t("auth.email")}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <View style={{ height: theme.Spacing.sm }} />

              <Input
                placeholder={t("auth.password")}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              <View style={{ height: theme.Spacing.sm }} />

              <Button
                title={isLoading ? t("auth.loggingIn") : t("auth.logIn")}
                disabled={!canSubmit || isLoading}
                onPress={handleLogin}
                style={{
                  borderRadius: theme.Radius.lg,
                  paddingVertical: theme.Spacing.md,
                }}
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <View style={{ height: theme.Spacing.md }} />

              <View style={styles.dividerRow}>
                <View style={styles.line} />
                <Text style={styles.orText}>{t("common.or")}</Text>
                <View style={styles.line} />
              </View>

              <View style={{ height: theme.Spacing.md }} />

              <Button
                title={t("auth.continueWithGoogle")}
                variant="outline"
                onPress={() => {
                  setError(t("auth.googleUnavailable"));
                }}
                style={{
                  borderRadius: theme.Radius.lg,
                  paddingVertical: theme.Spacing.md,
                }}
              />
            </View>
          </View>

          <View style={styles.bottomRowInline}>
            <Text style={[styles.bottomText, { color: colors.textMuted }]}>
              {t("auth.noAccount")}
            </Text>
            <Pressable onPress={() => navigation.navigate("Register")}>
              <Text style={styles.registerLink}>{t("auth.registerNow")}</Text>
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
  logo: { marginBottom: theme.Spacing.md },
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
    borderWidth: 1,
    padding: theme.Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 6,
  },
  dividerRow: { flexDirection: "row", alignItems: "center" },
  line: { flex: 1, height: 1, backgroundColor: theme.Colors.border },
  orText: {
    marginHorizontal: theme.Spacing.sm,
    color: theme.Colors.textSecondary,
  },
  bottomRowInline: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: theme.Spacing.md,
  },
  bottomText: { color: theme.Colors.textSecondary },
  registerLink: { color: theme.Colors.primary, fontWeight: "600" },
  errorText: {
    ...theme.Typography.caption,
    color: theme.Colors.error,
    textAlign: "center",
    marginTop: theme.Spacing.sm,
  },
});
