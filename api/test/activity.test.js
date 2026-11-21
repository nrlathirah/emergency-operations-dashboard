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

  it("does not count an uptime ping to / as activity, but does count /api requests", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const { isActive } = await loadActivity();
    const { createApp } = await import("../src/createApp.js");
    const app = createApp();

    vi.setSystemTime(Date.now() + 11 * 60 * 1000);
    expect(isActive()).toBe(false);

    const ping = await request(app).get("/");
    expect(ping.status).toBe(200);
    expect(isActive()).toBe(false);

    await request(app).get("/api/cases"); // 401 without a token, but still a real visitor
    expect(isActive()).toBe(true);
  });
});
