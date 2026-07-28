import { getAllVehicles } from "#services/vehicle.service.js";
import { getScopedAgency } from "#utils/scope.util.js";

export const listVehicles = async (req, res, next) => {
  try {
    const vehicles = await getAllVehicles({ agencyCode: getScopedAgency(req) });
    res.status(200).json({ data: vehicles });
  } catch (error) {
    next(error);
  }
};
