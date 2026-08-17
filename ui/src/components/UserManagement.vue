<template>
  <div class="bg-white rounded-lg shadow p-4">
    <div class="flex items-center justify-between flex-wrap gap-2 mb-3">
      <h2 class="text-lg font-semibold">User Management</h2>
      <div class="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          data-reset-requests-menu
          @click="toggleResetRequestsPopover($event)"
          class="relative px-3 py-1.5 border rounded text-sm hover:bg-gray-50 cursor-pointer transition"
        >
          🔔 Reset Requests
          <span
            v-if="resetRequests.length"
            class="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] leading-none rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center"
          >{{ resetRequests.length }}</span>
        </button>
        <button
          type="button"
          @click="showActivityDrawer = true"
          class="px-3 py-1.5 border rounded text-sm hover:bg-gray-50 cursor-pointer transition"
        >🕒 Activity</button>
        <button
          type="button"
          :disabled="exporting || total === 0"
          :title="total === 0 ? 'No users to export' : ''"
          @click="handleExport"
          class="px-3 py-1.5 border rounded text-sm hover:bg-gray-50 cursor-pointer transition disabled:opacity-60 disabled:cursor-default"
        >{{ exporting ? "Generating…" : "Export to Excel" }}</button>
        <button
          type="button"
          @click="openAddUser"
          class="px-3 py-1.5 bg-teal-600 text-white rounded text-sm hover:bg-teal-700 cursor-pointer transition"
        >+ Add User</button>
      </div>
    </div>

    <div class="flex flex-wrap gap-3 mb-4">
      <input
        v-model="search"
        type="text"
        placeholder="Search by name or email..."
        class="border rounded px-3 py-1.5 text-sm flex-1 min-w-[180px] max-w-xs"
      />
      <select v-if="isSuperAdmin" v-model="agencyFilter" class="border rounded px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50 transition">
        <option value="">All Agencies</option>
        <option value="KKM">KKM</option>
        <option value="PDRM">PDRM</option>
        <option value="JBPM">JBPM</option>
      </select>
      <select v-model="statusFilter" class="border rounded px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50 transition">
        <option value="">All Statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      <select v-model="roleFilter" class="border rounded px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50 transition">
        <option value="">All Roles</option>
        <option value="staff">Staff</option>
        <option value="super_admin">Super Admin</option>
      </select>
      <button
        v-if="hasActiveFilters"
        type="button"
        @click="clearFilters"
        class="px-3 py-1.5 border rounded text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 cursor-pointer transition"
      >✕ Reset Filters</button>
    </div>

    <p v-if="error && users.length > 0" class="text-xs text-red-500 mb-2">⚠️ {{ error }} Showing last loaded data.</p>

    <LoadingSpinner v-if="loading" />
    <ErrorBanner v-else-if="error && users.length === 0" :message="error" @retry="fetchUsers" />
    <template v-else>
      <div class="overflow-x-auto">
      <table class="w-full min-w-[850px] text-sm border-collapse">
        <thead>
          <tr class="border-b border-gray-200 text-left text-gray-500">
            <th class="py-2 pr-4 cursor-pointer select-none whitespace-nowrap" @click="toggleSort('name')">Name {{ sortIndicator('name') }}</th>
            <th class="py-2 pr-4 cursor-pointer select-none whitespace-nowrap" @click="toggleSort('email')">Email {{ sortIndicator('email') }}</th>
            <th class="py-2 pr-4 cursor-pointer select-none whitespace-nowrap" @click="toggleSort('role')">Role {{ sortIndicator('role') }}</th>
            <th class="py-2 pr-4 cursor-pointer select-none whitespace-nowrap" @click="toggleSort('agency')">Agency {{ sortIndicator('agency') }}</th>
            <th class="py-2 pr-4 cursor-pointer select-none whitespace-nowrap" @click="toggleSort('status')">Status {{ sortIndicator('status') }}</th>
            <th class="py-2 pr-4 cursor-pointer select-none whitespace-nowrap" @click="toggleSort('createdAt')">Created {{ sortIndicator('createdAt') }}</th>
            <th class="py-2 pr-4 cursor-pointer select-none whitespace-nowrap" @click="toggleSort('lastLoginAt')">Last Login {{ sortIndicator('lastLoginAt') }}</th>
            <th class="py-2 pr-4 whitespace-nowrap"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="u in users"
            :key="u.id"
            :ref="(el) => setRowRef(u.id, el)"
            class="border-b border-gray-100 transition-colors duration-700"
            :class="highlightedUserId === u.id ? 'bg-amber-100' : 'hover:bg-gray-50'"
          >
            <td class="py-2 pr-4 font-medium whitespace-nowrap">{{ u.name }}</td>
            <td class="py-2 pr-4 text-gray-600 whitespace-nowrap">{{ u.email }}</td>
            <td class="py-2 pr-4 capitalize whitespace-nowrap">{{ u.role }}</td>
            <td class="py-2 pr-4 whitespace-nowrap">{{ u.Agency?.code || "—" }}</td>
            <td class="py-2 pr-4 whitespace-nowrap">
              <span
                class="px-2 py-0.5 rounded-full text-xs"
                :class="u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'"
              >{{ u.status }}</span>
            </td>
            <td class="py-2 pr-4 text-gray-500 whitespace-nowrap">{{ formatDate(u.createdAt) }}</td>
            <td class="py-2 pr-4 text-gray-500 whitespace-nowrap">{{ formatDate(u.lastLoginAt) || "Never" }}</td>
            <td class="py-2 pr-4 whitespace-nowrap">
              <button
                type="button"
                data-action-menu
                @click="toggleActionMenu(u, $event)"
                class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 cursor-pointer text-gray-500 text-lg leading-none"
                :aria-label="`Actions for ${u.name}`"
              >⋮</button>
            </td>
          </tr>
          <tr v-if="users.length === 0">
            <td colspan="8" class="py-8 text-center text-gray-400 text-sm">
              <p>No users found{{ hasActiveFilters ? " matching your filters" : "" }}.</p>
              <button
                v-if="hasActiveFilters"
                type="button"
                @click="clearFilters"
                class="mt-2 text-teal-600 hover:underline cursor-pointer text-xs"
              >Clear filters</button>
            </td>
          </tr>
        </tbody>
      </table>
      </div>

      <!-- Action dropdown — teleported to <body> and positioned via fixed
           coords so it's never clipped by the table's overflow-x-auto wrapper. -->
      <Teleport to="body">
        <div
          v-if="actionMenuUser"
          data-action-menu
          @click.stop
          class="fixed w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 text-sm"
          :style="{ top: actionMenuPos.top + 'px', left: actionMenuPos.left + 'px', zIndex: 9999 }"
        >
          <template v-if="!confirmingDeactivate">
            <button
              type="button"
              @click="openEditName(actionMenuUser); closeActionMenu()"
              class="w-full text-left px-3 py-2 hover:bg-gray-50 cursor-pointer text-gray-600"
            >Edit Name</button>
            <button
              v-if="actionMenuUser.status === 'active'"
              type="button"
              @click="confirmingDeactivate = true"
              class="w-full text-left px-3 py-2 hover:bg-gray-50 cursor-pointer text-red-600"
            >Deactivate</button>
            <button
              v-else
              type="button"
              :disabled="togglingId === actionMenuUser.id"
              @click="toggleStatus(actionMenuUser); closeActionMenu()"
              class="w-full text-left px-3 py-2 hover:bg-gray-50 cursor-pointer text-teal-600 disabled:opacity-50 disabled:cursor-default"
            >Activate</button>
            <button
              type="button"
              @click="openResetPassword(actionMenuUser); closeActionMenu()"
              class="w-full text-left px-3 py-2 hover:bg-gray-50 cursor-pointer text-gray-600"
            >Reset Password</button>
          </template>
          <template v-else>
            <div class="px-3 py-2">
              <p class="text-[11px] text-gray-600 mb-2">Deactivate {{ actionMenuUser.name }}? They won't be able to log in until reactivated.</p>
              <div class="flex gap-2">
                <button
                  type="button"
                  :disabled="togglingId === actionMenuUser.id"
                  @click="confirmDeactivate(actionMenuUser)"
                  class="px-2.5 py-1 bg-red-600 text-white rounded text-[11px] font-medium hover:bg-red-700 cursor-pointer disabled:opacity-60 disabled:cursor-default transition"
                >{{ togglingId === actionMenuUser.id ? "…" : "Yes, Deactivate" }}</button>
                <button
                  type="button"
                  @click="confirmingDeactivate = false"
                  class="px-2.5 py-1 border border-gray-300 text-gray-500 rounded text-[11px] hover:bg-gray-50 cursor-pointer transition"
                >Cancel</button>
              </div>
            </div>
          </template>
        </div>
      </Teleport>

      <!-- Brief error toast for actions triggered outside a modal (e.g. the
           "last super admin" guard when deactivating from the dropdown). -->
      <Teleport to="body">
        <div
          v-if="actionError"
          class="fixed bottom-4 right-4 bg-red-600 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg max-w-xs"
          style="z-index: 9999;"
        >{{ actionError }}</div>
      </Teleport>

      <div class="flex items-center gap-3 mt-4 text-sm flex-wrap">
        <span class="text-gray-500 text-xs">Showing {{ rangeStart }}–{{ rangeEnd }} of {{ total }} users</span>
        <div class="flex items-center gap-3 sm:ml-auto">
          <button
            :disabled="page === 1"
            @click="page--"
            class="px-3 py-1 border rounded cursor-pointer disabled:opacity-40 disabled:cursor-default hover:bg-gray-50"
          >Previous</button>
          <span class="text-gray-600">Page {{ page }} of {{ totalPages }}</span>
          <button
            :disabled="page === totalPages"
            @click="page++"
            class="px-3 py-1 border rounded cursor-pointer disabled:opacity-40 disabled:cursor-default hover:bg-gray-50"
          >Next</button>
        </div>
      </div>
    </template>

    <!-- Recent Activity slide-over drawer -->
    <Teleport to="body">
      <div v-if="showActivityDrawer" class="fixed inset-0" style="z-index: 9999;">
        <div class="absolute inset-0 bg-black/40" @click="showActivityDrawer = false"></div>
        <div class="absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-xl flex flex-col">
          <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 class="text-sm font-semibold text-gray-800">🕒 Recent Activity</h3>
            <button
              type="button"
              @click="showActivityDrawer = false"
              class="text-gray-400 hover:text-gray-600 cursor-pointer text-lg leading-none"
              aria-label="Close"
            >✕</button>
          </div>
          <div class="flex-1 overflow-y-auto px-4 py-3">
            <p v-if="auditError" class="text-xs text-red-500 mb-3">
              ⚠️ {{ auditError }}
              <button type="button" @click="fetchAuditLog()" class="underline cursor-pointer">Retry</button>
            </p>
            <ul v-if="auditLogs.length" class="space-y-3 text-xs text-gray-600">
              <li v-for="log in auditLogs" :key="log.id" class="pb-3 border-b border-gray-50 last:border-0">
                <span class="font-medium text-gray-800">{{ log.Actor?.name || "Unknown" }}</span>
                {{ auditActionLabel(log.action) }}
                <span v-if="log.Target" class="font-medium text-gray-800">{{ log.Target.name }}</span>
                <div class="text-gray-400 mt-0.5">{{ formatDate(log.createdAt) }}</div>
              </li>
            </ul>
            <p v-else-if="!auditError" class="text-xs text-gray-400">No activity yet.</p>
          </div>
          <div v-if="auditLogs.length" class="px-4 py-3 border-t border-gray-100 text-center">
            <p class="text-[11px] text-gray-400 mb-2">Showing {{ auditLogs.length }} of {{ auditTotal }}</p>
            <button
              v-if="auditLogs.length < auditTotal"
              type="button"
              :disabled="auditLoadingMore"
              @click="loadMoreAuditLog"
              class="px-3 py-1.5 border rounded text-xs hover:bg-gray-50 cursor-pointer disabled:opacity-60 disabled:cursor-default"
            >{{ auditLoadingMore ? "Loading…" : "Load More" }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Password Reset Requests popover — a lightweight notice, not an
         action drawer. Clicking a name scrolls to and highlights that row
         in the table; the actual reset happens through the same "⋮" →
         Reset Password flow used everywhere else, so there's one reset
         path instead of two. -->
    <Teleport to="body">
      <div
        v-if="showResetRequestsPopover"
        data-reset-requests-menu
        @click.stop
        class="fixed w-80 bg-white border border-gray-200 rounded-xl shadow-xl text-sm overflow-hidden"
        :style="{ top: resetRequestsPopoverPos.top + 'px', left: resetRequestsPopoverPos.left + 'px', zIndex: 9999 }"
      >
        <div class="flex items-center justify-between px-4 py-3 bg-amber-50 border-b border-amber-100">
          <div class="flex items-center gap-2">
            <span class="text-base">🔔</span>
            <h4 class="text-sm font-semibold text-gray-800">Password Reset Requests</h4>
          </div>
          <button
            type="button"
            @click="closeResetRequestsPopover"
            class="text-gray-400 hover:text-gray-600 cursor-pointer text-base leading-none"
            aria-label="Close"
          >✕</button>
        </div>

        <div class="flex border-b border-gray-100 text-xs">
          <button
            type="button"
            @click="resetRequestsTab = 'pending'"
            class="flex-1 px-3 py-2 font-medium cursor-pointer transition"
            :class="resetRequestsTab === 'pending' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-500 hover:text-gray-700'"
          >Pending{{ resetRequests.length ? ` (${resetRequests.length})` : "" }}</button>
          <button
            type="button"
            @click="openHistoryTab"
            class="flex-1 px-3 py-2 font-medium cursor-pointer transition"
            :class="resetRequestsTab === 'history' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-500 hover:text-gray-700'"
          >History</button>
        </div>

        <template v-if="resetRequestsTab === 'pending'">
          <p v-if="resetRequestsError" class="text-xs text-red-500 px-4 py-3">
            ⚠️ {{ resetRequestsError }}
            <button type="button" @click="fetchResetRequests" class="underline cursor-pointer">Retry</button>
          </p>

          <ul v-if="resetRequests.length" class="max-h-80 overflow-y-auto divide-y divide-gray-50">
            <li v-for="req in resetRequests" :key="req.id" class="px-4 py-3">
              <template v-if="confirmingDismissId !== req.id">
                <div class="flex items-start gap-3">
                  <button
                    type="button"
                    @click="scrollToUser(req)"
                    class="flex items-start gap-3 flex-1 min-w-0 text-left cursor-pointer group"
                  >
                    <span class="flex-shrink-0 w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-semibold">
                      {{ (req.User?.name || req.email).charAt(0).toUpperCase() }}
                    </span>
                    <span class="min-w-0">
                      <span class="block font-medium text-gray-800 truncate group-hover:text-teal-600 transition">{{ req.User?.name || req.email }}</span>
                      <span class="block text-[11px] text-gray-400">Requested {{ formatDate(req.createdAt) }}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    @click="confirmingDismissId = req.id"
                    title="Remove request"
                    aria-label="Remove request"
                    class="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-gray-300 hover:text-red-600 hover:bg-red-50 cursor-pointer transition"
                  >✕</button>
                </div>
              </template>
              <template v-else>
                <div class="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                  <p class="text-amber-700 text-[11px] mb-2">Remove without resetting? They won't be notified — they'll have to try again or contact you directly.</p>
                  <div class="flex gap-2">
                    <button
                      type="button"
                      :disabled="processingRequestId === req.id"
                      @click="handleDismissRequest(req)"
                      class="px-2.5 py-1 bg-red-600 text-white rounded text-[11px] font-medium hover:bg-red-700 cursor-pointer disabled:opacity-60 disabled:cursor-default transition"
                    >{{ processingRequestId === req.id ? "…" : "Yes, Remove" }}</button>
                    <button
                      type="button"
                      @click="confirmingDismissId = null"
                      class="px-2.5 py-1 border border-gray-300 text-gray-500 rounded text-[11px] hover:bg-gray-50 cursor-pointer transition"
                    >Cancel</button>
                  </div>
                </div>
              </template>
            </li>
          </ul>
          <div v-else-if="!resetRequestsError" class="text-center px-4 py-8">
            <div class="text-2xl mb-1">✅</div>
            <p class="text-xs text-gray-400">All caught up — no pending requests.</p>
          </div>

          <div v-if="resetRequests.length" class="px-4 py-2 bg-gray-50 border-t border-gray-100">
            <p class="text-[10px] text-gray-400">Click a name to locate them in the table below.</p>
          </div>
        </template>

        <template v-else>
          <p v-if="resetHistoryError" class="text-xs text-red-500 px-4 py-3">
            ⚠️ {{ resetHistoryError }}
            <button type="button" @click="fetchResetRequestHistory()" class="underline cursor-pointer">Retry</button>
          </p>

          <ul v-if="resetHistory.length" class="max-h-80 overflow-y-auto divide-y divide-gray-50">
            <li v-for="req in resetHistory" :key="req.id" class="px-4 py-3 text-xs">
              <div class="flex items-start gap-3">
                <span class="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-semibold">
                  {{ (req.User?.name || req.email).charAt(0).toUpperCase() }}
                </span>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-gray-800 truncate">{{ req.User?.name || req.email }}</span>
                    <span
                      class="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                      :class="req.status === 'resolved' ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-500'"
                    >{{ req.status === "resolved" ? "Resolved" : "Dismissed" }}</span>
                  </div>
                  <div class="text-gray-400 mt-0.5">Requested {{ formatDate(req.createdAt) }}</div>
                  <div class="text-gray-400">By {{ req.ResolvedByUser?.name || "Unknown" }} · {{ formatDate(req.resolvedAt) }}</div>
                </div>
              </div>
            </li>
          </ul>
          <div v-else-if="!resetHistoryError" class="text-center px-4 py-8">
            <p class="text-xs text-gray-400">No history yet.</p>
          </div>

          <div v-if="resetHistory.length" class="px-4 py-2 bg-gray-50 border-t border-gray-100 text-center">
            <p class="text-[11px] text-gray-400 mb-2">Showing {{ resetHistory.length }} of {{ resetHistoryTotal }}</p>
            <button
              v-if="resetHistory.length < resetHistoryTotal"
              type="button"
              :disabled="resetHistoryLoadingMore"
              @click="loadMoreResetHistory"
              class="px-3 py-1.5 border rounded text-xs hover:bg-gray-50 cursor-pointer disabled:opacity-60 disabled:cursor-default"
            >{{ resetHistoryLoadingMore ? "Loading…" : "Load More" }}</button>
          </div>
        </template>
      </div>
    </Teleport>

    <!-- Edit Name modal -->
    <div v-if="editNameTarget" class="fixed inset-0 flex items-center justify-center bg-black/40 px-4" style="z-index: 9999;">
      <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
        <h3 class="text-base font-semibold mb-4">Edit Name</h3>
        <form @submit.prevent="handleEditName" class="space-y-3">
          <div>
            <label class="block text-xs text-gray-600 mb-1">Name</label>
            <input
              v-model="editNameValue"
              type="text"
              required
              class="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
            />
            <p class="text-[11px] text-gray-400 mt-1">Email can't be changed here — it's the account's login identifier.</p>
          </div>

          <p v-if="editNameError" class="text-red-600 text-xs">{{ editNameError }}</p>

          <div class="flex gap-2 pt-2">
            <button
              type="button"
              @click="closeEditName"
              class="flex-1 px-3 py-2 border rounded text-sm hover:bg-gray-50 cursor-pointer"
            >Cancel</button>
            <button
              type="submit"
              :disabled="savingName"
              class="flex-1 px-3 py-2 bg-teal-600 text-white rounded text-sm hover:bg-teal-700 cursor-pointer disabled:opacity-60 disabled:cursor-default"
            >{{ savingName ? "Saving…" : "Save" }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Add User modal -->
    <div v-if="showAddUser" class="fixed inset-0 flex items-center justify-center bg-black/40 px-4" style="z-index: 9999;">
      <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
        <template v-if="!createdCredentials">
          <h3 class="text-base font-semibold mb-4">Add User</h3>
          <form @submit.prevent="handleAddUser" class="space-y-3">
            <div>
              <label class="block text-xs text-gray-600 mb-1">Name</label>
              <input
                v-model="form.name"
                type="text"
                required
                class="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              />
            </div>
            <div>
              <label class="block text-xs text-gray-600 mb-1">Email</label>
              <input
                v-model="form.email"
                type="email"
                required
                class="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              />
            </div>
            <div>
              <label class="block text-xs text-gray-600 mb-1">Temporary Password</label>
              <div class="flex gap-2">
                <PasswordInput v-model="form.password" required minlength="6" class="flex-1" />
                <button
                  type="button"
                  @click="form.password = generateTempPassword()"
                  title="Generate a new one"
                  class="px-2.5 border rounded text-sm hover:bg-gray-50 cursor-pointer flex-shrink-0"
                >🔄</button>
              </div>
              <p class="text-[11px] text-gray-400 mt-1">Auto-generated — you'll share this with the user after creating. They'll be required to set their own on first login.</p>
            </div>
            <div>
              <label class="block text-xs text-gray-600 mb-1">Role</label>
              <select
                v-model="form.role"
                class="w-full border border-gray-300 rounded px-3 py-1.5 text-sm cursor-pointer"
              >
                <option value="staff">Staff</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div v-if="form.role !== 'super_admin'">
              <label class="block text-xs text-gray-600 mb-1">Agency</label>
              <select
                v-model="form.agencyCode"
                required
                class="w-full border border-gray-300 rounded px-3 py-1.5 text-sm cursor-pointer"
              >
                <option value="" disabled>Select agency</option>
                <option value="KKM">KKM</option>
                <option value="PDRM">PDRM</option>
                <option value="JBPM">JBPM</option>
              </select>
            </div>

            <p v-if="formError" class="text-red-600 text-xs">{{ formError }}</p>

            <div class="flex gap-2 pt-2">
              <button
                type="button"
                @click="closeAddUser"
                class="flex-1 px-3 py-2 border rounded text-sm hover:bg-gray-50 cursor-pointer"
              >Cancel</button>
              <button
                type="submit"
                :disabled="submitting"
                class="flex-1 px-3 py-2 bg-teal-600 text-white rounded text-sm hover:bg-teal-700 cursor-pointer disabled:opacity-60 disabled:cursor-default"
              >{{ submitting ? "Adding…" : "Add User" }}</button>
            </div>
          </form>
        </template>

        <!-- Shown once, right after creation — this password is never
             retrievable again since it's only ever stored as a hash. -->
        <template v-else>
          <h3 class="text-base font-semibold mb-1">✅ User Created</h3>
          <p class="text-xs text-gray-500 mb-3">Share this temporary password with {{ createdCredentials.name }} now — it won't be shown again.</p>
          <div class="flex items-center gap-2 bg-gray-50 border rounded px-3 py-2 mb-2">
            <code class="flex-1 text-sm font-mono">{{ createdCredentials.password }}</code>
            <button
              type="button"
              @click="copyPassword(createdCredentials.password)"
              class="px-2.5 py-1 rounded text-xs font-medium cursor-pointer flex-shrink-0 transition"
              :class="copied ? 'bg-teal-600 text-white' : 'border border-teal-600 text-teal-600 hover:bg-teal-50'"
            >{{ copied ? "Copied!" : "📋 Copy" }}</button>
          </div>
          <p class="text-[11px] text-amber-600 mb-4">⚠️ Copy it now — if lost, you'll need to reset this user's password again to get a new one.</p>
          <button
            type="button"
            @click="closeAddUser"
            class="w-full px-3 py-2 bg-teal-600 text-white rounded text-sm hover:bg-teal-700 cursor-pointer"
          >Done</button>
        </template>
      </div>
    </div>

    <!-- Reset Password modal -->
    <div v-if="resetTarget" class="fixed inset-0 flex items-center justify-center bg-black/40 px-4" style="z-index: 9999;">
      <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
        <template v-if="!resetCredentials">
          <h3 class="text-base font-semibold mb-1">Reset Password</h3>
          <p class="text-xs text-gray-500 mb-4">Set a new temporary password for {{ resetTarget.name }}. They'll be required to set their own on next login.</p>
          <form @submit.prevent="handleResetPassword" class="space-y-3">
            <div>
              <label class="block text-xs text-gray-600 mb-1">New Temporary Password</label>
              <div class="flex gap-2">
                <PasswordInput v-model="resetPasswordValue" required minlength="6" class="flex-1" />
                <button
                  type="button"
                  @click="resetPasswordValue = generateTempPassword()"
                  title="Generate a new one"
                  class="px-2.5 border rounded text-sm hover:bg-gray-50 cursor-pointer flex-shrink-0"
                >🔄</button>
              </div>
            </div>

            <p v-if="resetError" class="text-red-600 text-xs">{{ resetError }}</p>

            <div class="flex gap-2 pt-2">
              <button
                type="button"
                @click="closeResetPassword"
                class="flex-1 px-3 py-2 border rounded text-sm hover:bg-gray-50 cursor-pointer"
              >Cancel</button>
              <button
                type="submit"
                :disabled="resetting"
                class="flex-1 px-3 py-2 bg-teal-600 text-white rounded text-sm hover:bg-teal-700 cursor-pointer disabled:opacity-60 disabled:cursor-default"
              >{{ resetting ? "Resetting…" : "Reset Password" }}</button>
            </div>
          </form>
        </template>

        <template v-else>
          <h3 class="text-base font-semibold mb-1">✅ Password Reset</h3>
          <p class="text-xs text-gray-500 mb-3">Share this temporary password with {{ resetTarget.name }} now — it won't be shown again.</p>
          <div class="flex items-center gap-2 bg-gray-50 border rounded px-3 py-2 mb-2">
            <code class="flex-1 text-sm font-mono">{{ resetCredentials }}</code>
            <button
              type="button"
              @click="copyPassword(resetCredentials)"
              class="px-2.5 py-1 rounded text-xs font-medium cursor-pointer flex-shrink-0 transition"
              :class="copied ? 'bg-teal-600 text-white' : 'border border-teal-600 text-teal-600 hover:bg-teal-50'"
            >{{ copied ? "Copied!" : "📋 Copy" }}</button>
          </div>
          <p class="text-[11px] text-amber-600 mb-4">⚠️ Copy it now — if lost, you'll need to reset this user's password again to get a new one.</p>
          <button
            type="button"
            @click="closeResetPassword"
            class="w-full px-3 py-2 bg-teal-600 text-white rounded text-sm hover:bg-teal-700 cursor-pointer"
          >Done</button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { userService } from "../services/userService";
import { useAuthStore } from "../stores/auth";
import LoadingSpinner from "./LoadingSpinner.vue";
import ErrorBanner from "./ErrorBanner.vue";
import PasswordInput from "./PasswordInput.vue";

// Readable temp password (e.g. "Welcome4821") — easy for an admin to relay
// verbally or by message. Never persisted in plaintext; only shown once
// right after creation/reset, since the DB only ever stores the bcrypt hash.
const generateTempPassword = () => `Welcome${Math.floor(1000 + Math.random() * 9000)}`;

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString("en-MY", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : null;

const copied = ref(false);
const copyPassword = async (value) => {
  await navigator.clipboard.writeText(value);
  copied.value = true;
  setTimeout(() => (copied.value = false), 1500);
};

const authStore = useAuthStore();
const isSuperAdmin = computed(() => authStore.user?.role === "super_admin");

const users = ref([]);
const search = ref("");
const agencyFilter = ref("");
const statusFilter = ref("");
const roleFilter = ref("");
const sortField = ref("name");
const sortOrder = ref("ASC");
const page = ref(1);
const limit = 10;
const total = ref(0);

const hasActiveFilters = computed(
  () => !!(search.value || agencyFilter.value || statusFilter.value || roleFilter.value)
);
const clearFilters = () => {
  search.value = "";
  agencyFilter.value = "";
  statusFilter.value = "";
  roleFilter.value = "";
};
const loading = ref(true);
const error = ref(null);
const togglingId = ref(null);

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit)));
const rangeStart = computed(() => (total.value === 0 ? 0 : (page.value - 1) * limit + 1));
const rangeEnd = computed(() => Math.min(page.value * limit, total.value));

