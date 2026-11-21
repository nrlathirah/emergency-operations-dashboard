import { describe, it, expect, vi, afterEach } from "vitest";
import request from "supertest";

// Fresh module state per test — activity.util.js keeps module-level state.
const loadActivity = async () => {
  vi.resetModules();
  return import("#utils/activity.util.js");
};

afterEach(() => {
  vi.useRealTimers();
});

describe("idle detection", () => {
  it("is active at boot, goes idle after 10 minutes, and wakes on activity", async () => {
    vi.useFakeTimers();
    const { isActive, markActivity, onWake } = await loadActivity();
    const woke = vi.fn();
    onWake(woke);

    expect(isActive()).toBe(true);
    vi.advanceTimersByTime(11 * 60 * 1000);
    expect(isActive()).toBe(false);

    markActivity();
    await vi.runAllTimersAsync();
    expect(isActive()).toBe(true);
    expect(woke).toHaveBeenCalledTimes(1);

    markActivity(); // already active — must not fire wake listeners again
    await vi.runAllTimersAsync();
    expect(woke).toHaveBeenCalledTimes(1);
  });

  it("only counts logged-in requests as activity — not uptime pings, bots or failed logins", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const { isActive } = await loadActivity();
    // Imported after the module reset so the app shares this activity state.
    const { setupApp, login, auth } = await import("./helpers.js");
    const app = await setupApp();
    const token = await login(app, "admin@ops.gov.my");

    vi.setSystemTime(Date.now() + 11 * 60 * 1000);
    expect(isActive()).toBe(false);

    expect((await request(app).get("/")).status).toBe(200); // uptime monitor
    await request(app).get("/api"); // landing page
    await request(app).get("/api/cases"); // no token — 401
    await request(app).get("/api/wp-admin/setup.php"); // typical scanner probe — 404
    await request(app).post("/api/auth/login").send({ email: "bot@example.com", password: "guess" }); // 401
    expect(isActive()).toBe(false);

    expect((await request(app).get("/api/cases").set(auth(token))).status).toBe(200);
    expect(isActive()).toBe(true);
  });
});
