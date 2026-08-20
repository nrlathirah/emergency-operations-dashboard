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
    lastLoginAt: { type: DataTypes.DATE, allowNull: true },
    // Quick-login buttons on the login page (see ui LoginPage.vue) expose
    // this account's credentials publicly for portfolio demoing — the
    // self-service forgot-password flow must never be able to touch it,
    // or any visitor could change the shared demo password for everyone.
    isDemoAccount: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    // Stamped into every JWT at login and checked by auth.middleware.js on
    // every request. Bumping it (see beforeUpdate below) makes every token
    // issued before that moment fail verification immediately, instead of
    // staying valid until its own 8h expiry — the only way to actually
    // revoke a JWT already handed out, since the token itself can't be
    // un-issued.
    tokenVersion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
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
        // Any credential/access change invalidates tokens already handed
        // out for this account — a shared login being deactivated or reset
        // should cut off whoever else is still using it, not just whoever
        // logs in next.
        if (user.changed("password") || (user.changed("status") && user.status === "inactive")) {
          user.tokenVersion += 1;
        }
      },
    },
  }
);
