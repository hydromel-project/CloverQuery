# TEST MODE - Simulating November 15, 2026

## Current Test Configuration

The system is currently simulating **November 15, 2026** to test credit card expiration functionality.

## Expected Results in Test Mode

With this test date, cards with expiration dates of:
- **10/26 and earlier** → Will show as EXPIRED 🚨
- **11/26** → Will show as EXPIRING SOON (15 days remaining) ⚠️  
- **12/26** → Will show as EXPIRING SOON (within 30 days) ⚠️
- **01/27** → Will show as EXPIRING LATER (31-90 days) ⚠️
- **02/27 and later** → Will show as normal/valid

## To Switch Back to Production Mode

**File:** `app/lib/card-expiration-analyzer.ts`

**Change line 48 from:**
```typescript
const now = new Date('2026-11-15'); // Change this back to new Date() for production
```

**To:**
```typescript
const now = new Date(); // Production mode
```

**Also update cache key in:** `app/lib/clover-client.ts`
Change from `customers_v4_fix_nested_` back to `customers_v2_`

**Remove test mode indicators from:**
- `app/routes/dashboard.tsx` 
- `app/routes/clients.tsx`

## Test Cards Examples

If you have cards with these expiration dates, they should show the following status:

| Card Exp Date | Status | Days | Color |
|---------------|--------|------|-------|
| 0125 (01/25)  | EXPIRED | -680+ days | Red 🚨 |
| 0626 (06/26)  | EXPIRED | -138 days | Red 🚨 |
| 1026 (10/26)  | EXPIRED | -16 days | Red 🚨 |
| 1126 (11/26)  | EXPIRING | 15 days | Orange ⚠️ |
| 1226 (12/26)  | EXPIRING | 45 days | Orange ⚠️ |
| 0127 (01/27)  | EXPIRING LATER | 77 days | Orange ⚠️ |
| 0327 (03/27)  | Valid | 136+ days | Normal |

This will help you test the visual styling and filtering functionality!