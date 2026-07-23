import { Vehicle, Agency } from "#models/index.js";

export const getAllVehicles = async ({ agencyCode } = {}) => {
  const include = [{ model: Agency, attributes: ["code", "name"] }];
  if (agencyCode) {
    include[0].where = { code: agencyCode };
  }
  return Vehicle.findAll({ include });
};