import { DataTypes } from "sequelize";
import { sequelize } from "#config/database.js";

// Records admin actions on user accounts (create, activate/deactivate, reset
// password) so there's a trail of who did what to whom, and when.
export const AuditLog = sequelize.define("AuditLog", {
  action: { type: DataTypes.STRING, allowNull: false }, // create_user, activate_user, deactivate_user, reset_password
  actorId: { type: DataTypes.INTEGER, allowNull: false },
  targetUserId: { type: DataTypes.INTEGER, allowNull: true },
  detail: { type: DataTypes.STRING, allowNull: true },
});
