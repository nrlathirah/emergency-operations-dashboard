import { api } from "./api";

export const reportService = {
  async getCasesSummary(agencyCode) {
    const params = agencyCode ? { agency: agencyCode } : {};
    const response = await api.get("/reports/cases-summary", { params });
    return response.data.data;
  },

  async getCasesByAgency(agencyCode) {
    const params = agencyCode ? { agency: agencyCode } : {};
    const response = await api.get("/reports/cases-by-agency", { params });
    return response.data.data;
  },

  async getVehicleUtilization(agencyCode) {
    const params = agencyCode ? { agency: agencyCode } : {};
    const response = await api.get("/reports/vehicle-utilization", { params });
    return response.data.data;
  },

  async getCasesByPriority(agencyCode) {
    const params = agencyCode ? { agency: agencyCode } : {};
    const response = await api.get("/reports/cases-by-priority", { params });
    return response.data.data;
  },

  async getCasesByCategory(agencyCode) {
    const params = agencyCode ? { agency: agencyCode } : {};
    const response = await api.get("/reports/cases-by-category", { params });
    return response.data.data;
  },

  async getCasesTrend(agencyCode, days = 30) {
    const params = agencyCode ? { agency: agencyCode, days } : { days };
    const response = await api.get("/reports/cases-trend", { params });
    return response.data.data;
  },

  async getResponseTime(agencyCode) {
    const params = agencyCode ? { agency: agencyCode } : {};
    const response = await api.get("/reports/response-time", { params });
    return response.data.data;
  },

  // Uses the shared `api` axios instance (not a plain URL/<a href>) so the
  // Authorization header actually gets attached — a plain link navigation
  // can't send custom headers, and this endpoint requires auth.
  async downloadCasesExcel(agencyCode) {
    const params = agencyCode ? { agency: agencyCode } : {};
    const response = await api.get("/reports/cases/export", { params, responseType: "blob" });
    return response.data;
  },
};
