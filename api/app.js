// Must be the very first import — ES module imports are hoisted and
// evaluated in order before this file's own code runs, so this needs to
// execute before #models/index.js (which reads process.env.DATABASE_URL
// at import time via database.js) is evaluated. A later `dotenv.config()`
// call further down would be too late for that check.
import "dotenv/config";
import { syncDatabase, Agency } from "#models/index.js";
import { seedDatabase } from "./src/seed.js";
import { startVehicleSimulator } from "#services/simulator.service.js";
import { startReportBackfillJob } from "#services/reportBackfill.service.js";
import { repairDemoData } from "#services/demoIntegrity.service.js";
import { createApp } from "./src/createApp.js";

const PORT = process.env.PORT || 4000;
const app = createApp();

await syncDatabase();

const agencyCount = await Agency.count();
if (agencyCount === 0) {
  console.log("No data found — running initial seed...");
  await seedDatabase();
}

await repairDemoData();

startVehicleSimulator();
startReportBackfillJob();

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
