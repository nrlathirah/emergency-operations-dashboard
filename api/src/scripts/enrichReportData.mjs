// One-off, additive-only enrichment: INSERTs new historical `closed` cases
// for report/chart data. Never touches existing rows — no UPDATE, no DELETE.
// Connects via the same DATABASE_URL the app itself uses (see #config/database.js),
// so this targets whatever database your .env currently points at.
//
// Usage:
//   node src/scripts/enrichReportData.mjs            (dry run — prints the plan, writes nothing)
//   node src/scripts/enrichReportData.mjs --commit    (actually inserts)
import "dotenv/config";
import { sequelize, Agency, Vehicle, Station, Case } from "#models/index.js";
import { generateHistoricalCases } from "#utils/caseGenerator.js";

const COMMIT = process.argv.includes("--commit");
const COUNT_PER_AGENCY = 80;
const DAYS_BACK = 90;

const run = async () => {
  console.log(`Connected dialect: ${sequelize.getDialect()}`);

  const agencies = await Agency.findAll();
  if (agencies.length === 0) {
    console.log("No agencies found — nothing to enrich against. Aborting.");
    return;
  }

  const allNewCases = [];

  for (const agency of agencies) {
    const stations = await Station.findAll({ where: { agencyId: agency.id } });
    const vehicles = await Vehicle.findAll({ where: { agencyId: agency.id } });
    const existingCount = await Case.count({ where: { agencyId: agency.id } });

    const cases = generateHistoricalCases({
      agency,
      stations,
      vehicles,
      count: COUNT_PER_AGENCY,
      daysBack: DAYS_BACK,
      startSeq: existingCount + 1,
    });
    allNewCases.push(...cases);

    console.log(`${agency.code}: ${existingCount} existing case(s) -> +${cases.length} new historical closed case(s)`);
  }

  console.log(`\nTotal new cases to insert: ${allNewCases.length}`);
  console.log("Sample record:", allNewCases[0]);

  if (!COMMIT) {
    console.log("\nDry run only — no data written. Re-run with --commit to actually insert.");
    return;
  }

  await Case.bulkCreate(allNewCases, { silent: true });
  console.log(`\nInserted ${allNewCases.length} new cases. Existing rows were not touched.`);
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