const showActivityDrawer = ref(false);
const auditLogs = ref([]);
const auditTotal = ref(0);
const auditPage = ref(1);
const auditLoadingMore = ref(false);
const auditError = ref("");
const AUDIT_PAGE_SIZE = 10;
const AUDIT_ACTION_LABELS = {
  create_user: "created user",
  activate_user: "activated",
  deactivate_user: "deactivated",
  reset_password: "reset the password for",
  update_name: "renamed",
};
const auditActionLabel = (action) => AUDIT_ACTION_LABELS[action] || action;

// `reset` starts back at page 1 and replaces the list — used on mount and
// after any action, so the newest entry always surfaces at the top.
const fetchAuditLog = async (reset = true) => {
  if (reset) auditPage.value = 1;
  try {
    const result = await userService.getAuditLog({ page: auditPage.value, limit: AUDIT_PAGE_SIZE });
    auditLogs.value = reset ? result.data : [...auditLogs.value, ...result.data];
    auditTotal.value = result.total;
    auditError.value = "";
  } catch (err) {
    auditError.value = "Couldn't load activity.";
  }
};

const loadMoreAuditLog = async () => {
  auditLoadingMore.value = true;
  auditPage.value += 1;
  await fetchAuditLog(false);
  auditLoadingMore.value = false;
};

