import { getAllVehicles } from "#services/vehicle.service.js";

export const listVehicles = async (req, res, next) => {
  try {
    const vehicles = await getAllVehicles({ agencyCode: req.query.agency });
    res.status(200).json({ data: vehicles });
  } catch (error) {
    next(error);
  }
};
