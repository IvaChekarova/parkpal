import { Router } from "express";
import multer from "multer";
import path from "path";

import {
  deleteProfileImage,
  uploadProfileImage,
} from "../controllers/user.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

const profileImageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(process.cwd(), "uploads", "profile-images"));
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${req.userId}-${Date.now()}${extension}`);
  },
});

const upload = multer({
  storage: profileImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image uploads are allowed"));
      return;
    }

    cb(null, true);
  },
});

router.post(
  "/me/profile-image",
  requireAuth,
  upload.single("profileImage"),
  uploadProfileImage
);
router.delete("/me/profile-image", requireAuth, deleteProfileImage);

export default router;
