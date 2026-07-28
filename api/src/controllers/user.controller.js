import { getAllUsers } from "#services/user.service.js";
import { getScopedAgency } from "#utils/scope.util.js";

export const listUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;

    const result = await getAllUsers({
      search: req.query.search,
      agencyCode: getScopedAgency(req),
      sort: req.query.sort,
      order: req.query.order,
      page,
      limit,
    });

    res.status(200).json({
      data: result.users,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    next(error);
  }
};
