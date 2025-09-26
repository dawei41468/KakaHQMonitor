import "dotenv/config";
import { db } from "./db";

async function checkData() {
  try {
    const result = await db.execute(`
      SELECT id, order_number, status, estimated_delivery, created_at
      FROM orders
      LIMIT 5
    `);
    console.log("Sample orders:");
    console.log(result.rows);
  } catch (error) {
    console.error("Check failed:", error);
  } finally {
    process.exit(0);
  }
}

checkData();