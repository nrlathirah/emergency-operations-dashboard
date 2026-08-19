import { api } from "./api";

// Both bounds are required together — a half-filled range isn't sent, so
// the backend falls back to its own default (all-time, or last 30 days for
// trend endpoints) exactly like it did before date ranges existed.
const dateParams = (startDate, endDate) => (startDate && endDate ? { startDate, endDate } : {});

export const reportService = {
  // The earliest case on record — lets the UI show a real date range
  // ("19 May 2026 to 19 Aug 2026") instead of a vague "All Time" label
  // whenever no explicit range has been picked.
  async getDateBounds(agencyCode) {
    const params = agencyCode ? { agency: agencyCode } : {};
    const response = await api.get("/reports/date-bounds", { params });
    return response.data.data; // { earliestDate }
  },

  async getCasesSummary(agencyCode, { startDate, endDate } = {}) {
    const params = { ...(agencyCode ? { agency: agencyCode } : {}), ...dateParams(startDate, endDate) };
    const response = await api.get("/reports/cases-summary", { params });
    return response.data.data;
  },

  async getCasesByAgency(agencyCode, { startDate, endDate } = {}) {
    const params = { ...(agencyCode ? { agency: agencyCode } : {}), ...dateParams(startDate, endDate) };
    const response = await api.get("/reports/cases-by-agency", { params });
    return response.data.data;
  },

  // No date range here — vehicle status is a live fleet snapshot, not a
  // historical record.
  async getVehicleUtilization(agencyCode) {
    const params = agencyCode ? { agency: agencyCode } : {};
    const response = await api.get("/reports/vehicle-utilization", { params });
    return response.data.data;
  },

  async getCasesByPriority(agencyCode, { startDate, endDate } = {}) {
    const params = { ...(agencyCode ? { agency: agencyCode } : {}), ...dateParams(startDate, endDate) };
    const response = await api.get("/reports/cases-by-priority", { params });
    return response.data.data;
  },

  async getCasesByCategory(agencyCode, { startDate, endDate } = {}) {
    const params = { ...(agencyCode ? { agency: agencyCode } : {}), ...dateParams(startDate, endDate) };
    const response = await api.get("/reports/cases-by-category", { params });
    return response.data.data;
  },

  async getCasesTrend(agencyCode, { startDate, endDate } = {}) {
    const params = { ...(agencyCode ? { agency: agencyCode } : {}), ...dateParams(startDate, endDate) };
    const response = await api.get("/reports/cases-trend", { params });
    return response.data.data;
  },

  async getResponseTimeTrend(agencyCode, { startDate, endDate } = {}) {
    const params = { ...(agencyCode ? { agency: agencyCode } : {}), ...dateParams(startDate, endDate) };
    const response = await api.get("/reports/response-time-trend", { params });
    return response.data.data;
  },

  async getPeriodComparison(agencyCode, { startDate, endDate } = {}) {
    const params = { ...(agencyCode ? { agency: agencyCode } : {}), ...dateParams(startDate, endDate) };
    const response = await api.get("/reports/period-comparison", { params });
    return response.data.data;
  },

  async getResponseTime(agencyCode, { startDate, endDate } = {}) {
    const params = { ...(agencyCode ? { agency: agencyCode } : {}), ...dateParams(startDate, endDate) };
    const response = await api.get("/reports/response-time", { params });
    return response.data.data;
  },

  async getCasesByHour(agencyCode, { startDate, endDate } = {}) {
    const params = { ...(agencyCode ? { agency: agencyCode } : {}), ...dateParams(startDate, endDate) };
    const response = await api.get("/reports/cases-by-hour", { params });
    return response.data.data;
  },

  async getPriorityByAgency(agencyCode, { startDate, endDate } = {}) {
    const params = { ...(agencyCode ? { agency: agencyCode } : {}), ...dateParams(startDate, endDate) };
    const response = await api.get("/reports/priority-by-agency", { params });
    return response.data.data;
  },

  async getCasesTable({ agencyCode, status, sort, order, page, limit, search, category, priority, startDate, endDate } = {}) {
    const params = { ...dateParams(startDate, endDate) };
    if (agencyCode) params.agency = agencyCode;
    if (status) params.status = status;
    if (sort) params.sort = sort;
    if (order) params.order = order;
    if (page) params.page = page;
    if (limit) params.limit = limit;
    if (search) params.search = search;
    if (category) params.category = category;
    if (priority) params.priority = priority;
    const response = await api.get("/reports/cases-table", { params });
    return response.data; // { data, total, page, limit }
  },

  // Uses the shared `api` axios instance (not a plain URL/<a href>) so the
  // Authorization header actually gets attached — a plain link navigation
  // can't send custom headers, and this endpoint requires auth.
  async downloadCasesExcel(agencyCode, status, { startDate, endDate, search, category, priority } = {}) {
    const params = { ...dateParams(startDate, endDate) };
    if (agencyCode) params.agency = agencyCode;
    if (status) params.status = status;
    if (search) params.search = search;
    if (category) params.category = category;
    if (priority) params.priority = priority;
    const response = await api.get("/reports/cases/export", { params, responseType: "blob" });
    return response.data;
  },

  async downloadFullReportExcel(agencyCode, { startDate, endDate } = {}) {
    const params = { ...(agencyCode ? { agency: agencyCode } : {}), ...dateParams(startDate, endDate) };
    const response = await api.get("/reports/export-full", { params, responseType: "blob" });
    return response.data;
  },
};
