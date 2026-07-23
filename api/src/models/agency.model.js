import { DataTypes } from "sequelize";
import { sequelize } from "#config/database.js";

export const Agency = sequelize.define("Agency", {
  code: { type: DataTypes.STRING, allowNull: false, unique: true }, // KKM, PDRM, JBPM
  name: { type: DataTypes.STRING, allowNull: false },
});