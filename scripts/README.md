# Kaka HQ Monitor Backup and Recovery Scripts

This directory contains scripts for backing up and restoring the Kaka HQ Monitor database.

## Database Backup Script (`backup.sh`)

### Purpose
Creates compressed PostgreSQL database backups with integrity verification.

### Features
- Daily automated backups with timestamps
- Compression using gzip
- Integrity verification of backups
- Automatic cleanup of old backups (30 days retention)
- Comprehensive logging

### Usage
```bash
# Manual backup
./scripts/backup.sh

# Automated backup (add to crontab)
# Add this line to crontab for daily backups at 2 AM:
# 0 2 * * * /path/to/kaka-hq-monitor/scripts/backup.sh
```

### Configuration
Edit the script to modify:
- `BACKUP_DIR`: Backup storage directory (default: `/var/backups/kaka-hq`)
- `DB_NAME`: Database name (default: `kaka_hq`)
- `DB_USER`: Database user (default: `kaka_user`)

### Requirements
- PostgreSQL client tools (`pg_dump`, `pg_isready`, `pg_restore`)
- gzip for compression
- Write permissions to backup directory

## Database Restore Script (`restore.sh`)

### Purpose
Restores the database from a compressed backup with safety measures.

### Features
- Safety backup of current database before restore
- Automatic database recreation
- Integrity verification
- Comprehensive error handling and rollback

### Usage
```bash
# List available backups
./scripts/restore.sh

# Restore from specific backup
./scripts/restore.sh /var/backups/kaka-hq/kaka_hq_backup_20231011_120000.sql.gz
```

### Safety Features
- User confirmation required before restore
- Automatic safety backup creation
- Automatic rollback on restore failure
- Connection termination handling

## Setup Instructions

### 1. Create Backup Directory
```bash
sudo mkdir -p /var/backups/kaka-hq
sudo chown postgres:postgres /var/backups/kaka-hq
```

### 2. Configure PostgreSQL User
Ensure the database user has appropriate permissions:
```sql
-- Grant backup permissions
GRANT CONNECT ON DATABASE kaka_hq TO kaka_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO kaka_user;
```

### 3. Set Up Automated Backups
Add to crontab:
```bash
# Edit crontab
crontab -e

# Add this line for daily backups at 2 AM
0 2 * * * /path/to/kaka-hq-monitor/scripts/backup.sh
```

### 4. Test Backup and Restore
```bash
# Test backup
./scripts/backup.sh

# Verify backup exists
ls -la /var/backups/kaka-hq/

# Test restore (on a test database first!)
createdb kaka_hq_test
./scripts/restore.sh /var/backups/kaka-hq/kaka_hq_backup_*.sql.gz
```

## Monitoring

### Backup Logs
- Backup operations are logged to: `/var/backups/kaka-hq/backup.log`
- Restore operations are logged to: `/var/backups/kaka-hq/restore.log`

### Health Checks
Monitor backup health by checking:
- Log files for errors
- Backup file existence and sizes
- Disk space in backup directory

## Security Considerations

- Store backups on separate storage from database
- Encrypt backups if containing sensitive data
- Restrict access to backup files
- Test restore procedures regularly
- Monitor backup logs for failures

## Troubleshooting

### Common Issues

**Permission Denied**
```bash
# Fix backup directory permissions
sudo chown -R postgres:postgres /var/backups/kaka-hq
```

**Database Connection Failed**
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check database credentials in script
- Ensure user has backup permissions

**Backup Integrity Check Failed**
- Verify PostgreSQL version compatibility
- Check available disk space
- Review PostgreSQL logs for errors

**Restore Fails**
- Ensure no active connections to database
- Verify backup file is not corrupted
- Check PostgreSQL user permissions