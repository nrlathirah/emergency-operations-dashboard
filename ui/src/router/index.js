import { createRouter, createWebHistory } from "vue-router";
// Login is the one page loaded eagerly — it's the first thing anyone sees
// before they're authenticated, so it belongs in the initial bundle rather
// than costing an extra round trip to fetch its own chunk. Every other
// page is fetched on demand: nobody visiting only the Dashboard should pay
// for Reports' chart libraries (or vice versa) until they actually go
// there, and this is what lets Vite split those into separate chunks in
// the first place instead of one large bundle for the whole app.
import LoginPage from "../pages/LoginPage.vue";
import { useAuthStore } from "../stores/auth";

const routes = [
  { path: "/login", name: "login", component: LoginPage },
  {
    path: "/change-password-required",
    name: "change-password-required",
    component: () => import("../pages/ForceChangePasswordPage.vue"),
    meta: { requiresAuth: true },
  },
  { path: "/", name: "dashboard", component: () => import("../pages/DashboardPage.vue"), meta: { requiresAuth: true } },
  {
    path: "/users",
    name: "users",
    component: () => import("../pages/UsersPage.vue"),
    meta: { requiresAuth: true, requiresSuperAdmin: true },
  },
  { path: "/reports", name: "reports", component: () => import("../pages/ReportsPage.vue"), meta: { requiresAuth: true } },
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
