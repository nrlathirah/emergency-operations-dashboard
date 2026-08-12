import { getAllUsers, generateUsersExcel, createUser, updateUserStatus, changeOwnPassword, resetUserPassword } from "#services/user.service.js";
import { getAuditLogs } from "#services/audit.service.js";
import { getScopedAgency } from "#utils/scope.util.js";

export const listUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;

    const result = await getAllUsers({
      search: req.query.search,
      agencyCode: getScopedAgency(req),
      status: req.query.status,
      sort: req.query.sort,
      order: req.query.order,
      page,
      limit,
    });

    res.status(200).json({
      data: result.users,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    next(error);
  }
};

export const exportUsersExcel = async (req, res, next) => {
  try {
    const buffer = await generateUsersExcel({
      search: req.query.search,
      agencyCode: getScopedAgency(req),
      status: req.query.status,
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=users-report.xlsx");
    res.send(Buffer.from(buffer));
  } catch (error) {
    next(error);
  }
};

export const createUserController = async (req, res, next) => {
  try {
    const { name, email, password, role, agencyCode } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required." });
    }

    const user = await createUser({ name, email, password, role: role || "staff", agencyCode, actorId: req.user.id });
    res.status(201).json({ data: user });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateUserStatusController = async (req, res, next) => {
  try {
    const user = await updateUserStatus({ userId: req.params.id, status: req.body.status, actorId: req.user.id });
    res.status(200).json({ data: user });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const listAuditLogController = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const result = await getAuditLogs({ page, limit });
    res.status(200).json({
      data: result.logs,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    next(error);
  }
};

export const changePasswordController = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required." });
    }
    await changeOwnPassword({ userId: req.user.id, currentPassword, newPassword });
    res.status(200).json({ message: "Password changed successfully." });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const resetPasswordController = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    await resetUserPassword({ userId: req.params.id, newPassword, actorId: req.user.id });
    res.status(200).json({ message: "Password reset successfully." });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
