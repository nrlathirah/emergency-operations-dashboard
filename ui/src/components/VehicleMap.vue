<template>
  <div class="bg-white rounded-lg shadow p-4">
    <h2 class="text-lg font-semibold mb-3">Live Vehicle Map</h2>
    <div class="relative">
      <div id="map" style="height: 500px; width: 100%;" class="rounded"></div>
      <div v-if="mapLoading" class="absolute inset-0 flex items-center justify-center bg-white/70 rounded">
        <LoadingSpinner />
      </div>
    </div>

    <div class="flex flex-wrap gap-4 mt-3 text-xs text-gray-600">
      <span class="flex items-center gap-1.5">
        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white" style="box-shadow:0 1px 4px rgba(0,0,0,0.5);">
          <svg width="12" height="12" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="#dc2626"/><circle cx="21" cy="12" r="10" fill="white"/></svg>
        </span>
        Hospital
      </span>
      <span class="flex items-center gap-1.5">
        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white text-xs" style="box-shadow:0 1px 4px rgba(0,0,0,0.5);">👮</span>
        Police Station
      </span>
      <span class="flex items-center gap-1.5">
        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white text-xs" style="box-shadow:0 1px 4px rgba(0,0,0,0.5);">🧑‍🚒</span>
        Fire Station
      </span>
      <span class="flex items-center gap-1.5">
        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white border-2 text-xs" style="border-color:#dc2626">🚑</span>
        Ambulance (KKM)
      </span>
      <span class="flex items-center gap-1.5">
        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white border-2 text-xs" style="border-color:#2563eb">🚓</span>
        Police Car (PDRM)
      </span>
      <span class="flex items-center gap-1.5">
        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white border-2 text-xs" style="border-color:#f59e0b">🚒</span>
        Fire Truck (JBPM)
      </span>
      <span class="flex items-center gap-1.5">
        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full" style="background:#dc2626">
          <span class="block w-1.5 h-1.5 rounded-full bg-white"></span>
        </span>
        KKM Incident
      </span>
      <span class="flex items-center gap-1.5">
        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full" style="background:#2563eb">
          <span class="block w-1.5 h-1.5 rounded-full bg-white"></span>
        </span>
        PDRM Incident
      </span>
      <span class="flex items-center gap-1.5">
        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full" style="background:#f59e0b">
          <span class="block w-1.5 h-1.5 rounded-full bg-white"></span>
        </span>
        JBPM Incident
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { vehicleService } from "../services/vehicleService";
import { caseService } from "../services/caseService";
import { stationService } from "../services/stationService";
import LoadingSpinner from "./LoadingSpinner.vue";

let map;
const vehicleMarkers = {};
const incidentMarkers = {};
const routeLines = {};
let pollTimer;
const mapLoading = ref(true);

const AGENCY_COLORS = { KKM: "#dc2626", PDRM: "#2563eb", JBPM: "#f59e0b" };
const VEHICLE_EMOJI = { ambulance: "🚑", police_car: "🚓", fire_truck: "🚒" };

const CRESCENT_SVG = `<svg width="16" height="16" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="#dc2626"/><circle cx="21" cy="12" r="10" fill="white"/></svg>`;

const STATION_ICONS = {
  hospital: CRESCENT_SVG,
  police_station: `<span style="font-size:14px;">👮</span>`,
  fire_station: `<span style="font-size:14px;">🧑‍🚒</span>`,
};

// Stations: white pin, no border, shadow only for definition
const stationPinIcon = (innerHtml, size = 30) =>
  L.divIcon({
    html: `<div style="width:${size}px; height:${size}px; background:#ffffff; border-radius:50% 50% 50% 0; transform:rotate(-45deg); box-shadow:0 1px 5px rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center;"><div style="transform:rotate(45deg); line-height:1;">${innerHtml}</div></div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });

// Vehicles: white pin, colored border matching agency
const vehiclePinIcon = (emoji, borderColor, size = 30) =>
  L.divIcon({
    html: `<div style="width:${size}px; height:${size}px; background:#ffffff; border-radius:50% 50% 50% 0; transform:rotate(-45deg); border:3px solid ${borderColor}; box-shadow:0 1px 4px rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center;"><div style="transform:rotate(45deg); font-size:14px; line-height:1;">${emoji}</div></div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });

