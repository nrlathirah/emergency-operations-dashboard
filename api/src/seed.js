import { sequelize, Agency, Vehicle, Case, User, Station } from "#models/index.js";

const minutesAgo = (mins) => new Date(Date.now() - mins * 60000);

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

  // Every station has exactly one vehicle (3 per agency)
  const amb01 = await Vehicle.create({ agencyId: kkm.id, stationId: hospitalKL.id, callSign: "AMB-01", type: "ambulance", status: "dispatched", latitude: hospitalKL.latitude, longitude: hospitalKL.longitude });
  const amb02 = await Vehicle.create({ agencyId: kkm.id, stationId: hospitalSelayang.id, callSign: "AMB-02", type: "ambulance", status: "en_route", latitude: hospitalSelayang.latitude, longitude: hospitalSelayang.longitude });
  const amb03 = await Vehicle.create({ agencyId: kkm.id, stationId: hospitalSerdang.id, callSign: "AMB-03", type: "ambulance", status: "busy", latitude: hospitalSerdang.latitude, longitude: hospitalSerdang.longitude });

  const pc01 = await Vehicle.create({ agencyId: pdrm.id, stationId: ipdDangWangi.id, callSign: "PC-01", type: "police_car", status: "dispatched", latitude: ipdDangWangi.latitude, longitude: ipdDangWangi.longitude });
  const pc02 = await Vehicle.create({ agencyId: pdrm.id, stationId: ipdPJ.id, callSign: "PC-02", type: "police_car", status: "en_route", latitude: ipdPJ.latitude, longitude: ipdPJ.longitude });
  const pc03 = await Vehicle.create({ agencyId: pdrm.id, stationId: ipdShahAlam.id, callSign: "PC-03", type: "police_car", status: "busy", latitude: ipdShahAlam.latitude, longitude: ipdShahAlam.longitude });

  const ft01 = await Vehicle.create({ agencyId: jbpm.id, stationId: bombaHangTuah.id, callSign: "FT-01", type: "fire_truck", status: "busy", latitude: bombaHangTuah.latitude, longitude: bombaHangTuah.longitude });
  const ft02 = await Vehicle.create({ agencyId: jbpm.id, stationId: bombaPJ.id, callSign: "FT-02", type: "fire_truck", status: "dispatched", latitude: bombaPJ.latitude, longitude: bombaPJ.longitude });
  const ft03 = await Vehicle.create({ agencyId: jbpm.id, stationId: bombaShahAlam.id, callSign: "FT-03", type: "fire_truck", status: "en_route", latitude: bombaShahAlam.latitude, longitude: bombaShahAlam.longitude });

  // Every case (including open/closed) references the nearest station's vehicle for
  // that incident's location — verified by Haversine distance, not eyeballed. Incident
  // coordinates are deliberately placed close to their intended station's coverage area.

  // KKM — every case's nearest ambulance verified: AMB-01 (KL), AMB-02 (Selayang), AMB-03 (Serdang)
  await Case.create({ agencyId: kkm.id, caseNumber: "KKM-0001", category: "accident", priority: "high", location: "Jalan Ampang, KL", latitude: 3.1680, longitude: 101.7080, vehicleId: amb01.id, createdAt: minutesAgo(5) });
  await Case.create({ agencyId: kkm.id, caseNumber: "KKM-0002", category: "medical", priority: "low", status: "closed", location: "Jalan Ipoh, Selayang", latitude: 3.2400, longitude: 101.6600, vehicleId: amb02.id, createdAt: minutesAgo(240) });
  await Case.create({ agencyId: kkm.id, caseNumber: "KKM-0003", category: "medical", priority: "medium", status: "dispatched", vehicleId: amb01.id, location: "Jalan Raja Chulan, KL", latitude: 3.1750, longitude: 101.7010, createdAt: minutesAgo(15) });
  await Case.create({ agencyId: kkm.id, caseNumber: "KKM-0004", category: "accident", priority: "high", status: "en_route", vehicleId: amb02.id, location: "Jalan Selayang Baru", latitude: 3.2450, longitude: 101.6550, createdAt: minutesAgo(45) });
  await Case.create({ agencyId: kkm.id, caseNumber: "KKM-0005", category: "medical", priority: "medium", status: "on_scene", vehicleId: amb03.id, location: "Jalan Serdang Raya", latitude: 3.0050, longitude: 101.7150, createdAt: minutesAgo(90) });

  // PDRM — every case's nearest patrol car verified: PC-01 (Dang Wangi), PC-02 (PJ), PC-03 (Shah Alam)
  await Case.create({ agencyId: pdrm.id, caseNumber: "PDRM-0004", category: "traffic", priority: "low", location: "Jalan Dang Wangi, KL", latitude: 3.1620, longitude: 101.7060, vehicleId: pc01.id, createdAt: minutesAgo(10) });
  await Case.create({ agencyId: pdrm.id, caseNumber: "PDRM-0005", category: "theft", priority: "high", status: "closed", location: "Jalan SS2, Petaling Jaya", latitude: 3.1000, longitude: 101.6150, vehicleId: pc02.id, createdAt: minutesAgo(200) });
  await Case.create({ agencyId: pdrm.id, caseNumber: "PDRM-0001", category: "theft", priority: "medium", status: "dispatched", vehicleId: pc01.id, location: "Jalan Bukit Bintang, KL", latitude: 3.1550, longitude: 101.6980, createdAt: minutesAgo(20) });
  await Case.create({ agencyId: pdrm.id, caseNumber: "PDRM-0002", category: "traffic", priority: "high", status: "en_route", vehicleId: pc02.id, location: "Jalan Petaling Jaya", latitude: 3.1100, longitude: 101.6100, createdAt: minutesAgo(50) });
  await Case.create({ agencyId: pdrm.id, caseNumber: "PDRM-0003", category: "assault", priority: "medium", status: "on_scene", vehicleId: pc03.id, location: "Jalan Shah Alam", latitude: 3.0800, longitude: 101.5350, createdAt: minutesAgo(100) });

  // JBPM — every case's nearest fire truck verified: FT-01 (Hang Tuah), FT-02 (PJ), FT-03 (Shah Alam)
  await Case.create({ agencyId: jbpm.id, caseNumber: "JBPM-0002", category: "rescue", priority: "medium", location: "Jalan Hang Tuah, KL", latitude: 3.1350, longitude: 101.7150, vehicleId: ft01.id, createdAt: minutesAgo(8) });
  await Case.create({ agencyId: jbpm.id, caseNumber: "JBPM-0005", category: "fire", priority: "low", status: "closed", location: "Jalan Petaling Jaya Utara", latitude: 3.1150, longitude: 101.6050, vehicleId: ft02.id, createdAt: minutesAgo(220) });
  await Case.create({ agencyId: jbpm.id, caseNumber: "JBPM-0001", category: "fire", priority: "high", status: "on_scene", vehicleId: ft01.id, location: "Jalan Tun Razak, KL", latitude: 3.1420, longitude: 101.7050, createdAt: minutesAgo(25) });
  await Case.create({ agencyId: jbpm.id, caseNumber: "JBPM-0003", category: "fire", priority: "high", status: "dispatched", vehicleId: ft02.id, location: "Jalan Sungai Besi, Petaling Jaya", latitude: 3.1080, longitude: 101.6180, createdAt: minutesAgo(55) });
  await Case.create({ agencyId: jbpm.id, caseNumber: "JBPM-0004", category: "rescue", priority: "medium", status: "en_route", vehicleId: ft03.id, location: "Jalan Shah Alam Selatan", latitude: 3.0700, longitude: 101.5250, createdAt: minutesAgo(110) });

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
