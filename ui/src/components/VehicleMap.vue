<template>
  <div class="bg-white rounded-lg shadow p-4">
    <h2 class="text-lg font-semibold mb-3">Live Vehicle Map</h2>
    <div id="map" style="height: 500px; width: 100%;" class="rounded"></div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { vehicleService } from "../services/vehicleService";

let map;
const markers = {};
let pollTimer;

const AGENCY_COLORS = { KKM: "red", PDRM: "blue", JBPM: "orange" };

const renderVehicles = async () => {
  const vehicles = await vehicleService.getAll();

  vehicles.forEach((vehicle) => {
    const color = AGENCY_COLORS[vehicle.Agency?.code] || "gray";
    const position = [vehicle.latitude, vehicle.longitude];

    if (markers[vehicle.id]) {
      markers[vehicle.id].setLatLng(position);
    } else {
      markers[vehicle.id] = L.circleMarker(position, {
        radius: 8,
        color,
        fillColor: color,
        fillOpacity: 0.8,
      })
        .addTo(map)
        .bindPopup(`${vehicle.callSign} (${vehicle.type})`);
    }
  });
};

onMounted(() => {
  map = L.map("map").setView([3.139, 101.6869], 12); // Kuala Lumpur

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  renderVehicles();
  pollTimer = setInterval(renderVehicles, 3000); // matches your simulator's 3s tick
});

onUnmounted(() => clearInterval(pollTimer));
</script>
