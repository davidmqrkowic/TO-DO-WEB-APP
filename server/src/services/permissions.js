import { Op } from "sequelize";
import {
  BoardMember,
  BoardColumn,
  Task,
  Friend,
  Board,
} from "../models/index.js";

export async function isBoardMember(boardId, userId) {
  const m = await BoardMember.findOne({ where: { boardId, userId } });
  return !!m;
}

export async function requireBoardMemberOrThrow(boardId, userId) {
  const ok = await isBoardMember(boardId, userId);
  if (!ok) {
    const err = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
}

export async function requireBoardOwnerOrThrow(boardId, userId) {
  const m = await BoardMember.findOne({ where: { boardId, userId } });
  if (!m || m.role !== "owner") {
    const err = new Error("Only owner can perform this action");
    err.status = 403;
    throw err;
  }
}

export async function getBoardIdByColumnId(columnId) {
  const col = await BoardColumn.findByPk(columnId, { attributes: ["boardId"] });
  return col ? col.boardId : null;
}

export async function getBoardIdByTaskId(taskId) {
  const task = await Task.findByPk(taskId, { attributes: ["columnId"] });
  if (!task) return null;
  return getBoardIdByColumnId(task.columnId);
}

export async function requireAcceptedFriendshipOrThrow(userA, userB) {
  // accepted in either direction
  const f = await Friend.findOne({
    where: {
      status: "accepted",
      [Op.or]: [
        { requesterId: userA, addresseeId: userB },
        { requesterId: userB, addresseeId: userA },
      ],
    },
  });

  if (!f) {
    const err = new Error("You can only add accepted friends");
    err.status = 403;
    throw err;
  }
}

export async function requireBoardExistsOrThrow(boardId) {
  const b = await Board.findByPk(boardId);
  if (!b) {
    const err = new Error("Board not found");
    err.status = 404;
    throw err;
  }
  return b;
}
