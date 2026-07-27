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
