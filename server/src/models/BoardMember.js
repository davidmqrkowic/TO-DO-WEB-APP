import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

export const BoardMember = sequelize.define(
  "BoardMember",
  {
    boardId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      allowNull: false,
    },
    userId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING(20), // owner | member
      allowNull: false,
      defaultValue: "member",
    },
  },
  {
    tableName: "board_members",
    timestamps: true,
    updatedAt: false, // samo createdAt je dovoljno
  }
);
