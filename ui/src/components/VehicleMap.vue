<template>
  <div class="bg-white rounded-lg shadow p-4">
    <h2 class="text-lg font-semibold mb-3">Live Vehicle Map</h2>
    <p class="text-xs text-gray-500 mb-2">Click an incident or station to focus on its story. Click empty map area to reset.</p>
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
});

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
  });

// The set of "type:id" keys that should stay at full opacity, given current
// focus (click) first, falling back to the table's agency/status filters.
// null means "nothing active" -> everything full opacity.
const relevantKeys = computed(() => {
  if (!focus.value) {
    if (!props.agencyFilter && !props.statusFilter) return null;

    const set = new Set();
    const matchesAgency = (agencyCode) => !props.agencyFilter || agencyCode === props.agencyFilter;

    stationsData.value
      .filter((s) => matchesAgency(s.Agency?.code))
      .forEach((s) => set.add(`station:${s.id}`));

    const matchingCases = activeCasesData.value.filter(
      (c) => matchesAgency(c.Agency?.code) && (!props.statusFilter || c.status === props.statusFilter)
    );
    matchingCases.forEach((c) => set.add(`incident:${c.id}`));

    const matchingVehicleIds = new Set(matchingCases.map((c) => c.vehicleId).filter(Boolean));
    activeVehiclesData.value
      .filter((v) => matchingVehicleIds.has(v.id))
      .forEach((v) => set.add(`vehicle:${v.id}`));

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

const anyStationTypeVisible = (type) => {
  const matching = stationsData.value.filter((s) => s.type === type);
  const keys = relevantKeys.value;
  if (keys === null) return matching.length > 0;
  return matching.some((s) => keys.has(`station:${s.id}`));
};

const anyVehicleTypeVisible = (type) => {
  const matching = activeVehiclesData.value.filter((v) => v.type === type);
  const keys = relevantKeys.value;
  if (keys === null) return matching.length > 0;
  return matching.some((v) => keys.has(`vehicle:${v.id}`));
};

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

  Object.values(incidentMarkers).forEach((m) => map.removeLayer(m));
  Object.keys(incidentMarkers).forEach((key) => delete incidentMarkers[key]);

  activeCases.forEach((c) => {
    const color = AGENCY_COLORS[c.Agency?.code] || "#6b7280";
    const marker = L.marker([c.latitude, c.longitude], { icon: incidentPinIcon(color) })
      .addTo(map)
      .bindTooltip(`<strong>${c.caseNumber}</strong> (Incident ID: ${c.id})<br>${c.category} · ${c.priority} priority<br>Status: ${c.status}`);

    marker.on("click", (e) => {
      L.DomEvent.stopPropagation(e);
      focusOnIncident(c);
    });

    incidentMarkers[c.id] = marker;
  });

  return activeCases;
};

const renderVehicles = async (activeCases) => {
  const allVehicles = await vehicleService.getAll();
  const linkedVehicleIds = new Set(activeCases.map((c) => c.vehicleId).filter(Boolean));
  const relevantVehicles = allVehicles.filter((v) => linkedVehicleIds.has(v.id));
  activeVehiclesData.value = relevantVehicles;
  const enRouteStatuses = ["dispatched", "en_route"];

  // Remove markers/routes for vehicles no longer linked to an active incident
  Object.keys(vehicleMarkers).forEach((id) => {
    if (!linkedVehicleIds.has(Number(id))) {
      map.removeLayer(vehicleMarkers[id]);
      delete vehicleMarkers[id];
    }
  });
  Object.keys(routeLines).forEach((id) => {
    if (!linkedVehicleIds.has(Number(id))) {
      map.removeLayer(routeLines[id]);
      delete routeLines[id];
    }
  });

  relevantVehicles.forEach((vehicle) => {
    const color = AGENCY_COLORS[vehicle.Agency?.code] || "#6b7280";
    const emoji = VEHICLE_EMOJI[vehicle.type] || "🚗";
    const position = [vehicle.latitude, vehicle.longitude];
    const linkedCase = activeCases.find((c) => c.vehicleId === vehicle.id);
    const tooltip = `<strong>${vehicle.callSign}</strong> (Vehicle ID: ${vehicle.id})<br>${vehicle.type.replace("_", " ")} · ${vehicle.status}${linkedCase ? `<br>Incident: ${linkedCase.caseNumber} (ID: ${linkedCase.id})` : ""}`;

    if (vehicleMarkers[vehicle.id]) {
      vehicleMarkers[vehicle.id].setLatLng(position);
      vehicleMarkers[vehicle.id].setTooltipContent(tooltip);
    } else {
      const marker = L.marker(position, { icon: vehiclePinIcon(emoji, color) })
        .addTo(map)
        .bindTooltip(tooltip);
      marker.on("click", (e) => L.DomEvent.stopPropagation(e));
      vehicleMarkers[vehicle.id] = marker;
    }

    if (linkedCase && enRouteStatuses.includes(vehicle.status)) {
      const routePoints = [position, [linkedCase.latitude, linkedCase.longitude]];
      if (routeLines[vehicle.id]) {
        routeLines[vehicle.id].setLatLngs(routePoints);
      } else {
        routeLines[vehicle.id] = L.polyline(routePoints, { color, weight: 2, dashArray: "4,6" }).addTo(map);
      }
    } else if (routeLines[vehicle.id]) {
      map.removeLayer(routeLines[vehicle.id]);
      delete routeLines[vehicle.id];
    }
  });
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

onUnmounted(() => clearInterval(pollTimer));
</script>
