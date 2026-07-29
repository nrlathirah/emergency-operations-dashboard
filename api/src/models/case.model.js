import { DataTypes } from "sequelize";
import { sequelize } from "#config/database.js";

export const Case = sequelize.define("Case", {
  caseNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
  category: { type: DataTypes.STRING, allowNull: false }, // e.g. accident, fire, crime
  priority: { type: DataTypes.STRING, allowNull: false, defaultValue: "medium" }, // low, medium, high
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: "open" }, // open, dispatched, en_route, on_scene, closed
  location: { type: DataTypes.STRING, allowNull: false },
  latitude: { type: DataTypes.FLOAT, allowNull: false },
  longitude: { type: DataTypes.FLOAT, allowNull: false },
});