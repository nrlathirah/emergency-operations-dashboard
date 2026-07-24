import { api } from "./api";

export const vehicleService = {
  async getAll(agencyCode) {
    const params = agencyCode ? { agency: agencyCode } : {};
    const response = await api.get("/vehicles", { params });
    return response.data.data;
  },
};
