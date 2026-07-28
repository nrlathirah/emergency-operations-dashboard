import { createRouter, createWebHistory } from "vue-router";
import DashboardPage from "../pages/DashboardPage.vue";
import UsersPage from "../pages/UsersPage.vue";
import ReportsPage from "../pages/ReportsPage.vue";
import LoginPage from "../pages/LoginPage.vue";
import { useAuthStore } from "../stores/auth";

const routes = [
  { path: "/login", name: "login", component: LoginPage },
  { path: "/", name: "dashboard", component: DashboardPage, meta: { requiresAuth: true } },
  { path: "/users", name: "users", component: UsersPage, meta: { requiresAuth: true } },
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
});
