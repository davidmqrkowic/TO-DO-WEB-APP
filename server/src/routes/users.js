import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";

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

export default router;
