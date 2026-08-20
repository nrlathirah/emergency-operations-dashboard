<template>
  <div ref="mapCardRef" class="rb-panel">
    <div class="rb-panel-head">
      <div>
        <span class="rb-panel-tag">Fleet</span>
        <h2>Live Operations Map</h2>
      </div>
      <button v-if="viewChanged" type="button" @click="clearFocus" class="rb-reset-link">✕ Reset View</button>
    </div>
    <div class="relative">
      <div id="map" style="height: 500px; width: 100%;" class="rb-map-surface"></div>
      <div v-if="mapLoading" class="absolute inset-0 flex items-center justify-center bg-white/70 rounded">
        <ErrorBanner v-if="error" :message="error" @retry="loadInitialData" />
        <LoadingSpinner v-else />
      </div>
    </div>
    <p v-if="error && !mapLoading" class="text-xs text-red-500 mt-2">⚠️ {{ error }} Showing last loaded data.</p>

    <div class="rb-map-legend">
      <span v-if="showAgency('KKM')" class="flex items-center gap-1.5 transition-opacity" :class="{ 'opacity-30': !anyStationTypeVisible('hospital') }">
        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white" style="box-shadow:0 1px 4px rgba(0,0,0,0.5);">
          <svg width="12" height="12" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="#B3261E"/><circle cx="21" cy="12" r="10" fill="white"/></svg>
        </span>
        Hospital
      </span>
      <span v-if="showAgency('PDRM')" class="flex items-center gap-1.5 transition-opacity" :class="{ 'opacity-30': !anyStationTypeVisible('police_station') }">
        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white text-xs" style="box-shadow:0 1px 4px rgba(0,0,0,0.5);">👮</span>
        Police Station
      </span>
      <span v-if="showAgency('JBPM')" class="flex items-center gap-1.5 transition-opacity" :class="{ 'opacity-30': !anyStationTypeVisible('fire_station') }">
        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white text-xs" style="box-shadow:0 1px 4px rgba(0,0,0,0.5);">🧑‍🚒</span>
        Fire Station
      </span>
      <span v-if="showAgency('KKM')" class="flex items-center gap-1.5 transition-opacity" :class="{ 'opacity-30': !anyVehicleTypeVisible('ambulance') }">
        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white border-2 text-xs" style="border-color:#B3261E">🚑</span>
        Ambulance
      </span>
      <span v-if="showAgency('PDRM')" class="flex items-center gap-1.5 transition-opacity" :class="{ 'opacity-30': !anyVehicleTypeVisible('police_car') }">
        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white border-2 text-xs" style="border-color:#1F5C99">🚓</span>
        Police Car
      </span>
      <span v-if="showAgency('JBPM')" class="flex items-center gap-1.5 transition-opacity" :class="{ 'opacity-30': !anyVehicleTypeVisible('fire_truck') }">
        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white border-2 text-xs" style="border-color:#D9720A">🚒</span>
        Fire Truck
      </span>
      <span v-if="showAgency('KKM')" class="flex items-center gap-1.5 transition-opacity" :class="{ 'opacity-30': !anyIncidentAgencyVisible('KKM') }">
        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full" style="background:#B3261E">
          <span class="block w-1.5 h-1.5 rounded-full bg-white"></span>
        </span>
        KKM Incident
      </span>
      <span v-if="showAgency('PDRM')" class="flex items-center gap-1.5 transition-opacity" :class="{ 'opacity-30': !anyIncidentAgencyVisible('PDRM') }">
        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full" style="background:#1F5C99">
          <span class="block w-1.5 h-1.5 rounded-full bg-white"></span>
        </span>
        PDRM Incident
      </span>
      <span v-if="showAgency('JBPM')" class="flex items-center gap-1.5 transition-opacity" :class="{ 'opacity-30': !anyIncidentAgencyVisible('JBPM') }">
        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full" style="background:#D9720A">
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
import { useAuthStore } from "../stores/auth";
import LoadingSpinner from "./LoadingSpinner.vue";
import ErrorBanner from "./ErrorBanner.vue";

const props = defineProps({
  agencyFilter: { type: String, default: "" },
  statusFilter: { type: String, default: "" },
  // Composite "id:timestamp" string set by the table's "Show on map" button —
  // the timestamp guarantees a fresh value even for the same case twice in a row.
  focusCaseId: { type: String, default: null },
});

// Non-super-admin users only see the legend entries for their own agency —
// there's no point showing them Police Car / Fire Truck icons they'll never
// see markers for.
const authStore = useAuthStore();
const showAgency = (code) =>
  authStore.user?.role === "super_admin" || authStore.user?.agency === code;

// "panel-height" lets CaseList's panel match this one's real rendered
// height exactly (see DashboardPage.vue) — the map's own height isn't a
// fixed number (its legend row can wrap depending on how many agencies are
// visible), so this reports whatever it actually ends up being rather than
// the sibling guessing at a constant.
const emit = defineEmits(["focus-case", "panel-height"]);

