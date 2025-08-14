# Clover API Integration for Credit Card Expiration Monitoring

## Overview
This system monitors customer credit card expiration dates across multiple Clover merchant accounts (USD and CAD) to send proactive renewal reminders.

## API Endpoints

### Authentication
- **Method**: Bearer Token Authentication
- **Header**: `Authorization: Bearer {api_token}`
- **Base URLs**:
  - Sandbox: `https://apisandbox.dev.clover.com`
  - Production US: `https://api.clover.com`
  - Production CA: `https://api.clover.com` (with CAD merchant)

### Key Endpoints

#### Get All Customers
```
GET /v3/merchants/{mId}/customers
```
**Response includes customer cards with expiration data**

#### Get Single Customer
```
GET /v3/merchants/{mId}/customers/{customerId}
```

#### Customer Cards Structure
```json
{
  "elements": [
    {
      "id": "customer_id",
      "firstName": "John",
      "lastName": "Doe",
      "emailAddresses": [...],
      "phoneNumbers": [...],
      "cards": [
        {
          "first6": "424242",
          "last4": "4242",
          "expirationDate": "1027", // MMYY format
          "cardType": "VISA"
        }
      ]
    }
  ]
}
```

## Multi-Merchant Configuration

### Environment Variables Required
```env
# USD Merchant
CLOVER_USD_MERCHANT_ID=your_usd_merchant_id
CLOVER_USD_API_TOKEN=your_usd_api_token

# CAD Merchant  
CLOVER_CAD_MERCHANT_ID=your_cad_merchant_id
CLOVER_CAD_API_TOKEN=your_cad_api_token

# API Environment
CLOVER_ENV=sandbox|production
```

## Expiration Date Logic

### Card Expiration Format: MMYY
- Example: "1027" = October 2027
- Parse: Month = "10", Year = "27" (20**27**)

### Expiration Detection
- **Expired**: Current date > last day of expiration month/year
- **Expiring Soon**: 30-90 days before expiration
- **Future**: More than 90 days until expiration

## System Architecture

### Core Components
1. **Multi-Merchant Client** - Handles USD/CAD API calls
2. **Card Expiration Analyzer** - Processes expiration dates
3. **Notification Scheduler** - Manages reminder timing
4. **Customer Contact Manager** - Handles email/SMS/phone outreach

### Data Flow
1. Fetch customers from both USD and CAD merchants
2. Extract and parse card expiration dates
3. Categorize cards by expiration status
4. Schedule appropriate notifications
5. Track notification history to avoid duplicates

## Implementation Notes

- Cards expire on the last day of the expiration month
- Handle timezone differences for USD vs CAD merchants
- Respect customer communication preferences
- Implement rate limiting for API calls
- Store notification history to prevent spam
- Support batch processing for large customer bases