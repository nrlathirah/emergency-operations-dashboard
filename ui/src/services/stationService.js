import { api } from "./api";

export const stationService = {
  async getAll(agencyCode) {
    const params = agencyCode ? { agency: agencyCode } : {};
    const response = await api.get("/stations", { params });
    return response.data.data;
  },
};
