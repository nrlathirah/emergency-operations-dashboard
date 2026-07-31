import { sequelize, Agency, Vehicle, Case, User, Station } from "#models/index.js";

export const seedDatabase = async () => {
  await sequelize.sync({ force: true });

  const kkm = await Agency.create({ code: "KKM", name: "Kementerian Kesihatan Malaysia" });
  const pdrm = await Agency.create({ code: "PDRM", name: "Polis Diraja Malaysia" });
  const jbpm = await Agency.create({ code: "JBPM", name: "Jabatan Bomba dan Penyelamat Malaysia" });

  const hospitalKL = await Station.create({ name: "Hospital Kuala Lumpur", code: "KKM-HOSP-01", type: "hospital", agencyId: kkm.id, latitude: 3.1730, longitude: 101.7030 });
  const hospitalSelayang = await Station.create({ name: "Hospital Selayang", code: "KKM-HOSP-02", type: "hospital", agencyId: kkm.id, latitude: 3.2534, longitude: 101.6480 });
  await Station.create({ name: "Hospital Serdang", code: "KKM-HOSP-03", type: "hospital", agencyId: kkm.id, latitude: 2.9890, longitude: 101.7180 });

  const ipdDangWangi = await Station.create({ name: "IPD Dang Wangi", code: "PDRM-PS-01", type: "police_station", agencyId: pdrm.id, latitude: 3.1580, longitude: 101.7010 });
  const ipdPJ = await Station.create({ name: "IPD Petaling Jaya", code: "PDRM-PS-02", type: "police_station", agencyId: pdrm.id, latitude: 3.1073, longitude: 101.6067 });
  await Station.create({ name: "IPD Shah Alam", code: "PDRM-PS-03", type: "police_station", agencyId: pdrm.id, latitude: 3.0855, longitude: 101.5320 });

  const bombaHangTuah = await Station.create({ name: "Balai Bomba Hang Tuah", code: "JBPM-FS-01", type: "fire_station", agencyId: jbpm.id, latitude: 3.1390, longitude: 101.7080 });
  await Station.create({ name: "Balai Bomba Petaling Jaya", code: "JBPM-FS-02", type: "fire_station", agencyId: jbpm.id, latitude: 3.1121, longitude: 101.6120 });
  await Station.create({ name: "Balai Bomba Shah Alam", code: "JBPM-FS-03", type: "fire_station", agencyId: jbpm.id, latitude: 3.0738, longitude: 101.5183 });

  await Vehicle.create({ agencyId: kkm.id, stationId: hospitalKL.id, callSign: "AMB-01", type: "ambulance", latitude: hospitalKL.latitude, longitude: hospitalKL.longitude });
  await Vehicle.create({ agencyId: kkm.id, stationId: hospitalSelayang.id, callSign: "AMB-02", type: "ambulance", latitude: hospitalSelayang.latitude, longitude: hospitalSelayang.longitude });

  const pc01 = await Vehicle.create({ agencyId: pdrm.id, stationId: ipdDangWangi.id, callSign: "PC-01", type: "police_car", status: "dispatched", latitude: ipdDangWangi.latitude, longitude: ipdDangWangi.longitude });
  await Vehicle.create({ agencyId: pdrm.id, stationId: ipdPJ.id, callSign: "PC-02", type: "police_car", latitude: ipdPJ.latitude, longitude: ipdPJ.longitude });

  const ft01 = await Vehicle.create({ agencyId: jbpm.id, stationId: bombaHangTuah.id, callSign: "FT-01", type: "fire_truck", status: "busy", latitude: bombaHangTuah.latitude, longitude: bombaHangTuah.longitude });

  await Case.create({
    agencyId: kkm.id, caseNumber: "KKM-0001", category: "accident",
    priority: "high", location: "Jalan Ampang, KL",
    latitude: 3.1600, longitude: 101.7180,
  });

  await Case.create({
    agencyId: pdrm.id, caseNumber: "PDRM-0001", category: "theft",
    priority: "medium", status: "dispatched", vehicleId: pc01.id, location: "Jalan Bukit Bintang, KL",
    latitude: 3.1466, longitude: 101.7116,
  });

  await Case.create({
    agencyId: jbpm.id, caseNumber: "JBPM-0001", category: "fire",
    priority: "high", status: "on_scene", vehicleId: ft01.id, location: "Jalan Tun Razak, KL",
    latitude: 3.1580, longitude: 101.7220,
  });

  await Case.create({
    agencyId: kkm.id, caseNumber: "KKM-0002", category: "medical",
    priority: "low", status: "closed", location: "Jalan Sultan Ismail, KL",
    latitude: 3.1520, longitude: 101.7100,
  });

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
