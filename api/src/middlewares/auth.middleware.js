import jwt from "jsonwebtoken";
import { User } from "#models/index.js";
import { markActivity } from "#utils/activity.util.js";

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // { id, role, agencyId, agencyCode, tokenVersion }

    // A valid signature only proves the token was genuinely issued at some
    // point — it says nothing about whether it's since been revoked (a
    // password reset, a deactivation). Comparing against the user's current
    // tokenVersion is what actually enforces that, at the cost of one
    // indexed PK lookup per request.
    const user = await User.findByPk(decoded.id, { attributes: ["tokenVersion", "status"] });
    if (!user || user.status !== "active" || user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    req.user = decoded;
    // Only a genuinely logged-in user counts as "someone is using the site"
    // (see activity.util.js) — anonymous traffic like bots and scanners
    // probing /api never wakes the background jobs or the database.
    markActivity();
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Must run after authenticate — relies on req.user already being set.
export const requireSuperAdmin = (req, res, next) => {
  if (req.user?.role !== "super_admin") {
    return res.status(403).json({ message: "Super admin access required" });
  }
  next();
};
