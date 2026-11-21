import request from "supertest";
import { seedDatabase } from "../src/seed.js";
import { createApp } from "../src/createApp.js";

export const PASSWORD = "password123";
export const ADMIN = "admin@ops.gov.my";
export const KKM_STAFF = "ahmad.razak@kkm.gov.my"; // demo account
export const PDRM_STAFF = "zul.hassan@pdrm.gov.my"; // demo account
export const NON_DEMO_KKM = "siti.aminah@kkm.gov.my";

// Fresh seeded in-memory DB + a real app instance (no port, no background
// jobs). Call once per test file in beforeAll.
export const setupApp = async () => {
  const log = console.log;
  console.log = () => {}; // keep seed chatter out of test output
  try {
    await seedDatabase();
  } finally {
    console.log = log;
  }
  return createApp();
};

export const login = async (app, email, password = PASSWORD) => {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  if (res.status !== 200) throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.token;
};

export const auth = (token) => ({ Authorization: `Bearer ${token}` });

export const findUserId = async (app, adminToken, email) => {
  const res = await request(app).get("/api/users").query({ search: email }).set(auth(adminToken));
  return res.body.data.find((u) => u.email === email)?.id;
};

// Sets updatedAt directly in SQL. Sequelize ignores a silent update whose
// only field is updatedAt (it becomes a no-op), so tests that need to make a
// row look old use this instead.
export const backdateUpdatedAt = async (sequelize, ids, date) => {
  await sequelize.query(`UPDATE "Cases" SET "updatedAt" = :date WHERE id IN (:ids)`, {
    replacements: { date, ids },
  });
};
