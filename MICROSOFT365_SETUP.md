# Microsoft 365 Email Setup Guide

This guide walks you through configuring Microsoft 365 email functionality for the Clover Query application.

## Overview

The application uses Microsoft Graph API with app-only authentication (Client Credentials flow) to send PDF reports via email. This approach is suitable for automated systems and doesn't require user interaction.

## Prerequisites

- Microsoft 365 tenant
- Global Administrator access to Azure Portal
- A mailbox/email account that will be used to send emails

## Step 1: Register Application in Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Fill in the details:
   - **Name**: `Clover Query Email Service`
   - **Supported account types**: `Accounts in this organizational directory only`
   - **Redirect URI**: Leave blank for app-only authentication
5. Click **Register**

## Step 2: Configure API Permissions

1. In your newly created app, go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Choose **Application permissions** (not Delegated)
5. Add the following permissions:
   - `Mail.Send` - Send mail as any user
6. Click **Grant admin consent** (requires Global Administrator)

## Step 3: Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Add description: `Clover Query Email Secret`
4. Set expiration (recommended: 24 months)
5. Click **Add**
6. **Important**: Copy the secret value immediately - you won't be able to see it again!

## Step 4: Get Required Information

Collect the following information from your app registration:

- **Application (client) ID**: Found on the Overview page
- **Directory (tenant) ID**: Found on the Overview page  
- **Client secret**: The value you copied in Step 3

## Step 5: Configure Environment Variables

Update your `.env` file with the Microsoft 365 configuration:

```env
# Email Configuration (Microsoft 365)
EMAIL_RECIPIENT=c.baril@umatek.com
EMAIL_FROM=your-sender-email@yourdomain.com
EMAIL_CLIENT_ID=your-application-client-id-here
EMAIL_CLIENT_SECRET=your-client-secret-here
EMAIL_TENANT_ID=your-tenant-id-here
EMAIL_ENABLED=true
```

Replace the placeholder values:
- `EMAIL_RECIPIENT`: The default recipient email address
- `EMAIL_FROM`: The email address that will appear as the sender (must be a valid mailbox in your tenant)
- `EMAIL_CLIENT_ID`: Application (client) ID from Step 4
- `EMAIL_CLIENT_SECRET`: Client secret from Step 4
- `EMAIL_TENANT_ID`: Directory (tenant) ID from Step 4

## Step 6: Test the Configuration

1. Restart your application to load the new environment variables
2. Navigate to the customer print page (`/customers/print`)
3. Click the **📧 Send by Email** button
4. Check for success/error messages

## Troubleshooting

### Common Issues

1. **"Permission denied" error**
   - Ensure you granted admin consent for the Mail.Send permission
   - Verify the application has the correct API permissions

2. **"Sender email address not found" error**
   - Make sure `EMAIL_FROM` is a valid mailbox in your Microsoft 365 tenant
   - The email address must exist and be accessible

3. **"Authentication failed" error**
   - Double-check your `EMAIL_CLIENT_ID`, `EMAIL_CLIENT_SECRET`, and `EMAIL_TENANT_ID`
   - Ensure the client secret hasn't expired

4. **"Email service is disabled" error**
   - Set `EMAIL_ENABLED=true` in your `.env` file
   - Restart the application after making changes

### Testing Authentication

You can test your Microsoft Graph connection using the Microsoft Graph Explorer:
1. Go to [Microsoft Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer)
2. Sign in with your admin account
3. Try a test query like `GET https://graph.microsoft.com/v1.0/users`

## Security Considerations

- Store client secrets securely and rotate them regularly
- Use the principle of least privilege - only grant necessary permissions
- Monitor application usage through Azure Portal logs
- Consider using certificate-based authentication for production environments

## Features

Once configured, the email functionality provides:

- **Automated PDF generation**: Server-side PDF creation using Puppeteer
- **Professional email templates**: HTML-formatted emails with report details
- **Attachment support**: PDF reports attached to emails
- **Error handling**: Comprehensive error messages and logging
- **Configurable recipients**: Default recipient with option for custom addresses

## Usage

### Web Interface

The email button appears on the print report page alongside Print and Download PDF buttons. When clicked:

1. Generates a PDF report using Puppeteer
2. Creates an HTML email with report metadata
3. Attaches the PDF to the email
4. Sends via Microsoft Graph API
5. Shows success/error feedback to the user

### CLI Commands

#### Comprehensive Workflow
```bash
# Complete workflow: Sync data + Email both reports
npm run sync-and-email
```

This command performs:
1. Syncs latest customer data from Clover API
2. Generates and emails expired cards report  
3. Generates and emails expiring cards report
4. Provides detailed progress and summary

#### Individual PDF Commands

The CLI PDF generation commands automatically send emails when `EMAIL_ENABLED=true`:

```bash
# Generate and email action-required report
npm run pdf:action

# Generate and email expired cards report  
npm run pdf:expired

# Generate and email expiring cards report
npm run pdf:expiring

# Generate custom report with optional email
npm run pdf [filter] [output-dir]
```

When email is enabled, the CLI will:
1. Generate the PDF report and save it locally
2. Automatically send the report via email
3. Provide status feedback for both file saving and email delivery

### Email Content

The emails include:
- Report type and customer count
- Generation timestamp
- Professional HTML formatting
- PDF attachment with descriptive filename

### Scheduling

You can combine this with cron jobs for automated daily/weekly reports:

```bash
# Example cron job for daily expired card reports at 9 AM
0 9 * * * cd /path/to/clover-query && npm run pdf:expired
```