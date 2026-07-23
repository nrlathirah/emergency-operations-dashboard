import { Case, Agency } from "#models/index.js";

export const getAllCases = async ({ agencyCode, status } = {}) => {
  const where = {};
  if (status) where.status = status;

  const include = [{ model: Agency, attributes: ["code", "name"] }];
  if (agencyCode) include[0].where = { code: agencyCode };

  return Case.findAll({ where, include });
};