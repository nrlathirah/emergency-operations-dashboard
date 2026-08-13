// Must be the very first import — ES module imports are hoisted and
// evaluated in order before this file's own code runs, so this needs to
// execute before #models/index.js (which reads process.env.DATABASE_URL
// at import time via database.js) is evaluated. A later `dotenv.config()`
// call further down would be too late for that check.
import "dotenv/config";
import express from "express";
import cors from "cors";
import { syncDatabase, Agency } from "#models/index.js";
import { seedDatabase } from "./src/seed.js";
import { startVehicleSimulator } from "#services/simulator.service.js";
import { mountRoutes } from "./src/routes/index.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Emergency Operations Dashboard API is running");
});

mountRoutes(app);
await syncDatabase();

const agencyCount = await Agency.count();
if (agencyCount === 0) {
  console.log("No data found — running initial seed...");
  await seedDatabase();
}

startVehicleSimulator();

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
