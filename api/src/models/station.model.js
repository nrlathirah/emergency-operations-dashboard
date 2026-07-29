import { DataTypes } from "sequelize";
import { sequelize } from "#config/database.js";

export const Station = sequelize.define("Station", {
  name: { type: DataTypes.STRING, allowNull: false },
  code: { type: DataTypes.STRING, allowNull: false, unique: true },
  type: { type: DataTypes.STRING, allowNull: false }, // hospital, police_station, fire_station
  latitude: { type: DataTypes.FLOAT, allowNull: false },
  longitude: { type: DataTypes.FLOAT, allowNull: false },
});
