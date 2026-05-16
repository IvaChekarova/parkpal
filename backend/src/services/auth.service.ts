import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { prisma } from "../config/prisma";
import { User, UserRole } from "../generated/prisma/client";
import { env } from "../utils/env";

const SALT_ROUNDS = 12;
const TOKEN_EXPIRES_IN = "7d";

type RegisterInput = {
  fullName?: string;
  email?: string;
  password?: string;
  phoneNumber?: string;
};

type LoginInput = {
  email?: string;
  password?: string;
};

export class AuthError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
  }
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const sanitizeUser = (user: User) => {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
};

const createToken = (userId: string) => {
  return jwt.sign({ userId }, env.jwtSecret, {
    expiresIn: TOKEN_EXPIRES_IN,
  });
};

export const registerUser = async (input: RegisterInput) => {
  const fullName = input.fullName?.trim();
  const email = input.email ? normalizeEmail(input.email) : "";
  const password = input.password;
  const phoneNumber = input.phoneNumber?.trim() || null;

  if (!fullName || !email || !password) {
    throw new AuthError("fullName, email, and password are required", 400);
  }

  if (password.length < 6) {
    throw new AuthError("Password must be at least 6 characters", 400);
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AuthError("Email already exists", 409);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      fullName,
      email,
      passwordHash,
      phoneNumber,
      role: UserRole.DRIVER,
    },
  });

  return {
    token: createToken(user.id),
    user: sanitizeUser(user),
  };
};

export const loginUser = async (input: LoginInput) => {
  const email = input.email ? normalizeEmail(input.email) : "";
  const password = input.password;

  if (!email || !password) {
    throw new AuthError("email and password are required", 400);
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AuthError("Invalid email or password", 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    throw new AuthError("Invalid email or password", 401);
  }

  return {
    token: createToken(user.id),
    user: sanitizeUser(user),
  };
};

export const getCurrentUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AuthError("User not found", 401);
  }

  return sanitizeUser(user);
};
