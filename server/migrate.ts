import "dotenv/config";
import { db } from "./db";

async function migrateData() {
  try {
    await db.execute(`
      UPDATE orders
      SET estimated_delivery = estimated_ship_date
      WHERE estimated_delivery IS NULL
    `);
    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    process.exit(0);
  }
}

migrateData();