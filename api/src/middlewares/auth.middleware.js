import jwt from "jsonwebtoken";
import { User } from "#models/index.js";

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
