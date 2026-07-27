import { DataTypes } from "sequelize";
import { sequelize } from "#config/database.js";

export const User = sequelize.define("User", {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  role: { type: DataTypes.STRING, allowNull: false, defaultValue: "dispatcher" }, // dispatcher, controller, admin
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: "active" }, // active, inactive
});
