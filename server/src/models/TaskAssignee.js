import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

export const TaskAssignee = sequelize.define(
  "TaskAssignee",
  {
    taskId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      allowNull: false,
    },
    userId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      allowNull: false,
    },
  },
  {
    tableName: "task_assignees",
    timestamps: true,
    updatedAt: false,
  }
);
