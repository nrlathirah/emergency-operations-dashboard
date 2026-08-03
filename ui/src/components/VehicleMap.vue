<template>
  <div ref="mapCardRef" class="bg-white rounded-lg shadow p-4">
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-lg font-semibold">Live Vehicle Map</h2>
      <button
        type="button"
        @click="clearFocus"
        class="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 text-gray-600"
      >Reset View</button>
    </div>
    <p class="text-xs text-gray-500 mb-2">Vehicle markers are hidden by default — click an incident or station to reveal the vehicle involved. Click an incident pin again for a "Show on table" button. Click empty map area or "Reset View" to reset.</p>
    <div class="relative">
      <div id="map" style="height: 500px; width: 100%;" class="rounded"></div>
      <div v-if="mapLoading" class="absolute inset-0 flex items-center justify-center bg-white/70 rounded">
        <LoadingSpinner />
      </div>
    </div>

    <div class="flex flex-wrap gap-4 mt-3 text-xs text-gray-600">
      <span class="flex items-center gap-1.5 transition-opacity" :class="{ 'opacity-30': !anyStationTypeVisible('hospital') }">
        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white" style="box-shadow:0 1px 4px rgba(0,0,0,0.5);">
          <svg width="12" height="12" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="#dc2626"/><circle cx="21" cy="12" r="10" fill="white"/></svg>
        </span>
        Hospital
      </span>
      <span class="flex items-center gap-1.5 transition-opacity" :class="{ 'opacity-30': !anyStationTypeVisible('police_station') }">
        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white text-xs" style="box-shadow:0 1px 4px rgba(0,0,0,0.5);">👮</span>
        Police Station
      </span>
      <span class="flex items-center gap-1.5 transition-opacity" :class="{ 'opacity-30': !anyStationTypeVisible('fire_station') }">
        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white text-xs" style="box-shadow:0 1px 4px rgba(0,0,0,0.5);">🧑‍🚒</span>
        Fire Station
      </span>
      <span class="flex items-center gap-1.5 transition-opacity" :class="{ 'opacity-30': !anyVehicleTypeVisible('ambulance') }">
        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white border-2 text-xs" style="border-color:#dc2626">🚑</span>
        Ambulance (KKM)
      </span>
      <span class="flex items-center gap-1.5 transition-opacity" :class="{ 'opacity-30': !anyVehicleTypeVisible('police_car') }">
        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white border-2 text-xs" style="border-color:#2563eb">🚓</span>
        Police Car (PDRM)
      </span>
      <span class="flex items-center gap-1.5 transition-opacity" :class="{ 'opacity-30': !anyVehicleTypeVisible('fire_truck') }">
        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white border-2 text-xs" style="border-color:#f59e0b">🚒</span>
        Fire Truck (JBPM)
      </span>
      <span class="flex items-center gap-1.5 transition-opacity" :class="{ 'opacity-30': !anyIncidentAgencyVisible('KKM') }">
        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full" style="background:#dc2626">
          <span class="block w-1.5 h-1.5 rounded-full bg-white"></span>
        </span>
        KKM Incident
      </span>
      <span class="flex items-center gap-1.5 transition-opacity" :class="{ 'opacity-30': !anyIncidentAgencyVisible('PDRM') }">
        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full" style="background:#2563eb">
          <span class="block w-1.5 h-1.5 rounded-full bg-white"></span>
        </span>
        PDRM Incident
      </span>
      <span class="flex items-center gap-1.5 transition-opacity" :class="{ 'opacity-30': !anyIncidentAgencyVisible('JBPM') }">
        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full" style="background:#f59e0b">
          <span class="block w-1.5 h-1.5 rounded-full bg-white"></span>
        </span>
        JBPM Incident
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { vehicleService } from "../services/vehicleService";
import { caseService } from "../services/caseService";
import { stationService } from "../services/stationService";
import LoadingSpinner from "./LoadingSpinner.vue";

const props = defineProps({
  agencyFilter: { type: String, default: "" },
  statusFilter: { type: String, default: "" },
  // Composite "id:timestamp" string set by the table's "Show on map" button —
  // the timestamp guarantees a fresh value even for the same case twice in a row.
  focusCaseId: { type: String, default: null },
});

const emit = defineEmits(["focus-case"]);

const mapCardRef = ref(null);
let map;
const vehicleMarkers = {};
const incidentMarkers = {};
const stationMarkers = {};
const routeLines = {};
let pollTimer;
let focusBoundaryLayer = null;
const mapLoading = ref(true);

