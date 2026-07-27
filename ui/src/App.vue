<template>
  <div class="min-h-screen bg-slate-50">
    <header class="bg-slate-900 text-white px-6 py-4">
      <h1 class="text-xl font-semibold">Emergency Operations Dashboard</h1>
      <nav class="mt-2 flex gap-4 text-sm">
        <RouterLink to="/" class="hover:text-blue-300" active-class="text-blue-400 font-medium">Live Dashboard</RouterLink>
        <RouterLink to="/users" class="hover:text-blue-300" active-class="text-blue-400 font-medium">Users</RouterLink>
        <RouterLink to="/reports" class="hover:text-blue-300" active-class="text-blue-400 font-medium">Reports</RouterLink>
      </nav>
    </header>
    <main class="p-6 max-w-6xl mx-auto">
      <RouterView />
    </main>
  </div>
</template>
