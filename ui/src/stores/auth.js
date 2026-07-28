import { defineStore } from "pinia";
import { authService } from "../services/authService";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: localStorage.getItem("token") || null,
    user: JSON.parse(localStorage.getItem("user") || "null"),
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
  },
  actions: {
    async login(email, password) {
      const { token, user } = await authService.login(email, password);
      this.token = token;
      this.user = user;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
    },
    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    },
  },
});
