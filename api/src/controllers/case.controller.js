import { getAllCases } from "#services/case.service.js";

export const listCases = async (req, res, next) => {
  try {
    const cases = await getAllCases({
      agencyCode: req.query.agency,
      status: req.query.status,
      sort: req.query.sort,
      order: req.query.order,
    });
    res.status(200).json({ data: cases });
  } catch (error) {
    next(error);
  }
};
