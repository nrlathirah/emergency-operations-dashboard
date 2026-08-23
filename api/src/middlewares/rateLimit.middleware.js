import rateLimit, { ipKeyGenerator } from "express-rate-limit";

// Applied to every /api request as a floor against generic scraping/abuse —
// loose enough that no normal usage of this dashboard (polling, page loads,
// exports) should ever come close to it.
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again later." },
});

// Login is the classic brute-force target — keyed on IP+email together
// (not IP alone) so one slow attacker working through a list of emails from
// a single IP still gets caught quickly, without also locking out every
// other account sharing that IP (an office NAT, a shared demo machine).
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${(req.body?.email || "").toLowerCase()}`,
  message: { message: "Too many login attempts. Please wait a few minutes and try again." },
});

// Password reset requests are unauthenticated and already return the same
// generic response regardless of outcome (see auth.controller.js) — the
// remaining risk this closes is someone spamming the endpoint to flood the
// admin's Reset Requests queue or hammer the email-lookup query.
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again in an hour." },
});

// "Simulate New Case" is a demo convenience, not a real intake path — worth
// capping so it can't be used to flood the Cases table (and, downstream,
// every chart/export that aggregates it) via a scripted loop.
export const simulateCaseLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${req.user?.id ?? "anon"}`,
  message: { message: "Simulated cases are rate-limited — please slow down." },
});
