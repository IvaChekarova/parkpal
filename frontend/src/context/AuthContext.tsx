import React, { createContext, useContext, useState, ReactNode } from "react";
import { authApi, AuthUser } from "../services/authApi";

type AuthContextType = {
  isAuthenticated: boolean;
  token: string | null;
  user: AuthUser | null;
  login: (payload: { email: string; password: string }) => Promise<void>;
  register: (payload: {
    fullName: string;
    email: string;
    password: string;
  }) => Promise<void>;
  updateUser: (nextUser: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = async (payload: { email: string; password: string }) => {
    const result = await authApi.login(payload);
    setToken(result.token);
    setUser(result.user);
    setIsAuthenticated(true);
  };

  const register = async (payload: {
    fullName: string;
    email: string;
    password: string;
  }) => {
    const result = await authApi.register(payload);
    setToken(result.token);
    setUser(result.user);
    setIsAuthenticated(true);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = (nextUser: AuthUser) => {
    setUser(nextUser);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        token,
        user,
        login,
        register,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export default AuthContext;
