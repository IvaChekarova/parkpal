import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../utils/env";

type JwtPayload = {
  userId: string;
};

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authorization = req.header("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication token is required" });
  }

  const token = authorization.replace("Bearer ", "").trim();

  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;

    if (!payload.userId) {
      return res.status(401).json({ message: "Invalid authentication token" });
    }

    req.userId = payload.userId;
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Invalid authentication token" });
  }
};
