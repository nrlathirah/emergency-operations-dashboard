import { Op } from "sequelize";
import { Agency, Vehicle, Station, Case } from "#models/index.js";
import { generateCaseForDay } from "#utils/caseGenerator.js";
import { isActive, onWake } from "#utils/activity.util.js";

// Must match the report trend charts' own bucketing (see toDateKey in
// report.service.js) so "day N has enough data" here means the same thing
// it means there.
const toDateKey = (date) => new Date(date).toISOString().slice(0, 10);

const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS_BACK = 90; // matches the longest fixed preset on the Reports date-range picker (see DateRangePicker.vue)
// Typical daily volume per agency — the actual per-day target varies around
// this (see dailyTarget below) so the trend charts look like real traffic
// instead of a flat line.
const BASE_PER_DAY = { KKM: 4, PDRM: 3, JBPM: 2 };
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

// Deterministic pseudo-random number in [0, 1) for a given string — the same
// day+agency always gets the same target, so re-running the backfill (every
// hour, on every restart) never keeps piling more cases onto a day that was
// already filled. Math.random() here would make each run pick a new, likely
// higher, target for days already topped up.
const hashUnit = (str) => {
  let h = 2166136261; // FNV-1a
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
};

// How many closed cases a given agency "should" have on a given day: a base
// rate, a weekday rhythm (busier Fri/Sat, quieter Sun/Mon), day-to-day noise,
// and an occasional incident spike — so the chart has believable ups, downs
// and peaks. Never below 1, so no day ever reads as an outage.
const dailyTarget = (agencyCode, dateKey) => {
  const base = BASE_PER_DAY[agencyCode] ?? 2;
  const weekday = new Date(`${dateKey}T00:00:00Z`).getUTCDay(); // 0 = Sun
  const weekdayFactor = [0.8, 0.85, 1, 1, 1.1, 1.3, 1.25][weekday];
  const noise = 0.6 + hashUnit(`${dateKey}:${agencyCode}:noise`) * 0.8; // 0.6–1.4
  const spike = hashUnit(`${dateKey}:${agencyCode}:spike`) < 0.06 ? 2.5 : 1; // ~2 spike days a month
  return Math.max(1, Math.round(base * weekdayFactor * noise * spike));
};

// The Reports trend charts (getCasesTrend / getResponseTimeTrend) bucket
// cases by calendar day across a window ending "now" — a window that keeps
// sliding forward every day. The original historical dataset was a one-off
// script run once, so without this, every day after that run permanently
// reads as zero and the charts flatten out more and more over time.
//
// This tops up any day in the last DAYS_BACK (today included) that has
// fewer closed cases than its dailyTarget for a given agency. Today only
// gets the share of its target for the hours already elapsed, with times
// no later than now, so it grows through the day instead of reading as
// zero until tomorrow. It's cheap to
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
    const now = Date.now();
    const todayKey = toDateKey(now);
    for (let i = 0; i <= DAYS_BACK; i++) {
      const dateKey = toDateKey(new Date(windowStart.getTime() + i * DAY_MS));
      if (dateKey > todayKey) break;
      const isToday = dateKey === todayKey;
      const fullTarget = dailyTarget(agency.code, dateKey);
      const elapsedFraction = isToday ? (now - new Date(`${dateKey}T00:00:00Z`).getTime()) / DAY_MS : 1;
      const target = Math.floor(fullTarget * elapsedFraction);
      const have = countByDay[dateKey] || 0;
      for (let j = have; j < target; j++) {
        newCases.push(
          generateCaseForDay({ agency, stations, vehicles, dateKey, seq: seq++, year, latestMs: isToday ? now : undefined })
        );
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
// Hourly so today's count keeps climbing through the day — each run is a
// handful of cheap queries and usually inserts 0–3 rows. Skipped while the
// site is idle (so the database can sleep); the first visitor after an idle
// spell triggers an immediate catch-up run instead, so reports are already
// current by the time their page loads. A run never overlaps another.
const RUN_EVERY_MS = 60 * 60 * 1000;
let lastRunAt = 0;
let running = false;

const runIfDue = async ({ force = false } = {}) => {
  if (running || (!force && Date.now() - lastRunAt < RUN_EVERY_MS)) return;
  running = true;
  try {
    await runBackfillCycle();
    lastRunAt = Date.now();
  } catch (err) {
    console.error("Report backfill failed:", err);
  } finally {
    running = false;
  }
};

export const startReportBackfillJob = () => {
  runIfDue({ force: true });
  onWake(() => runIfDue());
  setInterval(() => {
    if (isActive()) runIfDue();
  }, 5 * 60 * 1000);
};
