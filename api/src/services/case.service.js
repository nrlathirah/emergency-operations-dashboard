import { Op } from "sequelize";
import { Case, Agency, Vehicle, Station } from "#models/index.js";

const ALLOWED_SORT_FIELDS = ["caseNumber", "category", "priority", "status", "createdAt"];
const CLOSED_RETENTION_MS = 24 * 60 * 60 * 1000;

export const getAllCases = async ({ agencyCode, status, sort, order, includeAll } = {}) => {
  const where = {};
  if (status) {
    // An explicit status filter (e.g. picked from the dropdown) is a
    // deliberate drill-down — show every matching case, regardless of age.
    where.status = status;
  } else if (!includeAll) {
    // Default Live Dashboard scope: active cases stay visible no matter how
    // old they are, but closed cases only stick around for 24h afterward —
    // otherwise the list grows unbounded as cases pile up day after day.
    // Reports pass includeAll to see full retained history instead.
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

// Server-side paginated case listing for the Reports data table — unlike
// getAllCases (used by the Live Dashboard's polling table, which always
// wants the full active/recent set client-side), this can page through the
// entire retained history without shipping hundreds of rows in one response.
export const getCasesPage = async ({ agencyCode, status, sort, order, page = 1, limit = 10 } = {}) => {
  const where = {};
  if (status) where.status = status;

  const include = [{ model: Agency, attributes: ["code", "name"] }];
  if (agencyCode) include[0].where = { code: agencyCode };

  const sortField = ALLOWED_SORT_FIELDS.includes(sort) ? sort : "createdAt";
  const sortOrder = order === "ASC" ? "ASC" : "DESC";

  const { rows, count } = await Case.findAndCountAll({
    where,
    include,
    order: [[sortField, sortOrder]],
    limit,
    offset: (page - 1) * limit,
  });

  return { cases: rows, total: count, page, limit };
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

const STREET_NAMES = ["Melur", "Kenanga", "Bunga Raya", "Damai", "Merdeka", "Sentosa", "Cempaka", "Anggerik", "Teratai", "Angsana"];
const STATION_DISTRICTS = {
  "KKM-HOSP-01": "Kuala Lumpur", "KKM-HOSP-02": "Selayang", "KKM-HOSP-03": "Serdang",
  "PDRM-PS-01": "Kuala Lumpur", "PDRM-PS-02": "Petaling Jaya", "PDRM-PS-03": "Shah Alam",
  "JBPM-FS-01": "Kuala Lumpur", "JBPM-FS-02": "Petaling Jaya", "JBPM-FS-03": "Shah Alam",
};
const CATEGORY_POOL = {
  KKM: ["accident", "medical"],
  PDRM: ["traffic", "theft", "assault"],
  JBPM: ["rescue", "fire"],
};
const PRIORITY_POOL = ["low", "medium", "high"];
const AGENCY_CODES = ["KKM", "PDRM", "JBPM"];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// A point 1-3km from the station in a random direction — plausible incident
// placement near the responding station without needing real street data.
const jitterFromStation = (station) => {
  const km = 1 + Math.random() * 2;
  const angle = Math.random() * 2 * Math.PI;
  const dLat = (km * Math.cos(angle)) / 111.32;
  const dLng = (km * Math.sin(angle)) / (111.32 * Math.cos((station.latitude * Math.PI) / 180));
  return { latitude: station.latitude + dLat, longitude: station.longitude + dLng };
};

const nextCaseNumber = async (agencyCode) => {
  const year = new Date().getFullYear();
  const prefix = `${agencyCode}${year}`;
  const latest = await Case.findOne({
    where: { caseNumber: { [Op.like]: `${prefix}%` } },
    order: [["caseNumber", "DESC"]],
  });
  const nextSeq = latest ? parseInt(latest.caseNumber.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(nextSeq).padStart(5, "0")}`;
};

// Per-case one-shot timers that walk a simulated case through its lifecycle
// (open -> dispatched -> en_route -> on_scene -> closed) and free its
// vehicle again at the end. Deliberately NOT a persistent global loop like
// the old design — each chain is scheduled once, only as a direct result of
// a user clicking "Simulate New Case," and naturally ends after ~60s. If the
// server restarts mid-chain the remaining timers are simply lost and the
// case freezes at its last status — an acceptable tradeoff for a demo
// feature, not worth the complexity of making it resumable.
const scheduleLifecycle = (caseId, vehicleId) => {
  const advance = async (fromStatus, toStatus, vehicleStatus) => {
    const caseRecord = await Case.findByPk(caseId);
    if (!caseRecord || caseRecord.status !== fromStatus) return; // state moved on/gone — don't clobber
    await caseRecord.update({ status: toStatus });
    if (vehicleStatus) {
      const vehicle = await Vehicle.findByPk(vehicleId);
      if (vehicle) await vehicle.update({ status: vehicleStatus });
    }
  };

  setTimeout(() => advance("open", "dispatched", null), 8000); // vehicle already claimed at creation
  setTimeout(() => advance("dispatched", "en_route", "en_route"), 23000);
  setTimeout(() => advance("en_route", "on_scene", "busy"), 43000);
  setTimeout(() => advance("on_scene", "closed", "available"), 63000);
};

export const simulateNewCase = async ({ requesterRole, requesterAgencyCode }) => {
  const agencyCode = requesterRole === "super_admin" ? pick(AGENCY_CODES) : requesterAgencyCode;

  const agency = await Agency.findOne({ where: { code: agencyCode } });
  if (!agency) {
    throw new Error("Agency not found");
  }

  // A vehicle marked "available" can still be referenced by an existing
  // "open" case (that case just hasn't been dispatched yet — see seed.js).
  // Exclude those too, so a vehicle is never claimed by two active cases
  // at once.
  const busyVehicleIds = (
    await Case.findAll({
      where: { status: { [Op.ne]: "closed" }, vehicleId: { [Op.ne]: null } },
      attributes: ["vehicleId"],
    })
  ).map((c) => c.vehicleId);

  const vehicle = await Vehicle.findOne({
    where: {
      agencyId: agency.id,
      status: "available",
      id: { [Op.notIn]: busyVehicleIds.length ? busyVehicleIds : [0] },
    },
    include: [Station],
  });
  if (!vehicle || !vehicle.Station) {
    throw new Error(`All ${agencyCode} units are currently busy — try again shortly`);
  }

  const station = vehicle.Station;
  const { latitude, longitude } = jitterFromStation(station);
  const category = pick(CATEGORY_POOL[agencyCode]);
  const priority = pick(PRIORITY_POOL);
  const district = STATION_DISTRICTS[station.code] || "Kuala Lumpur";
  const location = `Jalan ${pick(STREET_NAMES)}, ${district}`;
  const caseNumber = await nextCaseNumber(agencyCode);

  const caseRecord = await Case.create({
    agencyId: agency.id,
    caseNumber,
    category,
    priority,
    location,
    latitude,
    longitude,
    vehicleId: vehicle.id,
  });

  // Claim the vehicle immediately (not at the +8s "dispatched" step) so a
  // second simulate click can't pick the same vehicle before this case's
  // lifecycle has actually started.
  await vehicle.update({ status: "dispatched" });

  scheduleLifecycle(caseRecord.id, vehicle.id);

  return { caseNumber, agencyCode };
};
