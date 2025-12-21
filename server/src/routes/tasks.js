import express from "express";
import { z } from "zod";
import { sequelize } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import {
  BoardColumn,
  Task,
  TaskAssignee,
  TaskComment,
  BoardMember,
  User,
} from "../models/index.js";
import { logActivity } from "../services/activityLog.js";
import {
  requireBoardMemberOrThrow,
  getBoardIdByColumnId,
  getBoardIdByTaskId,
} from "../services/permissions.js";
import { insertAtPosition, normalizePositions } from "../services/ordering.js";

const router = express.Router();

const createTaskSchema = z.object({
  columnId: z.number().int().positive(),
  title: z.string().min(1).max(200),
  description: z.string().max(20000).optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(), // ISO string
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(20000).optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
});

const moveTaskSchema = z.object({
  toColumnId: z.number().int().positive(),
  newPosition: z.number().int().min(0),
});

const addAssigneeSchema = z.object({
  userId: z.number().int().positive(),
});

const addCommentSchema = z.object({
  body: z.string().min(1).max(10000),
});

const editCommentSchema = z.object({
  body: z.string().min(1).max(10000),
});

router.post("/", requireAuth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const actorUserId = req.user.userId;
    const data = createTaskSchema.parse(req.body);

    const col = await BoardColumn.findByPk(data.columnId, { transaction: t });
    if (!col) {
      await t.rollback();
      return res.status(404).json({ message: "Column not found" });
    }

    await requireBoardMemberOrThrow(col.boardId, actorUserId);

    const maxPos = await Task.max("position", { where: { columnId: col.columnId }, transaction: t });
    const position = Number.isFinite(maxPos) ? maxPos + 1 : 0;

    const task = await Task.create(
      {
        columnId: col.columnId,
        title: data.title,
        description: data.description ?? null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        position,
        createdByUserId: actorUserId,
      },
      { transaction: t }
    );

    await logActivity({
      actorUserId,
      boardId: col.boardId,
      entityType: "task",
      entityId: task.taskId,
      action: "TASK_CREATED",
      meta: { title: task.title, columnId: col.columnId, position: task.position },
      req,
    });

    await t.commit();
    return res.status(201).json({ task });
  } catch (err) {
    await t.rollback();
    if (err?.name === "ZodError") return res.status(400).json({ message: "Validation error", issues: err.issues });
    return res.status(err.status || 500).json({ message: err.message || "Server error" });
  }
});

router.patch("/:taskId", requireAuth, async (req, res) => {
  try {
    const actorUserId = req.user.userId;
    const taskId = Number(req.params.taskId);
    const data = updateTaskSchema.parse(req.body);

    const task = await Task.findByPk(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const boardId = await getBoardIdByTaskId(taskId);
    if (!boardId) return res.status(404).json({ message: "Board not found" });

    await requireBoardMemberOrThrow(boardId, actorUserId);

    const before = { title: task.title, description: task.description, dueDate: task.dueDate };

    await task.update({
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.dueDate !== undefined ? { dueDate: data.dueDate ? new Date(data.dueDate) : null } : {}),
    });

    await logActivity({
      actorUserId,
      boardId,
      entityType: "task",
      entityId: task.taskId,
      action: "TASK_UPDATED",
      meta: { before, after: { title: task.title, description: task.description, dueDate: task.dueDate } },
      req,
    });

    return res.json({ task });
  } catch (err) {
    if (err?.name === "ZodError") return res.status(400).json({ message: "Validation error", issues: err.issues });
    return res.status(err.status || 500).json({ message: err.message || "Server error" });
  }
});

