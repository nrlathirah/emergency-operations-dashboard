import { Case, Agency } from "#models/index.js";

const ALLOWED_SORT_FIELDS = ["caseNumber", "category", "priority", "status", "createdAt"];

export const getAllCases = async ({ agencyCode, status, sort, order } = {}) => {
  const where = {};
  if (status) where.status = status;

  const include = [{ model: Agency, attributes: ["code", "name"] }];
  if (agencyCode) include[0].where = { code: agencyCode };

  const sortField = ALLOWED_SORT_FIELDS.includes(sort) ? sort : "createdAt";
  const sortOrder = order === "ASC" ? "ASC" : "DESC";

  return Case.findAll({ where, include, order: [[sortField, sortOrder]] });
};