const mapCardRef = ref(null);
let map;
const vehicleMarkers = {};
const incidentMarkers = {};
const stationMarkers = {};
const routeLines = {};
let pollTimer;
const mapLoading = ref(true);
const error = ref(null);

const DEFAULT_CENTER = [3.139, 101.6869];
const DEFAULT_ZOOM = 11;
const DIM_OPACITY = 0.25;
// Fixed on-screen margin (px) for focus views — a percentage-based pad on the
// LatLngBounds itself can be too small in pixel terms for a tight cluster
// (e.g. an "open" case, where the vehicle sits right at the station), letting
// a pin end up clipped at the map's edge. Pixel padding guarantees every
// focused pin stays fully visible regardless of how tight or spread the
// incident/vehicle/station cluster is.
const FOCUS_VIEW_PADDING = [60, 60];

// Reactive data snapshots, used both for rendering and for legend/focus calculations
const stationsData = ref([]);
const activeCasesData = ref([]);
const activeVehiclesData = ref([]); // only vehicles currently linked to an active incident

// { type: 'incident' | 'station', id } | null
const focus = ref(null);

// True whenever the map's current view (center/zoom) differs from the
// default — whether that's from clicking a marker/station (focusOnIncident/
// focusOnStation below) or the user just manually dragging/scrolling the
// map themselves. Checked after every move rather than only set alongside
// `focus`, so a plain manual pan/zoom (no click involved) still reveals the
// Reset View button, same as Reset Filters appearing once a filter is set.
const viewChanged = ref(false);
// A resize (invalidateSize recentering, or even float rounding in Leaflet's
// own pixel<->latlng math) can leave the center a hair off DEFAULT_CENTER —
// visually identical, but the old 0.0001 epsilon (~11m) was tight enough to
// flag that as "changed" anyway. 0.001 (~110m) still reliably catches any
// real click-to-focus or manual pan (which move by kilometers) while
// absorbing that rendering noise instead of reacting to it.
const isDefaultView = () => {
  const center = map.getCenter();
  return (
    Math.abs(center.lat - DEFAULT_CENTER[0]) < 0.001 &&
    Math.abs(center.lng - DEFAULT_CENTER[1]) < 0.001 &&
    map.getZoom() === DEFAULT_ZOOM
  );
};
const checkViewChanged = () => {
  viewChanged.value = !isDefaultView();
};

const AGENCY_COLORS = { KKM: "#B3261E", PDRM: "#1F5C99", JBPM: "#D9720A" };
const VEHICLE_EMOJI = { ambulance: "🚑", police_car: "🚓", fire_truck: "🚒" };

// Matches the labels used everywhere else (status filter, case table stepper)
// instead of showing the raw snake_case status value.
const STATUS_LABELS = {
  open: "Open",
  dispatched: "Dispatched",
  en_route: "En Route",
  on_scene: "On Scene",
  closed: "Closed",
};

const CRESCENT_SVG = `<svg width="16" height="16" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="#B3261E"/><circle cx="21" cy="12" r="10" fill="white"/></svg>`;

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
  Object.entries(routeLines).forEach(([id, { casing, line }]) => {
    const relevant = isRelevant("vehicle", id);
    casing.setStyle({ opacity: relevant ? 0.9 : DIM_OPACITY * 0.6 });
    line.setStyle({ opacity: relevant ? 1 : DIM_OPACITY * 0.6 });
  });
};

const clearFocus = () => {
  focus.value = null;
  // Re-measure the container right before recentering — if the browser was
  // just resized, Leaflet's own cached size may still be stale at the exact
  // moment this runs, and centering against a stale size is part of what
  // left this button clickable-but-inert. animate: false also means this
  // either finishes synchronously or not at all, instead of leaving an
  // in-flight pan animation for a resize to interrupt.
  map.invalidateSize();
  map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: false });
  // Not just relying on the moveend listener to update this: if the map
  // was already within isDefaultView's tolerance of the target (e.g. after
  // a resize left it a sub-pixel amount off), Leaflet treats setView as a
  // no-op and never fires moveend at all — so checkViewChanged never runs
  // again and the button stays stuck showing even though we just did
  // exactly what it asked. Setting it directly makes "click Reset View"
  // itself the source of truth for its own visibility, not a side effect
  // of whether Leaflet happened to consider the move worth animating.
  viewChanged.value = false;
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

  const bounds = L.latLngBounds(points).pad(0.15);
  map.fitBounds(bounds, { padding: FOCUS_VIEW_PADDING });
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

  const bounds = L.latLngBounds(points).pad(0.15);
  map.fitBounds(bounds, { padding: FOCUS_VIEW_PADDING });
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
      .bindTooltip(station.name);

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
    const tooltip = `<strong>${c.caseNumber}</strong><br>Status: ${STATUS_LABELS[c.status] || c.status}`;

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
      map.removeLayer(routeLines[id].casing);
      map.removeLayer(routeLines[id].line);
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
      const tooltip = `${linkedCase ? `<strong>${linkedCase.caseNumber}</strong><br>` : ""}Vehicle: ${vehicle.callSign}`;

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
          routeLines[vehicle.id].casing.setLatLngs(routePoints);
          routeLines[vehicle.id].line.setLatLngs(routePoints);
        } else {
          // A white "casing" underneath the colored line keeps the route
          // visible against any tile background instead of blending in.
          const casing = L.polyline(routePoints, { color: "#ffffff", weight: 6, opacity: 0.9 }).addTo(map);
          const line = L.polyline(routePoints, { color, weight: 4 }).addTo(map);
          routeLines[vehicle.id] = { casing, line };
        }
      } else if (routeLines[vehicle.id]) {
        map.removeLayer(routeLines[vehicle.id].casing);
        map.removeLayer(routeLines[vehicle.id].line);
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
  try {
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
    error.value = null;
  } catch (err) {
    // On a background poll failure, keep showing whatever was last rendered
    // rather than clearing the map — only the initial load treats this as
    // blocking (see loadInitialData).
    error.value = "Failed to refresh map data.";
  } finally {
    mapLoading.value = false;
  }
};

