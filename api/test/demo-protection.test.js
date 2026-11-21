import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { setupApp, login, auth, findUserId, ADMIN, KKM_STAFF, PASSWORD } from "./helpers.js";
import { User } from "#models/index.js";
import { repairDemoData } from "#services/demoIntegrity.service.js";

let app;
let adminToken;
let adminId;

beforeAll(async () => {
  app = await setupApp();
  adminToken = await login(app, ADMIN);
  adminId = await findUserId(app, adminToken, ADMIN);
});

// The super-admin login is public on the live demo — these guards are what
// keep one visitor from breaking it for every visitor after them.
describe("shared demo accounts", () => {
  it("can't be renamed", async () => {
    const res = await request(app).patch(`/api/users/${adminId}/name`).set(auth(adminToken)).send({ name: "Hacked" });
    expect(res.status).toBe(400);
  });

  it("can't be deactivated", async () => {
    const res = await request(app).patch(`/api/users/${adminId}/status`).set(auth(adminToken)).send({ status: "inactive" });
    expect(res.status).toBe(400);
  });

  it("can't have their password reset by an admin", async () => {
    const res = await request(app)
      .patch(`/api/users/${adminId}/reset-password`)
      .set(auth(adminToken))
      .send({ newPassword: "new-password-123" });
    expect(res.status).toBe(400);
  });

  it("can't change their own password or name", async () => {
    const staffToken = await login(app, KKM_STAFF);
    const pw = await request(app)
      .patch("/api/users/me/password")
      .set(auth(staffToken))
      .send({ currentPassword: PASSWORD, newPassword: "new-password-123" });
    expect(pw.status).toBe(400);
    const name = await request(app).patch("/api/users/me/name").set(auth(staffToken)).send({ name: "Someone Else" });
    expect(name.status).toBe(400);
  });

  it("still log in with the published password after all of the above", async () => {
    await expect(login(app, ADMIN)).resolves.toEqual(expect.any(String));
    await expect(login(app, KKM_STAFF)).resolves.toEqual(expect.any(String));
  });
});

describe("startup self-repair", () => {
  it("restores renamed demo accounts and neutralises markup in names", async () => {
    await User.update({ name: "Vandalised" }, { where: { email: ADMIN } });
    await User.update({ name: "<svg onload=alert(1)>" }, { where: { email: "danial.iqbal@kkm.gov.my" } });

    await repairDemoData();

    expect((await User.findOne({ where: { email: ADMIN } })).name).toBe("System Administrator");
    expect((await User.findOne({ where: { email: "danial.iqbal@kkm.gov.my" } })).name).toBe("Removed test user");
  });
});