const showResetRequestsPopover = ref(false);
const resetRequestsPopoverPos = ref({ top: 0, left: 0 });
const resetRequests = ref([]);
const resetRequestsError = ref("");
const processingRequestId = ref(null);
const confirmingDismissId = ref(null);

const fetchResetRequests = async () => {
  try {
    resetRequests.value = await userService.getResetRequests();
    resetRequestsError.value = "";
  } catch (err) {
    resetRequestsError.value = "Couldn't load requests.";
  }
};

const toggleResetRequestsPopover = (event) => {
  if (showResetRequestsPopover.value) {
    showResetRequestsPopover.value = false;
    return;
  }
  confirmingDismissId.value = null;
  resetRequestsTab.value = "pending";
  const rect = event.currentTarget.getBoundingClientRect();
  resetRequestsPopoverPos.value = { top: rect.bottom + 4, left: rect.left };
  showResetRequestsPopover.value = true;
  fetchResetRequests();
};

const resetRequestsTab = ref("pending");
const resetHistory = ref([]);
const resetHistoryTotal = ref(0);
const resetHistoryPage = ref(1);
const resetHistoryError = ref("");
const resetHistoryLoadingMore = ref(false);
const RESET_HISTORY_PAGE_SIZE = 10;

const fetchResetRequestHistory = async (reset = true) => {
  if (reset) resetHistoryPage.value = 1;
  try {
    const result = await userService.getResetRequestHistory({ page: resetHistoryPage.value, limit: RESET_HISTORY_PAGE_SIZE });
    resetHistory.value = reset ? result.data : [...resetHistory.value, ...result.data];
    resetHistoryTotal.value = result.total;
    resetHistoryError.value = "";
  } catch (err) {
    resetHistoryError.value = "Couldn't load history.";
  }
};

