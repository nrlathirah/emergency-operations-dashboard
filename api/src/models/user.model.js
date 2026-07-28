import { DataTypes } from "sequelize";
import bcrypt from "bcryptjs";
import { sequelize } from "#config/database.js";

export const User = sequelize.define(
  "User",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: false, defaultValue: "dispatcher" }, // dispatcher, controller, admin, super_admin
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "active" }, // active, inactive
  },
  {
    defaultScope: {
      attributes: { exclude: ["password"] },
    },
    scopes: {
      withPassword: {
        attributes: {},
      },
    },
    hooks: {
      beforeCreate: async (user) => {
        user.password = await bcrypt.hash(user.password, 10);
      },
    },
  }
);
