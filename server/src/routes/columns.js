import express from "express";
import { z } from "zod";
import { sequelize } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { BoardColumn } from "../models/index.js";
import { logActivity } from "../services/activityLog.js";
import {
  requireBoardMemberOrThrow,
  requireBoardOwnerOrThrow,
  requireBoardExistsOrThrow,
} from "../services/permissions.js";
import { insertAtPosition, normalizePositions } from "../services/ordering.js";

const router = express.Router();

const createSchema = z.object({
  boardId: z.number().int().positive(),
  name: z.string().min(1).max(120),
});

const renameSchema = z.object({
  name: z.string().min(1).max(120),
});

const moveSchema = z.object({
  newPosition: z.number().int().min(0),
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const data = createSchema.parse(req.body);

    await requireBoardExistsOrThrow(data.boardId);
    await requireBoardMemberOrThrow(data.boardId, userId);

    const maxPos = await BoardColumn.max("position", { where: { boardId: data.boardId } });
    const position = Number.isFinite(maxPos) ? maxPos + 1 : 0;

    const col = await BoardColumn.create({
      boardId: data.boardId,
      name: data.name,
      position,
    });

    await logActivity({
      actorUserId: userId,
      boardId: data.boardId,
      entityType: "column",
      entityId: col.columnId,
      action: "COLUMN_CREATED",
      meta: { name: col.name, position: col.position },
      req,
    });

    return res.status(201).json({ column: col });
  } catch (err) {
    if (err?.name === "ZodError") return res.status(400).json({ message: "Validation error", issues: err.issues });
    return res.status(err.status || 500).json({ message: err.message || "Server error" });
  }
});

router.patch("/:columnId", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const columnId = Number(req.params.columnId);
    const data = renameSchema.parse(req.body);

    const col = await BoardColumn.findByPk(columnId);
    if (!col) return res.status(404).json({ message: "Column not found" });

    await requireBoardMemberOrThrow(col.boardId, userId);

    const oldName = col.name;
    await col.update({ name: data.name });

    await logActivity({
      actorUserId: userId,
      boardId: col.boardId,
      entityType: "column",
      entityId: col.columnId,
      action: "COLUMN_RENAMED",
      meta: { from: oldName, to: col.name },
      req,
    });

    return res.json({ column: col });
  } catch (err) {
    if (err?.name === "ZodError") return res.status(400).json({ message: "Validation error", issues: err.issues });
    return res.status(err.status || 500).json({ message: err.message || "Server error" });
  }
});

router.patch("/:columnId/move", requireAuth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userId = req.user.userId;
    const columnId = Number(req.params.columnId);
    const data = moveSchema.parse(req.body);

    const col = await BoardColumn.findByPk(columnId, { transaction: t });
    if (!col) {
      await t.rollback();
      return res.status(404).json({ message: "Column not found" });
    }

    await requireBoardMemberOrThrow(col.boardId, userId);

    const oldPosition = col.position;

    await insertAtPosition(
      BoardColumn,
      { boardId: col.boardId },
      "columnId",
      "position",
      col.columnId,
      data.newPosition,
      t
    );

    await normalizePositions(BoardColumn, { boardId: col.boardId }, "columnId", "position", t);

    const updated = await BoardColumn.findByPk(columnId, { transaction: t });

    await logActivity({
      actorUserId: userId,
      boardId: col.boardId,
      entityType: "column",
      entityId: col.columnId,
      action: "COLUMN_MOVED",
      meta: { from: oldPosition, to: updated.position },
      req,
    });

    await t.commit();
    return res.json({ column: updated });
  } catch (err) {
    await t.rollback();
    if (err?.name === "ZodError") return res.status(400).json({ message: "Validation error", issues: err.issues });
    return res.status(err.status || 500).json({ message: err.message || "Server error" });
  }
});

router.delete("/:columnId", requireAuth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userId = req.user.userId;
    const columnId = Number(req.params.columnId);

    const col = await BoardColumn.findByPk(columnId, { transaction: t });
    if (!col) {
      await t.rollback();
      return res.status(404).json({ message: "Column not found" });
    }

    // safe: owner only (clean rule)
    await requireBoardOwnerOrThrow(col.boardId, userId);

    await logActivity({
      actorUserId: userId,
      boardId: col.boardId,
      entityType: "column",
      entityId: col.columnId,
      action: "COLUMN_DELETED",
      meta: { name: col.name },
      req,
    });

    await BoardColumn.destroy({ where: { columnId }, transaction: t });
    await normalizePositions(BoardColumn, { boardId: col.boardId }, "columnId", "position", t);

    await t.commit();
    return res.json({ message: "Column deleted" });
  } catch (err) {
    await t.rollback();
    return res.status(err.status || 500).json({ message: err.message || "Server error" });
  }
});

export default router;
