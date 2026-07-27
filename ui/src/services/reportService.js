import { api } from "./api";

export const reportService = {
  async getCasesSummary(agencyCode) {
    const params = agencyCode ? { agency: agencyCode } : {};
    const response = await api.get("/reports/cases-summary", { params });
    return response.data.data;
  },

  getExportUrl(agencyCode) {
    const params = new URLSearchParams();
    if (agencyCode) params.set("agency", agencyCode);
    return `${import.meta.env.VITE_API_BASE_URL}/reports/cases/export?${params.toString()}`;
  },
};
