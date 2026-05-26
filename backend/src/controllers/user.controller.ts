import { Request, Response } from "express";

import {
  removeProfileImage,
  updateProfileImage,
  UserError,
} from "../services/user.service";

export const uploadProfileImage = async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Profile image is required" });
    }

    const imageUrl = `/uploads/profile-images/${req.file.filename}`;
    const user = await updateProfileImage(req.userId, imageUrl);

    return res.status(200).json({ user });
  } catch (err) {
    if (err instanceof UserError) {
      return res.status(err.statusCode).json({ message: err.message });
    }

    return res.status(500).json({ message: "Unable to upload profile image" });
  }
};

export const deleteProfileImage = async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await removeProfileImage(req.userId);
    return res.status(200).json({ user });
  } catch (err) {
    if (err instanceof UserError) {
      return res.status(err.statusCode).json({ message: err.message });
    }

    return res.status(500).json({ message: "Unable to remove profile image" });
  }
};