const loadInitialData = async () => {
  try {
    error.value = null;
    await renderStations();
  } catch (err) {
    error.value = "Failed to load map data.";
    mapLoading.value = false;
    return;
  }
  await refresh();
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
    color: "#0C6E72",
    weight: 2,
    dashArray: "6,6",
  }).addTo(map).bindTooltip("Demo coverage area: Klang Valley (KL & Selangor)");
};

// Leaflet caches its container's pixel size at init time and never notices
// if that element is later resized by the browser/CSS (a window resize, the
// responsive grid collapsing, etc.) — it has no resize listener of its own.
// Left alone, every subsequent pixel<->latlng calculation (including what
// map.setView() below the resize thinks "center" means) drifts against the
// stale size, which is exactly why Reset View could look like a no-op after
// resizing: the view genuinely did reset, just against outdated math, so it
// didn't visually match the button's own "default view" state either.
// map.invalidateSize() is Leaflet's own fix for this — it re-measures the
// container and recalculates, but only when told to, hence the observer.
// A real window drag fires the observer many times a second, not once —
// calling invalidateSize() (which itself measures and can pan/fire moveend)
// on every single one of those lets successive calls race and compound
// tiny rounding drift into a real, visible offset, which read as "Reset
// View showed up on its own, and clicking it didn't visibly do anything"
// (it moved the map, just to a slightly-off center thanks to that drift —
// see the isDefaultView epsilon check above). Debouncing to run only once
// resize events stop for a moment avoids the pile-up entirely.
let resizeObserver;
let resizeDebounce;
const handleMapResize = () => {
  clearTimeout(resizeDebounce);
  resizeDebounce = setTimeout(() => map.invalidateSize(), 150);
};

// Separate from the observer above (that one watches the #map div itself,
// for Leaflet's own sizing; this one watches the whole card, since the
// card's total height is header + map + legend together, not just the map).
let panelResizeObserver;
// ResizeObserver reports the content box by default (padding/border
// excluded) — .rb-panel's own padding+border is ~40px that this app's
// global box-sizing: border-box elsewhere always counts as part of an
// element's height, so CaseList setting height: <this value>px landed
// 40px short of the map's real outer size instead of matching it. Asking
// for the border box explicitly keeps this consistent with what
// getBoundingClientRect() (and CSS height, under border-box sizing)
// actually mean by "height".
const emitPanelHeight = (entries) => emit("panel-height", entries[0].borderBoxSize[0].blockSize);

onMounted(async () => {
  map = L.map("map").setView(DEFAULT_CENTER, DEFAULT_ZOOM);
  map.on("moveend", checkViewChanged);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  addCoverageMask();
  await loadInitialData();

  pollTimer = setInterval(refresh, 3000);

  const mapEl = document.getElementById("map");
  resizeObserver = new ResizeObserver(handleMapResize);
  resizeObserver.observe(mapEl);

  panelResizeObserver = new ResizeObserver(emitPanelHeight);
  panelResizeObserver.observe(mapCardRef.value, { box: "border-box" });
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

onUnmounted(() => {
  clearInterval(pollTimer);
  clearTimeout(resizeDebounce);
  resizeObserver?.disconnect();
  panelResizeObserver?.disconnect();
});
</script>

<style>
/* Leaflet popups are appended outside this component's scoped template, so
   this block is intentionally global — reskins the tiny "Show on table"
   action popup as a compact teal pill instead of Leaflet's default boxy
   white popup (which was wide/padded enough to cover the pin underneath). */
.incident-action-popup .leaflet-popup-content-wrapper {
  background: #0C6E72;
  border-radius: 6px;
  padding: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}
.incident-action-popup .leaflet-popup-content {
  margin: 0;
}
.incident-action-popup .leaflet-popup-tip {
  background: #0C6E72;
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
