import { DataTypes } from "sequelize";
import { sequelize } from "#config/database.js";

export const Vehicle = sequelize.define("Vehicle", {
  callSign: { type: DataTypes.STRING, allowNull: false },
  type: { type: DataTypes.STRING, allowNull: false }, // ambulance, police_car, fire_truck
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "available", // available, dispatched, en_route, busy, offline
  },
  latitude: { type: DataTypes.FLOAT, allowNull: false },
  longitude: { type: DataTypes.FLOAT, allowNull: false },
});