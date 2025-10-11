# Database Export and Seed Generation Script

This script (`server/export-data.ts`) exports current database data and generates a new seed file with real data for development/testing purposes.

## Usage

### Prerequisites

1. Ensure your database is running and accessible
2. Set the `DATABASE_URL` environment variable in your `.env` file
3. Make sure you have the necessary permissions to read from the database

### Running the Export Script

```bash
# From the project root
npx tsx server/export-data.ts
```

### What the Script Does

1. **Exports Data**: Queries all tables in the database and exports their data to a JSON file in the `exports/` directory
2. **Generates Seed File**: Creates a new TypeScript seed file in `server/` that can be used to populate a fresh database with the exported real data

### Output Files

- **Data Export**: `exports/database-export-{timestamp}.json` - Contains all database data in JSON format
- **Seed File**: `server/seed-real-data-{timestamp}.ts` - TypeScript file that can seed a database with the exported data

### Features

- **Proper Table Order**: Tables are exported and seeded in the correct order to respect foreign key constraints
- **Sensitive Data Handling**: Passwords are properly hashed during seeding
- **Conflict Resolution**: Uses `onConflictDoNothing()` to avoid duplicate key errors
- **Comprehensive Coverage**: Exports all tables defined in the schema

### Table Export Order

The script exports tables in this order to maintain referential integrity:

1. users
2. dealers
3. categories
4. products
5. colors
6. productColors
7. regions
8. productDetails
9. colorTypes
10. units
11. materials
12. orders
13. alerts
14. orderDocuments
15. orderAttachments
16. revokedTokens
17. applicationSettings
18. auditLogs

### Using the Generated Seed File

After running the export script, you can use the generated seed file to populate a fresh database:

```bash
npx tsx server/seed-real-data-{timestamp}.ts
```

### Security Considerations

- The script handles user passwords appropriately:
  - Existing hashed passwords are preserved
  - Plain text passwords (if any) are re-hashed during seeding
  - Admin users get a default password that should be changed in production

### Error Handling

The script includes proper error handling and will:
- Log progress for each table
- Skip tables that don't exist in the schema
- Handle database connection errors gracefully
- Provide clear error messages for troubleshooting

### Example Output

```
📤 Exporting database data...
✅ Exported 5 records from users
✅ Exported 5 records from dealers
✅ Exported 50 records from orders
...
🎉 Data exported successfully to exports/database-export-2024-01-15T10-30-00.000Z.json
🌱 Generating new seed file...
🎉 Seed file generated: server/seed-real-data-2024-01-15T10-30-00.000Z.ts

📋 Summary:
📤 Data exported to: exports/database-export-2024-01-15T10-30-00.000Z.json
🌱 Seed file generated: server/seed-real-data-2024-01-15T10-30-00.000Z.ts

🚀 To use the new seed file:
   npx tsx server/seed-real-data-2024-01-15T10-30-00.000Z.ts