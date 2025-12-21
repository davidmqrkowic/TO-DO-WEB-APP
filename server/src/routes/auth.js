import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { User } from "../models/User.js";

const router = express.Router();

/* =====================
   Validation schemas
===================== */
const registerSchema = z.object({
  email: z.string().email().max(255),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  password: z.string().min(8).max(200),
});

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(200),
});

function signToken(user) {
    return jwt.sign(
    { userId: Number(user.userId), email: user.email, admin: user.admin },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

/* =====================
   POST /auth/register
===================== */
router.post("/register", async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await User.findOne({ where: { email: data.email } });
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await User.create({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      password: passwordHash,
      active: true,
      admin: false,
      attempts: 0,
      attemptedAt: null,
      lastLoginAt: null,
    });

    const token = signToken(user);

    return res.status(201).json({
      token,
      user: {
        userId: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        active: user.active,
        admin: user.admin,
      },
    });
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ message: "Validation error", issues: err.issues });
    }
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =====================
   POST /auth/login
===================== */
router.post("/login", async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await User.findOne({ where: { email: data.email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.active) {
      return res.status(403).json({ message: "Account is not active" });
    }

    const ok = await bcrypt.compare(data.password, user.password);
    if (!ok) {
      const attempts = (user.attempts || 0) + 1;
      await user.update({ attempts, attemptedAt: new Date() });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    await user.update({ attempts: 0, attemptedAt: null, lastLoginAt: new Date() });

    const token = signToken(user);

    return res.json({
      token,
      user: {
        userId: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        active: user.active,
        admin: user.admin,
      },
    });
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ message: "Validation error", issues: err.issues });
    }
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
