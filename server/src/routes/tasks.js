// server/src/routes/tasks.js
import express from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { logActivity } from "../services/activityLog.js";
import { requireBoardMemberOrThrow } from "../services/permissions.js";
import { BoardColumn, BoardMember, Task, User, TaskComment, TaskAssignee } from "../models/index.js";

const router = express.Router();

const zId = z.coerce.number().int().positive();

const createTaskSchema = z.object({
  columnId: zId,
  title: z.string().min(1).max(200),
});

const moveTaskSchema = z.object({
  toColumnId: zId,
  newPosition: z.coerce.number().int().min(0).default(0),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(20000).nullable().optional(),
  dueDate: z.string().nullable().optional(),
  done: z.coerce.boolean().optional(),
});

/* =====================
   Helpers
===================== */
async function getBoardIdFromTask(task) {
  const col = await BoardColumn.findByPk(Number(task.columnId));
  return col ? Number(col.boardId) : null;
}

async function getBoardAndColumn(columnId) {
  const col = await BoardColumn.findByPk(Number(columnId));
  if (!col) return { boardId: null, column: null };
  return { boardId: Number(col.boardId), column: col };
}

function pickChangedFields(before, after) {
  const fields = [];
  for (const k of Object.keys(before)) {
    if (before[k] !== after[k]) fields.push(k);
  }
  return fields;
}

function bodyPreview(s, max = 60) {
  const txt = String(s || "").trim().replace(/\s+/g, " ");
  if (!txt) return "";
  return txt.length > max ? `${txt.slice(0, max)}…` : txt;
}

/* =====================
   POST /tasks
===================== */
router.post("/", requireAuth, async (req, res) => {
  try {
    const userId = Number(req.user.userId);
    const data = createTaskSchema.parse(req.body);

    const col = await BoardColumn.findByPk(Number(data.columnId));
    if (!col) {
      return res.status(400).json({
        message: "Invalid task data",
        details: [{ path: ["columnId"], message: "Column not found" }],
      });
    }

    const boardId = Number(col.boardId);
    await requireBoardMemberOrThrow(boardId, userId);

    const task = await Task.create({
      columnId: Number(data.columnId),
      title: data.title,
      createdByUserId: userId,
      position: 0,
    });

    await logActivity({
      req,
      actorUserId: userId,
      boardId,
      entityType: "task",
      entityId: Number(task.taskId),
      action: "task.created",
      meta: {
        taskId: Number(task.taskId),
        title: task.title,
        columnId: Number(col.columnId),
        columnName: col.name,
      },
    });

    return res.json(task);
  } catch (err) {
    console.error("TASK CREATE ERROR:", err);
    return res.status(400).json({
      message: "Invalid task data",
      details: err?.errors ?? err?.message,
    });
  }
});

