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

// Generates historical, already-`closed` case records for report/chart data.
// Always "closed" — never "open"/"dispatched"/etc — so the live simulator
// (which only queries active-status cases) can never pick these up, no
// matter when this runs relative to it. `updatedAt` doubles as a resolved-at
// timestamp since the Case model has no dedicated column for one.
export const generateHistoricalCases = ({ agency, stations, vehicles, count, daysBack, startSeq, year = new Date().getFullYear() }) => {
  const categories = CATEGORY_BY_AGENCY[agency.code] || ["general"];
  const cases = [];

  for (let i = 0; i < count; i++) {
    const station = randomItem(stations);
    const vehicle = vehicles.length ? randomItem(vehicles) : null;
    const priority = randomItem(PRIORITY_POOL);
    const [minRes, maxRes] = RESOLUTION_MINUTES_BY_PRIORITY[priority];

    const createdAt = new Date(Date.now() - randomInt(0, daysBack * 24 * 60) * 60000);
    const updatedAt = new Date(createdAt.getTime() + randomInt(minRes, maxRes) * 60000);

    cases.push({
      agencyId: agency.id,
      caseNumber: formatCaseNumber(agency.code, year, startSeq + i),
      category: randomItem(categories),
      priority,
      status: "closed",
      location: `Near ${station.name}`,
      latitude: station.latitude + (Math.random() - 0.5) * 0.04,
      longitude: station.longitude + (Math.random() - 0.5) * 0.04,
      vehicleId: vehicle?.id ?? null,
      createdAt,
      updatedAt,
    });
  }

  return cases;
};
