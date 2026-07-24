import { api } from "./api";

export const caseService = {
  async getAll({ agencyCode, status } = {}) {
    const params = {};
    if (agencyCode) params.agency = agencyCode;
    if (status) params.status = status;
    const response = await api.get("/cases", { params });
    return response.data.data;
  },
};