const loadMoreResetHistory = async () => {
  resetHistoryLoadingMore.value = true;
  resetHistoryPage.value += 1;
  await fetchResetRequestHistory(false);
  resetHistoryLoadingMore.value = false;
};

const openHistoryTab = () => {
  resetRequestsTab.value = "history";
  fetchResetRequestHistory();
};

const closeResetRequestsPopover = () => {
  showResetRequestsPopover.value = false;
};

const handleOutsideResetRequestsClick = (e) => {
  if (!e.target.closest("[data-reset-requests-menu]")) closeResetRequestsPopover();
};

const handleDismissRequest = async (req) => {
  processingRequestId.value = req.id;
  try {
    await userService.dismissResetRequest(req.id);
    // Refetch rather than locally filter, so a stray duplicate request for
    // the same user (e.g. from a double-submit) stays visible instead of
    // looking like dismissing "did nothing" once this one disappears.
    await fetchResetRequests();
  } catch (err) {
    resetRequestsError.value = err.response?.data?.message || "Failed to dismiss request.";
  } finally {
    processingRequestId.value = null;
    confirmingDismissId.value = null;
  }
};

// Table rows register themselves here by user id so a reset request can be
// scrolled to and highlighted without needing a separate "resolve" action —
// the actual reset happens through the row's own "⋮" → Reset Password.
const rowRefs = {};
const setRowRef = (id, el) => {
  if (el) rowRefs[id] = el;
  else delete rowRefs[id];
};

