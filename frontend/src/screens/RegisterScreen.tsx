import React, { useState } from "react";
import { StyleSheet, Text } from "react-native";
import ScreenWrapper from "../components/ScreenWrapper";
import Input from "../components/Input";
import Button from "../components/Button";
import theme from "../theme";

export default function RegisterScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  return (
    <ScreenWrapper>
      <Text style={theme.Typography.title}>Create account</Text>

      <Text style={{ height: theme.Spacing.md }} />

      <Input
        placeholder="Full name"
        value={fullName}
        onChangeText={setFullName}
      />

      <Text style={{ height: theme.Spacing.sm }} />

      <Input
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={{ height: theme.Spacing.sm }} />

      <Input
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Text style={{ height: theme.Spacing.sm }} />

      <Input
        placeholder="Confirm password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />

      <Text style={{ height: theme.Spacing.md }} />

      <Button title="Create account" onPress={() => {}} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({});
