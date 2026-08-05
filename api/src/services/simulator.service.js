import { Vehicle, Case, Station } from "#models/index.js";

// How far along the station->incident line the vehicle sits at each stage
// (0 = exactly at the station, 1 = exactly at the incident). Each is a fixed
// point, not time-based, so every status has one stable, comparable position.
// OPEN_FRACTION is nonzero (not exactly 0) so the vehicle renders as a
// distinct pin next to the station instead of stacking exactly on top of it
// and visually hiding the station marker underneath.
const OPEN_FRACTION = 0.05; // just off the station, not yet moving
const DISPATCHED_FRACTION = 0.15; // just pulling away from the station
const EN_ROUTE_FRACTION = 0.5; // roughly the midpoint of the journey
const ON_SCENE_FRACTION = 0.95; // essentially at the incident

// If a vehicle is referenced by more than one active case (e.g. an "open"
// case pointing to its nearest vehicle, while that same vehicle is also
// genuinely dispatched to a different case), the more advanced status wins —
// the vehicle can only physically be in one place.
const STATUS_PRIORITY = { on_scene: 4, en_route: 3, dispatched: 2, open: 1 };

const interpolate = (start, end, fraction) => ({
  latitude: start.latitude + (end.latitude - start.latitude) * fraction,
  longitude: start.longitude + (end.longitude - start.longitude) * fraction,
});

const positionForCase = (caseRecord, station) => {
  const incident = { latitude: caseRecord.latitude, longitude: caseRecord.longitude };

  switch (caseRecord.status) {
    case "open":
      return interpolate(station, incident, OPEN_FRACTION);
    case "dispatched":
      return interpolate(station, incident, DISPATCHED_FRACTION);
    case "en_route":
      return interpolate(station, incident, EN_ROUTE_FRACTION);
    case "on_scene":
      return interpolate(station, incident, ON_SCENE_FRACTION);
    default:
      return { latitude: station.latitude, longitude: station.longitude };
  }
};

// A position only differs meaningfully if it moved more than this — guards
// against rewriting the DB every tick over floating-point noise.
const POSITION_EPSILON = 0.00001;
const hasMoved = (vehicle, position) =>
  Math.abs(vehicle.latitude - position.latitude) > POSITION_EPSILON ||
  Math.abs(vehicle.longitude - position.longitude) > POSITION_EPSILON;

// Places each active case's linked vehicle deterministically along the
// station -> incident line, based purely on the case's current status — not
// randomly wandering, and not time-based. This guarantees the vehicle can
// never stray outside a station/incident focus area (an interpolated point
// always stays within the bounds of its two endpoints), and gives each
// status a single, stable, easily comparable position.
const positionVehicles = async () => {
  const activeCases = await Case.findAll({
    where: { status: ["open", "dispatched", "en_route", "on_scene"] },
    include: [{ model: Vehicle, include: [Station] }],
  });

  const caseByVehicle = new Map();
  for (const caseRecord of activeCases) {
    const vehicle = caseRecord.Vehicle;
    if (!vehicle || !vehicle.Station || vehicle.status === "offline") continue;

    const existing = caseByVehicle.get(vehicle.id);
    if (!existing || STATUS_PRIORITY[caseRecord.status] > STATUS_PRIORITY[existing.status]) {
      caseByVehicle.set(vehicle.id, caseRecord);
    }
  }

  // Skip the write (and the log) entirely once a vehicle already sits at the
  // position its case's status implies — a case's status rarely changes
  // between ticks, so most ticks would otherwise rewrite identical rows.
  let movedCount = 0;
  for (const caseRecord of caseByVehicle.values()) {
    const vehicle = caseRecord.Vehicle;
    const position = positionForCase(caseRecord, vehicle.Station);
    if (!hasMoved(vehicle, position)) continue;
    await vehicle.update(position);
    movedCount++;
  }

  if (movedCount > 0) {
    console.log(`Simulator tick: repositioned ${movedCount} vehicle(s)`);
  }
};

export const startVehicleSimulator = (intervalMs = 3000) => {
  setInterval(async () => {
    await positionVehicles();
  }, intervalMs);
};
