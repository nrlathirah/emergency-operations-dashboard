import { Op } from "sequelize";
import { Case } from "#models/index.js";
import { simulateNewCase } from "#services/case.service.js";

// Keeps the Live Dashboard looking like a real operations centre while
// someone is watching: every so often a new incident comes in on its own and
// runs through the normal automatic dispatch -> close lifecycle. Called from
// the simulator tick, which only runs while a logged-in user has been active
// in the last 10 minutes (see activity.util.js), so it never runs — or wakes
// the database — for an empty site.
//
// Like every simulated case, these are flagged isSimulated: shown on the
// dashboard, excluded from Reports (their ~1-minute "resolution" would drag
// the response-time KPIs down), and deleted 24h after closing.

const MAX_ACTIVE_SIMULATED = 3; // never crowd out a visitor's own "Simulate New Case" clicks
const MIN_GAP_MS = 45 * 1000;
const MAX_GAP_MS = 90 * 1000;
const DAILY_CAP = 60; // hard ceiling on simulated cases per (UTC) day, however busy the site gets
const AGENCY_CODES = ["KKM", "PDRM", "JBPM"];

let nextSpawnAt = 0; // 0 = spawn on the first eligible tick, so a new visitor sees activity quickly

const randomGap = () => MIN_GAP_MS + Math.floor(Math.random() * (MAX_GAP_MS - MIN_GAP_MS + 1));

export const maybeSpawnAmbientCase = async (now = Date.now()) => {
  if (now < nextSpawnAt) return null;

  const activeSimulated = await Case.count({ where: { isSimulated: true, status: { [Op.ne]: "closed" } } });
  if (activeSimulated >= MAX_ACTIVE_SIMULATED) return null; // busy enough — check again next tick

  const dayStart = new Date(now);
  dayStart.setUTCHours(0, 0, 0, 0);
  const simulatedToday = await Case.count({ where: { isSimulated: true, createdAt: { [Op.gte]: dayStart } } });
  if (simulatedToday >= DAILY_CAP) return null;

  nextSpawnAt = now + randomGap();

  // Random agency, but if that one's units are all out, try the others
  // rather than skip the round. allowQueue: false — background traffic only
  // uses genuinely free units, so it never makes a visitor's own case wait
  // in the queue behind it.
  const agencies = [...AGENCY_CODES].sort(() => Math.random() - 0.5);
  for (const agencyCode of agencies) {
    const result = await simulateNewCase({ requesterRole: "staff", requesterAgencyCode: agencyCode, allowQueue: false });
    if (result) return result;
  }
  return null; // every unit everywhere is busy — try again after the next gap
};

// Test hook — restores the "spawn on the next eligible tick" starting state.
export const resetAmbientSchedule = () => {
  nextSpawnAt = 0;
};
