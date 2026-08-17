import { api } from "./api";

export const userService = {
  async getAll({ search, agencyCode, status, role, sort, order, page, limit } = {}) {
    const params = {};
    if (search) params.search = search;
    if (agencyCode) params.agency = agencyCode;
    if (status) params.status = status;
    if (role) params.role = role;
    if (sort) params.sort = sort;
    if (order) params.order = order;
    if (page) params.page = page;
    if (limit) params.limit = limit;

    const response = await api.get("/users", { params });
    return response.data; // { data, total, page, limit }
  },

  // Uses the shared `api` axios instance (not a plain <a href>) so the
  // Authorization header actually gets attached to the request.
  async downloadUsersExcel({ search, agencyCode, status, role } = {}) {
    const params = {};
    if (search) params.search = search;
    if (agencyCode) params.agency = agencyCode;
    if (status) params.status = status;
    if (role) params.role = role;

    const response = await api.get("/users/export", { params, responseType: "blob" });
    return response.data;
  },

  async create({ name, email, password, role, agencyCode }) {
    const response = await api.post("/users", { name, email, password, role, agencyCode });
    return response.data.data;
  },

  async updateName(userId, name) {
    const response = await api.patch(`/users/${userId}/name`, { name });
    return response.data.data;
  },

  async updateStatus(userId, status) {
    const response = await api.patch(`/users/${userId}/status`, { status });
    return response.data.data;
  },

  // Self-service — the logged-in user changes their own password.
  async changeMyPassword(currentPassword, newPassword) {
    const response = await api.patch("/users/me/password", { currentPassword, newPassword });
    return response.data;
  },

  // Self-service — the logged-in user renames themselves.
  async changeMyName(name) {
    const response = await api.patch("/users/me/name", { name });
    return response.data;
  },

  // Admin-only — set a new temporary password for a user who forgot theirs.
  async resetPassword(userId, newPassword) {
    const response = await api.patch(`/users/${userId}/reset-password`, { newPassword });
    return response.data;
  },

  async getAuditLog({ page, limit } = {}) {
    const params = {};
    if (page) params.page = page;
    if (limit) params.limit = limit;
    const response = await api.get("/users/audit-log", { params });
    return response.data; // { data, total, page, limit }
  },

  async getResetRequests() {
    const response = await api.get("/users/reset-requests");
    return response.data.data;
  },

  async dismissResetRequest(requestId) {
    const response = await api.post(`/users/reset-requests/${requestId}/dismiss`);
    return response.data;
  },

  async getResetRequestHistory({ page, limit } = {}) {
    const params = {};
    if (page) params.page = page;
    if (limit) params.limit = limit;
    const response = await api.get("/users/reset-requests/history", { params });
    return response.data; // { data, total, page, limit }
  },
};
