<template>
  <div>
    <div class="rb-topbar">
      <div class="rb-brand">
        <span class="rb-brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
        </span>
        <div>
          <span class="rb-eyebrow">Emergency Operations</span>
          <h1>User Management</h1>
        </div>
      </div>
    </div>

    <div class="rb-section">
      <UserManagement />
    </div>
  </div>
</template>

<script setup>
import UserManagement from "../components/UserManagement.vue";
</script>
