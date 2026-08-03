import { Vehicle, Case, Station } from "#models/index.js";

// How far along the station->incident line the vehicle sits at each stage
// (0 = exactly at the station, 1 = exactly at the incident). Each is a fixed
// point, not time-based, so every status has one stable, comparable position.
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
      return { latitude: station.latitude, longitude: station.longitude };
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

  for (const caseRecord of caseByVehicle.values()) {
    const vehicle = caseRecord.Vehicle;
    const position = positionForCase(caseRecord, vehicle.Station);
    await vehicle.update(position);
  }

  console.log(`Simulator tick: positioned ${caseByVehicle.size} vehicles`);
};

// Auto-progression (open -> dispatched -> en_route -> on_scene -> closed) is
// intentionally disabled for now — statuses stay exactly as seeded so each
// stage's fixed position can be inspected and compared side by side. Kept
// here, unused, so it's easy to re-enable later for the "living system" demo.
// eslint-disable-next-line no-unused-vars
const progressCaseLifecycle = async () => {
  const DISPATCH_TO_EN_ROUTE_MS = 15000;
  const EN_ROUTE_TO_ON_SCENE_MS = 20000;
  const ON_SCENE_TO_CLOSED_MS = 20000;

  const activeCases = await Case.findAll({
    where: { status: ["dispatched", "en_route", "on_scene"] },
    include: [{ model: Vehicle }],
  });

  for (const caseRecord of activeCases) {
    const elapsedMs = Date.now() - new Date(caseRecord.updatedAt).getTime();
    const vehicle = caseRecord.Vehicle;

    if (caseRecord.status === "dispatched" && elapsedMs > DISPATCH_TO_EN_ROUTE_MS) {
      await caseRecord.update({ status: "en_route" });
      if (vehicle) await vehicle.update({ status: "en_route" });
      console.log(`Case ${caseRecord.caseNumber} -> en_route`);
    } else if (caseRecord.status === "en_route" && elapsedMs > EN_ROUTE_TO_ON_SCENE_MS) {
      await caseRecord.update({ status: "on_scene" });
      if (vehicle) await vehicle.update({ status: "busy" });
      console.log(`Case ${caseRecord.caseNumber} -> on_scene`);
    } else if (caseRecord.status === "on_scene" && elapsedMs > ON_SCENE_TO_CLOSED_MS) {
      await caseRecord.update({ status: "closed" });
      if (vehicle) await vehicle.update({ status: "available" });
      console.log(`Case ${caseRecord.caseNumber} -> closed`);
    }
  }
};

export const startVehicleSimulator = (intervalMs = 3000) => {
  setInterval(async () => {
    await positionVehicles();
  }, intervalMs);
};
