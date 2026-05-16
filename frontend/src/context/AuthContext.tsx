import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";

import {
  authApi,
  AuthUser,
  LoginPayload,
  RegisterPayload,
} from "../services/authApi";
import { setAuthToken } from "../services/apiClient";

type AuthContextType = {
  isAuthenticated: boolean;
  isRestoring: boolean;
  token: string | null;
  user: AuthUser | null;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const TOKEN_STORAGE_KEY = "parkpal_auth_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  const persistSession = useCallback(
    async (nextToken: string, nextUser: AuthUser) => {
      setAuthToken(nextToken);
      setToken(nextToken);
      setUser(nextUser);
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    },
    []
  );

  const clearSession = useCallback(async () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);

        if (!storedToken) return;

        setAuthToken(storedToken);
        const currentUser = await authApi.getCurrentUser();
        setToken(storedToken);
        setUser(currentUser);
      } catch (_error) {
        await clearSession();
      } finally {
        setIsRestoring(false);
      }
    };

    restoreSession();
  }, [clearSession]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const result = await authApi.login(payload);
      await persistSession(result.token, result.user);
    },
    [persistSession]
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const result = await authApi.register(payload);
      await persistSession(result.token, result.user);
    },
    [persistSession]
  );

  const logout = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(token),
      isRestoring,
      token,
      user,
      login,
      register,
      logout,
    }),
    [isRestoring, login, logout, register, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export default AuthContext;
