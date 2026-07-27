import vehicleRoutes from "./vehicle.route.js";
import caseRoutes from "./case.route.js";
import userRoutes from "./user.route.js";

export const mountRoutes = (app) => {
  app.use("/api/vehicles", vehicleRoutes);
  app.use("/api/cases", caseRoutes);
  app.use("/api/users", userRoutes);
};
