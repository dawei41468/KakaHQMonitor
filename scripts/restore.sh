#!/bin/bash

# Kaka HQ Monitor Database Restore Script
# This script restores the database from a backup

set -e  # Exit on any error

# Configuration
BACKUP_DIR="/var/backups/kaka-hq"
DB_NAME="kaka_hq"
DB_USER="kaka_user"
LOG_FILE="${BACKUP_DIR}/restore.log"

# Log function
log() {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - $1" | tee -a "$LOG_FILE"
}

# Function to show usage
usage() {
    echo "Usage: $0 <backup_file>"
    echo "Example: $0 /var/backups/kaka-hq/kaka_hq_backup_20231011_120000.sql.gz"
    echo ""
    echo "Available backups:"
    ls -la "${BACKUP_DIR}"/kaka_hq_backup_*.sql.gz 2>/dev/null || echo "No backups found in ${BACKUP_DIR}"
    exit 1
}

# Check arguments
if [ $# -ne 1 ]; then
    log "ERROR: Backup file not specified"
    usage
fi

BACKUP_FILE="$1"

# Validate backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    log "ERROR: Backup file does not exist: $BACKUP_FILE"
    exit 1
fi

# Validate backup file is a .gz file
if [[ "$BACKUP_FILE" != *.sql.gz ]]; then
    log "ERROR: Backup file must be a .sql.gz file"
    exit 1
fi

log "Starting database restore from: $BACKUP_FILE"

# Confirm action
echo "WARNING: This will overwrite the current database!"
read -p "Are you sure you want to continue? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    log "Restore cancelled by user"
    exit 0
fi

# Check if PostgreSQL is running
if ! pg_isready -h localhost -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
    log "ERROR: PostgreSQL is not running or connection failed"
    exit 1
fi

# Create a backup of current state before restore (safety measure)
CURRENT_BACKUP="${BACKUP_DIR}/pre_restore_backup_$(date +"%Y%m%d_%H%M%S").sql"
log "Creating safety backup of current database: $CURRENT_BACKUP"
pg_dump -h localhost -U "$DB_USER" -d "$DB_NAME" -f "$CURRENT_BACKUP" --no-password --format=custom

# Terminate active connections to the database
log "Terminating active connections to $DB_NAME"
psql -h localhost -U "$DB_USER" -d postgres -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();
" >/dev/null 2>&1 || true

# Drop and recreate the database
log "Dropping and recreating database $DB_NAME"
psql -h localhost -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" >/dev/null 2>&1
psql -h localhost -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" >/dev/null 2>&1

# Restore from backup
log "Restoring database from backup"
if gunzip -c "$BACKUP_FILE" | pg_restore -h localhost -U "$DB_USER" -d "$DB_NAME" --no-password --clean --if-exists; then
    log "Database restore completed successfully"

    # Run any post-restore operations (migrations, etc.)
    log "Running post-restore operations"

    # You might want to run migrations here if needed
    # npm run db:push or similar

    log "Post-restore operations completed"

else
    log "ERROR: Database restore failed"

    # Attempt to restore from safety backup
    log "Attempting to restore from safety backup: $CURRENT_BACKUP"
    if pg_restore -h localhost -U "$DB_USER" -d "$DB_NAME" "$CURRENT_BACKUP" --no-password --clean --if-exists >/dev/null 2>&1; then
        log "Safety backup restored successfully"
    else
        log "CRITICAL: Safety backup restore also failed"
    fi

    exit 1
fi

# Clean up safety backup after successful restore
if [ -f "$CURRENT_BACKUP" ]; then
    rm "$CURRENT_BACKUP"
    log "Safety backup cleaned up"
fi

log "Database restore process completed successfully"