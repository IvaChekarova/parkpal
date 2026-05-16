import { Request, Response } from "express";

import {
  AuthError,
  getCurrentUser,
  loginUser,
  registerUser,
} from "../services/auth.service";

const handleAuthError = (error: unknown, res: Response) => {
  if (error instanceof AuthError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  console.error(error);
  return res.status(500).json({ message: "Internal server error" });
};

export const register = async (req: Request, res: Response) => {
  try {
    const result = await registerUser(req.body);
    return res.status(201).json(result);
  } catch (error) {
    return handleAuthError(error, res);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const result = await loginUser(req.body);
    return res.status(200).json(result);
  } catch (error) {
    return handleAuthError(error, res);
  }
};

export const me = async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Authentication token is required" });
    }

    const user = await getCurrentUser(req.userId);
    return res.status(200).json({ user });
  } catch (error) {
    return handleAuthError(error, res);
  }
};