/* =====================
   PATCH /tasks/:taskId
===================== */
router.patch("/:taskId", requireAuth, async (req, res) => {
  try {
    const userId = Number(req.user.userId);
    const taskId = zId.parse(req.params.taskId);
    const data = updateTaskSchema.parse(req.body);

    const task = await Task.findByPk(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const boardId0 = await getBoardIdFromTask(task);
    if (!boardId0) return res.status(400).json({ message: "Invalid task column" });
    await requireBoardMemberOrThrow(boardId0, userId);

    const before = {
      title: task.title,
      description: task.description ?? null,
      dueDate: task.dueDate ?? null,
      done: !!task.done,
    };

    if (typeof data.title !== "undefined") task.title = data.title;
    if (typeof data.description !== "undefined") task.description = data.description;
    if (typeof data.dueDate !== "undefined") task.dueDate = data.dueDate;
    if (typeof data.done !== "undefined") task.done = data.done;

    await task.save();

    const after = {
      title: task.title,
      description: task.description ?? null,
      dueDate: task.dueDate ?? null,
      done: !!task.done,
    };

    const fields = pickChangedFields(before, after);
    const { boardId, column } = await getBoardAndColumn(task.columnId);

    await logActivity({
      req,
      actorUserId: userId,
      boardId,
      entityType: "task",
      entityId: Number(task.taskId),
      action: "task.updated",
      meta: {
        taskId: Number(task.taskId),
        title: task.title,
        columnId: column ? Number(column.columnId) : Number(task.columnId),
        columnName: column?.name || null,
        fields,
        before,
        after,
      },
    });

    return res.json(task);
  } catch (err) {
    console.error("TASK UPDATE ERROR:", err);
    return res.status(400).json({
      message: "Invalid update data",
      details: err?.errors ?? err?.message,
    });
  }
});

/* =====================
   PATCH /tasks/:taskId/move
===================== */
router.patch("/:taskId/move", requireAuth, async (req, res) => {
  try {
    const userId = Number(req.user.userId);
    const taskId = zId.parse(req.params.taskId);
    const data = moveTaskSchema.parse(req.body);

    const task = await Task.findByPk(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const fromCol = await BoardColumn.findByPk(Number(task.columnId));
    const toCol = await BoardColumn.findByPk(Number(data.toColumnId));

    if (!fromCol || !toCol) return res.status(400).json({ message: "Invalid column(s)" });
    if (Number(fromCol.boardId) !== Number(toCol.boardId)) {
      return res.status(400).json({ message: "Cannot move task across boards" });
    }

    const boardId = Number(toCol.boardId);
    await requireBoardMemberOrThrow(boardId, userId);

    task.columnId = Number(toCol.columnId);
    task.position = Number(data.newPosition ?? 0);
    await task.save();

    await logActivity({
      req,
      actorUserId: userId,
      boardId,
      entityType: "task",
      entityId: Number(task.taskId),
      action: "task.moved",
      meta: {
        taskId: Number(task.taskId),
        title: task.title,
        fromColumnId: Number(fromCol.columnId),
        fromColumnName: fromCol.name,
        toColumnId: Number(toCol.columnId),
        toColumnName: toCol.name,
        newPosition: Number(task.position),
      },
    });

    return res.json(task);
  } catch (err) {
    console.error("TASK MOVE ERROR:", err);
    return res.status(400).json({
      message: "Invalid move data",
      details: err?.errors ?? err?.message,
    });
  }
});

/* =====================
   DELETE /tasks/:taskId
===================== */
router.delete("/:taskId", requireAuth, async (req, res) => {
  try {
    const userId = Number(req.user.userId);
    const taskId = zId.parse(req.params.taskId);

    const task = await Task.findByPk(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const { boardId, column } = await getBoardAndColumn(task.columnId);
    if (!boardId) return res.status(400).json({ message: "Invalid task column" });
    await requireBoardMemberOrThrow(boardId, userId);

    // capture title before destroy
    const title = task.title;

    await task.destroy();

    await logActivity({
      req,
      actorUserId: userId,
      boardId,
      entityType: "task",
      entityId: Number(taskId),
      action: "task.deleted",
      meta: {
        taskId: Number(taskId),
        title,
        columnId: column ? Number(column.columnId) : Number(task.columnId),
        columnName: column?.name || null,
      },
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("TASK DELETE ERROR:", err);
    return res.status(400).json({
      message: "Invalid delete request",
      details: err?.errors ?? err?.message,
    });
  }
});

/* =====================
   GET /tasks/:taskId/assignees
===================== */
router.get("/:taskId/assignees", requireAuth, async (req, res) => {
  try {
    const userId = Number(req.user.userId);
    const taskId = zId.parse(req.params.taskId);

    const task = await Task.findByPk(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const boardId = await getBoardIdFromTask(task);
    if (!boardId) return res.status(400).json({ message: "Invalid task column" });

    await requireBoardMemberOrThrow(boardId, userId);

    const items = await TaskAssignee.findAll({ where: { taskId } });
    return res.json({ userIds: items.map((x) => Number(x.userId)) });
  } catch (err) {
    console.error("ASSIGNEES GET ERROR:", err);
    return res.status(500).json({ message: "Failed to load assignees" });
  }
});

/* =====================
   PUT /tasks/:taskId/assignees
===================== */
router.put("/:taskId/assignees", requireAuth, async (req, res) => {
  try {
    const me = Number(req.user.userId);
    const taskId = zId.parse(req.params.taskId);

    const nextIds = Array.isArray(req.body?.userIds)
      ? [...new Set(req.body.userIds.map((x) => Number(x)).filter(Boolean))]
      : [];

    const task = await Task.findByPk(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const { boardId, column } = await getBoardAndColumn(task.columnId);
    if (!boardId) return res.status(400).json({ message: "Invalid task column" });

    await requireBoardMemberOrThrow(boardId, me);

    // only board members can be assigned
    const memberRows = nextIds.length
      ? await BoardMember.findAll({ where: { boardId, userId: nextIds } })
      : [];
    const validIds = new Set(memberRows.map((m) => Number(m.userId)));
    const filteredNext = nextIds.filter((id) => validIds.has(id));

    const prevRows = await TaskAssignee.findAll({ where: { taskId } });
    const prevIds = prevRows.map((r) => Number(r.userId));

    const prevSet = new Set(prevIds);
    const nextSet = new Set(filteredNext);

    const added = filteredNext.filter((id) => !prevSet.has(id));
    const removed = prevIds.filter((id) => !nextSet.has(id));

    await TaskAssignee.destroy({ where: { taskId } });
    if (filteredNext.length) {
      await TaskAssignee.bulkCreate(filteredNext.map((uid) => ({ taskId, userId: uid })));
    }

    const affectedIds = [...new Set([...added, ...removed])];
    const affectedUsers = affectedIds.length
      ? await User.findAll({
          where: { userId: affectedIds },
          attributes: ["userId", "email", "firstName", "lastName"],
        })
      : [];
    const uMap = new Map(affectedUsers.map((u) => [Number(u.userId), u]));

    for (const uid of added) {
      const u = uMap.get(uid);
      await logActivity({
        req,
        actorUserId: me,
        boardId,
        entityType: "task",
        entityId: Number(task.taskId),
        action: "task.assignee.added",
        meta: {
          taskId: Number(task.taskId),
          title: task.title,
          columnId: column ? Number(column.columnId) : Number(task.columnId),
          columnName: column?.name || null,
          assigneeUserId: uid,
          assigneeEmail: u?.email || null,
          assigneeName: u ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : null,
        },
      });
    }

    for (const uid of removed) {
      const u = uMap.get(uid);
      await logActivity({
        req,
        actorUserId: me,
        boardId,
        entityType: "task",
        entityId: Number(task.taskId),
        action: "task.assignee.removed",
        meta: {
          taskId: Number(task.taskId),
          title: task.title,
          columnId: column ? Number(column.columnId) : Number(task.columnId),
          columnName: column?.name || null,
          assigneeUserId: uid,
          assigneeEmail: u?.email || null,
          assigneeName: u ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : null,
        },
      });
    }

    return res.json({ ok: true, userIds: filteredNext });
  } catch (err) {
    console.error("ASSIGNEES PUT ERROR:", err);
    return res.status(err.status || 500).json({ message: err.message || "Server error" });
  }
});

/* =====================
   GET /tasks/:taskId/comments
===================== */
router.get("/:taskId/comments", requireAuth, async (req, res) => {
  try {
    const userId = Number(req.user.userId);
    const taskId = zId.parse(req.params.taskId);

    const task = await Task.findByPk(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const boardId = await getBoardIdFromTask(task);
    if (!boardId) return res.status(400).json({ message: "Invalid task column" });

    await requireBoardMemberOrThrow(boardId, userId);

    const items = await TaskComment.findAll({
      where: { taskId },
      order: [["createdAt", "ASC"]],
      include: [
        {
          model: User,
          as: "author",
          attributes: ["userId", "email", "firstName", "lastName", "avatarPath"],
        },
      ],
    });

    const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 4001}`;

    const shaped = items.map((c) => ({
      commentId: c.commentId,
      body: c.body,
      createdAt: c.createdAt,
      user: c.author
        ? {
            userId: Number(c.author.userId),
            email: c.author.email,
            firstName: c.author.firstName,
            lastName: c.author.lastName,
            avatarUrl: c.author.avatarPath ? `${appUrl}/${c.author.avatarPath}` : null,
          }
        : null,
    }));

    return res.json({ items: shaped });
  } catch (err) {
    console.error("TASK COMMENTS GET ERROR:", err);
    return res.status(500).json({ message: "Failed to load comments" });
  }
});

/* =====================
   POST /tasks/:taskId/comments
===================== */
router.post("/:taskId/comments", requireAuth, async (req, res) => {
  try {
    const me = Number(req.user.userId);
    const taskId = zId.parse(req.params.taskId);
    const body = String(req.body?.body || "").trim();
    if (!body) return res.status(400).json({ message: "Missing body" });

    const task = await Task.findByPk(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const { boardId, column } = await getBoardAndColumn(task.columnId);
    if (!boardId) return res.status(400).json({ message: "Invalid task column" });

    await requireBoardMemberOrThrow(boardId, me);

    const created = await TaskComment.create({
      taskId: Number(taskId),
      userId: me,
      body,
    });

    await logActivity({
      req,
      actorUserId: me,
      boardId,
      entityType: "comment",
      entityId: Number(created.commentId),
      action: "comment.added",
      meta: {
        taskId: Number(task.taskId),
        title: task.title,
        columnId: column ? Number(column.columnId) : Number(task.columnId),
        columnName: column?.name || null,
        commentId: Number(created.commentId),
        bodyPreview: bodyPreview(body, 70),
      },
    });

    return res.status(201).json({ commentId: created.commentId });
  } catch (err) {
    console.error("TASK COMMENTS POST ERROR:", err);
    return res.status(500).json({ message: "Failed to add comment" });
  }
});

export default router;
