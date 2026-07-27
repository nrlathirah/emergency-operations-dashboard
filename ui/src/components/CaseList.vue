<template>
  <div>
    <h2>Cases</h2>

    <div class="filters">
      <select v-model="agencyFilter">
        <option value="">All Agencies</option>
        <option value="KKM">KKM</option>
        <option value="PDRM">PDRM</option>
        <option value="JBPM">JBPM</option>
      </select>

      <select v-model="statusFilter">
        <option value="">All Statuses</option>
        <option value="open">Open</option>
        <option value="dispatched">Dispatched</option>
        <option value="in_progress">In Progress</option>
        <option value="closed">Closed</option>
      </select>
    </div>

    <table>
      <thead>
        <tr>
          <th @click="toggleSort('caseNumber')">Case # {{ sortIndicator('caseNumber') }}</th>
          <th>Agency</th>
          <th @click="toggleSort('category')">Category {{ sortIndicator('category') }}</th>
          <th @click="toggleSort('priority')">Priority {{ sortIndicator('priority') }}</th>
          <th @click="toggleSort('status')">Status {{ sortIndicator('status') }}</th>
          <th>Location</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in cases" :key="c.id">
          <td>{{ c.caseNumber }}</td>
          <td>{{ c.Agency?.code }}</td>
          <td>{{ c.category }}</td>
          <td>{{ c.priority }}</td>
          <td>{{ c.status }}</td>
          <td>{{ c.location }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { caseService } from "../services/caseService";

const cases = ref([]);
const agencyFilter = ref("");
const statusFilter = ref("");
const sortField = ref("createdAt");
const sortOrder = ref("DESC");

const fetchCases = async () => {
  cases.value = await caseService.getAll({
    agencyCode: agencyFilter.value || undefined,
    status: statusFilter.value || undefined,
    sort: sortField.value,
    order: sortOrder.value,
  });
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

watch([agencyFilter, statusFilter, sortField, sortOrder], fetchCases);
onMounted(fetchCases);
</script>
