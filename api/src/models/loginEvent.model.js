import { DataTypes } from "sequelize";
import { sequelize } from "#config/database.js";

// One row per login attempt (successful or not). The 4 demo accounts are
// shared publicly, so lastLoginAt on Users can't say *who* used them — the
// IP + user agent recorded here is what lets the admin tell their own
// sessions apart from other visitors'. Pruned after a short retention
// window (see loginEvent.service.js) so it never grows unbounded.
export const LoginEvent = sequelize.define("LoginEvent", {
  // Whatever was typed into the login form — kept even when it matches no
  // account, so failed probing attempts are visible too.
  email: { type: DataTypes.STRING, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: true },
  success: { type: DataTypes.BOOLEAN, allowNull: false },
  ip: { type: DataTypes.STRING, allowNull: true },
  userAgent: { type: DataTypes.STRING(500), allowNull: true },
});
