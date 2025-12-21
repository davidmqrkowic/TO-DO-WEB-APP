import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";
import fs from "fs";
import path from "path";
import { uploadAvatar } from "../config/upload.js";


const router = express.Router();

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: ["userId", "email", "firstName", "lastName", "active", "admin"],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      user: {
        userId: Number(user.userId),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        active: user.active,
        admin: user.admin,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/me/avatar", requireAuth, uploadAvatar.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Missing file (avatar)" });

    const user = await User.findByPk(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // delete old avatar if exists
    if (user.avatarPath) {
      const oldAbs = path.join(process.cwd(), user.avatarPath);
      if (fs.existsSync(oldAbs)) {
        try { fs.unlinkSync(oldAbs); } catch (_) {}
      }
    }

    // store relative path like: uploads/filename.png
    const relativePath = path.join("uploads", req.file.filename).replaceAll("\\", "/");
    await user.update({ avatarPath: relativePath });

    return res.json({
      user: {
        userId: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        active: user.active,
        admin: user.admin,
        avatarUrl: `${process.env.APP_URL}/${relativePath}`,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});


export default router;
