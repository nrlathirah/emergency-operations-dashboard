import { sequelize, Agency, Vehicle, Case } from "#models/index.js";

const run = async () => {
  await sequelize.sync({ force: true }); // wipes and recreates tables — seed script only!

  const kkm = await Agency.create({ code: "KKM", name: "Kementerian Kesihatan Malaysia" });
  const pdrm = await Agency.create({ code: "PDRM", name: "Polis Diraja Malaysia" });
  const jbpm = await Agency.create({ code: "JBPM", name: "Jabatan Bomba dan Penyelamat Malaysia" });

  await Vehicle.create({ agencyId: kkm.id, callSign: "AMB-01", type: "ambulance", latitude: 3.1569, longitude: 101.7123 });
  await Vehicle.create({ agencyId: kkm.id, callSign: "AMB-02", type: "ambulance", latitude: 3.1478, longitude: 101.6953 });

  await Vehicle.create({ agencyId: pdrm.id, callSign: "PC-01", type: "patrol_car", latitude: 3.1412, longitude: 101.6865 });
  await Vehicle.create({ agencyId: pdrm.id, callSign: "PC-02", type: "patrol_car", latitude: 3.1590, longitude: 101.7180 });

  await Vehicle.create({ agencyId: jbpm.id, callSign: "FT-01", type: "fire_truck", latitude: 3.1701, longitude: 101.6996 });

  await Case.create({
    agencyId: kkm.id, caseNumber: "KKM-0001", category: "accident",
    priority: "high", location: "Jalan Ampang, KL",
    latitude: 3.1600, longitude: 101.7180,
  });

  console.log("Seed complete");
  process.exit(0);
};

run();