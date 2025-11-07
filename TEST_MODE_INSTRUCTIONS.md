# Shippo Test Mode - GrailSeeker

## Overview

GrailSeeker's shipping integration is currently running in **TEST MODE** using Shippo's sandbox API. This allows full end-to-end testing of the shipping flow without generating real postage or incurring charges.

## What Works in Test Mode

✅ **Fetch real USPS/UPS/FedEx rates** from Shippo's sandbox  
✅ **Generate test shipping labels** with test tracking numbers  
✅ **Download label PDFs** (marked as "TEST - DO NOT MAIL")  
✅ **Full checkout integration** with shipping rate selection  
✅ **Automatic label generation** after payment success  
✅ **Seller dashboard** with "Download Label" functionality  
✅ **$0.75 markup calculation** and margin tracking  

## Test Mode Indicators

Yellow "Test Mode" badges are displayed in:
- **Checkout page**: Next to "Ship Nationwide" option
- **Seller dashboard**: Next to "Download Label" button

These badges indicate that:
- No real postage is being purchased
- Labels are for testing only and cannot be used for actual shipping
- Tracking numbers are test data

## Switching to Live Mode

To switch from test to live mode:

### 1. Update SHIPPO_API_KEY Secret

In your Supabase project secrets, replace the test API key with your live Shippo API key:

```
Test key format: shippo_test_xxxxxxxxxxxxx
Live key format: shippo_live_xxxxxxxxxxxxx
```

**That's it!** No code changes needed.

### 2. Verify Test Mode Badge Behavior

The "Test Mode" badges will automatically disappear once you switch to a live key, because:
- The badge only shows when the API key starts with `shippo_test_`
- With a live key, badges are hidden automatically
- All functionality remains exactly the same

### 3. Test the Live Integration

Before going fully live:
1. Process a small test transaction with a real Shippo account
2. Verify the label PDF can be printed and used by USPS/UPS/FedEx
3. Confirm tracking numbers are valid and trackable
4. Check that margins are being calculated correctly

## Cost Structure (Live Mode)

When using a live Shippo API key:

**Example Transaction:**
```
Shippo Label Cost:     $8.25   (actual USPS Priority cost)
GrailSeeker Markup:    +$0.75  (our margin)
-----------------------------------
Buyer Pays:            $9.00   (what buyer sees at checkout)
GrailSeeker Profit:    $0.75   (per label)
```

Shippo will charge your payment method for the actual label cost ($8.25 in this example). GrailSeeker keeps the $0.75 markup.

## Database Fields

All Shippo-related data is stored in the `orders` table:

| Field | Description | Example |
|-------|-------------|---------|
| `shippo_rate_id` | Selected rate from Shippo | `rate_abc123` |
| `label_cost_cents` | What Shippo charges us | `825` ($8.25) |
| `shipping_charged_cents` | What buyer pays | `900` ($9.00) |
| `shipping_margin_cents` | Our profit | `75` ($0.75) |
| `label_url` | PDF download link | `https://shippo...` |
| `tracking_number` | USPS/UPS tracking # | `940011111...` |
| `carrier` | Shipping carrier | `USPS` |

## API Endpoints

### Test API
```
https://api.goshippo.com/
```

All Shippo API calls use this same endpoint for both test and live mode. The API key determines which mode is active.

### Rate Limits
- Test mode: 100 requests/minute
- Live mode: 100 requests/minute (can be increased)

## Edge Functions

### get-shipping-rates
**Test behavior:**
- Returns real rates from Shippo sandbox
- Rates are comparable to live but may vary slightly
- No charges incurred

**Live behavior:**
- Returns real rates from Shippo production
- Rates match what carrier would actually charge
- No charges until label is purchased

### purchase-shipping-label
**Test behavior:**
- Creates test label with test tracking number
- Label PDF marked "TEST - DO NOT MAIL"
- No charges incurred
- Cannot be used for actual shipping

**Live behavior:**
- Purchases real postage from carrier
- Shippo charges your payment method immediately
- Label can be used for actual shipping
- Tracking number is valid

## Common Test Addresses

Use these Shippo test addresses during development:

```typescript
// Valid test address (will return rates)
const validTestAddress = {
  name: "Shippo Test",
  street1: "215 Clayton St.",
  city: "San Francisco",
  state: "CA",
  zip: "94117",
  country: "US"
};

// Invalid test address (will return validation error)
const invalidTestAddress = {
  name: "Invalid",
  street1: "123 Fake St.",
  city: "Nowhere",
  state: "XX",
  zip: "00000",
  country: "US"
};
```

## Troubleshooting Test Mode

### "No rates returned"
- Check that addresses are valid
- Verify parcel dimensions are reasonable
- Ensure weight is > 0

### "Label purchase failed"
- Rate may have expired (rates are valid for 1 hour)
- Get fresh rates and try again

### "Test mode badge not showing"
- Verify SHIPPO_API_KEY starts with `shippo_test_`
- Check browser console for errors
- Refresh the page

## Security Notes

- Test API keys can be committed to version control if needed (they're safe)
- Live API keys **must** be kept secret and stored in environment variables only
- Never expose live keys in frontend code or logs

## Support

### Shippo Support
- Test mode docs: https://goshippo.com/docs/testing/
- API reference: https://goshippo.com/docs/reference
- Support email: support@goshippo.com

### GrailSeeker Integration
- Edge function logs: Check Supabase function logs
- Database queries: Monitor `orders` table for Shippo fields
- Error tracking: All errors logged to console
