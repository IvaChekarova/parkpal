import axios from "axios";

import { apiClient } from "./apiClient";

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  phoneNumber?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  fullName: string;
  email: string;
  password: string;
  phoneNumber?: string;
};

type CurrentUserResponse = {
  user: AuthUser;
};

export const authApi = {
  register: async (payload: RegisterPayload) => {
    const { data } = await apiClient.post<AuthResponse>("/auth/register", payload);
    return data;
  },

  login: async (payload: LoginPayload) => {
    const { data } = await apiClient.post<AuthResponse>("/auth/login", payload);
    return data;
  },

  getCurrentUser: async () => {
    const { data } = await apiClient.get<CurrentUserResponse>("/auth/me");
    return data.user;
  },
};

export const getAuthErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (typeof message === "string") {
      return message;
    }

    if (!error.response) {
      return "Unable to connect to ParkPal. Check your network and try again.";
    }
  }

  return "Something went wrong. Please try again.";
};

