# Clover Query - Deployment Guide

This guide covers deploying Clover Query as a containerized application for automated monthly reports on small Linux machines (Raspberry Pi, small VMs, etc.).

## Overview

The application runs as a Docker container that:
- Syncs customer data from Clover API monthly
- Generates PDF reports for expired and expiring cards
- Emails reports automatically to `info@umatek.com`
- Requires minimal resources (suitable for Raspberry Pi)

## Prerequisites

- Docker and Docker Compose installed
- Internet connection
- Microsoft 365 credentials configured

## Quick Start

### 1. Clone Repository

```bash
git clone <repository-url>
cd clover-query
```

### 2. Configure Environment

Copy and edit the environment file:

```bash
cp .env.example .env
nano .env
```

Required configuration:

```env
# Clover API Configuration
CLOVER_USD_MERCHANT_ID=your-usd-merchant-id
CLOVER_USD_API_TOKEN=your-usd-token
CLOVER_CAD_MERCHANT_ID=your-cad-merchant-id
CLOVER_CAD_API_TOKEN=your-cad-token

# Email Configuration
EMAIL_RECIPIENT=info@umatek.com
EMAIL_FROM=info@umatek.com
EMAIL_CLIENT_ID=your-app-client-id
EMAIL_CLIENT_SECRET=your-client-secret
EMAIL_TENANT_ID=your-tenant-id
EMAIL_ENABLED=true

# Database
DATABASE_URL="file:./data/dev.db"
```

### 3. Deploy with Docker Compose

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f
```

## Cron Job Setup

### Monthly Execution (1st of Every Month)

Add the following cron job to run reports on the 1st of each month at 8:00 AM:

```bash
# Edit crontab
crontab -e

# Add this line for monthly execution at 8:00 AM on the 1st
0 8 1 * * cd /path/to/clover-query && docker-compose exec -T app npm run sync-and-email

# Alternative: Run without docker-compose (if running container directly)
0 8 1 * * docker exec clover-query npm run sync-and-email
```

### Cron Schedule Examples

```bash
# 1st of every month at 8:00 AM (recommended)
0 8 1 * * 

# 1st of every month at 6:00 AM
0 6 1 * *

# 1st and 15th of every month at 8:00 AM
0 8 1,15 * *

# Every Monday at 8:00 AM (weekly alternative)
0 8 * * 1
```

### Full Cron Job Setup

1. **Create deployment script:**

```bash
# Create /opt/clover-query/run-monthly-reports.sh
#!/bin/bash
set -e

# Navigate to project directory
cd /opt/clover-query

# Ensure container is running
docker-compose up -d

# Wait for container to be ready
sleep 10

# Run the sync and email workflow
docker-compose exec -T app npm run sync-and-email

# Log the execution
echo "$(date): Monthly reports completed" >> /var/log/clover-monthly.log
```

2. **Make script executable:**

```bash
chmod +x /opt/clover-query/run-monthly-reports.sh
```

3. **Add to crontab:**

```bash
crontab -e

# Add monthly execution
0 8 1 * * /opt/clover-query/run-monthly-reports.sh >> /var/log/clover-monthly.log 2>&1
```

## Raspberry Pi Deployment

### System Requirements

- Raspberry Pi 3B+ or newer
- Minimum 1GB RAM (2GB recommended)
- 8GB+ SD card
- Internet connection

### Installation Steps

1. **Install Docker:**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose -y

# Reboot
sudo reboot
```

2. **Deploy Application:**

```bash
# Create application directory
sudo mkdir -p /opt/clover-query
cd /opt/clover-query

# Clone repository
git clone <repository-url> .

# Configure environment
cp .env.example .env
sudo nano .env

# Build and start
docker-compose up -d
```

3. **Setup Monthly Cron:**

```bash
# Create run script
sudo tee /opt/clover-query/run-monthly-reports.sh << 'EOF'
#!/bin/bash
set -e
cd /opt/clover-query
docker-compose up -d
sleep 10
docker-compose exec -T app npm run sync-and-email
echo "$(date): Monthly reports completed" >> /var/log/clover-monthly.log
EOF

# Make executable
sudo chmod +x /opt/clover-query/run-monthly-reports.sh

# Add to crontab
crontab -e
# Add: 0 8 1 * * /opt/clover-query/run-monthly-reports.sh >> /var/log/clover-monthly.log 2>&1
```

## VMware VM Deployment

### VM Specifications

- **OS**: Ubuntu Server 22.04 LTS
- **CPU**: 1-2 cores
- **RAM**: 2GB minimum
- **Disk**: 20GB
- **Network**: NAT or Bridged

### Installation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install docker.io docker-compose -y

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER

# Logout and login again
exit
```

Follow the same deployment steps as Raspberry Pi.

## Container Management

### Useful Commands

```bash
# View running containers
docker-compose ps

# View logs
docker-compose logs -f

# Restart application
docker-compose restart

# Update application
git pull
docker-compose build
docker-compose up -d

# Manual report execution
docker-compose exec app npm run sync-and-email

# Access container shell
docker-compose exec app bash

# Stop application
docker-compose down

# Clean up (removes data!)
docker-compose down -v
```

### Health Monitoring

Create a simple health check script:

```bash
#!/bin/bash
# /opt/clover-query/healthcheck.sh

if docker-compose ps | grep -q "Up"; then
    echo "$(date): Clover Query container is running"
    exit 0
else
    echo "$(date): Clover Query container is down, restarting..."
    docker-compose up -d
    exit 1
fi
```

Add to crontab for monitoring:

```bash
# Check every hour
0 * * * * /opt/clover-query/healthcheck.sh >> /var/log/clover-health.log 2>&1
```

## Backup and Maintenance

### Database Backup

```bash
# Backup database monthly (2nd of month at 2 AM)
0 2 2 * * docker-compose exec -T app cp /app/data/dev.db /app/data/backups/dev-$(date +\%Y\%m\%d).db
```

### Log Rotation

```bash
# Create logrotate config
sudo tee /etc/logrotate.d/clover-query << 'EOF'
/var/log/clover-monthly.log {
    monthly
    rotate 12
    compress
    delaycompress
    missingok
    notifempty
}
EOF
```

## Troubleshooting

### Common Issues

1. **Container won't start:**
   ```bash
   docker-compose logs app
   ```

2. **Email authentication fails:**
   - Verify Microsoft 365 credentials in `.env`
   - Check that `info@umatek.com` mailbox exists and has permissions

3. **Database connection issues:**
   ```bash
   docker-compose exec app ls -la /app/data/
   ```

4. **Cron job not running:**
   ```bash
   # Check cron service
   sudo systemctl status cron
   
   # Check cron logs
   sudo tail -f /var/log/cron.log
   ```

### Performance Optimization

For resource-constrained environments:

```yaml
# docker-compose.yml - Add resource limits
services:
  app:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
```

## Security Considerations

1. **Environment Variables**: Never commit `.env` to git
2. **Container Updates**: Regularly update base images
3. **Network Security**: Use firewall rules to restrict access
4. **File Permissions**: Ensure proper permissions on scripts and data directories

```bash
# Set secure permissions
sudo chown -R root:docker /opt/clover-query
sudo chmod 750 /opt/clover-query
sudo chmod 640 /opt/clover-query/.env
```

This deployment setup provides a robust, automated solution for monthly Clover customer reports with minimal maintenance requirements.