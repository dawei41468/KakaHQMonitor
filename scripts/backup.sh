#!/bin/bash

# Kaka HQ Monitor Database Backup Script
# This script creates daily backups of the PostgreSQL database

set -e  # Exit on any error

# Configuration
BACKUP_DIR="/var/backups/kaka-hq"
DB_NAME="kaka_hq"
DB_USER="kaka_user"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/kaka_hq_backup_${TIMESTAMP}.sql"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Log function
log() {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - $1" | tee -a "$LOG_FILE"
}

log "Starting database backup for $DB_NAME"

# Check if PostgreSQL is running
if ! pg_isready -h localhost -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
    log "ERROR: PostgreSQL is not running or connection failed"
    exit 1
fi

# Create backup
log "Creating backup: $BACKUP_FILE"
if pg_dump -h localhost -U "$DB_USER" -d "$DB_NAME" -f "$BACKUP_FILE" --no-password --format=custom; then
    log "Backup completed successfully"

    # Compress the backup
    gzip "$BACKUP_FILE"
    COMPRESSED_FILE="${BACKUP_FILE}.gz"
    log "Backup compressed: $COMPRESSED_FILE"

    # Calculate file size
    FILE_SIZE=$(stat -f%z "$COMPRESSED_FILE" 2>/dev/null || stat -c%s "$COMPRESSED_FILE" 2>/dev/null || echo "unknown")
    log "Backup file size: $FILE_SIZE bytes"

    # Clean up old backups (keep last 30 days)
    log "Cleaning up old backups (keeping last 30 days)"
    find "$BACKUP_DIR" -name "kaka_hq_backup_*.sql.gz" -mtime +30 -delete

    # Verify backup integrity
    log "Verifying backup integrity"
    if pg_restore --list "$COMPRESSED_FILE" >/dev/null 2>&1; then
        log "Backup integrity check passed"
    else
        log "ERROR: Backup integrity check failed"
        exit 1
    fi

else
    log "ERROR: Backup failed"
    exit 1
fi

log "Database backup process completed successfully"