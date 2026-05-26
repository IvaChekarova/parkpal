import { API_BASE_URL } from "../config/api";
import { AuthUser } from "./authApi";

type UserResponse = {
  user: AuthUser;
};

const authenticatedRequest = async <T>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message ?? "Profile request failed");
  }

  return data as T;
};

export const getAbsoluteProfileImageUrl = (profileImageUrl?: string | null) => {
  if (!profileImageUrl) return null;
  if (profileImageUrl.startsWith("http")) return profileImageUrl;
  return `${API_BASE_URL}${profileImageUrl}`;
};

export const userApi = {
  uploadProfileImage: async (token: string, imageUri: string) => {
    const filename = imageUri.split("/").pop() || `profile-${Date.now()}.jpg`;
    const extensionMatch = /\.(\w+)$/.exec(filename);
    const extension = extensionMatch?.[1]?.toLowerCase() || "jpg";
    const mimeType = extension === "png" ? "image/png" : "image/jpeg";
    const formData = new FormData();

    formData.append("profileImage", {
      uri: imageUri,
      name: filename,
      type: mimeType,
    } as unknown as Blob);

    const data = await authenticatedRequest<UserResponse>(
      "/users/me/profile-image",
      token,
      {
        method: "POST",
        body: formData,
      }
    );

    return data.user;
  },

  removeProfileImage: async (token: string) => {
    const data = await authenticatedRequest<UserResponse>(
      "/users/me/profile-image",
      token,
      { method: "DELETE" }
    );

    return data.user;
  },
};
