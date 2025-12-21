import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

export const ActivityLog = sequelize.define(
  "ActivityLog",
  {
    activityId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    actorUserId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    boardId: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    entityType: {
      type: DataTypes.STRING(30), // board|column|task|comment|member|friend|auth
      allowNull: false,
    },
    entityId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    meta: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    ip: {
      type: DataTypes.STRING(60),
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.STRING(300),
      allowNull: true,
    },
  },
  {
    tableName: "activity_log",
    timestamps: true,
    updatedAt: false,
  }
);
