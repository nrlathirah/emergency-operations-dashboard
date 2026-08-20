import { defineStore } from "pinia";
import { authService } from "../services/authService";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: localStorage.getItem("token") || null,
    user: JSON.parse(localStorage.getItem("user") || "null"),
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
    // The token itself is only checked reactively, by the API's response
    // interceptor after a request actually fails with 401 — a token sitting
    // unused in localStorage (e.g. the tab was resumed from memory instead
    // of reloaded, so no request ever fired) can look "logged in" long past
    // its real 8h expiry. Decoding the JWT's own exp claim lets the app
    // catch that proactively instead of waiting for a request to fail.
    isTokenExpired: (state) => {
      if (!state.token) return false;
      try {
        const payload = JSON.parse(atob(state.token.split(".")[1]));
        return typeof payload.exp === "number" && Date.now() >= payload.exp * 1000;
      } catch {
        return true; // unreadable token can't be trusted either
      }
    },
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
    // Clears the forced-change flag locally right after a successful
    // password change, so the router guard stops redirecting without
    // needing a fresh login/token.
    clearMustChangePassword() {
      if (!this.user) return;
      this.user = { ...this.user, mustChangePassword: false };
      localStorage.setItem("user", JSON.stringify(this.user));
    },
    // Reflects a self-service name change locally right away, so the header
    // updates without needing a fresh login/token.
    updateName(name) {
      if (!this.user) return;
      this.user = { ...this.user, name };
      localStorage.setItem("user", JSON.stringify(this.user));
    },
  },
});
