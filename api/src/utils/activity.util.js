// Tracks whether anyone is actually using the site, so background jobs that
// hit the database (the vehicle simulator every 3s, the hourly report
// backfill) can pause while nobody is around. That lets a serverless
// database like Neon auto-suspend and stay inside its free compute
// allowance, even when an uptime monitor keeps this server itself awake.
// An uptime ping to "/" never counts as activity — see createApp.js.

const IDLE_AFTER_MS = 10 * 60 * 1000;

// Boot counts as activity: whoever (or whatever) woke the server is likely
// about to make a request, and it gives the startup jobs a normal first run.
let lastActivityAt = Date.now();
const wakeListeners = [];

export const isActive = () => Date.now() - lastActivityAt < IDLE_AFTER_MS;

// Called on every /api request. On the first request after an idle period,
// notifies listeners (e.g. the report backfill catching up on hours it
// skipped) so the site is fully current right away for that visitor.
export const markActivity = () => {
  const wasIdle = !isActive();
  lastActivityAt = Date.now();
  if (wasIdle) {
    console.log("Activity resumed — background jobs waking up.");
    for (const listener of wakeListeners) {
      Promise.resolve()
        .then(listener)
        .catch((err) => console.error("Wake listener failed:", err));
    }
  }
};

export const onWake = (listener) => {
  wakeListeners.push(listener);
};
