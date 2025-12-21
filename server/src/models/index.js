import { sequelize } from "../config/db.js";
import { User } from "./User.js";

export const db = {
  sequelize,
  User,
};
