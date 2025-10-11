#!/bin/bash

# Kaka HQ Monitoring - Database Backup Script
# Production hardening feature for reliable data backup

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/kaka-hq}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/kaka_hq_backup_$TIMESTAMP.sql.gz"

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
fi

# Default database configuration
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_NAME="${DATABASE_NAME:-kaka_hq}"
DB_USER="${DATABASE_USER:-kaka_user}"
DB_PASSWORD="${DATABASE_PASSWORD:-}"

# Logging
LOG_FILE="$PROJECT_ROOT/logs/backup.log"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $*" >> "$LOG_FILE"
}

# Validate environment
validate_env() {
    if [ -z "$DB_PASSWORD" ]; then
        error "Database password not set. Please set DATABASE_PASSWORD environment variable."
        exit 1
    fi

    if ! command -v pg_dump &> /dev/null; then
        error "pg_dump command not found. Please install PostgreSQL client tools."
        exit 1
    fi
}

# Create backup directory
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        log "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
        chmod 700 "$BACKUP_DIR"
    fi
}

# Perform backup
perform_backup() {
    log "Starting database backup..."
    log "Backup file: $BACKUP_FILE"
    log "Database: $DB_NAME on $DB_HOST:$DB_PORT"

    # Export password for pg_dump
    export PGPASSWORD="$DB_PASSWORD"

    # Create compressed backup
    pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --no-password \
        --format=custom \
        --compress=9 \
        --verbose \
        --file="$BACKUP_FILE.tmp" \
        2>> "$LOG_FILE"

    # Compress the backup
    gzip -9 "$BACKUP_FILE.tmp"
    mv "$BACKUP_FILE.tmp.gz" "$BACKUP_FILE"

    # Verify backup file
    if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
        log "Backup completed successfully: $BACKUP_FILE"
        log "Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"

        # Set restrictive permissions
        chmod 600 "$BACKUP_FILE"
    else
        error "Backup failed - file not created or empty"
        rm -f "$BACKUP_FILE.tmp" "$BACKUP_FILE"
        exit 1
    fi
}

# Cleanup old backups (keep last 30 days)
cleanup_old_backups() {
    log "Cleaning up old backups (keeping last 30 days)..."
    find "$BACKUP_DIR" -name "kaka_hq_backup_*.sql.gz" -mtime +30 -delete
}

# Main execution
main() {
    log "=== Kaka HQ Database Backup Started ==="

    validate_env
    create_backup_dir
    perform_backup
    cleanup_old_backups

    log "=== Kaka HQ Database Backup Completed ==="
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "Kaka HQ Database Backup Script"
        echo ""
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --help, -h          Show this help message"
        echo "  --dry-run           Show what would be done without executing"
        echo ""
        echo "Environment Variables:"
        echo "  BACKUP_DIR          Backup directory (default: /var/backups/kaka-hq)"
        echo "  DATABASE_HOST       Database host (default: localhost)"
        echo "  DATABASE_PORT       Database port (default: 5432)"
        echo "  DATABASE_NAME       Database name (default: kaka_hq)"
        echo "  DATABASE_USER       Database user (default: kaka_user)"
        echo "  DATABASE_PASSWORD   Database password (required)"
        exit 0
        ;;
    --dry-run)
        echo "DRY RUN MODE - Would perform the following actions:"
        echo "1. Validate environment and PostgreSQL tools"
        echo "2. Create backup directory: $BACKUP_DIR"
        echo "3. Create backup: $BACKUP_FILE"
        echo "4. Cleanup backups older than 30 days"
        exit 0
        ;;
    *)
        main
        ;;
esac