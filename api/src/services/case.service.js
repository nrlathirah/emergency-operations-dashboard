import { Case, Agency, Vehicle } from "#models/index.js";

const ALLOWED_SORT_FIELDS = ["caseNumber", "category", "priority", "status", "createdAt"];

export const getAllCases = async ({ agencyCode, status, sort, order } = {}) => {
  const where = {};
  if (status) where.status = status;

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

  const vehicle = await Vehicle.findByPk(vehicleId);
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
  await vehicle.update({ status: "dispatched" });

  return caseRecord;
};
