import dotenv from "dotenv";

import app from "./app";
import { pool } from "./config/db";
import { env } from "./utils/env";

dotenv.config();

const startServer = async () => {
  try {
    await pool.query("SELECT 1");

    app.listen(env.port, () => {
      console.log(`ParkPal API running on port ${env.port}`);
    });
  } catch (error) {
    console.error("Failed to connect to PostgreSQL", error);
    process.exit(1);
  }
};

startServer();
