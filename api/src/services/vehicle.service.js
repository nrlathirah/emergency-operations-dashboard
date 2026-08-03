import { Vehicle, Agency, Station } from "#models/index.js";

export const getAllVehicles = async ({ agencyCode } = {}) => {
  const include = [
    { model: Agency, attributes: ["code", "name"] },
    { model: Station, attributes: ["name", "type"] },
  ];
  if (agencyCode) {
    include[0].where = { code: agencyCode };
  }
  return Vehicle.findAll({ include });
};