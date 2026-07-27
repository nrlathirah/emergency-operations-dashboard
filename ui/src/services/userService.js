import { api } from "./api";

export const userService = {
  async getAll({ search, agencyCode, sort, order, page, limit } = {}) {
    const params = {};
    if (search) params.search = search;
    if (agencyCode) params.agency = agencyCode;
    if (sort) params.sort = sort;
    if (order) params.order = order;
    if (page) params.page = page;
    if (limit) params.limit = limit;

    const response = await api.get("/users", { params });
    return response.data; // { data, total, page, limit }
  },
};
