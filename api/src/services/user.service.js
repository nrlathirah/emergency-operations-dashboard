import bcrypt from "bcryptjs";
import ExcelJS from "exceljs";
import { User, Agency } from "#models/index.js";
import { Op } from "sequelize";
import { recordAuditLog } from "./audit.service.js";
import { resolveAnyPendingRequestForUser } from "./passwordResetRequest.service.js";

const ALLOWED_SORT_FIELDS = ["name", "email", "role", "status", "createdAt", "lastLoginAt"];

export const getAllUsers = async ({ search, agencyCode, status, role, sort, order, page = 1, limit = 5 } = {}) => {
  const where = {};
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
    ];
  }
  if (["active", "inactive"].includes(status)) {
    where.status = status;
  }
  if (["staff", "super_admin"].includes(role)) {
    where.role = role;
  }

  const include = [{ model: Agency, attributes: ["code", "name"] }];
  if (agencyCode) include[0].where = { code: agencyCode };

  const sortOrder = order === "DESC" ? "DESC" : "ASC";
  const offset = (page - 1) * limit;

  // Agency isn't a column on User itself — it's the joined table's `code`,
  // so it needs Sequelize's [Model, column, direction] order syntax instead.
  const orderClause =
    sort === "agency"
      ? [[Agency, "code", sortOrder]]
      : [[ALLOWED_SORT_FIELDS.includes(sort) ? sort : "name", sortOrder]];

  const { rows, count } = await User.findAndCountAll({
    where,
    include,
    order: orderClause,
    limit,
    offset,
  });

  return { users: rows, total: count, page, limit };
};

// Reuses the same filters as getAllUsers but returns every matching row
// (no pagination) as an .xlsx buffer. Password is never included — the
// default scope excludes it, and this never opts into `withPassword`.
export const generateUsersExcel = async ({ search, agencyCode, status, role } = {}) => {
  const where = {};
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
    ];
  }
  if (["active", "inactive"].includes(status)) {
    where.status = status;
  }
  if (["staff", "super_admin"].includes(role)) {
    where.role = role;
  }

  const include = [{ model: Agency, attributes: ["code", "name"] }];
  if (agencyCode) include[0].where = { code: agencyCode };

  const users = await User.findAll({ where, include, order: [["name", "ASC"]] });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Users");

  // Column keys/widths only here — no `header`, since headers are written
  // manually below (after the title/filter info rows, not in row 1).
  const dateColumn = { width: 20, style: { numFmt: "dd mmm yyyy hh:mm AM/PM" } };
  sheet.columns = [
    { key: "name", width: 25 },
    { key: "email", width: 30 },
    { key: "role", width: 15 },
    { key: "agency", width: 10 },
    { key: "status", width: 12 },
    { key: "created", ...dateColumn },
    { key: "lastLogin", ...dateColumn },
  ];
  const columnCount = sheet.columns.length;

  const filterParts = [];
  if (search) filterParts.push(`Search: "${search}"`);
  if (agencyCode) filterParts.push(`Agency: ${agencyCode}`);
  if (["active", "inactive"].includes(status)) filterParts.push(`Status: ${status}`);
  if (["staff", "super_admin"].includes(role)) filterParts.push(`Role: ${role === "super_admin" ? "Super Admin" : "Staff"}`);

  const titleRow = sheet.addRow(["Users Report"]);
  titleRow.font = { bold: true, size: 14 };
  sheet.mergeCells(1, 1, 1, columnCount);

  const generatedRow = sheet.addRow([
    `Generated: ${new Date().toLocaleString("en-MY", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`,
  ]);
  generatedRow.font = { italic: true, color: { argb: "FF666666" } };
  sheet.mergeCells(2, 1, 2, columnCount);

  const filterRow = sheet.addRow([`Filters: ${filterParts.length ? filterParts.join(" | ") : "None"}`]);
  filterRow.font = { italic: true, color: { argb: "FF666666" } };
  sheet.mergeCells(3, 1, 3, columnCount);

  sheet.addRow([]); // spacer

  const HEADER_ROW = 5;
  const headerRow = sheet.addRow(["Name", "Email", "Role", "Agency", "Status", "Created", "Last Login"]);
  headerRow.font = { bold: true };

  users.forEach((u) => {
    sheet.addRow({
      name: u.name,
      email: u.email,
      agency: u.Agency?.code || "—",
      role: u.role,
      status: u.status,
      lastLogin: u.lastLoginAt || "Never",
      created: u.createdAt,
    });
  });

  // Filter dropdown arrows already active on open — no manual "Data > Filter" step.
  sheet.autoFilter = {
    from: { row: HEADER_ROW, column: 1 },
    to: { row: HEADER_ROW + users.length, column: columnCount },
  };
  // Keep the title/filter info and header row visible while scrolling.
  sheet.views = [{ state: "frozen", ySplit: HEADER_ROW }];

  return workbook.xlsx.writeBuffer();
};

