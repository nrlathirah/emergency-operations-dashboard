import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User, Agency } from "#models/index.js";

export const login = async ({ email, password }) => {
  const user = await User.scope("withPassword").findOne({
    where: { email },
    include: [{ model: Agency, attributes: ["code", "name"] }],
  });

  if (!user || user.status !== "active") {
    throw new Error("Invalid email or password");
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new Error("Invalid email or password");
  }

  await user.update({ lastLoginAt: new Date() });

  const token = jwt.sign(
    { id: user.id, role: user.role, agencyId: user.agencyId, agencyCode: user.Agency?.code || null },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      agency: user.Agency?.code || null,
      mustChangePassword: user.mustChangePassword,
    },
  };
};
