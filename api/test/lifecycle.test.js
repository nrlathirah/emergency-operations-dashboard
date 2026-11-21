import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { Op } from "sequelize";
import { setupApp, login, auth, ADMIN, KKM_STAFF, PDRM_STAFF } from "./helpers.js";
import { Case, Vehicle } from "#models/index.js";
import { advanceCaseLifecycles } from "#services/lifecycle.service.js";

let app;
let adminToken;

beforeAll(async () => {
  app = await setupApp();
  adminToken = await login(app, ADMIN);
});

const HOUR = 60 * 60 * 1000;
// One lifecycle check far enough in the "future" to pass any single stage
// (max 20s) but well short of the 30-minute stale threshold.
const tickLater = () => advanceCaseLifecycles(Date.now() + 25_000);

describe("simulated case lifecycle", () => {
  it("walks a simulated case from open to closed and frees its vehicle", async () => {
    const pdrmToken = await login(app, PDRM_STAFF);
    const res = await request(app).post("/api/cases/simulate").set(auth(pdrmToken));
    expect(res.status).toBe(201);

    const created = await Case.findOne({ where: { caseNumber: res.body.data.caseNumber } });
    expect(created.status).toBe("open");
    expect((await Vehicle.findByPk(created.vehicleId)).status).toBe("dispatched");

    const seen = [];
    for (let i = 0; i < 4; i++) {
      await tickLater();
      seen.push((await Case.findByPk(created.id)).status);
    }
    expect(seen).toEqual(["dispatched", "en_route", "on_scene", "closed"]);
    expect((await Vehicle.findByPk(created.vehicleId)).status).toBe("available");
  });

  it("does nothing before a stage's time is up", async () => {
    const pdrmToken = await login(app, PDRM_STAFF);
    const res = await request(app).post("/api/cases/simulate").set(auth(pdrmToken));
    await advanceCaseLifecycles(Date.now() + 2_000); // open lasts 8s
    expect((await Case.findOne({ where: { caseNumber: res.body.data.caseNumber } })).status).toBe("open");
  });
});

describe("recovery after a restart or long outage", () => {
  it("closes stuck cases with a believable resolution time, not months", async () => {
    // A case caught mid-lifecycle, then frozen since long ago — exactly what
    // the old in-memory timers left behind after a restart.
    const pdrmToken = await login(app, PDRM_STAFF);
    const res = await request(app).post("/api/cases/simulate").set(auth(pdrmToken));
    const stuck = await Case.findOne({ where: { caseNumber: res.body.data.caseNumber } });
    await tickLater();
    await tickLater(); // now en_route
    const longAgo = new Date(Date.now() - 100 * 24 * HOUR);
    await Case.update({ createdAt: longAgo, updatedAt: longAgo }, { where: { id: stuck.id }, silent: true });

    await advanceCaseLifecycles();

    const recovered = await Case.findByPk(stuck.id);
    expect(recovered.status).toBe("closed");
    const resolutionMin = (recovered.updatedAt - recovered.createdAt) / 60000;
    expect(resolutionMin).toBeGreaterThanOrEqual(0);
    expect(resolutionMin).toBeLessThanOrEqual(240);
  });

  it("frees vehicles left busy with no active case", async () => {
    const vehicle = await Vehicle.findOne({ where: { status: "available" } });
    await vehicle.update({ status: "busy" });
    await advanceCaseLifecycles();
    expect((await Vehicle.findByPk(vehicle.id)).status).toBe("available");
  });

  it("lets every agency simulate again once stuck cases are recovered", async () => {
    // Freeze every remaining self-running case far in the past, then recover.
    await Case.update(
      { updatedAt: new Date(Date.now() - 100 * 24 * HOUR) },
      { where: { status: ["dispatched", "en_route", "on_scene"] }, silent: true }
    );
    await advanceCaseLifecycles();

    // Two back-to-back simulations per agency, without waiting for either to
    // finish — each needs its own free unit.
    for (const email of [KKM_STAFF, PDRM_STAFF, "faizal.anuar@jbpm.gov.my"]) {
      const token = await login(app, email);
      for (let i = 0; i < 2; i++) {
        const res = await request(app).post("/api/cases/simulate").set(auth(token));
        expect(res.status, `${email} simulation ${i + 1}: ${res.body.message}`).toBe(201);
      }
    }
  });
});

describe("dispatch queue when every unit is busy", () => {
  it("queues new cases instead of failing, then dispatches them in order as units free up", async () => {
    const kkmToken = await login(app, KKM_STAFF);
    const simulate = () => request(app).post("/api/cases/simulate").set(auth(kkmToken));

    // Keep simulating until KKM runs out of free units.
    let res;
    for (let i = 0; i < 8; i++) {
      res = await simulate();
      expect(res.status).toBe(201);
      if (res.body.data.queued) break;
    }
    expect(res.body.data).toMatchObject({ agencyCode: "KKM", queued: true, queuePosition: 1 });
    const first = await Case.findOne({ where: { caseNumber: res.body.data.caseNumber } });
    expect(first).toMatchObject({ status: "open", vehicleId: null });

    const second = await simulate();
    expect(second.body.data).toMatchObject({ queued: true, queuePosition: 2 });

    // A queued case isn't moved along by the lifecycle while it waits.
    // Keep ticking: units finish their cases, free up, and are sent to the
    // queue oldest-first until everything has been handled.
    let firstAssignedAt = null;
    let secondAssignedAt = null;
    for (let i = 0; i < 20; i++) {
      await tickLater();
      const [a, b] = await Promise.all([Case.findByPk(first.id), Case.findOne({ where: { caseNumber: second.body.data.caseNumber } })]);
      if (a.vehicleId && firstAssignedAt === null) firstAssignedAt = i;
      if (b.vehicleId && secondAssignedAt === null) secondAssignedAt = i;
      if (a.status === "closed" && b.status === "closed") break;
    }
    // First come, first served: the earlier case is never sent a unit after
    // the later one (both in the same tick is fine — two units freed up).
    expect(firstAssignedAt).not.toBeNull();
    expect(secondAssignedAt).not.toBeNull();
    expect(firstAssignedAt).toBeLessThanOrEqual(secondAssignedAt);
    expect((await Case.findByPk(first.id)).status).toBe("closed");
    expect((await Case.findOne({ where: { caseNumber: second.body.data.caseNumber } })).status).toBe("closed");
    expect(await Case.count({ where: { status: "open", vehicleId: null } })).toBe(0);
  });

  it("caps the queue so a script can't grow it forever", async () => {
    const kkmToken = await login(app, KKM_STAFF);
    let last;
    for (let i = 0; i < 20; i++) {
      last = await request(app).post("/api/cases/simulate").set(auth(kkmToken));
      if (last.status !== 201) break;
    }
    expect(last.status).toBe(400);
    expect(last.body.message).toMatch(/waiting for a unit/);
    expect(await Case.count({ where: { status: "open", vehicleId: null } })).toBe(10);
  });
});
