<template>
  <div>
    <h2>User Management</h2>

    <div class="controls">
      <input v-model="search" type="text" placeholder="Search by name or email..." />
      <select v-model="agencyFilter">
        <option value="">All Agencies</option>
        <option value="KKM">KKM</option>
        <option value="PDRM">PDRM</option>
        <option value="JBPM">JBPM</option>
      </select>
    </div>

    <table>
      <thead>
        <tr>
          <th @click="toggleSort('name')">Name {{ sortIndicator('name') }}</th>
          <th @click="toggleSort('email')">Email {{ sortIndicator('email') }}</th>
          <th>Agency</th>
          <th @click="toggleSort('role')">Role {{ sortIndicator('role') }}</th>
          <th @click="toggleSort('status')">Status {{ sortIndicator('status') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in users" :key="u.id">
          <td>{{ u.name }}</td>
          <td>{{ u.email }}</td>
          <td>{{ u.Agency?.code }}</td>
          <td>{{ u.role }}</td>
          <td>{{ u.status }}</td>
        </tr>
      </tbody>
    </table>

    <div class="pagination">
      <button :disabled="page === 1" @click="page--">Previous</button>
      <span>Page {{ page }} of {{ totalPages }}</span>
      <button :disabled="page === totalPages" @click="page++">Next</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { userService } from "../services/userService";

const users = ref([]);
const search = ref("");
const agencyFilter = ref("");
const sortField = ref("name");
const sortOrder = ref("ASC");
const page = ref(1);
const limit = 5;
const total = ref(0);

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit)));

const fetchUsers = async () => {
  const result = await userService.getAll({
    search: search.value || undefined,
    agencyCode: agencyFilter.value || undefined,
    sort: sortField.value,
    order: sortOrder.value,
    page: page.value,
    limit,
  });
  users.value = result.data;
  total.value = result.total;
};

const toggleSort = (field) => {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === "ASC" ? "DESC" : "ASC";
  } else {
    sortField.value = field;
    sortOrder.value = "ASC";
  }
};

const sortIndicator = (field) =>
  sortField.value === field ? (sortOrder.value === "ASC" ? "▲" : "▼") : "";

watch([search, agencyFilter, sortField, sortOrder], () => {
  page.value = 1;
  fetchUsers();
});
watch(page, fetchUsers);

onMounted(fetchUsers);
</script>
