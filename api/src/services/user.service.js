import bcrypt from "bcryptjs";
import { User, Agency } from "#models/index.js";
import { Op } from "sequelize";

const ALLOWED_SORT_FIELDS = ["name", "email", "role", "status", "createdAt"];

export const getAllUsers = async ({ search, agencyCode, sort, order, page = 1, limit = 5 } = {}) => {
  const where = {};
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
    ];
  }

  const include = [{ model: Agency, attributes: ["code", "name"] }];
  if (agencyCode) include[0].where = { code: agencyCode };

  const sortField = ALLOWED_SORT_FIELDS.includes(sort) ? sort : "name";
  const sortOrder = order === "DESC" ? "DESC" : "ASC";
  const offset = (page - 1) * limit;

  const { rows, count } = await User.findAndCountAll({
    where,
    include,
    order: [[sortField, sortOrder]],
    limit,
    offset,
  });

  return { users: rows, total: count, page, limit };
};

export const createUser = async ({ name, email, password, role, agencyCode }) => {
  let agencyId = null;
  if (role !== "super_admin") {
    const agency = await Agency.findOne({ where: { code: agencyCode } });
    if (!agency) {
      throw new Error("A valid agency is required for staff accounts.");
    }
    agencyId = agency.id;
  }

  let created;
  try {
    created = await User.create({ name, email, password, role, agencyId, status: "active", mustChangePassword: true });
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      throw new Error("This email is already registered.");
    }
    throw err;
  }

  // Re-fetch through the default scope (excludes password) with Agency
  // included, so the response shape matches getAllUsers exactly.
  return User.findByPk(created.id, { include: [{ model: Agency, attributes: ["code", "name"] }] });
};

export const updateUserStatus = async ({ userId, status }) => {
  if (!["active", "inactive"].includes(status)) {
    throw new Error("Status must be 'active' or 'inactive'.");
  }

  const user = await User.findByPk(userId, { include: [{ model: Agency, attributes: ["code", "name"] }] });
  if (!user) {
    throw new Error("User not found.");
  }

  await user.update({ status });
  return user;
};

// Self-service — the logged-in user changes their own password. Requires
// proving they know the current one; the new password is never seen by
// anyone else (including admins) once set.
export const changeOwnPassword = async ({ userId, currentPassword, newPassword }) => {
  if (!newPassword || newPassword.length < 6) {
    throw new Error("New password must be at least 6 characters.");
  }

  const user = await User.scope("withPassword").findByPk(userId);
  if (!user) {
    throw new Error("User not found.");
  }

  const isValid = await bcrypt.compare(currentPassword || "", user.password);
  if (!isValid) {
    throw new Error("Current password is incorrect.");
  }

  // They set this one themselves — no longer forced to change it again.
  await user.update({ password: newPassword, mustChangePassword: false });
};

// Admin-triggered fallback for a user who forgot their password entirely
// (so can't prove the current one to self-change) — sets a new temporary
// password the admin relays to them, which they're expected to change
// themselves afterward via changeOwnPassword.
export const resetUserPassword = async ({ userId, newPassword }) => {
  if (!newPassword || newPassword.length < 6) {
    throw new Error("New password must be at least 6 characters.");
  }

  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error("User not found.");
  }

  // The admin now knows this password — force the user to set their own on
  // next login so that knowledge stays temporary.
  await user.update({ password: newPassword, mustChangePassword: true });
};
