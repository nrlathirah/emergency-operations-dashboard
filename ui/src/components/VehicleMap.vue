<template>
  <div class="bg-white rounded-lg shadow p-4">
    <h2 class="text-lg font-semibold mb-3">Live Vehicle Map</h2>
    <div id="map" style="height: 500px; width: 100%;" class="rounded"></div>

    <div class="flex flex-wrap gap-4 mt-3 text-xs text-gray-600">
      <span class="flex items-center gap-1"><span>🏥</span> Hospital</span>
      <span class="flex items-center gap-1"><span>🚓</span> Police Station</span>
      <span class="flex items-center gap-1"><span>🚒</span> Fire Station</span>
      <span class="flex items-center gap-1"><span>🚨</span> Active Incident</span>
      <span class="flex items-center gap-1">
        <span class="inline-block w-3 h-3 rounded-full" style="background:#dc2626"></span> KKM Vehicle
      </span>
      <span class="flex items-center gap-1">
        <span class="inline-block w-3 h-3 rounded-full" style="background:#2563eb"></span> PDRM Vehicle
      </span>
      <span class="flex items-center gap-1">
        <span class="inline-block w-3 h-3 rounded-full" style="background:#ea580c"></span> JBPM Vehicle
      </span>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { vehicleService } from "../services/vehicleService";
import { caseService } from "../services/caseService";
import { stationService } from "../services/stationService";

let map;
const vehicleMarkers = {};
const incidentMarkers = {};
let pollTimer;

const AGENCY_COLORS = { KKM: "#dc2626", PDRM: "#2563eb", JBPM: "#ea580c" };
const VEHICLE_EMOJI = { ambulance: "🚑", patrol_car: "🚓", fire_truck: "🚒" };
const STATION_EMOJI = { hospital: "🏥", police_station: "🚓", fire_station: "🚒" };
const PRIORITY_COLORS = { high: "#dc2626", medium: "#d97706", low: "#65a30d" };

const divIcon = (emoji, bgColor, size = 26) =>
  L.divIcon({
    html: `<div style="background:${bgColor}; width:${size}px; height:${size}px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:${size * 0.55}px; border:2px solid white; box-shadow:0 1px 3px rgba(0,0,0,0.4);">${emoji}</div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

const renderStations = async () => {
  const stations = await stationService.getAll();
  stations.forEach((station) => {
    const icon = divIcon(STATION_EMOJI[station.type] || "📍", "#ffffff");
    L.marker([station.latitude, station.longitude], { icon })
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
    const icon = divIcon("🚨", PRIORITY_COLORS[c.priority] || "#6b7280");
    const marker = L.marker([c.latitude, c.longitude], { icon })
      .addTo(map)
      .bindTooltip(`<strong>${c.caseNumber}</strong><br>${c.category} · ${c.priority} priority<br>Status: ${c.status}`);
    incidentMarkers[c.id] = marker;
  });

  return activeCases;
};

const renderVehicles = async (activeCases) => {
  const vehicles = await vehicleService.getAll();

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
      vehicleMarkers[vehicle.id] = L.marker(position, { icon: divIcon(emoji, color) })
        .addTo(map)
        .bindTooltip(tooltip);
    }
  });
};

const refresh = async () => {
  const activeCases = await renderIncidents();
  await renderVehicles(activeCases);
};

onMounted(async () => {
  map = L.map("map").setView([3.139, 101.6869], 11);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  await renderStations();
  await refresh();
  pollTimer = setInterval(refresh, 3000);
});

onUnmounted(() => clearInterval(pollTimer));
</script>
