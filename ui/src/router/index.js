import { createRouter, createWebHistory } from "vue-router";
import DashboardPage from "../pages/DashboardPage.vue";
import UsersPage from "../pages/UsersPage.vue";
import ReportsPage from "../pages/ReportsPage.vue";

const routes = [
  { path: "/", name: "dashboard", component: DashboardPage },
  { path: "/users", name: "users", component: UsersPage },
  { path: "/reports", name: "reports", component: ReportsPage },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
