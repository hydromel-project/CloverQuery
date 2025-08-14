#!/bin/bash

# CloverQuery Cron Jobs Installer
# Sets up automated cron jobs for monthly reports and health monitoring

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${BLUE}INFO: $1${NC}"; }
success() { echo -e "${GREEN}SUCCESS: $1${NC}"; }
warning() { echo -e "${YELLOW}WARNING: $1${NC}"; }

echo "CloverQuery Cron Jobs Installer"
echo "==============================="

# Verify scripts exist
if [[ ! -f "$SCRIPT_DIR/run-monthly-reports.sh" ]]; then
    echo "ERROR: run-monthly-reports.sh not found"
    exit 1
fi

if [[ ! -f "$SCRIPT_DIR/health-monitor.sh" ]]; then
    echo "ERROR: health-monitor.sh not found"
    exit 1
fi

info "Installing cron jobs for user: $(whoami)"
info "Project directory: $PROJECT_DIR"

# Create temporary cron file
TEMP_CRON=$(mktemp)

# Get existing cron jobs
crontab -l 2>/dev/null > "$TEMP_CRON" || true

# Remove existing CloverQuery cron jobs
sed -i '/# CloverQuery/d' "$TEMP_CRON"
sed -i '/run-monthly-reports.sh/d' "$TEMP_CRON"
sed -i '/health-monitor.sh/d' "$TEMP_CRON"

# Add new cron jobs
cat >> "$TEMP_CRON" << EOF

# CloverQuery Automated Jobs
# Monthly reports on 1st of every month at 8:00 AM
0 8 1 * * $SCRIPT_DIR/run-monthly-reports.sh >> /var/log/clover-monthly.log 2>&1

# Health check every 30 minutes
*/30 * * * * $SCRIPT_DIR/health-monitor.sh check >> /var/log/clover-health.log 2>&1

# Weekly cleanup on Sundays at 2:00 AM
0 2 * * 0 $SCRIPT_DIR/container-manager.sh cleanup >> /var/log/clover-manager.log 2>&1
EOF

# Install new cron jobs
crontab "$TEMP_CRON"
rm -f "$TEMP_CRON"

success "Cron jobs installed successfully!"

echo ""
echo "Installed Jobs:"
echo "==============="
echo "1. Monthly Reports:  1st of month at 8:00 AM"
echo "2. Health Checks:    Every 30 minutes"
echo "3. Weekly Cleanup:   Sundays at 2:00 AM"
echo ""

info "Verifying cron installation..."
crontab -l | grep -A 10 "CloverQuery"

echo ""
echo "Log Files:"
echo "==========="
echo "Monthly Reports: /var/log/clover-monthly.log"
echo "Health Monitor:  /var/log/clover-health.log"
echo "Manager:         /var/log/clover-manager.log"
echo ""

warning "Make sure log files are writable:"
echo "sudo touch /var/log/clover-{monthly,health,manager}.log"
echo "sudo chown $(whoami):$(whoami) /var/log/clover-*.log"

echo ""
success "Setup complete! CloverQuery will now run automatically."