// Incidents: classic pin look — colored teardrop with a white hollow circle in the center
const incidentPinIcon = (color, size = 26) =>
  L.divIcon({
    html: `<div style="width:${size}px; height:${size}px; background:${color}; border-radius:50% 50% 50% 0; transform:rotate(-45deg); border:2px solid white; box-shadow:0 1px 4px rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center;"><div style="width:${Math.round(size * 0.35)}px; height:${Math.round(size * 0.35)}px; background:white; border-radius:50%;"></div></div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });

const renderStations = async () => {
  const stations = await stationService.getAll();
  stations.forEach((station) => {
    const html = STATION_ICONS[station.type] || "📍";
    L.marker([station.latitude, station.longitude], { icon: stationPinIcon(html) })
      .addTo(map)
      .bindTooltip(`<strong>${station.name}</strong><br>${station.type.replace("_", " ")} · ${station.Agency?.code}`);
  });
};

const renderIncidents = async () => {
  const cases = await caseService.getAll();
  const activeCases = cases.filter((c) => c.status !== "closed");

  Object.values(incidentMarkers).forEach((m) => map.removeLayer(m));
  Object.keys(incidentMarkers).forEach((key) => delete incidentMarkers[key]);

  activeCases.forEach((c) => {
    const color = AGENCY_COLORS[c.Agency?.code] || "#6b7280";
    const marker = L.marker([c.latitude, c.longitude], { icon: incidentPinIcon(color) })
      .addTo(map)
      .bindTooltip(`<strong>${c.caseNumber}</strong><br>${c.category} · ${c.priority} priority<br>Status: ${c.status}`);
    incidentMarkers[c.id] = marker;
  });

  return activeCases;
};

const renderVehicles = async (activeCases) => {
  const vehicles = await vehicleService.getAll();
  const enRouteStatuses = ["dispatched", "en_route"];

  vehicles.forEach((vehicle) => {
    const color = AGENCY_COLORS[vehicle.Agency?.code] || "#6b7280";
    const emoji = VEHICLE_EMOJI[vehicle.type] || "🚗";
    const position = [vehicle.latitude, vehicle.longitude];
    const linkedCase = activeCases.find((c) => c.vehicleId === vehicle.id);
    const tooltip = `<strong>${vehicle.callSign}</strong><br>${vehicle.type.replace("_", " ")} · ${vehicle.status}${linkedCase ? `<br>Assigned to ${linkedCase.caseNumber}` : ""}`;

    if (vehicleMarkers[vehicle.id]) {
      vehicleMarkers[vehicle.id].setLatLng(position);
      vehicleMarkers[vehicle.id].setTooltipContent(tooltip);
    } else {
      vehicleMarkers[vehicle.id] = L.marker(position, { icon: vehiclePinIcon(emoji, color) })
        .addTo(map)
        .bindTooltip(tooltip);
    }

    const shouldShowRoute = linkedCase && enRouteStatuses.includes(vehicle.status);
    if (shouldShowRoute) {
      const routePoints = [position, [linkedCase.latitude, linkedCase.longitude]];
      if (routeLines[vehicle.id]) {
        routeLines[vehicle.id].setLatLngs(routePoints);
      } else {
        routeLines[vehicle.id] = L.polyline(routePoints, {
          color,
          weight: 2,
          dashArray: "4,6",
        }).addTo(map);
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
  map = L.map("map").setView([3.139, 101.6869], 11);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  addCoverageMask();
  await renderStations();
  await refresh();
  pollTimer = setInterval(refresh, 3000);
});

onUnmounted(() => clearInterval(pollTimer));
</script>
