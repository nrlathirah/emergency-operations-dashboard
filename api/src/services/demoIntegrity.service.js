import { Op } from "sequelize";
import { User } from "#models/index.js";

// The live demo hands out a super-admin login publicly, so anything that
// admin can do, any visitor can do. The API now blocks the worst of it going
// forward (see user.service.js / user.schema.js) — this repairs whatever
// already slipped in before those guards existed, and re-checks on every
// boot so the demo always comes back to a clean state after a redeploy or
// restart. Idempotent: on a clean database it changes nothing.

// Keep in sync with seed.js (and ui LoginPage.vue's quickLoginRoles).
const DEMO_ACCOUNT_NAMES = {
  "admin@ops.gov.my": "System Administrator",
  "ahmad.razak@kkm.gov.my": "Ahmad Razak",
  "zul.hassan@pdrm.gov.my": "Zulkifli Hassan",
  "faizal.anuar@jbpm.gov.my": "Faizal Anuar",
};

const REMOVED_NAME = "Removed test user";

export const repairDemoData = async () => {
  try {
    // Shared demo accounts are visible to every visitor — restore their
    // original names if someone renamed them.
    for (const [email, name] of Object.entries(DEMO_ACCOUNT_NAMES)) {
      const [count] = await User.update({ name }, { where: { email, isDemoAccount: true, name: { [Op.ne]: name } } });
      if (count) console.log(`Demo integrity: restored the name of ${email}.`);
    }

    // Names containing HTML-like markup (e.g. an XSS probe) are rejected by
    // the API now; neutralise any created before that rule existed. Vue
    // already renders them as harmless text — this just tidies the list.
    const [renamed] = await User.update(
      { name: REMOVED_NAME },
      { where: { [Op.or]: [{ name: { [Op.like]: "%<%" } }, { name: { [Op.like]: "%>%" } }] } }
    );
    if (renamed) console.log(`Demo integrity: renamed ${renamed} user(s) with markup in their name.`);
  } catch (error) {
    // Never block the API from starting over a cleanup step.
    console.error("Demo integrity check failed:", error.message);
  }
};
