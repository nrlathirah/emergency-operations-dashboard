import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { setupApp, login, auth, ADMIN, KKM_STAFF, PDRM_STAFF } from "./helpers.js";

let app;
let adminToken;
let kkmToken;

beforeAll(async () => {
  app = await setupApp();
  adminToken = await login(app, ADMIN);
  kkmToken = await login(app, KKM_STAFF);
});

const agencyCodes = (cases) => new Set(cases.map((c) => c.Agency?.code));

describe("agency scoping", () => {
  it("lets the super admin see every agency's cases", async () => {
    const res = await request(app).get("/api/cases").set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(agencyCodes(res.body.data)).toEqual(new Set(["KKM", "PDRM", "JBPM"]));
  });

  it("limits staff to their own agency", async () => {
    const res = await request(app).get("/api/cases").set(auth(kkmToken));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(agencyCodes(res.body.data)).toEqual(new Set(["KKM"]));
  });

  it("ignores a staff member's attempt to ask for another agency", async () => {
    const res = await request(app).get("/api/cases").query({ agency: "PDRM" }).set(auth(kkmToken));
    expect(agencyCodes(res.body.data)).toEqual(new Set(["KKM"]));
  });

  it("scopes vehicles the same way", async () => {
    const res = await request(app).get("/api/vehicles").set(auth(kkmToken));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(new Set(res.body.data.map((v) => v.Agency?.code))).toEqual(new Set(["KKM"]));
  });
});

describe("super-admin-only endpoints", () => {
  for (const [method, path] of [
    ["get", "/api/users"],
    ["get", "/api/users/audit-log"],
    ["get", "/api/users/export"],
    ["post", "/api/users"],
  ]) {
    it(`refuses staff on ${method.toUpperCase()} ${path}`, async () => {
      const res = await request(app)[method](path).set(auth(kkmToken)).send({});
      expect(res.status).toBe(403);
    });
  }
});

describe("dispatch", () => {
  it("stops staff from dispatching another agency's case", async () => {
    const all = await request(app).get("/api/cases").set(auth(adminToken));
    const pdrmOpenCase = all.body.data.find((c) => c.Agency?.code === "PDRM" && c.status === "open");
    expect(pdrmOpenCase).toBeDefined();

    const res = await request(app)
      .patch(`/api/cases/${pdrmOpenCase.id}/dispatch`)
      .set(auth(kkmToken))
      .send({ vehicleId: pdrmOpenCase.vehicleId || 1 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not authorized/i);
  });

  it("lets the owning agency dispatch an open case to an available vehicle", async () => {
    const pdrmToken = await login(app, PDRM_STAFF);
    const cases = await request(app).get("/api/cases").set(auth(pdrmToken));
    const openCase = cases.body.data.find((c) => c.status === "open");
    const vehicles = await request(app).get("/api/vehicles").set(auth(pdrmToken));
    const available = vehicles.body.data.find((v) => v.status === "available");
    expect(openCase && available).toBeTruthy();

    const res = await request(app).patch(`/api/cases/${openCase.id}/dispatch`).set(auth(pdrmToken)).send({ vehicleId: available.id });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("dispatched");
  });
});
