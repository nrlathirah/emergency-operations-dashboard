import { sequelize, User, Agency, PasswordResetRequest } from "#models/index.js";

// Always resolves the same way regardless of whether the email matches a
// real, active account — the caller (public, unauthenticated) must never be
// able to tell the difference, or this becomes a user-enumeration leak.
export const createPasswordResetRequest = async ({ email }) => {
  if (!email) return;

  const user = await User.findOne({ where: { email, status: "active" } });
  if (!user || user.isDemoAccount) return;

  // Check-then-create wrapped in a transaction so a double-submit (double
  // click, a retried request) can't race past the "existing" check and
  // create two pending rows for the same user — SQLite serializes
  // concurrent write transactions, so a second call's SELECT here will
  // correctly see the first call's INSERT once it commits.
  await sequelize.transaction(async (t) => {
    const existing = await PasswordResetRequest.findOne({
      where: { userId: user.id, status: "pending" },
      transaction: t,
    });
    if (existing) return;

    await PasswordResetRequest.create({ email, userId: user.id, status: "pending" }, { transaction: t });
  });
};

export const getPendingResetRequests = async () => {
  return PasswordResetRequest.findAll({
    where: { status: "pending" },
    include: [{ model: User, as: "User", attributes: ["name", "email"], include: [{ model: Agency, attributes: ["code"] }] }],
    order: [["createdAt", "ASC"]],
  });
};

// Called as a side effect of the normal admin "Reset Password" action (see
// user.service.js resetUserPassword) — resetting a user's password that way
// now also clears any pending self-service request for them, so there's a
// single reset path instead of two separate ones that both change passwords.
export const resolveAnyPendingRequestForUser = async ({ userId, actorId }) => {
  const request = await PasswordResetRequest.findOne({ where: { userId, status: "pending" } });
  if (!request) return null;
  await request.update({ status: "resolved", resolvedAt: new Date(), resolvedBy: actorId });
  return request;
};

export const dismissPasswordResetRequest = async ({ requestId, actorId }) => {
  const request = await PasswordResetRequest.findByPk(requestId);
  if (!request || request.status !== "pending") {
    throw new Error("Request not found or already handled.");
  }
  await request.update({ status: "dismissed", resolvedAt: new Date(), resolvedBy: actorId });
};

// Past requests (resolved or dismissed) — once a request leaves the pending
// list it otherwise vanishes with no way to look back at it, even though
// the row itself is never deleted.
export const getResetRequestHistory = async ({ page = 1, limit = 10 } = {}) => {
  const offset = (page - 1) * limit;
  const { rows, count } = await PasswordResetRequest.findAndCountAll({
    where: { status: ["resolved", "dismissed"] },
    include: [
      { model: User, as: "User", attributes: ["name", "email"], include: [{ model: Agency, attributes: ["code"] }] },
      { model: User, as: "ResolvedByUser", attributes: ["name", "email"] },
    ],
    order: [["resolvedAt", "DESC"]],
    limit,
    offset,
  });
  return { requests: rows, total: count, page, limit };
};
