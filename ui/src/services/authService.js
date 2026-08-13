import { api } from "./api";

export const authService = {
  async login(email, password) {
    const response = await api.post("/auth/login", { email, password });
    return response.data;
  },

  async requestPasswordReset(email) {
    const response = await api.post("/auth/request-password-reset", { email });
    return response.data;
  },
};
