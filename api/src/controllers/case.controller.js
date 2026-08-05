import { getAllCases, dispatchCase as dispatchCaseService, simulateNewCase } from "#services/case.service.js";
import { getScopedAgency } from "#utils/scope.util.js";

export const listCases = async (req, res, next) => {
  try {
    const cases = await getAllCases({
      agencyCode: getScopedAgency(req),
      status: req.query.status,
      sort: req.query.sort,
      order: req.query.order,
    });
    res.status(200).json({ data: cases });
  } catch (error) {
    next(error);
  }
};

export const dispatchCase = async (req, res, next) => {
  try {
    const updatedCase = await dispatchCaseService({
      caseId: req.params.id,
      vehicleId: req.body.vehicleId,
      requesterRole: req.user.role,
      requesterAgencyCode: req.user.agencyCode,
    });
    res.status(200).json({ data: updatedCase });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const simulateCase = async (req, res, next) => {
  try {
    const result = await simulateNewCase({
      requesterRole: req.user.role,
      requesterAgencyCode: req.user.agencyCode,
    });
    res.status(201).json({ data: result });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
