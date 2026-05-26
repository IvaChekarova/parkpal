import fs from "fs/promises";
import path from "path";

import { prisma } from "../config/prisma";
import { User } from "../generated/prisma/client";

export class UserError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
  }
}

const sanitizeUser = (user: User) => {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
};

const deleteLocalProfileImage = async (profileImageUrl?: string | null) => {
  if (!profileImageUrl?.startsWith("/uploads/profile-images/")) {
    return;
  }

  const filename = path.basename(profileImageUrl);
  const filepath = path.join(
    process.cwd(),
    "uploads",
    "profile-images",
    filename
  );

  try {
    await fs.unlink(filepath);
  } catch (_err) {
    // The database reference is still cleared even if the local file is gone.
  }
};

export const updateProfileImage = async (userId: string, imageUrl: string) => {
  const currentUser = await prisma.user.findUnique({ where: { id: userId } });

  if (!currentUser) {
    throw new UserError("User not found", 404);
  }

  await deleteLocalProfileImage(currentUser.profileImageUrl);

  const user = await prisma.user.update({
    where: { id: userId },
    data: { profileImageUrl: imageUrl },
  });

  return sanitizeUser(user);
};

export const removeProfileImage = async (userId: string) => {
  const currentUser = await prisma.user.findUnique({ where: { id: userId } });

  if (!currentUser) {
    throw new UserError("User not found", 404);
  }

  await deleteLocalProfileImage(currentUser.profileImageUrl);

  const user = await prisma.user.update({
    where: { id: userId },
    data: { profileImageUrl: null },
  });

  return sanitizeUser(user);
};
