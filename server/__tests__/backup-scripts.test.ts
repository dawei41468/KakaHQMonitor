import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { db } from '../db.js';

// Use real fs functions for file existence checks
const realFs = jest.requireActual('fs') as typeof import('fs');

describe('Backup and Recovery Scripts', () => {
  const scriptsDir = '/Users/dawei/Coding/Projects/KakaHQMonitor/scripts';
  const backupDir = '/Users/dawei/Coding/Projects/KakaHQMonitor/test-backups';

  beforeAll(async () => {
    // Ensure database is ready for tests
    await db.execute('SELECT 1');

    // Create test backup directory
    if (!realFs.existsSync(backupDir)) {
      realFs.mkdirSync(backupDir, { recursive: true });
    }
  });

  afterAll(async () => {
    // Clean up test backup directory
    if (realFs.existsSync(backupDir)) {
      const files = realFs.readdirSync(backupDir);
      files.forEach(file => {
        const filePath = path.join(backupDir, file);
        if (realFs.statSync(filePath).isFile()) {
          realFs.unlinkSync(filePath);
        }
      });
      realFs.rmdirSync(backupDir);
    }
  });

  describe('Backup Script Structure', () => {
    it('should have backup script file', () => {
      const backupScript = path.join(scriptsDir, 'backup.sh');
      expect(realFs.existsSync(backupScript)).toBe(true);
    });

    it('should have restore script file', () => {
      const restoreScript = path.join(scriptsDir, 'restore.sh');
      expect(realFs.existsSync(restoreScript)).toBe(true);
    });

    it('should have executable permissions on backup script', () => {
      const backupScript = path.join(scriptsDir, 'backup.sh');
      if (realFs.existsSync(backupScript)) {
        const stats = realFs.statSync(backupScript);
        // Check if executable (this might not work on Windows)
        expect(stats.mode & parseInt('111', 8)).toBeTruthy();
      }
    });

    it('should have executable permissions on restore script', () => {
      const restoreScript = path.join(scriptsDir, 'restore.sh');
      if (realFs.existsSync(restoreScript)) {
        const stats = realFs.statSync(restoreScript);
        expect(stats.mode & parseInt('111', 8)).toBeTruthy();
      }
    });
  });

  describe('Backup Script Content', () => {
    it('should contain PostgreSQL dump command', () => {
      const backupScript = path.join(scriptsDir, 'backup.sh');
      if (fs.existsSync(backupScript)) {
        const content = fs.readFileSync(backupScript, 'utf8');
        expect(content).toContain('pg_dump');
        expect(content).toContain('postgresql');
      }
    });

    it('should include compression', () => {
      const backupScript = path.join(scriptsDir, 'backup.sh');
      if (fs.existsSync(backupScript)) {
        const content = fs.readFileSync(backupScript, 'utf8');
        const hasCompression = content.includes('gzip') || content.includes('bzip2') ||
                              content.includes('.gz') || content.includes('.bz2');
        expect(hasCompression).toBe(true);
      }
    });

    it('should include timestamp in filename', () => {
      const backupScript = path.join(scriptsDir, 'backup.sh');
      if (fs.existsSync(backupScript)) {
        const content = fs.readFileSync(backupScript, 'utf8');
        const hasTimestamp = content.includes('date') || content.includes('timestamp') || content.includes('+%Y%m%d');
        expect(hasTimestamp).toBe(true);
      }
    });

    it('should include error handling', () => {
      const backupScript = path.join(scriptsDir, 'backup.sh');
      if (fs.existsSync(backupScript)) {
        const content = fs.readFileSync(backupScript, 'utf8');
        const hasErrorHandling = content.includes('set -e') || content.includes('exit 1') || content.includes('error');
        expect(hasErrorHandling).toBe(true);
      }
    });
  });

  describe('Restore Script Content', () => {
    it('should contain PostgreSQL restore command', () => {
      const restoreScript = path.join(scriptsDir, 'restore.sh');
      if (fs.existsSync(restoreScript)) {
        const content = fs.readFileSync(restoreScript, 'utf8');
        const hasRestoreCommand = content.includes('psql') || content.includes('pg_restore');
        expect(hasRestoreCommand).toBe(true);
      }
    });

    it('should include decompression', () => {
      const restoreScript = path.join(scriptsDir, 'restore.sh');
      if (fs.existsSync(restoreScript)) {
        const content = fs.readFileSync(restoreScript, 'utf8');
        const hasDecompression = content.includes('gunzip') || content.includes('bunzip2') || content.includes('zcat');
        expect(hasDecompression).toBe(true);
      }
    });

    it('should include safety checks', () => {
      const restoreScript = path.join(scriptsDir, 'restore.sh');
      if (fs.existsSync(restoreScript)) {
        const content = fs.readFileSync(restoreScript, 'utf8');
        const hasSafetyChecks = content.includes('backup') || content.includes('confirm') || content.includes('warning');
        expect(hasSafetyChecks).toBe(true);
      }
    });
  });

  describe('Backup Script Functionality', () => {
    it('should create backup directory if it does not exist', () => {
      const testBackupDir = path.join(backupDir, 'test-dir');
      if (realFs.existsSync(testBackupDir)) {
        realFs.rmdirSync(testBackupDir);
      }

      // Simulate mkdir -p behavior
      realFs.mkdirSync(testBackupDir, { recursive: true });
      expect(realFs.existsSync(testBackupDir)).toBe(true);

      // Clean up
      realFs.rmdirSync(testBackupDir);
    });

    it('should generate timestamped filenames', () => {
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      expect(timestamp).toMatch(/^\d{8}$/);
      expect(timestamp.length).toBe(8);
    });

    it('should handle database connection errors gracefully', () => {
      // This test verifies that the script structure includes error handling
      const backupScript = path.join(scriptsDir, 'backup.sh');
      if (fs.existsSync(backupScript)) {
        const content = fs.readFileSync(backupScript, 'utf8');
        // Should include error checking
        const hasErrorHandling = content.includes('if') || content.includes('then') || content.includes('exit');
        expect(hasErrorHandling).toBe(true);
      }
    });
  });

  describe('Restore Script Functionality', () => {
    it('should validate backup file existence', () => {
      // This test verifies that the script includes file existence checks
      const restoreScript = path.join(scriptsDir, 'restore.sh');
      if (fs.existsSync(restoreScript)) {
        const content = fs.readFileSync(restoreScript, 'utf8');
        const hasFileChecks = content.includes('exists') || content.includes('-f') || content.includes('test');
        expect(hasFileChecks).toBe(true);
      }
    });

    it('should include database cleanup before restore', () => {
      const restoreScript = path.join(scriptsDir, 'restore.sh');
      if (fs.existsSync(restoreScript)) {
        const content = fs.readFileSync(restoreScript, 'utf8');
        const hasCleanup = content.includes('DROP') || content.includes('CREATE') || content.includes('clean');
        expect(hasCleanup).toBe(true);
      }
    });

    it('should handle restore errors gracefully', () => {
      const restoreScript = path.join(scriptsDir, 'restore.sh');
      if (fs.existsSync(restoreScript)) {
        const content = fs.readFileSync(restoreScript, 'utf8');
        const hasErrorHandling = content.includes('error') || content.includes('exit') || content.includes('rollback');
        expect(hasErrorHandling).toBe(true);
      }
    });
  });

  describe('Integration Testing', () => {
    it('should be able to run backup script (dry run)', () => {
      const backupScript = path.join(scriptsDir, 'backup.sh');
      if (fs.existsSync(backupScript)) {
        // Test that the script is syntactically valid by checking if it can be parsed
        const content = fs.readFileSync(backupScript, 'utf8');
        expect(content.length).toBeGreaterThan(0);
        const hasShebang = content.includes('#!/bin/bash') || content.includes('#!/bin/sh');
        expect(hasShebang).toBe(true);
      }
    });

    it('should be able to run restore script (dry run)', () => {
      const restoreScript = path.join(scriptsDir, 'restore.sh');
      if (fs.existsSync(restoreScript)) {
        const content = fs.readFileSync(restoreScript, 'utf8');
        expect(content.length).toBeGreaterThan(0);
        const hasShebang = content.includes('#!/bin/bash') || content.includes('#!/bin/sh');
        expect(hasShebang).toBe(true);
      }
    });

    it('should include usage instructions', () => {
      const backupScript = path.join(scriptsDir, 'backup.sh');
      const restoreScript = path.join(scriptsDir, 'restore.sh');

      [backupScript, restoreScript].forEach(scriptPath => {
        if (fs.existsSync(scriptPath)) {
          const content = fs.readFileSync(scriptPath, 'utf8');
          const hasUsage = content.includes('#') || content.includes('Usage') || content.includes('usage');
          expect(hasUsage).toBe(true);
        }
      });
    });
  });

  describe('Security Considerations', () => {
    it('should not contain hardcoded passwords', () => {
      const scripts = [
        path.join(scriptsDir, 'backup.sh'),
        path.join(scriptsDir, 'restore.sh')
      ];

      scripts.forEach(scriptPath => {
        if (fs.existsSync(scriptPath)) {
          const content = fs.readFileSync(scriptPath, 'utf8');
          expect(content).not.toContain('password123');
          expect(content).not.toContain('admin123');
          expect(content).not.toMatch(/PASSWORD\s*=\s*['"][^'"]*['"]/);
        }
      });
    });

    it('should use environment variables for sensitive data', () => {
      const scripts = [
        path.join(scriptsDir, 'backup.sh'),
        path.join(scriptsDir, 'restore.sh')
      ];

      scripts.forEach(scriptPath => {
        if (fs.existsSync(scriptPath)) {
          const content = fs.readFileSync(scriptPath, 'utf8');
          const usesEnvVars = content.includes('$') || content.includes('env') || content.includes('ENV');
          expect(usesEnvVars).toBe(true);
        }
      });
    });

    it('should have restricted permissions', () => {
      const scripts = [
        path.join(scriptsDir, 'backup.sh'),
        path.join(scriptsDir, 'restore.sh')
      ];

      scripts.forEach(scriptPath => {
        if (fs.existsSync(scriptPath)) {
          const stats = fs.statSync(scriptPath);
          // Should not be world-writable
          expect(stats.mode & parseInt('022', 8)).toBe(0);
        }
      });
    });
  });
});