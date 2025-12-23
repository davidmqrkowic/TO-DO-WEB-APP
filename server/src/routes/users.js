import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";
import path from "path";
import fs from "fs";
import { uploadAvatar } from "../config/upload.js";

const router = express.Router();

function getAppUrl(req) {
  // Prefer env, fallback to request host (najbolje za dev)
  const envUrl = process.env.APP_URL;
  if (envUrl) return envUrl.replace(/\/+$/, "");
  return `${req.protocol}://${req.get("host")}`;
}

function toUserDto(u, appUrl) {
  return {
    userId: Number(u.userId),
    id: Number(u.userId),
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    active: u.active,
    admin: u.admin,
    avatarUrl: u.avatarPath ? `${appUrl}/${u.avatarPath}` : null,
  };
}

/* =====================
   GET /users
   - list all users (for Friends)
===================== */
router.get("/", requireAuth, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ["userId", "email", "firstName", "lastName", "active", "admin", "avatarPath"],
      order: [["userId", "ASC"]],
    });

    const appUrl = getAppUrl(req);

    return res.json(users.map((u) => toUserDto(u, appUrl)));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =====================
   GET /users/me
===================== */
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: ["userId", "email", "firstName", "lastName", "active", "admin", "avatarPath"],
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    const appUrl = getAppUrl(req);

    return res.json({ user: toUserDto(user, appUrl) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =====================
   PUT /users/me
   - update profile (no avatar upload here)
===================== */
router.put("/me", requireAuth, async (req, res) => {
  try {
    const { firstName = "", lastName = "" } = req.body || {};

    const user = await User.findByPk(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    await user.update({ firstName, lastName });

    const appUrl = getAppUrl(req);

    return res.json({ user: toUserDto(user, appUrl) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =====================
   POST /users/me/avatar
   - upload avatar file
===================== */
router.post("/me/avatar", requireAuth, uploadAvatar.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Missing file (avatar)" });

    const user = await User.findByPk(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // delete old avatar if exists
    if (user.avatarPath) {
      const oldAbs = path.join(process.cwd(), user.avatarPath);
      if (fs.existsSync(oldAbs)) {
        try {
          fs.unlinkSync(oldAbs);
        } catch (_) {}
      }
    }

    // store relative path like: uploads/filename.png
    const relativePath = path.join("uploads", req.file.filename).replaceAll("\\", "/");
    await user.update({ avatarPath: relativePath });

    const appUrl = getAppUrl(req);

    return res.json({ user: toUserDto(user, appUrl) });
  } catch (err) {
    // multer errors (file too large, invalid mimetype) često dođu ovdje
    if (err?.name === "MulterError" && err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: "File too large. Max is 50MB." });
    }
    if (err?.message?.toLowerCase()?.includes("only jpg") || err?.message?.toLowerCase()?.includes("png")) {
      return res.status(400).json({ message: err.message });
    }

    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
