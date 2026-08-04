import { Op } from "sequelize";
import { Case, Agency, Vehicle, Station } from "#models/index.js";

const ALLOWED_SORT_FIELDS = ["caseNumber", "category", "priority", "status", "createdAt"];
const CLOSED_RETENTION_MS = 24 * 60 * 60 * 1000;

export const getAllCases = async ({ agencyCode, status, sort, order } = {}) => {
  const where = {};
  if (status) {
    // An explicit status filter (e.g. picked from the dropdown) is a
    // deliberate drill-down — show every matching case, regardless of age.
    where.status = status;
  } else {
    // Default Live Dashboard scope: active cases stay visible no matter how
    // old they are, but closed cases only stick around for 24h afterward —
    // otherwise the list grows unbounded as cases pile up day after day.
    // Older closed cases remain available via the Reports page.
    where[Op.or] = [
      { status: { [Op.ne]: "closed" } },
      { status: "closed", updatedAt: { [Op.gte]: new Date(Date.now() - CLOSED_RETENTION_MS) } },
    ];
  }

  const include = [{ model: Agency, attributes: ["code", "name"] }];
  if (agencyCode) include[0].where = { code: agencyCode };

  const sortField = ALLOWED_SORT_FIELDS.includes(sort) ? sort : "createdAt";
  const sortOrder = order === "ASC" ? "ASC" : "DESC";

  return Case.findAll({ where, include, order: [[sortField, sortOrder]] });
};

export const dispatchCase = async ({ caseId, vehicleId, requesterRole, requesterAgencyCode }) => {
  const caseRecord = await Case.findByPk(caseId, {
    include: [{ model: Agency, attributes: ["code", "name"] }],
  });

  if (!caseRecord) {
    throw new Error("Case not found");
  }

  if (requesterRole !== "super_admin" && caseRecord.Agency?.code !== requesterAgencyCode) {
    throw new Error("Not authorized to dispatch this case");
  }

  if (caseRecord.status !== "open") {
    throw new Error("Only open cases can be dispatched");
  }

  const vehicle = await Vehicle.findByPk(vehicleId, { include: [Station] });
  if (!vehicle) {
    throw new Error("Vehicle not found");
  }
  if (vehicle.status !== "available") {
    throw new Error("Vehicle is not available");
  }
  if (vehicle.agencyId !== caseRecord.agencyId) {
    throw new Error("Vehicle must belong to the same agency as the case");
  }

  await caseRecord.update({ status: "dispatched", vehicleId: vehicle.id });

  // Snap the vehicle back to its station on dispatch — it may have drifted
  // while idle/wandering, but a freshly-dispatched vehicle should visually
  // read as "just leaving the station," not wherever it happened to wander to.
  const updates = { status: "dispatched" };
  if (vehicle.Station) {
    updates.latitude = vehicle.Station.latitude;
    updates.longitude = vehicle.Station.longitude;
  }
  await vehicle.update(updates);

  return caseRecord;
};
