import { API_BASE_URL } from "../config/api";

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  phoneNumber?: string | null;
  profileImageUrl?: string | null;
  createdAt?: string;
};

type AuthResponse = {
  token: string;
  user: AuthUser;
};

const request = async <T>(path: string, body: unknown): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message ?? "Authentication failed");
  }

  return data as T;
};

export const authApi = {
  login: (payload: { email: string; password: string }) => {
    return request<AuthResponse>("/auth/login", payload);
  },
  register: (payload: {
    fullName: string;
    email: string;
    password: string;
  }) => {
    return request<AuthResponse>("/auth/register", payload);
  },
};
