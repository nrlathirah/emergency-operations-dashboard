import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { setupApp, login, auth, PDRM_STAFF } from "./helpers.js";
import { Case, Vehicle } from "#models/index.js";
import { advanceCaseLifecycles } from "#services/lifecycle.service.js";

// Dispatch is always automatic: no case ever waits for a person to press a
// button. These run against a fresh seed, before anything else has moved
// the seed's starter "open" cases along.

let app;

beforeAll(async () => {
  app = await setupApp();
});

const tickLater = () => advanceCaseLifecycles(Date.now() + 25_000);

describe("automatic dispatch of open cases", () => {
  it("sends a unit to a starter open case on its own and runs it to closed", async () => {
    const starter = await Case.findOne({ where: { status: "open" }, include: [{ model: Vehicle }] });
    expect(starter).toBeTruthy();
    expect(starter.Vehicle.status).toBe("available"); // only a suggestion — not claimed

    await tickLater(); // queued + assigned a unit
    const assigned = await Case.findByPk(starter.id);
    expect(assigned.vehicleId).not.toBeNull();
    expect((await Vehicle.findByPk(assigned.vehicleId)).status).toBe("dispatched");

    for (let i = 0; i < 4; i++) await tickLater();
    expect((await Case.findByPk(starter.id)).status).toBe("closed");
  });

  it("closes an open case nobody dispatched for ages, with a believable resolution time", async () => {
    // Like the live demo's 5 Aug starter cases: open for months.
    const pdrmToken = await login(app, PDRM_STAFF);
    const res = await request(app).post("/api/cases/simulate").set(auth(pdrmToken));
    const c = await Case.findOne({ where: { caseNumber: res.body.data.caseNumber } });
    await Vehicle.update({ status: "available" }, { where: { id: c.vehicleId } }); // unclaimed suggestion
    const longAgo = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
    await Case.update({ createdAt: longAgo, updatedAt: longAgo }, { where: { id: c.id }, silent: true });

    await advanceCaseLifecycles();

    const recovered = await Case.findByPk(c.id);
    expect(recovered.status).toBe("closed");
    const resolutionMin = (recovered.updatedAt - recovered.createdAt) / 60000;
    expect(resolutionMin).toBeGreaterThanOrEqual(0);
    expect(resolutionMin).toBeLessThanOrEqual(240);
  });

  it("leaves no open case without a unit once units are free", async () => {
    for (let i = 0; i < 6; i++) await tickLater();
    const open = await Case.findAll({ where: { status: "open" }, include: [{ model: Vehicle }] });
    expect(open.filter((c) => c.Vehicle?.status !== "dispatched")).toHaveLength(0);
  });
});
