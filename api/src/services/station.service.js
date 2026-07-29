import { Station, Agency } from "#models/index.js";

export const getAllStations = async ({ agencyCode } = {}) => {
  const include = [{ model: Agency, attributes: ["code", "name"] }];
  if (agencyCode) include[0].where = { code: agencyCode };

  return Station.findAll({ include });
};
