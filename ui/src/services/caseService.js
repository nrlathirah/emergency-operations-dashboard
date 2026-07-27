import { api } from "./api";

export const caseService = {
  async getAll({ agencyCode, status, sort, order } = {}) {
    const params = {};
    if (agencyCode) params.agency = agencyCode;
    if (status) params.status = status;
    if (sort) params.sort = sort;
    if (order) params.order = order;
    const response = await api.get("/cases", { params });
    return response.data.data;
  },
};
