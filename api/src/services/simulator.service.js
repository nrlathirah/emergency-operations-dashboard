import { Vehicle } from "#models/index.js";

const BOUNDS = {
  minLat: 3.05, maxLat: 3.25,
  minLng: 101.60, maxLng: 101.80,
};

const MOVE_STEP = 0.0015; // roughly ~150m per tick

const randomStep = () => (Math.random() - 0.5) * 2 * MOVE_STEP;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const startVehicleSimulator = (intervalMs = 3000) => {
  setInterval(async () => {
    const vehicles = await Vehicle.findAll();

    for (const vehicle of vehicles) {
      if (vehicle.status === "offline") continue;

      const newLat = clamp(vehicle.latitude + randomStep(), BOUNDS.minLat, BOUNDS.maxLat);
      const newLng = clamp(vehicle.longitude + randomStep(), BOUNDS.minLng, BOUNDS.maxLng);

      await vehicle.update({ latitude: newLat, longitude: newLng });
    }

    console.log(`Simulator tick: moved ${vehicles.length} vehicles`);
  }, intervalMs);
};