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
    // True whenever an admin (not the user themselves) is the one who last
    // set the password — created or reset. Forces a mandatory change on next
    // login so the admin's knowledge of the password is only ever temporary.
    mustChangePassword: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
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
      // Without this, updating password via user.update({ password }) would
      // silently store it in plaintext — beforeCreate only covers creation.
      beforeUpdate: async (user) => {
        if (user.changed("password")) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
    },
  }
);
