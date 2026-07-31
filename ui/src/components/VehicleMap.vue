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
      <span class="flex items-center gap-1"><span>☪️</span> Hospital</span>
      <span class="flex items-center gap-1"><span>🛡️</span> Police Station</span>
      <span class="flex items-center gap-1"><span>🔥</span> Fire Station</span>
      <span class="flex items-center gap-1">
        <span class="inline-block w-3 h-3 rounded-full" style="background:#dc2626"></span> KKM Incident/Vehicle
      </span>
      <span class="flex items-center gap-1">
        <span class="inline-block w-3 h-3 rounded-full" style="background:#2563eb"></span> PDRM Incident/Vehicle
      </span>
      <span class="flex items-center gap-1">
        <span class="inline-block w-3 h-3 rounded-full" style="background:#ea580c"></span> JBPM Incident/Vehicle
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

const AGENCY_COLORS = { KKM: "#dc2626", PDRM: "#2563eb", JBPM: "#ea580c" };
const VEHICLE_EMOJI = { ambulance: "🚑", patrol_car: "🚓", fire_truck: "🚒" };

// Red crescent: red circle with a white circle offset to "bite" a crescent shape out of it
const CRESCENT_SVG = `<svg width="16" height="16" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="#dc2626"/><circle cx="21" cy="12" r="10" fill="white"/></svg>`;

const STATION_ICONS = {
  hospital: { bg: "#ffffff", html: CRESCENT_SVG },
  police_station: { bg: "#1e3a8a", html: `<span style="font-size:14px;">🛡️</span>` },
  fire_station: { bg: "#7c2d12", html: `<span style="font-size:14px;">🔥</span>` },
};

const pinIcon = (innerHtml, bgColor, size = 30) =>
  L.divIcon({
    html: `<div style="width:${size}px; height:${size}px; background:${bgColor}; border-radius:50% 50% 50% 0; transform:rotate(-45deg); border:2px solid white; box-shadow:0 1px 4px rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center;"><div style="transform:rotate(45deg); line-height:1;">${innerHtml}</div></div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });

const plainPinIcon = (bgColor, size = 26) =>
  L.divIcon({
    html: `<div style="width:${size}px; height:${size}px; background:${bgColor}; border-radius:50% 50% 50% 0; transform:rotate(-45deg); border:2px solid white; box-shadow:0 1px 4px rgba(0,0,0,0.5);"></div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });

const renderStations = async () => {
  const stations = await stationService.getAll();
  stations.forEach((station) => {
    const config = STATION_ICONS[station.type] || { bg: "#6b7280", html: "📍" };
    const icon = pinIcon(config.html, config.bg);
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
    const color = AGENCY_COLORS[c.Agency?.code] || "#6b7280";
    const marker = L.marker([c.latitude, c.longitude], { icon: plainPinIcon(color) })
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
      vehicleMarkers[vehicle.id] = L.marker(position, {
        icon: pinIcon(`<span style="font-size:14px;">${emoji}</span>`, color),
      })
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

  // Outer ring + inner ring (the circle) = Leaflet renders the inner ring as a hole
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
