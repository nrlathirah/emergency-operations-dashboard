import { AuditLog, User } from "#models/index.js";

export const recordAuditLog = async ({ actorId, action, targetUserId, detail }) => {
  await AuditLog.create({ actorId, action, targetUserId: targetUserId ?? null, detail: detail ?? null });
};

const ACTOR_TARGET_INCLUDE = [
  { model: User, as: "Actor", attributes: ["name", "email"] },
  { model: User, as: "Target", attributes: ["name", "email"] },
];

export const getAuditLogs = async ({ page = 1, limit = 15, targetUserId } = {}) => {
  const where = {};
  if (targetUserId) where.targetUserId = targetUserId;

  const offset = (page - 1) * limit;
  const { rows, count } = await AuditLog.findAndCountAll({
    where,
    include: ACTOR_TARGET_INCLUDE,
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });

  return { logs: rows, total: count, page, limit };
};
