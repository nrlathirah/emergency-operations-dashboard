import express from "express";
import cors from "cors";
import helmet from "helmet";
import { mountRoutes } from "./routes/index.js";
import { generalLimiter } from "#middlewares/rateLimit.middleware.js";
import { notFound, errorHandler } from "#middlewares/errorHandler.middleware.js";

// Builds the Express app (middleware + routes) without connecting to the
// database, starting background jobs, or listening on a port — app.js does
// those. Kept separate so the test suite can drive the real app in-process.
export const createApp = () => {
  const app = express();

  // Unset (the local-dev default) means "there is no proxy in front of this
  // process" — Express then reads req.ip straight off the raw socket, which
  // is correct locally. Once deployed behind a reverse proxy (Render,
  // Railway, Fly.io, nginx — nearly every real host puts exactly one hop in
  // front), that same default instead makes req.ip resolve to the PROXY's
  // address for every single visitor: the login/reset/simulate rate limiters
  // key on req.ip, so everyone would silently share one bucket — one
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

  // Health check / keep-alive target for an uptime monitor. It never counts
  // as activity (only authenticated requests do — see auth.middleware.js),
  // so the server stays awake while the database is left alone to sleep.
  app.get("/", (req, res) => {
    res.send("Emergency Operations Dashboard API is running");
  });

  // The README links straight to /api — give anyone who clicks it a useful
  // landing response instead of a bare 404. Everything listed below needs a
  // Bearer token (from POST /api/auth/login) except login itself.
  app.get("/api", (req, res) => {
    res.json({
      name: "Emergency Operations Dashboard API",
      status: "ok",
      dashboard: "https://emergency-operations-dashboard.vercel.app",
      auth: "POST /api/auth/login with { email, password } — then send 'Authorization: Bearer <token>'",
      endpoints: ["/api/auth", "/api/cases", "/api/vehicles", "/api/stations", "/api/reports", "/api/users"],
    });
  });

  mountRoutes(app);
  app.use(notFound);
  app.use(errorHandler);

  return app;
};
