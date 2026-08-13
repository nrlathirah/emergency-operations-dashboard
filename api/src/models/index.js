import { sequelize } from "#config/database.js";
import { Agency } from "#models/agency.model.js";
import { Vehicle } from "#models/vehicle.model.js";
import { Case } from "#models/case.model.js";
import { User } from "#models/user.model.js";
import { Station } from "#models/station.model.js";
import { AuditLog } from "#models/auditLog.model.js";
import { PasswordResetRequest } from "#models/passwordResetRequest.model.js";

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

User.hasMany(AuditLog, { foreignKey: "actorId", as: "ActionsPerformed" });
AuditLog.belongsTo(User, { foreignKey: "actorId", as: "Actor" });
AuditLog.belongsTo(User, { foreignKey: "targetUserId", as: "Target" });

User.hasMany(PasswordResetRequest, { foreignKey: "userId" });
PasswordResetRequest.belongsTo(User, { foreignKey: "userId", as: "User" });
PasswordResetRequest.belongsTo(User, { foreignKey: "resolvedBy", as: "ResolvedByUser" });

// Targeted, idempotent column additions for the existing production Users
// table. plain sync() below only creates tables that don't exist yet — it
// never alters an existing one, so new columns need to be added explicitly.
// Postgres-only (`ADD COLUMN IF NOT EXISTS` isn't SQLite syntax); local dev
// already handles schema changes via a full reseed instead.
//
// Deliberately NOT using sequelize.sync({ alter: true }) here — tested it
// locally against a pre-existing table with a foreign key on it, and it
// crashed trying to DROP TABLE to work around a column change, blocked by
// the FK constraint. alter:true's blast radius (it reconciles the *entire*
// schema, not just what actually changed) makes it unsafe to run against
// production on every boot.
const migrateUserColumns = async () => {
  // Check the dialect the `sequelize` instance actually bound to (not
  // process.env.DATABASE_URL directly) — database.js decides that at
  // import time, before app.js's dotenv.config() call has necessarily run,
  // so the env var can disagree with what `sequelize` really is.
  if (sequelize.getDialect() !== "postgres") return;

  const [[{ exists }]] = await sequelize.query(`
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Users') AS exists;
  `);
  if (!exists) return; // fresh DB — sync() below creates the table with every column already

  await sequelize.query(`
    ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT true;
  `);
  await sequelize.query(`
    ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP WITH TIME ZONE;
  `);
  await sequelize.query(`
    ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "isDemoAccount" BOOLEAN NOT NULL DEFAULT false;
  `);

  // The column above defaults every pre-existing row to false — including
  // the real quick-login accounts, which would otherwise leave the demo
  // protections (see passwordResetRequest.service.js, user.service.js)
  // silently inactive for them. Re-flag them explicitly; safe to repeat.
  // Keep this list in sync with ui LoginPage.vue's quickLoginRoles.
  await sequelize.query(
    `UPDATE "Users" SET "isDemoAccount" = true WHERE email IN (:emails);`,
    {
      replacements: {
        emails: [
          "admin@ops.gov.my",
          "ahmad.razak@kkm.gov.my",
          "zul.hassan@pdrm.gov.my",
          "faizal.anuar@jbpm.gov.my",
        ],
      },
    }
  );
};

export const syncDatabase = async () => {
  await migrateUserColumns();
  await sequelize.sync();
  console.log("Database synced");
};

export { sequelize, Agency, Vehicle, Case, User, Station, AuditLog, PasswordResetRequest };
