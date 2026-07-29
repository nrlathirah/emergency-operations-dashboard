import { Vehicle, Case } from "#models/index.js";

const BOUNDS = {
  minLat: 3.05, maxLat: 3.25,
  minLng: 101.60, maxLng: 101.80,
};

const MOVE_STEP = 0.0015; // roughly ~150m per tick

const DISPATCH_TO_EN_ROUTE_MS = 15000;
const EN_ROUTE_TO_ON_SCENE_MS = 20000;
const ON_SCENE_TO_CLOSED_MS = 20000;

const randomStep = () => (Math.random() - 0.5) * 2 * MOVE_STEP;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const moveVehicles = async () => {
  const vehicles = await Vehicle.findAll();

  for (const vehicle of vehicles) {
    if (vehicle.status === "offline") continue;

    const newLat = clamp(vehicle.latitude + randomStep(), BOUNDS.minLat, BOUNDS.maxLat);
    const newLng = clamp(vehicle.longitude + randomStep(), BOUNDS.minLng, BOUNDS.maxLng);

    await vehicle.update({ latitude: newLat, longitude: newLng });
  }

  console.log(`Simulator tick: moved ${vehicles.length} vehicles`);
};

const progressCaseLifecycle = async () => {
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
    await moveVehicles();
    await progressCaseLifecycle();
  }, intervalMs);
};