const highlightedUserId = ref(null);
let highlightTimeout;

const scrollToUser = async (req) => {
  closeResetRequestsPopover();

  // Clear filters and search by exact email so the row is guaranteed to be
  // on the very next page fetched, regardless of current filter/page state.
  search.value = req.User?.email || req.email;
  agencyFilter.value = "";
  statusFilter.value = "";
  roleFilter.value = "";
  page.value = 1;
  await fetchUsers();
  await nextTick();

  const el = rowRefs[req.userId];
  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });

  highlightedUserId.value = req.userId;
  clearTimeout(highlightTimeout);
  highlightTimeout = setTimeout(() => (highlightedUserId.value = null), 2500);
};

const fetchUsers = async () => {
  try {
    const result = await userService.getAll({
      search: search.value || undefined,
      agencyCode: agencyFilter.value || undefined,
      status: statusFilter.value || undefined,
      role: roleFilter.value || undefined,
      sort: sortField.value,
      order: sortOrder.value,
      page: page.value,
      limit,
    });
    users.value = result.data;
    total.value = result.total;
    error.value = null;
  } catch (err) {
    error.value = "Failed to load users.";
  } finally {
    loading.value = false;
  }
};

const exporting = ref(false);
const handleExport = async () => {
  if (exporting.value) return;
  exporting.value = true;
  try {
    const blob = await userService.downloadUsersExcel({
      search: search.value || undefined,
      agencyCode: agencyFilter.value || undefined,
      status: statusFilter.value || undefined,
      role: roleFilter.value || undefined,
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "users-report.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    showActionError("Couldn't generate the export. Please try again.");
  } finally {
    exporting.value = false;
  }
};

// First click on a column starts at whichever direction reads most natural
// for that data — alphabetical for text, newest-first for dates.
const SORT_DEFAULT_DIRECTION = {
  name: "ASC",
  email: "ASC",
  role: "ASC",
  agency: "ASC",
  status: "ASC",
  createdAt: "DESC",
  lastLoginAt: "DESC",
};

const toggleSort = (field) => {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === "ASC" ? "DESC" : "ASC";
  } else {
    sortField.value = field;
    sortOrder.value = SORT_DEFAULT_DIRECTION[field] || "ASC";
  }
};

const sortIndicator = (field) =>
  sortField.value === field ? (sortOrder.value === "ASC" ? "▲" : "▼") : "";

// Flips a user's active/inactive status — enforced server-side too (a
// deactivated account is rejected at login, not just hidden in the UI).
const actionError = ref("");
let actionErrorTimeout;
const showActionError = (message) => {
  actionError.value = message;
  clearTimeout(actionErrorTimeout);
  actionErrorTimeout = setTimeout(() => (actionError.value = ""), 4000);
};

const editNameTarget = ref(null);
const editNameValue = ref("");
const editNameError = ref("");
const savingName = ref(false);

const openEditName = (u) => {
  editNameTarget.value = u;
  editNameValue.value = u.name;
  editNameError.value = "";
};

const closeEditName = () => {
  editNameTarget.value = null;
};

const handleEditName = async () => {
  editNameError.value = "";
  savingName.value = true;
  try {
    await userService.updateName(editNameTarget.value.id, editNameValue.value);
    closeEditName();
    await fetchUsers();
    fetchAuditLog();
  } catch (err) {
    editNameError.value = err.response?.data?.message || "Failed to update name.";
  } finally {
    savingName.value = false;
  }
};

const toggleStatus = async (u) => {
  togglingId.value = u.id;
  try {
    await userService.updateStatus(u.id, u.status === "active" ? "inactive" : "active");
    await fetchUsers();
    fetchAuditLog();
  } catch (err) {
    showActionError(err.response?.data?.message || "Failed to update user status.");
  } finally {
    togglingId.value = null;
  }
};

// Per-row "⋮" action menu — only one open at a time, positioned in fixed
// coords (via the trigger button's rect) so it renders above the table
// regardless of the overflow-x-auto wrapper or scroll position.
const actionMenuUser = ref(null);
const actionMenuPos = ref({ top: 0, left: 0 });

const confirmingDeactivate = ref(false);

const toggleActionMenu = (u, event) => {
  confirmingDeactivate.value = false;
  if (actionMenuUser.value?.id === u.id) {
    actionMenuUser.value = null;
    return;
  }
  const rect = event.currentTarget.getBoundingClientRect();
  const MENU_WIDTH = 176; // matches the drawer's w-44
  const left = Math.min(Math.max(8, rect.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - 8);
  actionMenuPos.value = { top: rect.bottom + 4, left };
  actionMenuUser.value = u;
};

const closeActionMenu = () => {
  actionMenuUser.value = null;
  confirmingDeactivate.value = false;
};

const confirmDeactivate = (u) => {
  toggleStatus(u);
  closeActionMenu();
};

const handleOutsideMenuClick = (e) => {
  if (!e.target.closest("[data-action-menu]")) closeActionMenu();
};

onMounted(() => {
  window.addEventListener("click", handleOutsideMenuClick);
  window.addEventListener("scroll", closeActionMenu, true);
  window.addEventListener("click", handleOutsideResetRequestsClick);
  window.addEventListener("scroll", closeResetRequestsPopover, true);
});
onUnmounted(() => {
  window.removeEventListener("click", handleOutsideMenuClick);
  window.removeEventListener("scroll", closeActionMenu, true);
  window.removeEventListener("click", handleOutsideResetRequestsClick);
  window.removeEventListener("scroll", closeResetRequestsPopover, true);
});

const showAddUser = ref(false);
const submitting = ref(false);
const formError = ref("");
const createdCredentials = ref(null);
const emptyForm = () => ({ name: "", email: "", password: generateTempPassword(), role: "staff", agencyCode: "" });
const form = ref(emptyForm());

const openAddUser = () => {
  form.value = emptyForm();
  formError.value = "";
  createdCredentials.value = null;
  showAddUser.value = true;
};

const closeAddUser = () => {
  showAddUser.value = false;
  createdCredentials.value = null;
};

const handleAddUser = async () => {
  formError.value = "";
  submitting.value = true;
  try {
    await userService.create({
      name: form.value.name,
      email: form.value.email,
      password: form.value.password,
      role: form.value.role,
      agencyCode: form.value.role === "super_admin" ? undefined : form.value.agencyCode,
    });
    createdCredentials.value = { name: form.value.name, password: form.value.password };
    page.value = 1;
    await fetchUsers();
    fetchAuditLog();
  } catch (err) {
    formError.value = err.response?.data?.message || "Failed to add user.";
  } finally {
    submitting.value = false;
  }
};

const resetTarget = ref(null);
const resetPasswordValue = ref("");
const resetError = ref("");
const resetting = ref(false);
const resetCredentials = ref(null);

const openResetPassword = (u) => {
  resetTarget.value = u;
  resetPasswordValue.value = generateTempPassword();
  resetError.value = "";
  resetCredentials.value = null;
};

const closeResetPassword = () => {
  resetTarget.value = null;
  resetCredentials.value = null;
};

const handleResetPassword = async () => {
  resetError.value = "";
  resetting.value = true;
  try {
    await userService.resetPassword(resetTarget.value.id, resetPasswordValue.value);
    resetCredentials.value = resetPasswordValue.value;
    fetchAuditLog();
    fetchResetRequests();
  } catch (err) {
    resetError.value = err.response?.data?.message || "Failed to reset password.";
  } finally {
    resetting.value = false;
  }
};

watch([search, agencyFilter, statusFilter, roleFilter, sortField, sortOrder], () => {
  page.value = 1;
  fetchUsers();
});
watch(page, fetchUsers);

onMounted(() => {
  fetchUsers();
  fetchAuditLog();
  fetchResetRequests();
});
</script>