export const createUser = async ({ name, email, password, role, agencyCode, actorId }) => {
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

  await recordAuditLog({
    actorId,
    action: "create_user",
    targetUserId: created.id,
    detail: `role: ${role}${agencyCode ? `, agency: ${agencyCode}` : ""}`,
  });

  // Re-fetch through the default scope (excludes password) with Agency
  // included, so the response shape matches getAllUsers exactly.
  return User.findByPk(created.id, { include: [{ model: Agency, attributes: ["code", "name"] }] });
};

export const updateUserName = async ({ userId, name, actorId }) => {
  if (!name || !name.trim()) {
    throw new Error("Name is required.");
  }

  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error("User not found.");
  }
  // Unlike password/status changes, renaming doesn't affect login access —
  // no reason to block it for the shared demo accounts.

  const oldName = user.name;
  const newName = name.trim();
  await user.update({ name: newName });
  await recordAuditLog({
    actorId,
    action: "update_name",
    targetUserId: user.id,
    detail: `"${oldName}" → "${newName}"`,
  });

  return User.findByPk(user.id, { include: [{ model: Agency, attributes: ["code", "name"] }] });
};

export const updateUserStatus = async ({ userId, status, actorId }) => {
  if (!["active", "inactive"].includes(status)) {
    throw new Error("Status must be 'active' or 'inactive'.");
  }

  const user = await User.findByPk(userId, { include: [{ model: Agency, attributes: ["code", "name"] }] });
  if (!user) {
    throw new Error("User not found.");
  }

  // Anyone who clicks a Quick Login button is effectively logged in as this
  // account — including as super admin. Deactivating it would break the
  // login for every future visitor, and there's no "trusted" way to tell
  // the real owner apart from a stranger using the same public credentials.
  if (user.isDemoAccount && status === "inactive") {
    throw new Error("This is a shared demo account and can't be deactivated.");
  }

  // Deactivating the last active super admin would lock everyone out of
  // Users management with no way back in short of touching the DB directly.
  if (user.role === "super_admin" && user.status === "active" && status === "inactive") {
    const activeSuperAdmins = await User.count({ where: { role: "super_admin", status: "active" } });
    if (activeSuperAdmins <= 1) {
      throw new Error("Cannot deactivate the last active super admin.");
    }
  }

  await user.update({ status });
  await recordAuditLog({
    actorId,
    action: status === "active" ? "activate_user" : "deactivate_user",
    targetUserId: user.id,
  });
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
  if (user.isDemoAccount) {
    // The current password is public (it's on the Quick Login buttons), so
    // knowing it proves nothing here — anyone could self-service their way
    // into breaking the shared demo credentials otherwise.
    throw new Error("This is a shared demo account and its password can't be changed.");
  }

  const isValid = await bcrypt.compare(currentPassword || "", user.password);
  if (!isValid) {
    throw new Error("Current password is incorrect.");
  }

  // They set this one themselves — no longer forced to change it again.
  await user.update({ password: newPassword, mustChangePassword: false });
};

// Self-service — the logged-in user renames themselves. Unlike an admin
// renaming someone else (see updateUserName), this is reachable by anyone
// who's simply logged in, so the shared demo accounts stay off-limits here.
export const changeOwnName = async ({ userId, name }) => {
  if (!name || !name.trim()) {
    throw new Error("Name is required.");
  }

  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error("User not found.");
  }
  if (user.isDemoAccount) {
    throw new Error("This is a shared demo account and its name can't be changed.");
  }

  await user.update({ name: name.trim() });
};

// Admin-triggered fallback for a user who forgot their password entirely
// (so can't prove the current one to self-change) — sets a new temporary
// password the admin relays to them, which they're expected to change
// themselves afterward via changeOwnPassword.
export const resetUserPassword = async ({ userId, newPassword, actorId }) => {
  if (!newPassword || newPassword.length < 6) {
    throw new Error("New password must be at least 6 characters.");
  }

  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error("User not found.");
  }
  if (user.isDemoAccount) {
    throw new Error("This is a shared demo account and its password can't be reset here.");
  }

  // The admin now knows this password — force the user to set their own on
  // next login so that knowledge stays temporary.
  await user.update({ password: newPassword, mustChangePassword: true });

  // A single reset path handles both "admin decided to reset this" and "user
  // asked via Forgot Password" — clear any pending request for them too.
  const clearedRequest = await resolveAnyPendingRequestForUser({ userId: user.id, actorId });

  await recordAuditLog({
    actorId,
    action: "reset_password",
    targetUserId: user.id,
    detail: clearedRequest ? "also cleared their pending self-service request" : undefined,
  });
};
