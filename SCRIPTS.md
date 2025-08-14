# CloverQuery Shell Scripts Guide

This document describes the shell scripts available for managing the containerized CloverQuery application.

## 📁 Scripts Overview

| Script | Purpose | Usage |
|--------|---------|-------|
| `run-monthly-reports.sh` | Main monthly automation script | Cron job execution |
| `container-manager.sh` | Container management utility | Manual operations |
| `health-monitor.sh` | Health monitoring and auto-recovery | System monitoring |
| `install-cron-jobs.sh` | Automated cron job setup | One-time setup |

## 🚀 Quick Setup

### 1. Make Scripts Executable
```bash
chmod +x scripts/*.sh
```

### 2. Install Automated Cron Jobs
```bash
# Run once to setup all automation
./scripts/install-cron-jobs.sh
```

### 3. Setup Log Files
```bash
# Create log files with proper permissions
sudo touch /var/log/clover-{monthly,health,manager}.log
sudo chown $(whoami):$(whoami) /var/log/clover-*.log
```

## 📋 Script Details

### `run-monthly-reports.sh` - Monthly Automation

**Primary script for monthly automated reports.**

```bash
# Basic usage (for cron jobs)
./scripts/run-monthly-reports.sh

# Test mode (no emails sent)
./scripts/run-monthly-reports.sh --test

# Force run (ignore recent execution checks)
./scripts/run-monthly-reports.sh --force

# Show help
./scripts/run-monthly-reports.sh --help
```

**What it does:**
1. ✅ Checks prerequisites (Docker, files, permissions)
2. ✅ Ensures container is running and healthy
3. ✅ Executes full sync and email workflow
4. ✅ Generates expired cards report → emails to `info@umatek.com`
5. ✅ Generates expiring cards report → emails to `info@umatek.com`
6. ✅ Cleans up old files and logs
7. ✅ Comprehensive logging and error handling

**Cron Job Usage:**
```bash
# Monthly on 1st at 8:00 AM
0 8 1 * * /path/to/scripts/run-monthly-reports.sh >> /var/log/clover-monthly.log 2>&1
```

### `container-manager.sh` - Container Operations

**Swiss-army knife for container management.**

```bash
# Container lifecycle
./scripts/container-manager.sh start
./scripts/container-manager.sh stop
./scripts/container-manager.sh restart
./scripts/container-manager.sh status

# Operations
./scripts/container-manager.sh sync           # Manual sync and email
./scripts/container-manager.sh report expired # Individual reports
./scripts/container-manager.sh logs 100      # View logs
./scripts/container-manager.sh shell         # Container shell access

# Maintenance  
./scripts/container-manager.sh update        # Git pull + rebuild
./scripts/container-manager.sh cleanup       # Clean old files
./scripts/container-manager.sh backup        # Create backup
./scripts/container-manager.sh health        # Health check
```

**Examples:**
```bash
# Check what's running
./scripts/container-manager.sh status

# Generate only expired cards report
./scripts/container-manager.sh report expired

# View real-time logs
./scripts/container-manager.sh logs 

# Get into container for debugging
./scripts/container-manager.sh shell

# Update to latest version
./scripts/container-manager.sh update
```

### `health-monitor.sh` - Health Monitoring

**Monitors container health and auto-restarts if needed.**

```bash
# Single health check
./scripts/health-monitor.sh check

# Start continuous monitoring (daemon)
./scripts/health-monitor.sh monitor

# Check monitoring status  
./scripts/health-monitor.sh status

# Stop monitoring
./scripts/health-monitor.sh stop

# Clean up logs
./scripts/health-monitor.sh cleanup
```

**Auto-restart Logic:**
- 🔍 Checks container every 5 minutes (in daemon mode)
- 🔄 Auto-restarts failed containers (up to 3 attempts)
- 📊 Monitors system resources (CPU, memory, disk)
- 📧 Sends alerts on failures
- 🧹 Automatically cleans logs

**Cron Job Usage:**
```bash
# Health check every 30 minutes
*/30 * * * * /path/to/scripts/health-monitor.sh check >> /var/log/clover-health.log 2>&1
```

### `install-cron-jobs.sh` - Automation Setup

**One-time setup script for all cron jobs.**

```bash
./scripts/install-cron-jobs.sh
```

