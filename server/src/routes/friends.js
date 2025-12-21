import express from "express";
import { z } from "zod";
import { Op } from "sequelize";
import { requireAuth } from "../middleware/auth.js";
import { Friend, User } from "../models/index.js";
import { logActivity } from "../services/activityLog.js";

const router = express.Router();

const requestSchema = z.object({
  email: z.string().email().max(255),
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const me = req.user.userId;

    const friends = await Friend.findAll({
      where: {
        status: "accepted",
        [Op.or]: [{ requesterId: me }, { addresseeId: me }],
      },
      order: [["createdAt", "DESC"]],
    });

    return res.json({ friends });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/requests", requireAuth, async (req, res) => {
  try {
    const me = req.user.userId;

    const incoming = await Friend.findAll({
      where: { addresseeId: me, status: "pending" },
      order: [["createdAt", "DESC"]],
    });

    const outgoing = await Friend.findAll({
      where: { requesterId: me, status: "pending" },
      order: [["createdAt", "DESC"]],
    });

    return res.json({ incoming, outgoing });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/request", requireAuth, async (req, res) => {
  try {
    const me = req.user.userId;
    const data = requestSchema.parse(req.body);

    const other = await User.findOne({ where: { email: data.email } });
    if (!other) return res.status(404).json({ message: "User not found" });
    if (Number(other.userId) === Number(me)) return res.status(400).json({ message: "Cannot friend yourself" });

    // already exists in any direction?
    const existing = await Friend.findOne({
      where: {
        [Op.or]: [
          { requesterId: me, addresseeId: other.userId },
          { requesterId: other.userId, addresseeId: me },
        ],
      },
    });

    if (existing) {
      if (existing.status === "accepted") return res.status(409).json({ message: "Already friends" });
      if (existing.status === "pending") return res.status(409).json({ message: "Request already pending" });
    }

    const fr = await Friend.create({
      requesterId: me,
      addresseeId: other.userId,
      status: "pending",
    });

    await logActivity({
      actorUserId: me,
      boardId: null,
      entityType: "friend",
      entityId: fr.friendshipId,
      action: "FRIEND_REQUEST_SENT",
      meta: { toUserId: other.userId },
      req,
    });

    return res.status(201).json({ friendRequest: fr });
  } catch (err) {
    if (err?.name === "ZodError") return res.status(400).json({ message: "Validation error", issues: err.issues });
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/:friendshipId/accept", requireAuth, async (req, res) => {
  try {
    const me = req.user.userId;
    const friendshipId = Number(req.params.friendshipId);

    const fr = await Friend.findByPk(friendshipId);
    if (!fr) return res.status(404).json({ message: "Request not found" });

    if (Number(fr.addresseeId) !== Number(me)) {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (fr.status !== "pending") {
      return res.status(400).json({ message: "Request is not pending" });
    }

    await fr.update({ status: "accepted" });

    await logActivity({
      actorUserId: me,
      entityType: "friend",
      entityId: fr.friendshipId,
      action: "FRIEND_REQUEST_ACCEPTED",
      meta: { fromUserId: fr.requesterId },
      req,
    });

    return res.json({ friend: fr });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/:friendshipId/reject", requireAuth, async (req, res) => {
  try {
    const me = req.user.userId;
    const friendshipId = Number(req.params.friendshipId);

    const fr = await Friend.findByPk(friendshipId);
    if (!fr) return res.status(404).json({ message: "Request not found" });

    if (Number(fr.addresseeId) !== Number(me)) {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (fr.status !== "pending") {
      return res.status(400).json({ message: "Request is not pending" });
    }

    await fr.update({ status: "rejected" });
    return res.json({ message: "Rejected" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:friendshipId", requireAuth, async (req, res) => {
  try {
    const me = req.user.userId;
    const friendshipId = Number(req.params.friendshipId);

    const fr = await Friend.findByPk(friendshipId);
    if (!fr) return res.status(404).json({ message: "Friendship not found" });

    if (Number(fr.requesterId) !== Number(me) && Number(fr.addresseeId) !== Number(me)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    await Friend.destroy({ where: { friendshipId } });

    await logActivity({
      actorUserId: me,
      entityType: "friend",
      entityId: friendshipId,
      action: "FRIEND_REMOVED",
      meta: { requesterId: fr.requesterId, addresseeId: fr.addresseeId },
      req,
    });

    return res.json({ message: "Removed" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