router.patch("/:taskId/move", requireAuth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const actorUserId = req.user.userId;
    const taskId = Number(req.params.taskId);
    const data = moveTaskSchema.parse(req.body);

    const task = await Task.findByPk(taskId, { transaction: t });
    if (!task) {
      await t.rollback();
      return res.status(404).json({ message: "Task not found" });
    }

    const fromColumnId = task.columnId;
    const fromBoardId = await getBoardIdByColumnId(fromColumnId);
    if (!fromBoardId) {
      await t.rollback();
      return res.status(404).json({ message: "Board not found" });
    }

    const toCol = await BoardColumn.findByPk(data.toColumnId, { transaction: t });
    if (!toCol) {
      await t.rollback();
      return res.status(404).json({ message: "Target column not found" });
    }

    if (Number(toCol.boardId) !== Number(fromBoardId)) {
      await t.rollback();
      return res.status(400).json({ message: "Cannot move task to another board" });
    }

    await requireBoardMemberOrThrow(fromBoardId, actorUserId);

    const old = { columnId: fromColumnId, position: task.position };

    // Update column first
    await task.update({ columnId: data.toColumnId }, { transaction: t });

    // Reorder in target column
    await insertAtPosition(Task, { columnId: data.toColumnId }, "taskId", "position", task.taskId, data.newPosition, t);

    // Normalize both columns
    await normalizePositions(Task, { columnId: fromColumnId }, "taskId", "position", t);
    await normalizePositions(Task, { columnId: data.toColumnId }, "taskId", "position", t);

    const updated = await Task.findByPk(taskId, { transaction: t });

    await logActivity({
      actorUserId,
      boardId: fromBoardId,
      entityType: "task",
      entityId: task.taskId,
      action: "TASK_MOVED",
      meta: { from: old, to: { columnId: updated.columnId, position: updated.position } },
      req,
    });

    await t.commit();
    return res.json({ task: updated });
  } catch (err) {
    await t.rollback();
    if (err?.name === "ZodError") return res.status(400).json({ message: "Validation error", issues: err.issues });
    return res.status(err.status || 500).json({ message: err.message || "Server error" });
  }
});

router.delete("/:taskId", requireAuth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const actorUserId = req.user.userId;
    const taskId = Number(req.params.taskId);

    const task = await Task.findByPk(taskId, { transaction: t });
    if (!task) {
      await t.rollback();
      return res.status(404).json({ message: "Task not found" });
    }

    const boardId = await getBoardIdByTaskId(taskId);
    await requireBoardMemberOrThrow(boardId, actorUserId);

    await logActivity({
      actorUserId,
      boardId,
      entityType: "task",
      entityId: task.taskId,
      action: "TASK_DELETED",
      meta: { title: task.title },
      req,
    });

    await Task.destroy({ where: { taskId }, transaction: t });
    await normalizePositions(Task, { columnId: task.columnId }, "taskId", "position", t);

    await t.commit();
    return res.json({ message: "Task deleted" });
  } catch (err) {
    await t.rollback();
    return res.status(err.status || 500).json({ message: err.message || "Server error" });
  }
});

/* =====================
   Assignees
===================== */
router.post("/:taskId/assignees", requireAuth, async (req, res) => {
  try {
    const actorUserId = req.user.userId;
    const taskId = Number(req.params.taskId);
    const data = addAssigneeSchema.parse(req.body);

    const boardId = await getBoardIdByTaskId(taskId);
    if (!boardId) return res.status(404).json({ message: "Board not found" });

    await requireBoardMemberOrThrow(boardId, actorUserId);

    // assignee must be member of the board
    const member = await BoardMember.findOne({ where: { boardId, userId: data.userId } });
    if (!member) return res.status(400).json({ message: "Assignee must be a board member" });

    await TaskAssignee.findOrCreate({ where: { taskId, userId: data.userId } });

    await logActivity({
      actorUserId,
      boardId,
      entityType: "task",
      entityId: taskId,
      action: "ASSIGNEE_ADDED",
      meta: { assigneeUserId: data.userId },
      req,
    });

    return res.status(201).json({ message: "Assignee added" });
  } catch (err) {
    if (err?.name === "ZodError") return res.status(400).json({ message: "Validation error", issues: err.issues });
    return res.status(err.status || 500).json({ message: err.message || "Server error" });
  }
});

