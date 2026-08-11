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

  async create({ name, email, password, role, agencyCode }) {
    const response = await api.post("/users", { name, email, password, role, agencyCode });
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

  // Admin-only — set a new temporary password for a user who forgot theirs.
  async resetPassword(userId, newPassword) {
    const response = await api.patch(`/users/${userId}/reset-password`, { newPassword });
    return response.data;
  },
};
