import { Op } from "sequelize";
import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { ActivityLog, User } from "../models/index.js";
import { requireBoardMemberOrThrow } from "../services/permissions.js";

const router = express.Router();

// GET /activity/boards/:boardId?limit=80&offset=0
router.get("/boards/:boardId", requireAuth, async (req, res) => {
  try {
    const boardId = Number(req.params.boardId);
    const me = req.user.userId;

    await requireBoardMemberOrThrow(boardId, me);

    const limit = Math.min(Number(req.query.limit ?? 50) || 50, 200);
    const offset = Math.max(Number(req.query.offset ?? 0) || 0, 0);

    const activities = await ActivityLog.findAll({
      where: { boardId },
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      include: [
        {
          model: User,
          as: "actor",
          attributes: ["userId", "email", "firstName", "lastName", "avatarPath"],
        },
      ],
    });

    return res.json({
      items: activities.map((a) => ({
        activityId: a.activityId,
        actorUserId: a.actorUserId,
        actor: a.actor
          ? {
              userId: Number(a.actor.userId),
              email: a.actor.email,
              firstName: a.actor.firstName,
              lastName: a.actor.lastName,
              avatarUrl: a.actor.avatarPath ? `${process.env.APP_URL}/${a.actor.avatarPath}` : null,
            }
          : null,
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        meta: a.meta,
        createdAt: a.createdAt,
      })),
    });
  } catch (err) {
    console.error("ACTIVITY ERROR:", err);
    return res.status(err.status || 500).json({
      message: err.message || "Server error",
    });
  }
});

router.get("/tasks/:taskId", requireAuth, async (req, res) => {
  try {
    const taskId = Number(req.params.taskId);
    const limit = Math.min(Number(req.query.limit ?? 50) || 50, 200);
    const offset = Math.max(Number(req.query.offset ?? 0) || 0, 0);

    const activities = await ActivityLog.findAll({
      where: {
        [Op.or]: [
          { entityType: "task", entityId: taskId },
          { meta: { taskId } },
        ],
      },
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      include: [
        {
          model: User,
          as: "actor",
          attributes: ["userId", "email", "firstName", "lastName", "avatarPath"],
        },
      ],
    });

    return res.json({
      items: activities.map((a) => ({
        activityId: a.activityId,
        actorUserId: a.actorUserId,
        actor: a.actor
          ? {
              userId: Number(a.actor.userId),
              email: a.actor.email,
              firstName: a.actor.firstName,
              lastName: a.actor.lastName,
              avatarUrl: a.actor.avatarPath ? `${process.env.APP_URL}/${a.actor.avatarPath}` : null,
            }
          : null,
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        meta: a.meta,
        createdAt: a.createdAt,
      })),
    });
  } catch (err) {
    console.error("ACTIVITY TASK ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
