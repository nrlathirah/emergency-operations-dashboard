import { Op } from "sequelize";
import { Agency, Vehicle, Station, Case } from "#models/index.js";
import { generateCaseForDay } from "#utils/caseGenerator.js";

// Must match the report trend charts' own bucketing (see toDateKey in
// report.service.js) so "day N has enough data" here means the same thing
// it means there.
const toDateKey = (date) => new Date(date).toISOString().slice(0, 10);

const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS_BACK = 90; // matches the longest fixed preset on the Reports date-range picker (see DateRangePicker.vue)
const TARGET_PER_AGENCY_PER_DAY = 1; // roughly the density enrichReportData.mjs originally seeded (80 cases / 90 days)
// Kept well beyond DAYS_BACK so pruning never touches a day any chart preset
// can actually select (the longest is 90d) — this is purely about not
// letting the table grow forever, not about how far back charts can look.
const RETENTION_DAYS = 120;

// caseNumber is globally unique, so the next number for an agency must be
// derived from what's actually still in the table (its current max), not a
// row count — pruneOldClosedCases (below) deletes old rows, which would
// make a count-based sequence collide with a number already used earlier.
const nextSeqForAgency = async (agency, year) => {
  const prefix = `${agency.code}${year}`;
  const latest = await Case.findOne({
    where: { agencyId: agency.id, caseNumber: { [Op.like]: `${prefix}%` } },
    order: [["caseNumber", "DESC"]],
    attributes: ["caseNumber"],
  });
  return latest ? parseInt(latest.caseNumber.slice(prefix.length), 10) + 1 : 1;
};

// The Reports trend charts (getCasesTrend / getResponseTimeTrend) bucket
// cases by calendar day across a window ending "now" — a window that keeps
// sliding forward every day. The original historical dataset was a one-off
// script run once, so without this, every day after that run permanently
// reads as zero and the charts flatten out more and more over time.
//
// This tops up any day in the last DAYS_BACK that has fewer than
// TARGET_PER_AGENCY_PER_DAY closed cases for a given agency. It's cheap to
// call repeatedly: a day that already meets the target is left untouched,
// so after the first run this only ever has to fill in the handful of days
// since it last ran.
export const ensureHistoricalCoverage = async () => {
  const agencies = await Agency.findAll();
  if (agencies.length === 0) return;

  const year = new Date().getFullYear();
  const windowStart = new Date(Date.now() - DAYS_BACK * DAY_MS);
  const newCases = [];

  for (const agency of agencies) {
    const [stations, vehicles, existingClosedCases, seqStart] = await Promise.all([
      Station.findAll({ where: { agencyId: agency.id } }),
      Vehicle.findAll({ where: { agencyId: agency.id } }),
      Case.findAll({
        where: { agencyId: agency.id, status: "closed", createdAt: { [Op.gte]: windowStart } },
        attributes: ["createdAt"],
      }),
      nextSeqForAgency(agency, year),
    ]);
    if (stations.length === 0) continue;

    const countByDay = {};
    existingClosedCases.forEach((c) => {
      const key = toDateKey(c.createdAt);
      countByDay[key] = (countByDay[key] || 0) + 1;
    });

    let seq = seqStart;
    for (let i = 0; i < DAYS_BACK; i++) {
      const dateKey = toDateKey(new Date(windowStart.getTime() + i * DAY_MS));
      const have = countByDay[dateKey] || 0;
      for (let j = have; j < TARGET_PER_AGENCY_PER_DAY; j++) {
        newCases.push(generateCaseForDay({ agency, stations, vehicles, dateKey, seq: seq++, year }));
      }
    }
  }

  if (newCases.length > 0) {
    await Case.bulkCreate(newCases, { silent: true });
    console.log(`Report backfill: added ${newCases.length} historical case(s) to keep trend charts populated.`);
  }
};

// Deletes closed cases older than RETENTION_DAYS so the table doesn't grow
// forever as ensureHistoricalCoverage keeps adding a day's worth of rows
// every day — old rows fall out of every chart's usable range long before
// they're pruned (the longest preset is 90d), so this never affects what's
// visible on the site.
export const pruneOldClosedCases = async () => {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * DAY_MS);
  const deleted = await Case.destroy({ where: { status: "closed", createdAt: { [Op.lt]: cutoff } } });
  if (deleted > 0) console.log(`Report backfill: pruned ${deleted} closed case(s) older than ${RETENTION_DAYS} days.`);
};

const runBackfillCycle = async () => {
  await ensureHistoricalCoverage();
  await pruneOldClosedCases();
};

// Runs the check once immediately, then on a recurring interval — covers
// both deployment shapes this app runs under: a free-tier host that sleeps
// and restarts often (each restart alone would keep things fresh) and a
// long-lived process that never restarts (which needs the interval instead).
export const startReportBackfillJob = (intervalMs = 12 * 60 * 60 * 1000) => {
  runBackfillCycle().catch((err) => console.error("Report backfill failed:", err));
  setInterval(() => {
    runBackfillCycle().catch((err) => console.error("Report backfill failed:", err));
  }, intervalMs);
};
