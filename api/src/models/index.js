import { sequelize } from "#config/database.js";
import { Agency } from "#models/agency.model.js";
import { Vehicle } from "#models/vehicle.model.js";
import { Case } from "#models/case.model.js";
import { User } from "#models/user.model.js";
import { Station } from "#models/station.model.js";

Agency.hasMany(Vehicle, { foreignKey: "agencyId" });
Vehicle.belongsTo(Agency, { foreignKey: "agencyId" });

Agency.hasMany(Case, { foreignKey: "agencyId" });
Case.belongsTo(Agency, { foreignKey: "agencyId" });

Vehicle.hasMany(Case, { foreignKey: "vehicleId" });
Case.belongsTo(Vehicle, { foreignKey: "vehicleId" });

Agency.hasMany(User, { foreignKey: "agencyId" });
User.belongsTo(Agency, { foreignKey: "agencyId" });

Agency.hasMany(Station, { foreignKey: "agencyId" });
Station.belongsTo(Agency, { foreignKey: "agencyId" });

Station.hasMany(Vehicle, { foreignKey: "stationId" });
Vehicle.belongsTo(Station, { foreignKey: "stationId" });

export const syncDatabase = async () => {
  await sequelize.sync();
  console.log("Database synced");
};

export { sequelize, Agency, Vehicle, Case, User, Station };
