import { Op } from "sequelize";
import { LoginEvent, User } from "#models/index.js";

const RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

// Express reports IPv4 clients on a dual-stack socket as "::ffff:1.2.3.4" —
// strip that so the same visitor always shows (and compares) as one address.
export const normalizeIp = (ip) => (ip ? ip.replace(/^::ffff:/, "") : null);

const pruneOldLoginEvents = async () => {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * DAY_MS);
  await LoginEvent.destroy({ where: { createdAt: { [Op.lt]: cutoff } } });
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
