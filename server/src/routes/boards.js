import express from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { sequelize } from "../config/db.js";
import { Board, BoardMember, BoardColumn, Task, TaskAssignee, TaskComment } from "../models/index.js";
import { logActivity } from "../services/activityLog.js";


const router = express.Router();

const createBoardSchema = z.object({
  name: z.string().min(1).max(150),
});

const renameBoardSchema = z.object({
  name: z.string().min(1).max(150),
});

// helper: is member of board
async function requireBoardMember(boardId, userId) {
  const member = await BoardMember.findOne({ where: { boardId, userId } });
  return !!member;
}

/* =====================
   GET /boards
   - My boards (owner or member)
===================== */
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;

    // find boards where user is a member
    const memberships = await BoardMember.findAll({
      where: { userId },
      attributes: ["boardId", "role"],
    });

    const boardIds = memberships.map((m) => m.boardId);
    if (boardIds.length === 0) return res.json({ boards: [] });

    const boards = await Board.findAll({
      where: { boardId: boardIds },
      order: [["createdAt", "DESC"]],
    });

    return res.json({ boards });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =====================
   POST /boards
   - Create board
   - Add creator as owner in board_members
   - Create default columns
===================== */
router.post("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const data = createBoardSchema.parse(req.body);

    const board = await Board.create({
      name: data.name,
      ownerId: userId,
    });

    await BoardMember.create({
      boardId: board.boardId,
      userId,
      role: "owner",
    });

    // default columns
    const defaults = [
      { name: "To Do", position: 0 },
      { name: "Doing", position: 1 },
      { name: "Done", position: 2 },
    ];

    const createdColumns = [];
    for (const c of defaults) {
      const col = await BoardColumn.create({
        boardId: board.boardId,
        name: c.name,
        position: c.position,
      });
      createdColumns.push(col);
    }

    await logActivity({
      actorUserId: userId,
      boardId: board.boardId,
      entityType: "board",
      entityId: board.boardId,
      action: "BOARD_CREATED",
      meta: { name: board.name },
      req,
    });

    return res.status(201).json({ board, columns: createdColumns });
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ message: "Validation error", issues: err.issues });
    }
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =====================
   GET /boards/:boardId
   - Board details (basic) + columns
===================== */
router.get("/:boardId", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const boardId = Number(req.params.boardId);

    if (!(await requireBoardMember(boardId, userId))) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const board = await Board.findByPk(boardId);
    if (!board) return res.status(404).json({ message: "Board not found" });

    const columns = await BoardColumn.findAll({
      where: { boardId },
      order: [["position", "ASC"]],
    });

    return res.json({ board, columns });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =====================
   GET /boards/:boardId/full
   - Board + columns + tasks + assignees + comments
===================== */
router.get("/:boardId/full", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const boardId = Number(req.params.boardId);

    if (!(await requireBoardMember(boardId, userId))) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const board = await Board.findByPk(boardId);
    if (!board) return res.status(404).json({ message: "Board not found" });

    const columns = await BoardColumn.findAll({
      where: { boardId },
      order: [["position", "ASC"]],
    });

    const columnIds = columns.map((c) => c.columnId);

    const tasks = columnIds.length
      ? await Task.findAll({
          where: { columnId: columnIds },
          order: [["columnId", "ASC"], ["position", "ASC"]],
        })
      : [];

    const taskIds = tasks.map((t) => t.taskId);

    const assignees = taskIds.length
      ? await TaskAssignee.findAll({ where: { taskId: taskIds } })
      : [];

    const comments = taskIds.length
      ? await TaskComment.findAll({
          where: { taskId: taskIds },
          order: [["createdAt", "ASC"]],
        })
      : [];

    return res.json({ board, columns, tasks, assignees, comments });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =====================
   PATCH /boards/:boardId
   - Rename board
===================== */
router.patch("/:boardId", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const boardId = Number(req.params.boardId);

    const data = renameBoardSchema.parse(req.body);

    const board = await Board.findByPk(boardId);
    if (!board) return res.status(404).json({ message: "Board not found" });

    // Only owner can rename
    const member = await BoardMember.findOne({ where: { boardId, userId } });
    if (!member || member.role !== "owner") {
      return res.status(403).json({ message: "Only owner can rename the board" });
    }

    const oldName = board.name;
    await board.update({ name: data.name });

    await logActivity({
      actorUserId: userId,
      boardId,
      entityType: "board",
      entityId: boardId,
      action: "BOARD_RENAMED",
      meta: { from: oldName, to: board.name },
      req,
    });

    return res.json({ board });
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ message: "Validation error", issues: err.issues });
    }
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =====================
   DELETE /boards/:boardId
   - Delete board (owner only)
===================== */
router.delete("/:boardId", requireAuth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userId = req.user.userId;
    const boardId = Number(req.params.boardId);

    const member = await BoardMember.findOne({ where: { boardId, userId }, transaction: t });
    if (!member || member.role !== "owner") {
      await t.rollback();
      return res.status(403).json({ message: "Only owner can delete the board" });
    }

    // fetch columns
    const columns = await BoardColumn.findAll({ where: { boardId }, transaction: t });
    const columnIds = columns.map((c) => c.columnId);

    // fetch tasks
    const tasks = columnIds.length
      ? await Task.findAll({ where: { columnId: columnIds }, transaction: t })
      : [];
    const taskIds = tasks.map((x) => x.taskId);

    // delete dependents (order matters)
    if (taskIds.length) {
      await TaskAssignee.destroy({ where: { taskId: taskIds }, transaction: t });
      await TaskComment.destroy({ where: { taskId: taskIds }, transaction: t });
      await Task.destroy({ where: { taskId: taskIds }, transaction: t });
    }

    await BoardColumn.destroy({ where: { boardId }, transaction: t });
    await BoardMember.destroy({ where: { boardId }, transaction: t });

    await logActivity({
      actorUserId: userId,
      boardId,
      entityType: "board",
      entityId: boardId,
      action: "BOARD_DELETED",
      meta: null,
      req,
    });

    await Board.destroy({ where: { boardId }, transaction: t });

    await t.commit();
    return res.json({ message: "Board deleted" });
  } catch (err) {
    await t.rollback();
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
