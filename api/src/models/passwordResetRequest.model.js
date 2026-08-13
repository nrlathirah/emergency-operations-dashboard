import { DataTypes } from "sequelize";
import { sequelize } from "#config/database.js";

// A user who forgot their password submits one of these (no auth needed —
// that's the whole point). An admin sees it in the Users page and resolves
// it by issuing a new temporary password, same as a direct reset.
export const PasswordResetRequest = sequelize.define("PasswordResetRequest", {
  email: { type: DataTypes.STRING, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: true },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: "pending" }, // pending, resolved, dismissed
  resolvedAt: { type: DataTypes.DATE, allowNull: true },
  resolvedBy: { type: DataTypes.INTEGER, allowNull: true },
});
