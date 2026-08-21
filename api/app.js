// Must be the very first import — ES module imports are hoisted and
// evaluated in order before this file's own code runs, so this needs to
// execute before #models/index.js (which reads process.env.DATABASE_URL
// at import time via database.js) is evaluated. A later `dotenv.config()`
// call further down would be too late for that check.
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { syncDatabase, Agency } from "#models/index.js";
import { seedDatabase } from "./src/seed.js";
import { startVehicleSimulator } from "#services/simulator.service.js";
import { mountRoutes } from "./src/routes/index.js";
import { generalLimiter } from "#middlewares/rateLimit.middleware.js";
import { notFound, errorHandler } from "#middlewares/errorHandler.middleware.js";

const app = express();
const PORT = process.env.PORT || 4000;

// Unset (the local-dev default) means "there is no proxy in front of this
// process" — Express then reads req.ip straight off the raw socket, which
// is correct locally. Once deployed behind a reverse proxy (Render,
// Railway, Fly.io, nginx — nearly every real host puts exactly one hop in
// front), that same default instead makes req.ip resolve to the PROXY's
// address for every single visitor: the login/reset/simulate rate limiters
// above key on req.ip, so everyone would silently share one bucket — one
// person's lockout is everyone's lockout, and it stops meaningfully
// limiting anyone at all. Set TRUST_PROXY=1 in that environment (trust
// exactly one hop) to fix it; leave it unset for local dev.
if (process.env.TRUST_PROXY) {
  const value = process.env.TRUST_PROXY;
  app.set("trust proxy", /^\d+$/.test(value) ? Number(value) : value);
}

app.use(helmet());

// Defaults to the Vite dev server — set CORS_ORIGIN (comma-separated for
// more than one) once this is actually deployed somewhere. A bare cors()
// with no options reflects whatever Origin the request sends, which is
// fine for a local-only demo but not something to carry into production
// unnoticed.
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173").split(",").map((o) => o.trim());
app.use(cors({ origin: allowedOrigins }));

app.use(express.json({ limit: "100kb" }));
app.use(generalLimiter);

app.get("/", (req, res) => {
  res.send("Emergency Operations Dashboard API is running");
});

mountRoutes(app);
app.use(notFound);
app.use(errorHandler);

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
