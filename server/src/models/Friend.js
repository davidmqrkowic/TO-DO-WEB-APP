import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

export const Friend = sequelize.define(
  "Friend",
  {
    friendshipId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    requesterId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    addresseeId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(20), // pending | accepted | rejected | blocked
      allowNull: false,
      defaultValue: "pending",
    },
  },
  {
    tableName: "friends",
    timestamps: true,
  }
);