router.delete("/:taskId/assignees/:userId", requireAuth, async (req, res) => {
  try {
    const actorUserId = req.user.userId;
    const taskId = Number(req.params.taskId);
    const userId = Number(req.params.userId);

    const boardId = await getBoardIdByTaskId(taskId);
    if (!boardId) return res.status(404).json({ message: "Board not found" });

    await requireBoardMemberOrThrow(boardId, actorUserId);

    await TaskAssignee.destroy({ where: { taskId, userId } });

    await logActivity({
      actorUserId,
      boardId,
      entityType: "task",
      entityId: taskId,
      action: "ASSIGNEE_REMOVED",
      meta: { assigneeUserId: userId },
      req,
    });

    return res.json({ message: "Assignee removed" });
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || "Server error" });
  }
});

/* =====================
   Comments
===================== */
router.post("/:taskId/comments", requireAuth, async (req, res) => {
  try {
    const actorUserId = req.user.userId;
    const taskId = Number(req.params.taskId);
    const data = addCommentSchema.parse(req.body);

    const boardId = await getBoardIdByTaskId(taskId);
    if (!boardId) return res.status(404).json({ message: "Board not found" });

    await requireBoardMemberOrThrow(boardId, actorUserId);

    const comment = await TaskComment.create({
      taskId,
      userId: actorUserId,
      body: data.body,
      deletedAt: null,
    });

    await logActivity({
      actorUserId,
      boardId,
      entityType: "comment",
      entityId: comment.commentId,
      action: "COMMENT_ADDED",
      meta: { taskId },
      req,
    });

    return res.status(201).json({ comment });
  } catch (err) {
    if (err?.name === "ZodError") return res.status(400).json({ message: "Validation error", issues: err.issues });
    return res.status(err.status || 500).json({ message: err.message || "Server error" });
  }
});

router.patch("/comments/:commentId", requireAuth, async (req, res) => {
  try {
    const actorUserId = req.user.userId;
    const commentId = Number(req.params.commentId);
    const data = editCommentSchema.parse(req.body);

    const comment = await TaskComment.findByPk(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const boardId = await getBoardIdByTaskId(comment.taskId);
    await requireBoardMemberOrThrow(boardId, actorUserId);

    // only author can edit
    if (Number(comment.userId) !== Number(actorUserId)) {
      return res.status(403).json({ message: "Only author can edit comment" });
    }

    const before = comment.body;
    await comment.update({ body: data.body });

    await logActivity({
      actorUserId,
      boardId,
      entityType: "comment",
      entityId: commentId,
      action: "COMMENT_EDITED",
      meta: { from: before, to: comment.body, taskId: comment.taskId },
      req,
    });

    return res.json({ comment });
  } catch (err) {
    if (err?.name === "ZodError") return res.status(400).json({ message: "Validation error", issues: err.issues });
    return res.status(err.status || 500).json({ message: err.message || "Server error" });
  }
});

router.delete("/comments/:commentId", requireAuth, async (req, res) => {
  try {
    const actorUserId = req.user.userId;
    const commentId = Number(req.params.commentId);

    const comment = await TaskComment.findByPk(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const boardId = await getBoardIdByTaskId(comment.taskId);
    await requireBoardMemberOrThrow(boardId, actorUserId);

    // author can delete (soft)
    if (Number(comment.userId) !== Number(actorUserId)) {
      return res.status(403).json({ message: "Only author can delete comment" });
    }

    await comment.update({ deletedAt: new Date() });

    await logActivity({
      actorUserId,
      boardId,
      entityType: "comment",
      entityId: commentId,
      action: "COMMENT_DELETED",
      meta: { taskId: comment.taskId },
      req,
    });

    return res.json({ message: "Comment deleted" });
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || "Server error" });
  }
});

export default router;
