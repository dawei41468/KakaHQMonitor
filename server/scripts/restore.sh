#!/bin/bash

# Kaka HQ Monitoring - Database Restore Script
# Production hardening feature for reliable data recovery

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/kaka-hq}"

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
LOG_FILE="$PROJECT_ROOT/logs/restore.log"
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

    if ! command -v pg_restore &> /dev/null; then
        error "pg_restore command not found. Please install PostgreSQL client tools."
        exit 1
    fi

    if ! command -v psql &> /dev/null; then
        error "psql command not found. Please install PostgreSQL client tools."
        exit 1
    fi
}

# Validate backup file
validate_backup_file() {
    local backup_file="$1"

    if [ ! -f "$backup_file" ]; then
        error "Backup file does not exist: $backup_file"
        exit 1
    fi

    if [ ! -s "$backup_file" ]; then
        error "Backup file is empty: $backup_file"
        exit 1
    fi

    # Check if it's a valid gzip file
    if ! gzip -t "$backup_file" 2>/dev/null; then
        error "Backup file is not a valid gzip file: $backup_file"
        exit 1
    fi

    log "Backup file validated: $backup_file ($(du -h "$backup_file" | cut -f1))"
}

# Create backup of current database before restore
create_pre_restore_backup() {
    local pre_restore_backup="$BACKUP_DIR/pre_restore_backup_$(date +"%Y%m%d_%H%M%S").sql.gz"

    log "Creating pre-restore backup: $pre_restore_backup"

    export PGPASSWORD="$DB_PASSWORD"

    pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --no-password \
        --format=custom \
        --compress=9 \
        --file="$pre_restore_backup.tmp" \
        2>> "$LOG_FILE"

    gzip -9 "$pre_restore_backup.tmp"
    mv "$pre_restore_backup.tmp.gz" "$pre_restore_backup"
    chmod 600 "$pre_restore_backup"

    log "Pre-restore backup created: $pre_restore_backup"
}

# Clean database before restore
clean_database() {
    log "Cleaning existing database..."

    export PGPASSWORD="$DB_PASSWORD"

    # Terminate active connections to the database
    psql \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="postgres" \
        --no-password \
        --command="SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" \
        2>> "$LOG_FILE"

    # Drop and recreate database
    psql \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="postgres" \
        --no-password \
        --command="DROP DATABASE IF EXISTS $DB_NAME;" \
        2>> "$LOG_FILE"

    psql \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="postgres" \
        --no-password \
        --command="CREATE DATABASE $DB_NAME;" \
        2>> "$LOG_FILE"

    log "Database cleaned and recreated"
}

# Perform restore
perform_restore() {
    local backup_file="$1"

    log "Starting database restore from: $backup_file"

    export PGPASSWORD="$DB_PASSWORD"

    # Restore from compressed backup
    gunzip -c "$backup_file" | pg_restore \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --no-password \
        --verbose \
        --clean \
        --if-exists \
        --create \
        2>> "$LOG_FILE"

    log "Database restore completed"
}

# Verify restore
verify_restore() {
    log "Verifying database restore..."

    export PGPASSWORD="$DB_PASSWORD"

    # Basic connectivity test
    if psql \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --no-password \
        --command="SELECT version();" \
        --quiet \
        --tuples-only \
        > /dev/null 2>> "$LOG_FILE"; then
        log "Database connectivity verified"
    else
        error "Database connectivity test failed"
        exit 1
    fi

    # Check if tables exist (basic smoke test)
    table_count=$(psql \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --no-password \
        --command="SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" \
        --quiet \
        --tuples-only)

    if [ "$table_count" -gt 0 ]; then
        log "Database structure verified ($table_count tables found)"
    else
        error "No tables found in restored database"
        exit 1
    fi
}

# List available backups
list_backups() {
    echo "Available backup files in $BACKUP_DIR:"
    echo "========================================"

    if [ ! -d "$BACKUP_DIR" ]; then
        echo "Backup directory does not exist: $BACKUP_DIR"
        return 1
    fi

    local count=0
    while IFS= read -r -d '' file; do
        local size=$(du -h "$file" | cut -f1)
        local mtime=$(stat -c %y "$file" 2>/dev/null || stat -f %Sm -t "%Y-%m-%d %H:%M:%S" "$file")
        echo "$(basename "$file") ($size) - $mtime"
        ((count++))
    done < <(find "$BACKUP_DIR" -name "kaka_hq_backup_*.sql.gz" -print0 | sort -z)

    if [ $count -eq 0 ]; then
        echo "No backup files found"
    else
        echo ""
        echo "Total: $count backup files"
    fi
}

# Main execution
main() {
    local backup_file="$1"

    log "=== Kaka HQ Database Restore Started ==="
    log "Target database: $DB_NAME on $DB_HOST:$DB_PORT"
    log "Backup file: $backup_file"

    validate_env
    validate_backup_file "$backup_file"

    # Safety confirmation (unless --force is used)
    if [ "${2:-}" != "--force" ]; then
        echo "WARNING: This will overwrite the existing database!"
        echo "A pre-restore backup will be created automatically."
        echo ""
        read -p "Are you sure you want to continue? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log "Restore cancelled by user"
            exit 0
        fi
    fi

    create_pre_restore_backup
    clean_database
    perform_restore "$backup_file"
    verify_restore

    log "=== Kaka HQ Database Restore Completed Successfully ==="
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "Kaka HQ Database Restore Script"
        echo ""
        echo "Usage: $0 <backup-file> [--force]"
        echo "       $0 --list"
        echo ""
        echo "Arguments:"
        echo "  backup-file    Path to the backup file to restore from"
        echo "  --force        Skip confirmation prompt"
        echo "  --list         List available backup files"
        echo "  --help, -h     Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  BACKUP_DIR          Backup directory (default: /var/backups/kaka-hq)"
        echo "  DATABASE_HOST       Database host (default: localhost)"
        echo "  DATABASE_PORT       Database port (default: 5432)"
        echo "  DATABASE_NAME       Database name (default: kaka_hq)"
        echo "  DATABASE_USER       Database user (default: kaka_user)"
        echo "  DATABASE_PASSWORD   Database password (required)"
        echo ""
        echo "Examples:"
        echo "  $0 /var/backups/kaka-hq/kaka_hq_backup_20231011_143022.sql.gz"
        echo "  $0 --list"
        exit 0
        ;;
    --list)
        list_backups
        exit 0
        ;;
    "")
        error "No backup file specified. Use --help for usage information."
        exit 1
        ;;
    *)
        if [ -f "$1" ]; then
            main "$1" "${2:-}"
        else
            # Try to find the backup in the default directory
            local candidate="$BACKUP_DIR/$1"
            if [ -f "$candidate" ]; then
                main "$candidate" "${2:-}"
            else
                error "Backup file not found: $1"
                echo ""
                echo "Available backups:"
                list_backups
                exit 1
            fi
        fi
        ;;
esac