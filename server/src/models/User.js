import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

/* =====================
   User Model
===================== */
export const User = sequelize.define(
  "User",
  {
    userId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },

    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },

    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    password: {
      type: DataTypes.STRING(255), // bcrypt hash
      allowNull: false,
    },

    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    admin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    attemptedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "created_at",
    },
    avatarPath: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  },
  {
    tableName: "users",
    timestamps: false, 
  }
);
