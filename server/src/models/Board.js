import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

export const Board = sequelize.define(
  "Board",
  {
    boardId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    ownerId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
  },
  {
    tableName: "boards",
    timestamps: true,
  }
);
