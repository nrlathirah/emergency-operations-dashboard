import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import { Op } from "sequelize";
import { setupApp, login, auth, backdateUpdatedAt, ADMIN } from "./helpers.js";
import { sequelize, Case, Vehicle, Agency } from "#models/index.js";
import { maybeSpawnAmbientCase, resetAmbientSchedule } from "#services/ambient.service.js";
import { advanceCaseLifecycles } from "#services/lifecycle.service.js";
import { pruneClosedSimulatedCases } from "#services/reportBackfill.service.js";

let app;
let adminToken;

beforeAll(async () => {
  app = await setupApp();
  adminToken = await login(app, ADMIN);
});

beforeEach(() => resetAmbientSchedule());

const activeSimulated = () => Case.count({ where: { isSimulated: true, status: { [Op.ne]: "closed" } } });
const finishEverything = async () => {
  for (let i = 0; i < 6; i++) await advanceCaseLifecycles(Date.now() + 25_000);
};

describe("background traffic generator", () => {
  it("creates a simulated incident, then waits 45–90s before the next one", async () => {
    const first = await maybeSpawnAmbientCase();
    expect(first).toMatchObject({ queued: false });
    const created = await Case.findOne({ where: { caseNumber: first.caseNumber } });
    expect(created.isSimulated).toBe(true);
    expect(created.vehicleId).not.toBeNull();

    expect(await maybeSpawnAmbientCase(Date.now() + 30_000)).toBeNull(); // too soon
    expect(await maybeSpawnAmbientCase(Date.now() + 91_000)).not.toBeNull(); // gap has passed
    await finishEverything();
  });

  it("never keeps more than 3 simulated cases active at once", async () => {
    for (let i = 0; i < 6; i++) {
      resetAmbientSchedule();
      await maybeSpawnAmbientCase();
    }
    expect(await activeSimulated()).toBe(3);
    await finishEverything();
  });

  it("never queues — skips the round when no unit is free", async () => {
    await Vehicle.update({ status: "busy" }, { where: {} });
    const before = await Case.count();
    expect(await maybeSpawnAmbientCase()).toBeNull();
    expect(await Case.count()).toBe(before);
    await Vehicle.update({ status: "available" }, { where: {} });
  });

  it("stops for the day after 60 simulated cases", async () => {
    const agency = await Agency.findOne();
    await Case.bulkCreate(
      Array.from({ length: 60 }, (_, i) => ({
        agencyId: agency.id,
        caseNumber: `CAP${i}`,
        category: "medical",
        priority: "low",
        status: "closed",
        location: "x",
        latitude: 3.1,
        longitude: 101.7,
        isSimulated: true,
      }))
    );
    expect(await maybeSpawnAmbientCase()).toBeNull();
    await Case.destroy({ where: { caseNumber: { [Op.like]: "CAP%" } } });
  });
});

describe("simulated cases and Reports", () => {
  it("shows a simulated case on the Live Dashboard but keeps it out of Reports", async () => {
    const res = await request(app).post("/api/cases/simulate").set(auth(adminToken));
    const { caseNumber } = res.body.data;
    await finishEverything(); // closes in about a minute of simulated time

    const dashboard = await request(app).get("/api/cases").set(auth(adminToken));
    expect(dashboard.body.data.some((c) => c.caseNumber === caseNumber)).toBe(true);

    const reportsTable = await request(app).get("/api/reports/cases-table").query({ search: caseNumber }).set(auth(adminToken));
    expect(reportsTable.body.total).toBe(0);
  });

  it("deletes simulated cases 24h after they close, and nothing else", async () => {
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const simulated = await Case.findOne({ where: { isSimulated: true, status: "closed" } });
    const historical = await Case.findOne({ where: { isSimulated: false, status: "closed" } });
    await backdateUpdatedAt(sequelize, [simulated.id, historical.id], twoDaysAgo);

    await pruneClosedSimulatedCases();

    expect(await Case.findByPk(simulated.id)).toBeNull();
    expect(await Case.findByPk(historical.id)).not.toBeNull();
  });
});
