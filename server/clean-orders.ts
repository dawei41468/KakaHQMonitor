import { config } from 'dotenv';
config();

import { db } from './db.js';
import { orders, orderDocuments, alerts } from '@shared/schema.js';
import { sql } from 'drizzle-orm';

export async function cleanOrders() {
  console.log('🧹 Cleaning all orders data...');

  try {
    // Delete order documents first (foreign key constraint)
    await db.delete(orderDocuments);
    console.log('✅ Deleted all order documents');

    // Delete alerts related to orders
    await db.delete(alerts).where(sql`${alerts.relatedOrderId} IS NOT NULL`);
    console.log('✅ Deleted alerts related to orders');

    // Delete all orders
    await db.delete(orders);
    console.log('✅ Deleted all orders');

    console.log('🎉 All orders data cleaned successfully!');
  } catch (error) {
    console.error('❌ Error cleaning orders data:', error);
    throw error;
  }
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  cleanOrders().then(() => process.exit(0)).catch(() => process.exit(1));
}