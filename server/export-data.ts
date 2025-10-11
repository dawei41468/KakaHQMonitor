import { config } from 'dotenv';
config();

import { db } from './db.js';
import * as schema from '@shared/schema.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface ExportedData {
  [tableName: string]: any[];
}

// Tables in order of dependency (no foreign keys first)
const TABLES_ORDER = [
  'users',
  'dealers',
  'categories',
  'products',
  'colors',
  'productColors',
  'regions',
  'productDetails',
  'colorTypes',
  'units',
  'materials',
  'orders',
  'alerts',
  'orderDocuments',
  'orderAttachments',
  'revokedTokens',
  'applicationSettings',
  'auditLogs'
] as const;

async function exportDatabaseData() {
  console.log('📤 Exporting database data...');

  try {
    const exportedData: ExportedData = {};

    // Export data from each table
    for (const tableName of TABLES_ORDER) {
      console.log(`Exporting ${tableName}...`);

      const table = (schema as any)[tableName];
      if (!table) {
        console.warn(`⚠️  Table ${tableName} not found in schema, skipping`);
        continue;
      }

      const data = await db.select().from(table);
      exportedData[tableName] = data;

      console.log(`✅ Exported ${data.length} records from ${tableName}`);
    }

    // Create exports directory if it doesn't exist
    const exportsDir = join(process.cwd(), 'exports');
    mkdirSync(exportsDir, { recursive: true });

    // Write data to JSON file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `database-export-${timestamp}.json`;
    const filepath = join(exportsDir, filename);

    writeFileSync(filepath, JSON.stringify(exportedData, null, 2), 'utf-8');

    console.log(`🎉 Data exported successfully to ${filepath}`);
    console.log(`📊 Summary:`);

    for (const [table, data] of Object.entries(exportedData)) {
      console.log(`   ${table}: ${data.length} records`);
    }

    return { filepath, data: exportedData };

  } catch (error) {
    console.error('❌ Error exporting database data:', error);
    throw error;
  }
}

async function generateSeedFile(exportData: ExportedData) {
  console.log('🌱 Generating new seed file...');

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Special handling for users - separate hashed and non-hashed data
    let usersData: any[] = exportData.users || [];
    const hashedUsers: any[] = [];
    const plainUsers: any[] = [];

    for (const user of usersData) {
      if (user.password && !user.password.startsWith('$2')) { // Not already hashed
        hashedUsers.push(user);
      } else {
        plainUsers.push(user);
      }
    }

    const seedContent = `import { config } from 'dotenv';
config();

import { db } from './db.js';
import * as schema from '@shared/schema.js';
import { hashPassword } from './auth.js';

// Auto-generated seed file from database export on ${new Date().toISOString()}
// This file contains real data exported from the production database

export async function seedDatabaseWithRealData() {
  console.log('🌱 Seeding database with real data...');

  try {
${TABLES_ORDER.map(tableName => {
  if (tableName === 'users') {
    // Special handling for users
    let userInserts = '';

    if (hashedUsers.length > 0) {
      userInserts += `    // Insert users with password hashing
    const hashedUsersData = ${JSON.stringify(hashedUsers.map(u => ({ ...u, password: undefined })), null, 6)};
    for (const user of hashedUsersData) {
      const hashedPassword = await hashPassword(user.email.includes('admin') ? 'admin123' : 'defaultpass');
      await db.insert(schema.users).values({ ...user, password: hashedPassword }).onConflictDoNothing();
    }
    console.log(\`✅ Inserted \${hashedUsersData.length} users with hashed passwords\`);`;
    }

    if (plainUsers.length > 0) {
      userInserts += `
    // Insert users with existing hashed passwords
    const plainUsersData = ${JSON.stringify(plainUsers, null, 6)};
    if (plainUsersData.length > 0) {
      await db.insert(schema.users).values(plainUsersData).onConflictDoNothing();
      console.log(\`✅ Inserted \${plainUsersData.length} users with existing passwords\`);
    }`;
    }

    return userInserts;
  }

  const data = exportData[tableName];
  if (!data || data.length === 0) {
    return `    // No data for ${tableName}`;
  }

  return `    // Insert ${tableName} data
    const ${tableName}Data = ${JSON.stringify(data, null, 6)};
    if (${tableName}Data.length > 0) {
      await db.insert(schema.${tableName}).values(${tableName}Data).onConflictDoNothing();
      console.log(\`✅ Inserted \${${tableName}Data.length} records into ${tableName}\`);
    }`;
}).join('\n\n')}

    console.log('🎉 Database seeded with real data successfully!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seed if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  seedDatabaseWithRealData().then(() => process.exit(0)).catch(() => process.exit(1));
}
`;

    const seedFilePath = join(process.cwd(), 'server', `seed-real-data-${timestamp}.ts`);
    writeFileSync(seedFilePath, seedContent, 'utf-8');

    console.log(`🎉 Seed file generated: ${seedFilePath}`);

    return seedFilePath;

  } catch (error) {
    console.error('❌ Error generating seed file:', error);
    throw error;
  }
}

async function main() {
  try {
    const { filepath, data } = await exportDatabaseData();
    const seedFilePath = await generateSeedFile(data);

    console.log('\n📋 Summary:');
    console.log(`📤 Data exported to: ${filepath}`);
    console.log(`🌱 Seed file generated: ${seedFilePath}`);
    console.log('\n🚀 To use the new seed file:');
    console.log(`   npx tsx ${seedFilePath}`);

  } catch (error) {
    console.error('❌ Export process failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main();
}