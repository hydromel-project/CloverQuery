# Clover Query - Quick Setup Guide

## Monthly Automated Reports for Small Devices

This application is designed to run on small Linux devices (Raspberry Pi, small VMs) and automatically send monthly credit card expiration reports.

## 🚀 Quick Deployment

### 1. Clone and Configure
```bash
git clone <your-repository-url>
cd clover-query
cp .env.example .env
nano .env  # Edit with your actual credentials
```

### 2. Deploy with Docker
```bash
docker-compose up -d
```

### 3. Setup Monthly Cron Job
```bash
# Edit crontab
crontab -e

# Add this line for 1st of every month at 8:00 AM
0 8 1 * * cd /path/to/clover-query && docker-compose exec -T app npm run sync-and-email
```

## 📧 What It Does

**Monthly on the 1st at 8:00 AM:**
1. Syncs latest customer data from Clover API (USD + CAD merchants)
2. Generates expired cards report → Emails PDF to `info@umatek.com`
3. Generates expiring cards report → Emails PDF to `info@umatek.com` 
4. Logs execution status

## ⚙️ Configuration Required

**In `.env` file:**
```env
# Clover API (get from your Clover dashboard)
CLOVER_USD_MERCHANT_ID=your-usd-merchant-id
CLOVER_USD_API_TOKEN=your-usd-token
CLOVER_CAD_MERCHANT_ID=your-cad-merchant-id  
CLOVER_CAD_API_TOKEN=your-cad-token

# Microsoft 365 (setup app in Azure Portal)
EMAIL_CLIENT_ID=your-app-client-id
EMAIL_CLIENT_SECRET=your-app-secret
EMAIL_TENANT_ID=your-tenant-id

# Recipients (already configured)
EMAIL_RECIPIENT=info@umatek.com
EMAIL_FROM=info@umatek.com
EMAIL_ENABLED=true
```

## 🔧 Manual Operations

```bash
# Manual sync and email
docker-compose exec app npm run sync-and-email

# Individual reports
docker-compose exec app npm run pdf:expired
docker-compose exec app npm run pdf:expiring

# View logs
docker-compose logs -f
```

## 📋 System Requirements

- **Raspberry Pi**: 3B+ or newer, 2GB RAM recommended
- **VM**: 1-2 cores, 2GB RAM, 20GB disk  
- **OS**: Any Linux with Docker support
- **Network**: Internet access for Clover API and Microsoft 365

## 📁 File Structure

```
clover-query/
├── .env                    # Your credentials (DO NOT COMMIT)
├── docker-compose.yml      # Container orchestration
├── DEPLOYMENT.md          # Detailed deployment guide
├── MICROSOFT365_SETUP.md  # Email setup instructions
├── data/                  # SQLite database (persistent)
└── reports/              # Generated PDF files
```

## 🔒 Security

- ✅ Non-root container user
- ✅ Resource limits configured  
- ✅ Sensitive data in `.env` (gitignored)
- ✅ Health checks and restart policies
- ✅ Network isolation

## 📞 Support

For detailed setup instructions:
- **Microsoft 365 Email**: See `MICROSOFT365_SETUP.md`
- **Full Deployment Guide**: See `DEPLOYMENT.md`  
- **Raspberry Pi Setup**: See `DEPLOYMENT.md` → Raspberry Pi section
- **Troubleshooting**: See `DEPLOYMENT.md` → Troubleshooting section

**Perfect for unattended operation on small devices!** 🎯