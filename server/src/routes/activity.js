import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { ActivityLog } from "../models/index.js";
import { requireBoardMemberOrThrow } from "../services/permissions.js";

const router = express.Router();

router.get("/boards/:boardId", requireAuth, async (req, res) => {
  try {
    const me = req.user.userId;
    const boardId = Number(req.params.boardId);

    await requireBoardMemberOrThrow(boardId, me);

    const limit = Math.min(Number(req.query.limit || 50), 200);
    const offset = Math.max(Number(req.query.offset || 0), 0);

    const items = await ActivityLog.findAll({
      where: { boardId },
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    return res.json({ items, limit, offset });
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || "Server error" });
  }
});

export default router;
