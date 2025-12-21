import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

export const Task = sequelize.define(
  "Task",
  {
    taskId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    columnId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    createdByUserId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
  },
  {
    tableName: "tasks",
    timestamps: true,
  }
);
