import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

export const BoardColumn = sequelize.define(
  "BoardColumn",
  {
    columnId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    boardId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "board_columns",
    timestamps: true,
    updatedAt: false,
  }
);
