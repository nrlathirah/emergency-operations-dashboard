import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { setupApp, login, auth, ADMIN } from "./helpers.js";
import { parsePagination } from "#utils/pagination.util.js";

let app;
let adminToken;

beforeAll(async () => {
  app = await setupApp();
  adminToken = await login(app, ADMIN);
});

const newUser = (overrides = {}) => ({
  name: "Test Person",
  email: `test.${Math.random().toString(36).slice(2)}@ops.gov.my`,
  password: "password123",
  role: "staff",
  agencyCode: "KKM",
  ...overrides,
});

describe("creating users", () => {
  it("accepts a valid user", async () => {
    const res = await request(app).post("/api/users").set(auth(adminToken)).send(newUser());
    expect(res.status).toBe(201);
    expect(res.body.data.password).toBeUndefined();
  });

  it.each([
    ["an XSS payload in the name", { name: "<svg onload=alert(document.domain)>" }],
    ["a control character in the name", { name: "Bad\u0000Name" }],
    ["an invalid email", { email: "not-an-email" }],
    ["a password under 8 characters", { password: "short" }],
    ["an unknown agency", { agencyCode: "FBI" }],
    ["an unknown role", { role: "god_mode" }],
  ])("rejects %s", async (_label, overrides) => {
    const res = await request(app).post("/api/users").set(auth(adminToken)).send(newUser(overrides));
    expect(res.status).toBe(400);
    expect(res.body.message).toEqual(expect.any(String));
  });

  it("rejects a duplicate email", async () => {
    const user = newUser();
    await request(app).post("/api/users").set(auth(adminToken)).send(user);
    const res = await request(app).post("/api/users").set(auth(adminToken)).send(user);
    expect(res.status).toBe(400);
  });
});

describe("report date ranges", () => {
  it("accepts a normal range", async () => {
    const res = await request(app)
      .get("/api/reports/cases-trend")
      .query({ startDate: "2026-01-01", endDate: "2026-03-31" })
      .set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(90);
  });

  it("works with no range at all", async () => {
    const res = await request(app).get("/api/reports/cases-trend").set(auth(adminToken));
    expect(res.status).toBe(200);
  });

  it("rejects an absurd range that would pin the server", async () => {
    const res = await request(app)
      .get("/api/reports/cases-trend")
      .query({ startDate: "0001-01-01", endDate: "9999-12-31" })
      .set(auth(adminToken));
    expect(res.status).toBe(400);
  });

  it("rejects an unparseable date", async () => {
    const res = await request(app)
      .get("/api/reports/cases-summary")
      .query({ startDate: "yesterday-ish", endDate: "2026-01-01" })
      .set(auth(adminToken));
    expect(res.status).toBe(400);
  });
});

describe("pagination", () => {
  it("clamps page and limit to safe bounds", () => {
    expect(parsePagination({ page: "-5", limit: "1000000" })).toEqual({ page: 1, limit: 100 });
    expect(parsePagination({ page: "abc", limit: "0" }, 10)).toEqual({ page: 1, limit: 10 });
    expect(parsePagination({ page: "3", limit: "25" })).toEqual({ page: 3, limit: 25 });
  });

  it("never returns more than 100 rows, whatever is asked for", async () => {
    const res = await request(app).get("/api/reports/cases-table").query({ limit: 1000000, page: -1 }).set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(100);
    expect(res.body.page).toBe(1);
    expect(res.body.data.length).toBeLessThanOrEqual(100);
  });
});

describe("error handling", () => {
  it("returns JSON 404 for unknown routes", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Not found." });
  });

  it("rejects oversized request bodies", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ email: "a@b.com", password: "x".repeat(200 * 1024) }));
    expect(res.status).toBe(413);
  });
});
