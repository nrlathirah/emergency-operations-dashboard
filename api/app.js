import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { syncDatabase, Agency } from "#models/index.js";
import { seedDatabase } from "./src/seed.js";
import { startVehicleSimulator } from "#services/simulator.service.js";
import { mountRoutes } from "./src/routes/index.js";

dotenv.config();

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
