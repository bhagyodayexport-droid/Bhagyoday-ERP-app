#!/bin/bash
# Bhagyoday Cloud ERP - Backup Cron Job
# Add to crontab: 0 20 * * * /path/to/backup-cron.sh (20:30 UTC = 02:00 IST)

# Navigate to project directory (assuming standard deployment)
# cd /path/to/bhagyoday-erp

echo "Running scheduled backup at $(date)"
npx tsx scripts/backup.ts >> logs/backup.log 2>&1
echo "Backup process finished at $(date)"
