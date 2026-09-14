const CATEGORY_BY_AGENCY = {
  KKM: ["medical", "accident", "cardiac", "respiratory", "trauma", "poisoning"],
  PDRM: ["theft", "traffic", "assault", "burglary", "fraud", "public_disturbance"],
  JBPM: ["fire", "rescue", "flood", "hazmat", "gas_leak", "tree_fall"],
};

// Weighted so "medium" is most common and "high" stays a minority — mirrors
// the rough shape of the hand-written seed cases rather than a flat 1/3 each.
const PRIORITY_POOL = ["low", "low", "low", "medium", "medium", "medium", "medium", "medium", "high", "high"];

// Rough resolution-time bands by priority (minutes) — higher priority cases
// resolve faster on average, so response-time/SLA charts have a real signal
// to show instead of uniform noise.
const RESOLUTION_MINUTES_BY_PRIORITY = {
  high: [20, 60],
  medium: [40, 120],
  low: [60, 240],
};

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const formatCaseNumber = (agencyCode, year, seq) => `${agencyCode}${year}${String(seq).padStart(5, "0")}`;

// Shared by both generators below — everything about a synthetic historical
// case except its createdAt, which each caller derives differently (a random
// offset from now vs. a random moment within one specific calendar day).
const buildClosedCase = ({ agency, stations, vehicles, caseNumber, createdAt }) => {
  const categories = CATEGORY_BY_AGENCY[agency.code] || ["general"];
  const station = randomItem(stations);
  const vehicle = vehicles.length ? randomItem(vehicles) : null;
  const priority = randomItem(PRIORITY_POOL);
  const [minRes, maxRes] = RESOLUTION_MINUTES_BY_PRIORITY[priority];
  const updatedAt = new Date(createdAt.getTime() + randomInt(minRes, maxRes) * 60000);

  return {
    agencyId: agency.id,
    caseNumber,
    category: randomItem(categories),
    priority,
    status: "closed",
    location: `Near ${station.name}`,
    latitude: station.latitude + (Math.random() - 0.5) * 0.04,
    longitude: station.longitude + (Math.random() - 0.5) * 0.04,
    vehicleId: vehicle?.id ?? null,
    createdAt,
    updatedAt,
  };
};

// Generates historical, already-`closed` case records for report/chart data.
// Always "closed" — never "open"/"dispatched"/etc — so the live simulator
// (which only queries active-status cases) can never pick these up, no
// matter when this runs relative to it. `updatedAt` doubles as a resolved-at
// timestamp since the Case model has no dedicated column for one.
export const generateHistoricalCases = ({ agency, stations, vehicles, count, daysBack, startSeq, year = new Date().getFullYear() }) => {
  const cases = [];
  for (let i = 0; i < count; i++) {
    const createdAt = new Date(Date.now() - randomInt(0, daysBack * 24 * 60) * 60000);
    cases.push(buildClosedCase({ agency, stations, vehicles, caseNumber: formatCaseNumber(agency.code, year, startSeq + i), createdAt }));
  }
  return cases;
};

// Same idea, but pinned to one specific calendar day (rather than a random
// offset from "now") — used by the auto-backfill job to top up individual
// days that have fallen short of their target density, instead of only ever
// re-seeding one fixed window relative to whenever it happens to run.
export const generateCaseForDay = ({ agency, stations, vehicles, dateKey, seq, year = new Date().getFullYear() }) => {
  const dayStartMs = new Date(`${dateKey}T00:00:00.000Z`).getTime();
  const createdAt = new Date(dayStartMs + randomInt(0, 23 * 60 + 59) * 60000);
  return buildClosedCase({ agency, stations, vehicles, caseNumber: formatCaseNumber(agency.code, year, seq), createdAt });
};
