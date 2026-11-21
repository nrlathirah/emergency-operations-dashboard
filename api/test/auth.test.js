import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { setupApp, login, auth, findUserId, ADMIN, KKM_STAFF, NON_DEMO_KKM, PASSWORD } from "./helpers.js";

let app;
let adminToken;

beforeAll(async () => {
  app = await setupApp();
  adminToken = await login(app, ADMIN);
});

describe("login", () => {
  it("returns a token and safe user profile for valid credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: KKM_STAFF, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ email: KKM_STAFF, role: "staff", agency: "KKM" });
    expect(res.body.user.password).toBeUndefined();
  });

  it("rejects a wrong password with a generic message", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: KKM_STAFF, password: "wrong-password" });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password");
  });

  it("gives an unknown email the exact same response (no account enumeration)", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "nobody@example.com", password: "whatever" });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password");
  });

  it("rejects a malformed body", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "" });
    expect(res.status).toBe(400);
  });
});

describe("authentication", () => {
  it("rejects requests without a token", async () => {
    const res = await request(app).get("/api/cases");
    expect(res.status).toBe(401);
  });

  it("rejects a forged token", async () => {
    const res = await request(app).get("/api/cases").set(auth("not.a.real.token"));
    expect(res.status).toBe(401);
  });

  it("revokes existing sessions immediately when a user is deactivated", async () => {
    const userToken = await login(app, NON_DEMO_KKM);
    expect((await request(app).get("/api/cases").set(auth(userToken))).status).toBe(200);

    const id = await findUserId(app, adminToken, NON_DEMO_KKM);
    const deactivate = await request(app).patch(`/api/users/${id}/status`).set(auth(adminToken)).send({ status: "inactive" });
    expect(deactivate.status).toBe(200);

    expect((await request(app).get("/api/cases").set(auth(userToken))).status).toBe(401);
  });
});

describe("login activity log", () => {
  it("records successful and failed attempts, visible to the super admin with their own IP", async () => {
    await request(app).post("/api/auth/login").send({ email: "probe@example.com", password: "x" });

    const res = await request(app).get("/api/users/login-activity").set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.yourIp).toEqual(expect.any(String));
    const probe = res.body.data.find((e) => e.email === "probe@example.com");
    expect(probe).toMatchObject({ success: false, userId: null });
    expect(res.body.data.some((e) => e.email === ADMIN && e.success)).toBe(true);
  });

  it("is hidden from staff", async () => {
    const staffToken = await login(app, KKM_STAFF);
    const res = await request(app).get("/api/users/login-activity").set(auth(staffToken));
    expect(res.status).toBe(403);
  });
});
