import express from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { BoardMember, User } from "../models/index.js";
import { logActivity } from "../services/activityLog.js";
import {
  requireBoardOwnerOrThrow,
  requireAcceptedFriendshipOrThrow,
  requireBoardMemberOrThrow,
} from "../services/permissions.js";

const router = express.Router();

const addMemberSchema = z.object({
  userId: z.number().int().positive(),
});

router.get("/:boardId/members", requireAuth, async (req, res) => {
  try {
    const me = req.user.userId;
    const boardId = Number(req.params.boardId);

    await requireBoardMemberOrThrow(boardId, me);

    const members = await BoardMember.findAll({ where: { boardId } });
    return res.json({ members });
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || "Server error" });
  }
});

router.post("/:boardId/members", requireAuth, async (req, res) => {
  try {
    const me = req.user.userId;
    const boardId = Number(req.params.boardId);
    const data = addMemberSchema.parse(req.body);

    await requireBoardOwnerOrThrow(boardId, me);
    await requireAcceptedFriendshipOrThrow(me, data.userId);

    const [member, created] = await BoardMember.findOrCreate({
      where: { boardId, userId: data.userId },
      defaults: { role: "member" },
    });

    if (!created) return res.status(409).json({ message: "User is already a member" });

    await logActivity({
      actorUserId: me,
      boardId,
      entityType: "member",
      entityId: data.userId,
      action: "MEMBER_ADDED",
      meta: { userId: data.userId },
      req,
    });

    return res.status(201).json({ member });
  } catch (err) {
    if (err?.name === "ZodError") return res.status(400).json({ message: "Validation error", issues: err.issues });
    return res.status(err.status || 500).json({ message: err.message || "Server error" });
  }
});

router.delete("/:boardId/members/:userId", requireAuth, async (req, res) => {
  try {
    const me = req.user.userId;
    const boardId = Number(req.params.boardId);
    const userId = Number(req.params.userId);

    await requireBoardOwnerOrThrow(boardId, me);

    if (Number(userId) === Number(me)) {
      return res.status(400).json({ message: "Owner cannot remove self here" });
    }

    await BoardMember.destroy({ where: { boardId, userId } });

    await logActivity({
      actorUserId: me,
      boardId,
      entityType: "member",
      entityId: userId,
      action: "MEMBER_REMOVED",
      meta: { userId },
      req,
    });

    return res.json({ message: "Member removed" });
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || "Server error" });
  }
});

export default router;
