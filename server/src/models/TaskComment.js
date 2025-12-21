import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

export const TaskComment = sequelize.define(
  "TaskComment",
  {
    commentId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    taskId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "task_comments",
    timestamps: true,
  }
);