const DEFAULT_CENTER = [3.139, 101.6869];
const DEFAULT_ZOOM = 11;
const DIM_OPACITY = 0.25;

// Reactive data snapshots, used both for rendering and for legend/focus calculations
const stationsData = ref([]);
const activeCasesData = ref([]);
const activeVehiclesData = ref([]); // only vehicles currently linked to an active incident

// { type: 'incident' | 'station', id } | null
const focus = ref(null);

const AGENCY_COLORS = { KKM: "#dc2626", PDRM: "#2563eb", JBPM: "#f59e0b" };
const VEHICLE_EMOJI = { ambulance: "🚑", police_car: "🚓", fire_truck: "🚒" };

const CRESCENT_SVG = `<svg width="16" height="16" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="#dc2626"/><circle cx="21" cy="12" r="10" fill="white"/></svg>`;

const STATION_ICONS = {
  hospital: CRESCENT_SVG,
  police_station: `<span style="font-size:14px;">👮</span>`,
  fire_station: `<span style="font-size:14px;">🧑‍🚒</span>`,
};

const stationPinIcon = (innerHtml, size = 30) =>
  L.divIcon({
    html: `<div style="width:${size}px; height:${size}px; background:#ffffff; border-radius:50% 50% 50% 0; transform:rotate(-45deg); box-shadow:0 1px 5px rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center;"><div style="transform:rotate(45deg); line-height:1;">${innerHtml}</div></div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });

const vehiclePinIcon = (emoji, borderColor, size = 30) =>
  L.divIcon({
    html: `<div style="width:${size}px; height:${size}px; background:#ffffff; border-radius:50% 50% 50% 0; transform:rotate(-45deg); border:3px solid ${borderColor}; box-shadow:0 1px 4px rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center;"><div style="transform:rotate(45deg); font-size:14px; line-height:1;">${emoji}</div></div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });

