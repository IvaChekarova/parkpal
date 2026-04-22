import React, { useState } from "react";
import { StyleSheet, Text } from "react-native";
import ScreenWrapper from "../components/ScreenWrapper";
import Input from "../components/Input";
import Button from "../components/Button";
import theme from "../theme";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <ScreenWrapper>
      <Text style={theme.Typography.title}>Login</Text>

      <Text style={{ height: theme.Spacing.md }} />

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

      <Text style={{ height: theme.Spacing.md }} />

      <Button title="Login" onPress={() => {}} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({});
