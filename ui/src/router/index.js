import { createRouter, createWebHistory } from "vue-router";
import DashboardPage from "../pages/DashboardPage.vue";
import UsersPage from "../pages/UsersPage.vue";
import ReportsPage from "../pages/ReportsPage.vue";
import LoginPage from "../pages/LoginPage.vue";
import ForceChangePasswordPage from "../pages/ForceChangePasswordPage.vue";
import { useAuthStore } from "../stores/auth";

const routes = [
  { path: "/login", name: "login", component: LoginPage },
  { path: "/change-password-required", name: "change-password-required", component: ForceChangePasswordPage, meta: { requiresAuth: true } },
  { path: "/", name: "dashboard", component: DashboardPage, meta: { requiresAuth: true } },
  { path: "/users", name: "users", component: UsersPage, meta: { requiresAuth: true, requiresSuperAdmin: true } },
  { path: "/reports", name: "reports", component: ReportsPage, meta: { requiresAuth: true } },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const authStore = useAuthStore();
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return { name: "login" };
  }
  if (to.meta.requiresSuperAdmin && authStore.user?.role !== "super_admin") {
    return { name: "dashboard" };
  }
  // A password set by an admin (created or reset) must be replaced before
  // the user can go anywhere else in the app.
  if (
    authStore.isLoggedIn &&
    authStore.user?.mustChangePassword &&
    to.name !== "change-password-required"
  ) {
    return { name: "change-password-required" };
  }
});
