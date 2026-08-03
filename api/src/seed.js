import { sequelize, Agency, Vehicle, Case, User, Station } from "#models/index.js";

export const seedDatabase = async () => {
  await sequelize.sync({ force: true });

  const kkm = await Agency.create({ code: "KKM", name: "Kementerian Kesihatan Malaysia" });
  const pdrm = await Agency.create({ code: "PDRM", name: "Polis Diraja Malaysia" });
  const jbpm = await Agency.create({ code: "JBPM", name: "Jabatan Bomba dan Penyelamat Malaysia" });

  const hospitalKL = await Station.create({ name: "Hospital Kuala Lumpur", code: "KKM-HOSP-01", type: "hospital", agencyId: kkm.id, latitude: 3.1730, longitude: 101.7030 });
  const hospitalSelayang = await Station.create({ name: "Hospital Selayang", code: "KKM-HOSP-02", type: "hospital", agencyId: kkm.id, latitude: 3.2534, longitude: 101.6480 });
  const hospitalSerdang = await Station.create({ name: "Hospital Serdang", code: "KKM-HOSP-03", type: "hospital", agencyId: kkm.id, latitude: 2.9890, longitude: 101.7180 });

  const ipdDangWangi = await Station.create({ name: "IPD Dang Wangi", code: "PDRM-PS-01", type: "police_station", agencyId: pdrm.id, latitude: 3.1580, longitude: 101.7010 });
  const ipdPJ = await Station.create({ name: "IPD Petaling Jaya", code: "PDRM-PS-02", type: "police_station", agencyId: pdrm.id, latitude: 3.1073, longitude: 101.6067 });
  const ipdShahAlam = await Station.create({ name: "IPD Shah Alam", code: "PDRM-PS-03", type: "police_station", agencyId: pdrm.id, latitude: 3.0855, longitude: 101.5320 });

  const bombaHangTuah = await Station.create({ name: "Balai Bomba Hang Tuah", code: "JBPM-FS-01", type: "fire_station", agencyId: jbpm.id, latitude: 3.1390, longitude: 101.7080 });
  const bombaPJ = await Station.create({ name: "Balai Bomba Petaling Jaya", code: "JBPM-FS-02", type: "fire_station", agencyId: jbpm.id, latitude: 3.1121, longitude: 101.6120 });
  const bombaShahAlam = await Station.create({ name: "Balai Bomba Shah Alam", code: "JBPM-FS-03", type: "fire_station", agencyId: jbpm.id, latitude: 3.0738, longitude: 101.5183 });

  // Every station now has exactly one vehicle (3 per agency)
  const amb01 = await Vehicle.create({ agencyId: kkm.id, stationId: hospitalKL.id, callSign: "AMB-01", type: "ambulance", status: "dispatched", latitude: hospitalKL.latitude, longitude: hospitalKL.longitude });
  const amb02 = await Vehicle.create({ agencyId: kkm.id, stationId: hospitalSelayang.id, callSign: "AMB-02", type: "ambulance", status: "en_route", latitude: hospitalSelayang.latitude, longitude: hospitalSelayang.longitude });
  const amb03 = await Vehicle.create({ agencyId: kkm.id, stationId: hospitalSerdang.id, callSign: "AMB-03", type: "ambulance", status: "busy", latitude: hospitalSerdang.latitude, longitude: hospitalSerdang.longitude });

  const pc01 = await Vehicle.create({ agencyId: pdrm.id, stationId: ipdDangWangi.id, callSign: "PC-01", type: "police_car", status: "dispatched", latitude: ipdDangWangi.latitude, longitude: ipdDangWangi.longitude });
  const pc02 = await Vehicle.create({ agencyId: pdrm.id, stationId: ipdPJ.id, callSign: "PC-02", type: "police_car", status: "en_route", latitude: ipdPJ.latitude, longitude: ipdPJ.longitude });
  const pc03 = await Vehicle.create({ agencyId: pdrm.id, stationId: ipdShahAlam.id, callSign: "PC-03", type: "police_car", status: "busy", latitude: ipdShahAlam.latitude, longitude: ipdShahAlam.longitude });

  const ft01 = await Vehicle.create({ agencyId: jbpm.id, stationId: bombaHangTuah.id, callSign: "FT-01", type: "fire_truck", status: "busy", latitude: bombaHangTuah.latitude, longitude: bombaHangTuah.longitude });
  const ft02 = await Vehicle.create({ agencyId: jbpm.id, stationId: bombaPJ.id, callSign: "FT-02", type: "fire_truck", status: "dispatched", latitude: bombaPJ.latitude, longitude: bombaPJ.longitude });
  const ft03 = await Vehicle.create({ agencyId: jbpm.id, stationId: bombaShahAlam.id, callSign: "FT-03", type: "fire_truck", status: "en_route", latitude: bombaShahAlam.latitude, longitude: bombaShahAlam.longitude });

  // Every agency has one case in every status: open, dispatched, en_route, on_scene, closed
  await Case.create({ agencyId: kkm.id, caseNumber: "KKM-0001", category: "accident", priority: "high", location: "Jalan Ampang, KL", latitude: 3.1600, longitude: 101.7180 });
  await Case.create({ agencyId: kkm.id, caseNumber: "KKM-0002", category: "medical", priority: "low", status: "closed", location: "Jalan Sultan Ismail, KL", latitude: 3.1520, longitude: 101.7100 });
  await Case.create({ agencyId: kkm.id, caseNumber: "KKM-0003", category: "medical", priority: "medium", status: "dispatched", vehicleId: amb01.id, location: "Jalan Raja Chulan, KL", latitude: 3.1505, longitude: 101.7167 });
  await Case.create({ agencyId: kkm.id, caseNumber: "KKM-0004", category: "accident", priority: "high", status: "en_route", vehicleId: amb02.id, location: "Jalan Tuanku Abdul Rahman, KL", latitude: 3.1610, longitude: 101.6950 });
  await Case.create({ agencyId: kkm.id, caseNumber: "KKM-0005", category: "medical", priority: "medium", status: "on_scene", vehicleId: amb03.id, location: "Jalan Cheras, KL", latitude: 3.1280, longitude: 101.7350 });

  await Case.create({ agencyId: pdrm.id, caseNumber: "PDRM-0004", category: "traffic", priority: "low", location: "Jalan Ipoh, KL", latitude: 3.1850, longitude: 101.6850 });
  await Case.create({ agencyId: pdrm.id, caseNumber: "PDRM-0005", category: "theft", priority: "high", status: "closed", location: "Jalan Genting Klang, KL", latitude: 3.1750, longitude: 101.7250 });
  await Case.create({ agencyId: pdrm.id, caseNumber: "PDRM-0001", category: "theft", priority: "medium", status: "dispatched", vehicleId: pc01.id, location: "Jalan Bukit Bintang, KL", latitude: 3.1466, longitude: 101.7116 });
  await Case.create({ agencyId: pdrm.id, caseNumber: "PDRM-0002", category: "traffic", priority: "high", status: "en_route", vehicleId: pc02.id, location: "Jalan Kuching, KL", latitude: 3.1750, longitude: 101.6800 });
  await Case.create({ agencyId: pdrm.id, caseNumber: "PDRM-0003", category: "assault", priority: "medium", status: "on_scene", vehicleId: pc03.id, location: "Jalan Klang Lama, KL", latitude: 3.1050, longitude: 101.6750 });

  await Case.create({ agencyId: jbpm.id, caseNumber: "JBPM-0002", category: "rescue", priority: "medium", location: "Jalan Ampang Hilir, KL", latitude: 3.1620, longitude: 101.7350 });
  await Case.create({ agencyId: jbpm.id, caseNumber: "JBPM-0005", category: "fire", priority: "low", status: "closed", location: "Jalan Kepong, KL", latitude: 3.2050, longitude: 101.6350 });
  await Case.create({ agencyId: jbpm.id, caseNumber: "JBPM-0001", category: "fire", priority: "high", status: "on_scene", vehicleId: ft01.id, location: "Jalan Tun Razak, KL", latitude: 3.1580, longitude: 101.7220 });
  await Case.create({ agencyId: jbpm.id, caseNumber: "JBPM-0003", category: "fire", priority: "high", status: "dispatched", vehicleId: ft02.id, location: "Jalan Sungai Besi, KL", latitude: 3.0950, longitude: 101.7050 });
  await Case.create({ agencyId: jbpm.id, caseNumber: "JBPM-0004", category: "rescue", priority: "medium", status: "en_route", vehicleId: ft03.id, location: "Jalan Damansara, KL", latitude: 3.1450, longitude: 101.6550 });

  const users = [
    { name: "Ahmad Razak", email: "ahmad.razak@kkm.gov.my", password: "password123", role: "staff", agencyId: kkm.id },
    { name: "Siti Aminah", email: "siti.aminah@kkm.gov.my", password: "password123", role: "staff", agencyId: kkm.id },
    { name: "Farah Nadia", email: "farah.nadia@kkm.gov.my", password: "password123", role: "staff", agencyId: kkm.id },
    { name: "Danial Iqbal", email: "danial.iqbal@kkm.gov.my", password: "password123", role: "staff", agencyId: kkm.id },
    { name: "Zulkifli Hassan", email: "zul.hassan@pdrm.gov.my", password: "password123", role: "staff", agencyId: pdrm.id },
    { name: "Nur Hidayah", email: "nur.hidayah@pdrm.gov.my", password: "password123", role: "staff", agencyId: pdrm.id },
    { name: "Amirul Haziq", email: "amirul.haziq@pdrm.gov.my", password: "password123", role: "staff", agencyId: pdrm.id },
    { name: "Rosnah Ibrahim", email: "rosnah.ibrahim@pdrm.gov.my", password: "password123", role: "staff", agencyId: pdrm.id },
    { name: "Faizal Anuar", email: "faizal.anuar@jbpm.gov.my", password: "password123", role: "staff", agencyId: jbpm.id },
    { name: "Kamalia Yusof", email: "kamalia.yusof@jbpm.gov.my", password: "password123", role: "staff", agencyId: jbpm.id },
    { name: "Hafiz Rahman", email: "hafiz.rahman@jbpm.gov.my", password: "password123", role: "staff", agencyId: jbpm.id },
    { name: "Aina Sofea", email: "aina.sofea@jbpm.gov.my", password: "password123", role: "staff", agencyId: jbpm.id },
    { name: "System Administrator", email: "admin@ops.gov.my", password: "password123", role: "super_admin", agencyId: null },
  ];

  for (const u of users) {
    await User.create(u);
  }

  console.log("Seed complete");
};

if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase().then(() => process.exit(0));
}
