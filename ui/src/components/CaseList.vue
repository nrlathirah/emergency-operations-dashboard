<template>
  <div>
    <h2>Cases</h2>
    <table>
      <thead>
        <tr>
          <th>Case #</th>
          <th>Agency</th>
          <th>Category</th>
          <th>Priority</th>
          <th>Status</th>
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
import { ref, onMounted } from "vue";
import { caseService } from "../services/caseService";

const cases = ref([]);

onMounted(async () => {
  cases.value = await caseService.getAll();
});
</script>
