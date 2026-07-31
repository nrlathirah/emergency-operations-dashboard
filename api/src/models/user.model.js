import { DataTypes } from "sequelize";
import bcrypt from "bcryptjs";
import { sequelize } from "#config/database.js";

export const User = sequelize.define(
  "User",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: false, defaultValue: "staff" }, // staff (agency-scoped), super_admin (all agencies)
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