const incidentPinIcon = (color, size = 26) =>
  L.divIcon({
    html: `<div style="width:${size}px; height:${size}px; background:${color}; border-radius:50% 50% 50% 0; transform:rotate(-45deg); border:2px solid white; box-shadow:0 1px 4px rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center;"><div style="width:${Math.round(size * 0.35)}px; height:${Math.round(size * 0.35)}px; background:white; border-radius:50%;"></div></div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    // Anchor the popup above the whole pin (not just its bottom tip), so it
    // doesn't open right on top of and cover the marker itself.
    popupAnchor: [0, -size],
  });

// The set of "type:id" keys that should stay at full opacity, given current
// focus (click) first, falling back to the table's agency/status filters.
// null means "nothing active" -> everything full opacity.
// Vehicles are deliberately excluded from the filter fallback below — they're
// never shown at all unless a click-focus applies (see visibleVehicleIds).
const relevantKeys = computed(() => {
  if (!focus.value) {
    if (!props.agencyFilter && !props.statusFilter) return null;

    const set = new Set();
    const matchesAgency = (agencyCode) => !props.agencyFilter || agencyCode === props.agencyFilter;

    stationsData.value
      .filter((s) => matchesAgency(s.Agency?.code))
      .forEach((s) => set.add(`station:${s.id}`));

    activeCasesData.value
      .filter((c) => matchesAgency(c.Agency?.code) && (!props.statusFilter || c.status === props.statusFilter))
      .forEach((c) => set.add(`incident:${c.id}`));

    return set;
  }

  const set = new Set();

  if (focus.value.type === "incident") {
    const incident = activeCasesData.value.find((c) => c.id === focus.value.id);
    if (!incident) return set;
    set.add(`incident:${incident.id}`);
    const vehicle = activeVehiclesData.value.find((v) => v.id === incident.vehicleId);
    if (vehicle) {
      set.add(`vehicle:${vehicle.id}`);
      if (vehicle.stationId) set.add(`station:${vehicle.stationId}`);
    }
  }

  if (focus.value.type === "station") {
    set.add(`station:${focus.value.id}`);
    activeVehiclesData.value
      .filter((v) => v.stationId === focus.value.id)
      .forEach((v) => {
        set.add(`vehicle:${v.id}`);
        const incident = activeCasesData.value.find((c) => c.vehicleId === v.id);
        if (incident) set.add(`incident:${incident.id}`);
      });
  }

  return set;
});

// Vehicles are only ever rendered on the map when a click-focus (incident or
// station) directly involves them — not on filters, not by default. This is
// a separate, stricter gate than relevantKeys, which only controls opacity.
const visibleVehicleIds = computed(() => {
  const set = new Set();
  if (!focus.value) return set;

  if (focus.value.type === "incident") {
    const incident = activeCasesData.value.find((c) => c.id === focus.value.id);
    if (incident?.vehicleId) set.add(incident.vehicleId);
  } else if (focus.value.type === "station") {
    activeVehiclesData.value
      .filter((v) => v.stationId === focus.value.id)
      .forEach((v) => set.add(v.id));
  }

  return set;
});

const anyStationTypeVisible = (type) => {
  const matching = stationsData.value.filter((s) => s.type === type);
  const keys = relevantKeys.value;
  if (keys === null) return matching.length > 0;
  return matching.some((s) => keys.has(`station:${s.id}`));
};

const anyVehicleTypeVisible = (type) =>
  activeVehiclesData.value.some((v) => v.type === type && visibleVehicleIds.value.has(v.id));

const anyIncidentAgencyVisible = (agencyCode) => {
  const matching = activeCasesData.value.filter((c) => c.Agency?.code === agencyCode);
  const keys = relevantKeys.value;
  if (keys === null) return matching.length > 0;
  return matching.some((c) => keys.has(`incident:${c.id}`));
};

const applyOpacity = () => {
  const keys = relevantKeys.value;
  const isRelevant = (type, id) => keys === null || keys.has(`${type}:${id}`);

  Object.entries(stationMarkers).forEach(([id, marker]) =>
    marker.setOpacity(isRelevant("station", id) ? 1 : DIM_OPACITY)
  );
  Object.entries(incidentMarkers).forEach(([id, marker]) =>
    marker.setOpacity(isRelevant("incident", id) ? 1 : DIM_OPACITY)
  );
  Object.entries(vehicleMarkers).forEach(([id, marker]) =>
    marker.setOpacity(isRelevant("vehicle", id) ? 1 : DIM_OPACITY)
  );
  Object.entries(routeLines).forEach(([id, line]) =>
    line.setStyle({ opacity: isRelevant("vehicle", id) ? 1 : DIM_OPACITY * 0.6 })
  );
};

const drawFocusBoundary = (bounds) => {
  if (focusBoundaryLayer) map.removeLayer(focusBoundaryLayer);
  focusBoundaryLayer = L.rectangle(bounds, {
    color: "#3b82f6",
    weight: 2,
    dashArray: "6,6",
    fillOpacity: 0.05,
  }).addTo(map);
};

const clearFocus = () => {
  focus.value = null;
  if (focusBoundaryLayer) {
    map.removeLayer(focusBoundaryLayer);
    focusBoundaryLayer = null;
  }
  map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
  syncVehicleMarkers();
  applyOpacity();
};

const focusOnIncident = (incident) => {
  focus.value = { type: "incident", id: incident.id };

  const vehicle = activeVehiclesData.value.find((v) => v.id === incident.vehicleId);
  const points = [[incident.latitude, incident.longitude]];
  if (vehicle) points.push([vehicle.latitude, vehicle.longitude]);
  const station = vehicle ? stationsData.value.find((s) => s.id === vehicle.stationId) : null;
  if (station) points.push([station.latitude, station.longitude]);

  const bounds = L.latLngBounds(points).pad(0.4);
  map.fitBounds(bounds);
  drawFocusBoundary(bounds);
  syncVehicleMarkers();
  applyOpacity();
};

const focusOnStation = (station) => {
  const stationVehicles = activeVehiclesData.value.filter((v) => v.stationId === station.id);
  if (stationVehicles.length === 0) return; // nothing active at this station, no-op

  focus.value = { type: "station", id: station.id };

  const points = [[station.latitude, station.longitude]];
  stationVehicles.forEach((v) => {
    points.push([v.latitude, v.longitude]);
    const incident = activeCasesData.value.find((c) => c.vehicleId === v.id);
    if (incident) points.push([incident.latitude, incident.longitude]);
  });

  const bounds = L.latLngBounds(points).pad(0.4);
  map.fitBounds(bounds);
  drawFocusBoundary(bounds);
  syncVehicleMarkers();
  applyOpacity();
};

const renderStations = async () => {
  const stations = await stationService.getAll();
  stationsData.value = stations;

  stations.forEach((station) => {
    const html = STATION_ICONS[station.type] || "📍";
    const marker = L.marker([station.latitude, station.longitude], { icon: stationPinIcon(html) })
      .addTo(map)
      .bindTooltip(`<strong>${station.name}</strong><br>${station.type.replace("_", " ")} · ${station.Agency?.code}`);

    marker.on("click", (e) => {
      L.DomEvent.stopPropagation(e);
      focusOnStation(station);
    });

    stationMarkers[station.id] = marker;
  });
};

const renderIncidents = async () => {
  const cases = await caseService.getAll();
  const activeCases = cases.filter((c) => c.status !== "closed");
  activeCasesData.value = activeCases;

  const activeIds = new Set(activeCases.map((c) => c.id));

  // Only remove markers for incidents that genuinely dropped off (e.g. just
  // closed) — existing markers are updated in place, never destroyed and
  // recreated, so their current opacity is preserved between polls instead
  // of flashing back to full opacity every 3 seconds.
  Object.keys(incidentMarkers).forEach((id) => {
    if (!activeIds.has(Number(id))) {
      map.removeLayer(incidentMarkers[id]);
      delete incidentMarkers[id];
    }
  });

  activeCases.forEach((c) => {
    const color = AGENCY_COLORS[c.Agency?.code] || "#6b7280";
    const tooltip = `<strong>${c.caseNumber}</strong> (Incident ID: ${c.id})<br>${c.category} · ${c.priority} priority<br>Status: ${c.status}`;

    if (incidentMarkers[c.id]) {
      incidentMarkers[c.id].setTooltipContent(tooltip);
    } else {
      const marker = L.marker([c.latitude, c.longitude], { icon: incidentPinIcon(color) })
        .addTo(map)
        .bindTooltip(tooltip)
        .bindPopup(`<button type="button" class="show-on-table-btn">Show on table</button>`, {
          className: "incident-action-popup",
          closeButton: false,
          offset: [0, -4],
        });

      // Give brand-new markers the correct opacity immediately, instead of
      // waiting for the next applyOpacity() call further down the pipeline.
      const keys = relevantKeys.value;
      marker.setOpacity(keys === null || keys.has(`incident:${c.id}`) ? 1 : DIM_OPACITY);

      // Clicking the pin only focuses the map (zoom + reveal vehicle) and
      // opens a popup with a "Show on table" button — it no longer jumps
      // the table on its own, that's now an explicit user action.
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        const current = activeCasesData.value.find((cs) => cs.id === c.id);
        if (current) focusOnIncident(current);
      });

      marker.on("popupopen", (e) => {
        const btn = e.popup.getElement()?.querySelector(".show-on-table-btn");
        if (btn) {
          btn.onclick = () => {
            emit("focus-case", c.id);
            marker.closePopup();
          };
        }
      });

      incidentMarkers[c.id] = marker;
    }
  });

  return activeCases;
};

// Adds/updates/removes vehicle markers and route lines to match exactly
// visibleVehicleIds, using already-cached data (no fetch). Called both after
// a fresh poll and immediately on any focus change, so hiding/revealing
// vehicles never waits for the next 3s poll tick.
const syncVehicleMarkers = () => {
  const visibleIds = visibleVehicleIds.value;
  // Route line reflects the CASE's status, not the vehicle's — an "open" case's
  // nearest vehicle hasn't actually been dispatched yet (still "available"),
  // but the line should still show which unit would respond and from where.
  const routeVisibleStatuses = ["open", "dispatched", "en_route"];

  Object.keys(vehicleMarkers).forEach((id) => {
    if (!visibleIds.has(Number(id))) {
      map.removeLayer(vehicleMarkers[id]);
      delete vehicleMarkers[id];
    }
  });
  Object.keys(routeLines).forEach((id) => {
    if (!visibleIds.has(Number(id))) {
      map.removeLayer(routeLines[id]);
      delete routeLines[id];
    }
  });

  activeVehiclesData.value
    .filter((vehicle) => visibleIds.has(vehicle.id))
    .forEach((vehicle) => {
      const color = AGENCY_COLORS[vehicle.Agency?.code] || "#6b7280";
      const emoji = VEHICLE_EMOJI[vehicle.type] || "🚗";
      const position = [vehicle.latitude, vehicle.longitude];
      const linkedCase = activeCasesData.value.find((c) => c.vehicleId === vehicle.id);
      const tooltip = `<strong>${vehicle.callSign}</strong> (Vehicle ID: ${vehicle.id})<br>${vehicle.type.replace("_", " ")} · ${vehicle.status}${linkedCase ? `<br>Incident: ${linkedCase.caseNumber} (ID: ${linkedCase.id})` : ""}`;

      if (vehicleMarkers[vehicle.id]) {
        vehicleMarkers[vehicle.id].setLatLng(position);
        vehicleMarkers[vehicle.id].setTooltipContent(tooltip);
      } else {
        const marker = L.marker(position, { icon: vehiclePinIcon(emoji, color) })
          .addTo(map)
          .bindTooltip(tooltip);

        const keys = relevantKeys.value;
        marker.setOpacity(keys === null || keys.has(`vehicle:${vehicle.id}`) ? 1 : DIM_OPACITY);

        marker.on("click", (e) => L.DomEvent.stopPropagation(e));
        vehicleMarkers[vehicle.id] = marker;
      }

      if (linkedCase && routeVisibleStatuses.includes(linkedCase.status)) {
        const routePoints = [position, [linkedCase.latitude, linkedCase.longitude]];
        if (routeLines[vehicle.id]) {
          routeLines[vehicle.id].setLatLngs(routePoints);
        } else {
          routeLines[vehicle.id] = L.polyline(routePoints, { color, weight: 2 }).addTo(map);
        }
      } else if (routeLines[vehicle.id]) {
        map.removeLayer(routeLines[vehicle.id]);
        delete routeLines[vehicle.id];
      }
    });
};

const renderVehicles = async (activeCases) => {
  const allVehicles = await vehicleService.getAll();
  const linkedVehicleIds = new Set(activeCases.map((c) => c.vehicleId).filter(Boolean));
  activeVehiclesData.value = allVehicles.filter((v) => linkedVehicleIds.has(v.id));
  syncVehicleMarkers();
};

const refresh = async () => {
  const activeCases = await renderIncidents();
  await renderVehicles(activeCases);

  // Auto-clear focus if the focused incident/station's story is no longer active
  if (focus.value?.type === "incident" && !activeCasesData.value.some((c) => c.id === focus.value.id)) {
    clearFocus();
  } else if (
    focus.value?.type === "station" &&
    !activeVehiclesData.value.some((v) => v.stationId === focus.value.id)
  ) {
    clearFocus();
  }

  applyOpacity();
  mapLoading.value = false;
};

const addCoverageMask = () => {
  const center = [3.12, 101.62];
  const radiusKm = 35;
  const points = 64;
  const circlePoints = [];
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = radiusKm * Math.cos(angle);
    const dy = radiusKm * Math.sin(angle);
    const dLat = dy / 111.32;
    const dLng = dx / (111.32 * Math.cos((center[0] * Math.PI) / 180));
    circlePoints.push([center[0] + dLat, center[1] + dLng]);
  }

  const outerRing = [
    [-85, -180], [-85, 180], [85, 180], [85, -180],
  ];

  L.polygon([outerRing, circlePoints], {
    stroke: false,
    fillColor: "#000000",
    fillOpacity: 0.35,
  }).addTo(map);

  L.polyline([...circlePoints, circlePoints[0]], {
    color: "#3b82f6",
    weight: 2,
    dashArray: "6,6",
  }).addTo(map).bindTooltip("Demo coverage area: Klang Valley (KL & Selangor)");
};

onMounted(async () => {
  map = L.map("map").setView(DEFAULT_CENTER, DEFAULT_ZOOM);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  addCoverageMask();
  await renderStations();
  await refresh();

  map.on("click", clearFocus);

  pollTimer = setInterval(refresh, 3000);
});

// When the table's agency/status filter changes, drop any active click-focus
// (it may no longer make sense against the new filter) and re-apply opacity
// immediately rather than waiting for the next 3s poll.
watch([() => props.agencyFilter, () => props.statusFilter], () => {
  if (focus.value) clearFocus();
  else applyOpacity();
});

// Triggered by the table's "Show on map" button — mirrors a direct marker
// click (zoom + reveal vehicle) for whichever case the user picked, and
// scrolls the map into view since the table row may be far down the page.
watch(() => props.focusCaseId, (value) => {
  if (!value) return;
  const caseId = Number(value.split(":")[0]);
  const incident = activeCasesData.value.find((c) => c.id === caseId);
  if (!incident) return;
  focusOnIncident(incident);
  mapCardRef.value?.scrollIntoView({ behavior: "smooth", block: "center" });
});

onUnmounted(() => clearInterval(pollTimer));
</script>

<style>
/* Leaflet popups are appended outside this component's scoped template, so
   this block is intentionally global — reskins the tiny "Show on table"
   action popup as a compact blue pill instead of Leaflet's default boxy
   white popup (which was wide/padded enough to cover the pin underneath). */
.incident-action-popup .leaflet-popup-content-wrapper {
  background: #2563eb;
  border-radius: 6px;
  padding: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}
.incident-action-popup .leaflet-popup-content {
  margin: 0;
}
.incident-action-popup .leaflet-popup-tip {
  background: #2563eb;
}
.incident-action-popup .show-on-table-btn {
  display: block;
  background: transparent;
  color: white;
  border: none;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
}
.incident-action-popup .show-on-table-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}
</style>
