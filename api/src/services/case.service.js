import { Op } from "sequelize";
import { Case, Agency, Vehicle, Station } from "#models/index.js";

const ALLOWED_SORT_FIELDS = ["caseNumber", "category", "priority", "status", "createdAt"];
const CLOSED_RETENTION_MS = 24 * 60 * 60 * 1000;

// Both bounds must be given together — a lopsided range (only a start, or
// only an end) is more likely a half-filled picker than an intentional
// open-ended query, so it's treated as "no range" rather than guessed at.
const dateRangeWhere = (startDate, endDate) => {
  if (!startDate || !endDate) return null;
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999); // inclusive of the whole end day, not just midnight
  return { [Op.between]: [new Date(startDate), end] };
};

export const getAllCases = async ({ agencyCode, status, sort, order, includeAll, startDate, endDate, search, category, priority } = {}) => {
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
  if (category) where.category = category;
  if (priority) where.priority = priority;
  const createdAtRange = dateRangeWhere(startDate, endDate);
  if (createdAtRange) where.createdAt = createdAtRange;
  // Only safe to add a second Op.or (search) when the status-less branch
  // above didn't already claim the Op.or key — Reports exports always pass
  // either an explicit status or includeAll, so this never collides there.
  if (search) {
    where[Op.and] = [{ [Op.or]: [{ caseNumber: { [Op.like]: `%${search}%` } }, { location: { [Op.like]: `%${search}%` } }] }];
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
export const getCasesPage = async ({
  agencyCode,
  status,
  sort,
  order,
  page = 1,
  limit = 10,
  startDate,
  endDate,
  search,
  category,
  priority,
} = {}) => {
  const where = {};
  if (status) where.status = status;
  if (category) where.category = category;
  if (priority) where.priority = priority;
  const createdAtRange = dateRangeWhere(startDate, endDate);
  if (createdAtRange) where.createdAt = createdAtRange;
  if (search) {
    where[Op.or] = [
      { caseNumber: { [Op.like]: `%${search}%` } },
      { location: { [Op.like]: `%${search}%` } },
    ];
  }

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

// The real start of a trend chart's "All time" — lets a trend window mean
// "since the first case on record" instead of an arbitrary fallback that
// silently caps at N days while still being labeled "All time."
export const getEarliestCaseDate = async ({ agencyCode } = {}) => {
  const include = [{ model: Agency, attributes: [] }];
  if (agencyCode) include[0].where = { code: agencyCode };
  const earliest = await Case.findOne({ include, order: [["createdAt", "ASC"]], attributes: ["createdAt"] });
  return earliest ? earliest.createdAt : null;
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

// Vehicles of an agency that are free to take a new case: "available", and
// not referenced by any unfinished case — so a vehicle is never claimed by
// two active cases at once.
export const findFreeVehicles = async (agencyId) => {
  const busyVehicleIds = (
    await Case.findAll({
      where: { status: { [Op.ne]: "closed" }, vehicleId: { [Op.ne]: null } },
      attributes: ["vehicleId"],
    })
  ).map((c) => c.vehicleId);

  return Vehicle.findAll({
    where: {
      agencyId,
      status: "available",
      id: { [Op.notIn]: busyVehicleIds.length ? busyVehicleIds : [0] },
    },
    include: [Station],
  });
};

// Rough planar distance — plenty to rank vehicles within one city.
const distanceSq = (a, b) => {
  const dLat = a.latitude - b.latitude;
  const dLng = (a.longitude - b.longitude) * Math.cos((a.latitude * Math.PI) / 180);
  return dLat * dLat + dLng * dLng;
};

export const nearestVehicle = (vehicles, point) =>
  vehicles.reduce((best, v) => (!best || distanceSq(v, point) < distanceSq(best, point) ? v : best), null);

// Claiming a vehicle (status "dispatched") is what marks a case as
// self-running: lifecycle.service.js then walks it open -> dispatched ->
// en_route -> on_scene -> closed on every simulator tick, from the database,
// so it survives restarts. A case that's still waiting in the queue
// (open, no vehicle) is assigned a unit there too, as soon as one frees up.
export const claimVehicleForCase = async (caseRecord, vehicle) => {
  const [claimed] = await Case.update(
    { vehicleId: vehicle.id },
    { where: { id: caseRecord.id, status: "open", vehicleId: null } }
  );
  if (claimed) await vehicle.update({ status: "dispatched" });
  return claimed > 0;
};

// How many cases an agency may have waiting for a unit at once. The queue
// drains at several cases a minute, so this is only ever reached by
// scripted spamming — it just stops the queue growing without bound.
const MAX_QUEUED_PER_AGENCY = 10;

// Never fails just because every unit is out — like a real dispatch centre,
// the incident is still logged and joins a queue ("Awaiting unit"); the
// nearest unit to free up is sent automatically.
export const simulateNewCase = async ({ requesterRole, requesterAgencyCode }) => {
  const agencyCode = requesterRole === "super_admin" ? pick(AGENCY_CODES) : requesterAgencyCode;

  const agency = await Agency.findOne({ where: { code: agencyCode } });
  if (!agency) {
    throw new Error("Agency not found");
  }

  const queuedCount = await Case.count({ where: { agencyId: agency.id, status: "open", vehicleId: null } });

  const freeVehicles = (await findFreeVehicles(agency.id)).filter((v) => v.Station);
  const vehicle = queuedCount === 0 ? pick(freeVehicles.length ? freeVehicles : [null]) : null; // never jump the queue

  if (!vehicle && queuedCount >= MAX_QUEUED_PER_AGENCY) {
    throw new Error(`${agencyCode} already has ${queuedCount} cases waiting for a unit — give it a minute to catch up`);
  }

  // Place the incident near the responding vehicle's station, or — when it
  // has to queue — near any of the agency's stations.
  const station = vehicle?.Station || pick(await Station.findAll({ where: { agencyId: agency.id } }));
  if (!station) {
    throw new Error(`No ${agencyCode} stations found`);
  }

  const { latitude, longitude } = jitterFromStation(station);
  const caseRecord = await Case.create({
    agencyId: agency.id,
    caseNumber: await nextCaseNumber(agencyCode),
    category: pick(CATEGORY_POOL[agencyCode]),
    priority: pick(PRIORITY_POOL),
    location: `Jalan ${pick(STREET_NAMES)}, ${STATION_DISTRICTS[station.code] || "Kuala Lumpur"}`,
    latitude,
    longitude,
    // Assigned in the same insert, so the queue-assignment tick can never
    // see this case as "waiting" and hand it a second vehicle.
    vehicleId: vehicle?.id ?? null,
  });

  // Claimed immediately (not at the +8s "dispatched" step) so a second
  // simulate click can't pick the same vehicle in the meantime.
  if (vehicle) await vehicle.update({ status: "dispatched" });

  return {
    caseNumber: caseRecord.caseNumber,
    agencyCode,
    queued: !vehicle,
    queuePosition: vehicle ? null : queuedCount + 1,
  };
};
