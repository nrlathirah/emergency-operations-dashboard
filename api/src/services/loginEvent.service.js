import { Op } from "sequelize";
import { LoginEvent, User } from "#models/index.js";

const RETENTION_DAYS = 30;
// Login attempts are unauthenticated, so time-based retention alone isn't a
// ceiling — a script rotating emails could still write a lot of rows within
// 30 days. This caps the table outright; oldest rows go first.
const MAX_ROWS = 5000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Express reports IPv4 clients on a dual-stack socket as "::ffff:1.2.3.4" —
// strip that so the same visitor always shows (and compares) as one address.
export const normalizeIp = (ip) => (ip ? ip.replace(/^::ffff:/, "") : null);

const pruneOldLoginEvents = async () => {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * DAY_MS);
  await LoginEvent.destroy({ where: { createdAt: { [Op.lt]: cutoff } } });

  const overflowRow = await LoginEvent.findOne({ order: [["id", "DESC"]], offset: MAX_ROWS, attributes: ["id"] });
  if (overflowRow) await LoginEvent.destroy({ where: { id: { [Op.lte]: overflowRow.id } } });
};

// Never allowed to fail a login — a logging problem must not lock anyone out.
export const recordLoginEvent = async ({ email, userId, success, ip, userAgent }) => {
  try {
    await LoginEvent.create({
      email: String(email || "").slice(0, 254),
      userId: userId ?? null,
      success,
      ip: normalizeIp(ip),
      userAgent: userAgent ? userAgent.slice(0, 500) : null,
    });
    await pruneOldLoginEvents();
  } catch (error) {
    console.error("Failed to record login event:", error.message);
  }
};

export const getLoginEvents = async ({ page = 1, limit = 20 } = {}) => {
  const offset = (page - 1) * limit;
  const { rows, count } = await LoginEvent.findAndCountAll({
    include: [{ model: User, as: "User", attributes: ["name"] }],
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });
  return { events: rows, total: count, page, limit };
};
