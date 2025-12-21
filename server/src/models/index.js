import { User } from "./User.js";
import { Board } from "./Board.js";
import { BoardMember } from "./BoardMember.js";
import { BoardColumn } from "./BoardColumn.js";
import { Task } from "./Task.js";
import { TaskAssignee } from "./TaskAssignee.js";
import { TaskComment } from "./TaskComment.js";
import { Friend } from "./Friend.js";
import { ActivityLog } from "./ActivityLog.js";

export function initModels() {
  // Board ownership
  User.hasMany(Board, { foreignKey: "ownerId", as: "ownedBoards" });
  Board.belongsTo(User, { foreignKey: "ownerId", as: "owner" });

  // Board members (M:N)
  Board.belongsToMany(User, {
    through: BoardMember,
    foreignKey: "boardId",
    otherKey: "userId",
    as: "members",
  });
  User.belongsToMany(Board, {
    through: BoardMember,
    foreignKey: "userId",
    otherKey: "boardId",
    as: "boards",
  });

  // Board -> Columns
  Board.hasMany(BoardColumn, { foreignKey: "boardId", as: "columns" });
  BoardColumn.belongsTo(Board, { foreignKey: "boardId", as: "board" });

  // Column -> Tasks
  BoardColumn.hasMany(Task, { foreignKey: "columnId", as: "tasks" });
  Task.belongsTo(BoardColumn, { foreignKey: "columnId", as: "column" });

  // Task creator
  User.hasMany(Task, { foreignKey: "createdByUserId", as: "createdTasks" });
  Task.belongsTo(User, { foreignKey: "createdByUserId", as: "createdBy" });

  // Task assignees (M:N)
  Task.belongsToMany(User, {
    through: TaskAssignee,
    foreignKey: "taskId",
    otherKey: "userId",
    as: "assignees",
  });
  User.belongsToMany(Task, {
    through: TaskAssignee,
    foreignKey: "userId",
    otherKey: "taskId",
    as: "assignedTasks",
  });

  // Task comments
  Task.hasMany(TaskComment, { foreignKey: "taskId", as: "comments" });
  TaskComment.belongsTo(Task, { foreignKey: "taskId", as: "task" });

  User.hasMany(TaskComment, { foreignKey: "userId", as: "comments" });
  TaskComment.belongsTo(User, { foreignKey: "userId", as: "author" });

  // Friends (self references)
  User.hasMany(Friend, { foreignKey: "requesterId", as: "sentFriendRequests" });
  User.hasMany(Friend, { foreignKey: "addresseeId", as: "receivedFriendRequests" });
  Friend.belongsTo(User, { foreignKey: "requesterId", as: "requester" });
  Friend.belongsTo(User, { foreignKey: "addresseeId", as: "addressee" });

  // Activity log
  User.hasMany(ActivityLog, { foreignKey: "actorUserId", as: "activity" });
  ActivityLog.belongsTo(User, { foreignKey: "actorUserId", as: "actor" });

  Board.hasMany(ActivityLog, { foreignKey: "boardId", as: "activity" });
  ActivityLog.belongsTo(Board, { foreignKey: "boardId", as: "board" });
}

export {
  User,
  Board,
  BoardMember,
  BoardColumn,
  Task,
  TaskAssignee,
  TaskComment,
  Friend,
  ActivityLog,
};
