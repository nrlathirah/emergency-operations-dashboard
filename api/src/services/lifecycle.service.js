import { Op } from "sequelize";
import { Case, Vehicle } from "#models/index.js";
import { findFreeVehicles, nearestVehicle, claimVehicleForCase } from "#services/case.service.js";

// Moves active cases through open -> dispatched -> en_route -> on_scene ->
// closed based on how long each has sat in its current status (the row's
// updatedAt), checked on every simulator tick. Replaces the old per-case
// setTimeout chains, which lived only in memory: any server restart
// mid-chain (a deploy, a free-tier sleep) froze the case forever and kept
// its vehicle "busy" for good, until every unit of an agency was stuck and
// "Simulate New Case" could only fail. State now lives entirely in the
// database, so a restart just resumes where things left off.

// Seconds spent in each status before advancing — the same ~63s end-to-end
// timeline the old timers used.
const STAGES = {
  open: { next: "dispatched", afterSec: 8, vehicleStatus: "dispatched" },
  dispatched: { next: "en_route", afterSec: 15, vehicleStatus: "en_route" },
  en_route: { next: "on_scene", afterSec: 20, vehicleStatus: "busy" },
  on_scene: { next: "closed", afterSec: 20, vehicleStatus: "available" },
};

// A case that hasn't moved for this long missed its lifecycle entirely
// (e.g. it was mid-chain when the server went down for hours). Closing it
// with "now" as its close time would record a resolution time of hours or
// months and wreck the average-response-time KPIs, so it's closed instead
// with a plausible resolution time for its priority.
const STALE_AFTER_MS = 30 * 60 * 1000;
const RECOVERY_MINUTES_BY_PRIORITY = { high: [20, 60], medium: [40, 120], low: [60, 240] };

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Dispatch is always automatic — no case ever waits for a person to press a
// button. An "open" case is either already running (its unit is claimed,
// vehicle status "dispatched") or waiting for a unit: no vehicle yet, or
// only a *suggested* one that hasn't actually been claimed (the seed data's
// starter cases). Waiting cases are handed the nearest free unit by
// assignQueuedCases.
const isWaitingForUnit = (caseRecord) =>
  caseRecord.status === "open" && caseRecord.Vehicle?.status !== "dispatched";

const closeAsRecovered = (caseRecord, now) => {
  const [minM, maxM] = RECOVERY_MINUTES_BY_PRIORITY[caseRecord.priority] || [40, 120];
  const closedAt = new Date(new Date(caseRecord.createdAt).getTime() + randomInt(minM, maxM) * 60000);
  // `status` in the where clause = only if nothing else moved it meanwhile.
  return Case.update(
    { status: "closed", updatedAt: closedAt > new Date(now) ? new Date(now) : closedAt },
    { where: { id: caseRecord.id, status: caseRecord.status }, silent: true }
  );
};

export const advanceCaseLifecycles = async (now = Date.now()) => {
  await advanceActiveCases(now);
  await releaseOrphanedVehicles();
  await assignQueuedCases();
};

const advanceActiveCases = async (now) => {
  const activeCases = await Case.findAll({
    where: { status: Object.keys(STAGES) },
    include: [{ model: Vehicle, attributes: ["id", "status"] }],
  });

  for (const caseRecord of activeCases) {
    // A case still waiting for a unit is the queue's job — unless it has
    // waited so long (e.g. the seed's starter cases, or a queue left behind
    // while the site sat idle) that it clearly missed its moment.
    if (isWaitingForUnit(caseRecord)) {
      if (now - new Date(caseRecord.createdAt).getTime() >= STALE_AFTER_MS) await closeAsRecovered(caseRecord, now);
      continue;
    }

    const stage = STAGES[caseRecord.status];
    const idleMs = now - new Date(caseRecord.updatedAt).getTime();

    if (idleMs >= STALE_AFTER_MS) {
      await closeAsRecovered(caseRecord, now);
      continue;
    }

    if (idleMs < stage.afterSec * 1000) continue;

    const [moved] = await Case.update({ status: stage.next }, { where: { id: caseRecord.id, status: caseRecord.status } });
    if (moved && caseRecord.vehicleId) {
      await Vehicle.update({ status: stage.vehicleStatus }, { where: { id: caseRecord.vehicleId, status: { [Op.ne]: "offline" } } });
    }
  }
};

// Cases waiting for a unit (see isWaitingForUnit). Whenever units are free,
// the longest-waiting case gets the nearest one, first come first served,
// per agency. Its updatedAt is bumped by the assignment, so the usual
// ~1-minute lifecycle starts from the moment a unit is actually sent.
const assignQueuedCases = async () => {
  const open = await Case.findAll({
    where: { status: "open" },
    include: [{ model: Vehicle, attributes: ["id", "status"] }],
    order: [["createdAt", "ASC"]],
  });
  const queued = open.filter(isWaitingForUnit);
  if (queued.length === 0) return;

  // A merely *suggested* vehicle isn't a claim — drop it, so the case
  // queues like any other and the suggested unit stays free for whoever
  // is first in line (possibly this very case).
  for (const caseRecord of queued) {
    if (caseRecord.vehicleId) {
      await Case.update({ vehicleId: null }, { where: { id: caseRecord.id, status: "open", vehicleId: caseRecord.vehicleId } });
      caseRecord.vehicleId = null;
    }
  }

  const freeByAgency = new Map();
  for (const caseRecord of queued) {
    if (!freeByAgency.has(caseRecord.agencyId)) {
      freeByAgency.set(caseRecord.agencyId, await findFreeVehicles(caseRecord.agencyId));
    }
    const free = freeByAgency.get(caseRecord.agencyId);
    const vehicle = nearestVehicle(free, caseRecord);
    if (!vehicle) continue; // this agency is still fully busy — keep waiting

    if (await claimVehicleForCase(caseRecord, vehicle)) {
      free.splice(free.indexOf(vehicle), 1);
    }
  }
};

// Any vehicle still marked dispatched/en_route/busy that no case is
// actually using is stuck from an earlier crash or recovery — free it.
// "Using" means a case already under way or one that has claimed it; an
// open case merely *suggesting* it doesn't hold it.
const releaseOrphanedVehicles = async () => {
  const holders = await Case.findAll({
    where: { status: Object.keys(STAGES), vehicleId: { [Op.ne]: null } },
    attributes: ["vehicleId", "status"],
    include: [{ model: Vehicle, attributes: ["status"] }],
  });
  const inUse = holders.filter((c) => !isWaitingForUnit(c)).map((c) => c.vehicleId);

  await Vehicle.update(
    { status: "available" },
    {
      where: {
        status: ["dispatched", "en_route", "busy"],
        ...(inUse.length ? { id: { [Op.notIn]: inUse } } : {}),
      },
    }
  );
};