**Installs:**
1. **Monthly Reports**: 1st of month at 8:00 AM
2. **Health Checks**: Every 30 minutes  
3. **Weekly Cleanup**: Sundays at 2:00 AM

## 📅 Automated Schedule

Once installed, CloverQuery runs on this schedule:

| Frequency | Time | Task | Script |
|-----------|------|------|--------|
| Monthly | 1st at 8:00 AM | Sync data + email reports | `run-monthly-reports.sh` |
| Every 30 min | :00, :30 | Health check + auto-restart | `health-monitor.sh check` |
| Weekly | Sun 2:00 AM | Cleanup old files | `container-manager.sh cleanup` |

## 📊 Monitoring & Logs

### Log Locations
```bash
/var/log/clover-monthly.log    # Monthly reports execution
/var/log/clover-health.log     # Health monitoring
/var/log/clover-manager.log    # Container management
/tmp/clover-alerts.log         # System alerts
```

### View Live Logs
```bash
# Monthly reports
tail -f /var/log/clover-monthly.log

# Health monitoring
tail -f /var/log/clover-health.log

# Container logs
./scripts/container-manager.sh logs

# All CloverQuery logs
tail -f /var/log/clover-*.log
```

### Check System Status
```bash
# Overall health check
./scripts/health-monitor.sh status
./scripts/container-manager.sh health

# Container status
./scripts/container-manager.sh status

# Cron jobs status
crontab -l | grep CloverQuery
```

## 🔧 Common Operations

### Manual Monthly Report
```bash
# Test the monthly workflow
./scripts/run-monthly-reports.sh --test

# Run actual monthly reports
./scripts/run-monthly-reports.sh
```

### Emergency Recovery
```bash
# If container is stuck
./scripts/container-manager.sh restart

# If health monitor is stuck
./scripts/health-monitor.sh stop
./scripts/health-monitor.sh monitor &

# Nuclear option - full reset
./scripts/container-manager.sh stop
docker system prune -f
./scripts/container-manager.sh start
```

### Maintenance Tasks
```bash
# Update to latest version
./scripts/container-manager.sh update

# Backup data before updates
./scripts/container-manager.sh backup

# Clean up old files
./scripts/container-manager.sh cleanup

# Check health status
./scripts/container-manager.sh health
```

## 🛠️ Troubleshooting

### Container Won't Start
```bash
# Check Docker status
sudo systemctl status docker

# Check logs
./scripts/container-manager.sh logs 100

# Rebuild container
./scripts/container-manager.sh update
```

### Email Not Sending
```bash
# Test email configuration
./scripts/run-monthly-reports.sh --test

# Check environment variables
cat .env | grep EMAIL

# Manual test
./scripts/container-manager.sh report expired
```

### Cron Jobs Not Running
```bash
# Check if cron service is running
sudo systemctl status cron

# View cron logs
sudo tail -f /var/log/cron.log

# Reinstall cron jobs
./scripts/install-cron-jobs.sh
```

### High Resource Usage
```bash
# Check system resources
./scripts/health-monitor.sh status

# View container stats
./scripts/container-manager.sh status

# Clean up resources
./scripts/container-manager.sh cleanup
```

## 🔒 Security Notes

- Scripts run as non-root user
- Log files require proper permissions
- Environment variables secured in `.env`
- Container runs with resource limits
- Health monitoring prevents resource exhaustion

## 🎯 Production Recommendations

### VM Setup
```bash
# Install scripts and setup automation
git clone https://github.com/hydromel-project/CloverQuery.git
cd CloverQuery
cp .env.example .env
nano .env  # Configure credentials

# Setup automation
./scripts/install-cron-jobs.sh

# Create log files
sudo touch /var/log/clover-{monthly,health,manager}.log
sudo chown $(whoami):$(whoami) /var/log/clover-*.log

# Start monitoring
./scripts/health-monitor.sh monitor &
```

### Monitoring Setup
```bash
# Add to system startup (optional)
echo "./scripts/health-monitor.sh monitor &" >> ~/.bashrc

# Setup log rotation
sudo tee /etc/logrotate.d/clover-query << 'EOF'
/var/log/clover-*.log {
    monthly
    rotate 12
    compress
    delaycompress
    missingok
    notifempty
}
EOF
```

This script-based approach provides **reliable, automated, and maintainable** CloverQuery operations with comprehensive monitoring and error recovery! 🚀