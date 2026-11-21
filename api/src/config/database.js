import { Sequelize } from "sequelize";

export const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: "postgres",
      protocol: "postgres",
      dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false },
      },
      logging: false,
    })
  : new Sequelize({
      dialect: "sqlite",
      // Overridable so the test suite can use a throwaway in-memory DB.
      storage: process.env.SQLITE_STORAGE || "./data/dev.sqlite",
      logging: false,
    });
