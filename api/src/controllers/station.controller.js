import { getAllStations } from "#services/station.service.js";
import { getScopedAgency } from "#utils/scope.util.js";

export const listStations = async (req, res, next) => {
  try {
    const stations = await getAllStations({ agencyCode: getScopedAgency(req) });
    res.status(200).json({ data: stations });
  } catch (error) {
    next(error);
  }
};
