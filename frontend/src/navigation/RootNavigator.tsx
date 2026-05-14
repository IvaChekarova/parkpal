import React from "react";
import { useAuth } from "../context/AuthContext";
import AuthNavigator from "./AuthNavigator";
import AppTabs from "./AppTabs";

export default function RootNavigator() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return <AuthNavigator />;

  return <AppTabs />;
}
