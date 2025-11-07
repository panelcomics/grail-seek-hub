# Shippo Integration for GrailSeeker

## Overview

GrailSeeker now includes automated shipping label generation through Shippo integration. This provides prepaid shipping labels for sellers and includes a small profit margin on each shipment.

## Features

- **Automated Label Generation**: Sellers can generate prepaid USPS/UPS shipping labels
- **Multiple Shipping Options**: Buyers can choose from economy to priority shipping
- **Built-in Margin**: GrailSeeker earns $0.75 markup on each label
- **Tracking Integration**: Automatic tracking number assignment and buyer notifications
- **Seller Dashboard**: Download labels and view shipping details

## Architecture

### Database Schema

Added columns to `orders` table:
- `label_cost_cents` - Actual cost Shippo charges us
- `shipping_charged_cents` - Amount buyer paid for shipping
- `shipping_margin_cents` - Our profit ($0.75 typically)
- `label_url` - PDF download link for the shipping label
- `shippo_transaction_id` - Shippo transaction reference
- `shippo_rate_id` - Selected shipping rate ID

### Edge Functions

#### 1. `get-shipping-rates`
**Purpose**: Fetch available shipping rates from Shippo with markup

**Input**:
```json
{
  "fromAddress": {
    "name": "Seller Name",
    "street1": "123 Main St",
    "city": "City",
    "state": "ST",
    "zip": "12345",
    "country": "US"
  },
  "toAddress": { /* same structure */ },
  "parcel": {
    "length": "12",
    "width": "9",
    "height": "3",
    "distance_unit": "in",
    "weight": "2",
    "mass_unit": "lb"
  }
}
```

**Output**:
```json
{
  "rates": [
    {
      "rate_id": "abc123",
      "provider": "USPS",
      "servicelevel": "Priority Mail",
      "duration_terms": "1-3 business days",
      "estimated_days": 2,
      "label_cost_cents": 825,
      "shipping_charged_cents": 900,
      "shipping_margin_cents": 75,
      "display_price": "$9.00"
    }
  ],
  "shipment_id": "shipment_xyz"
}
```

#### 2. `purchase-shipping-label`
**Purpose**: Purchase a shipping label after payment succeeds

**Input**:
```json
{
  "orderId": "uuid",
  "rateId": "rate_id_from_get_rates",
  "labelCostCents": 825,
  "shippingChargedCents": 900,
  "shippingMarginCents": 75
}
```

**Output**:
```json
{
  "success": true,
  "label_url": "https://shippo-delivery.s3.amazonaws.com/...",
  "tracking_number": "9400111111111111111111",
  "tracking_url": "https://tools.usps.com/go/TrackConfirmAction?..."
}
```

## Pricing Model

### Markup Strategy
- **Fixed Markup**: $0.75 per label (defined in `SHIPPING_MARKUP_CENTS`)
- Applied to all shipping services (economy, priority, etc.)
- Buyer sees final price including markup
- Seller receives prepaid label at no additional cost

### Fee Breakdown Example
```
Shippo Label Cost:     $8.25
GrailSeeker Markup:    +$0.75
-----------------------------------
Buyer Pays:            $9.00
```

### Billing Flow
1. Buyer selects shipping method during checkout
2. Total includes: item price + shipping (with markup) + buyer protection
3. GrailSeeker collects full payment
4. Label purchased from Shippo at actual cost
5. GrailSeeker retains markup as profit

## User Flows

### Checkout Flow
1. Buyer enters shipping address
2. `ShippingRateSelector` component fetches rates from Shippo
3. Rates displayed with $0.75 markup included
4. Buyer selects preferred shipping method
5. Checkout proceeds with shipping cost included in total

### Post-Purchase Flow (Seller)
1. After payment succeeds, seller views order in dashboard
2. Seller clicks "Download Label" button
3. `purchase-shipping-label` edge function called
4. Shippo generates label and returns PDF URL
5. Order updated with label URL and tracking number
6. Seller downloads label and ships item

### Post-Purchase Flow (Buyer)
1. Receives email notification with tracking number
2. Can track package via order details page
3. Tracking links to carrier website (USPS/UPS/FedEx)

## Components

### `ShippingRateSelector.tsx`
- Displays available shipping options
- Shows delivery time estimates
- Handles rate selection
- Communicates selected rate to parent component

### `SellerOrderManagement.tsx`
- Updated to show "Download Label" button when `label_url` exists
- Displays shipping margin data (admin view only)
- Integrates with existing tracking workflow

## Configuration

### Environment Variables
Required in Supabase secrets:
- `SHIPPO_API_KEY` - Your Shippo API key (test or live mode)

### Default Parcel Dimensions
Defined in `src/lib/shippo.ts`:
```typescript
export const DEFAULT_PARCEL = {
  length: "12",   // inches
  width: "9",     // inches
  height: "3",    // inches
  weight: "2",    // pounds
};
```

## Local Pickup Handling

The integration **does not interfere** with local pickup:
- If `shipping_method === "local_pickup"`, Shippo is skipped entirely
- No shipping rates fetched
- No labels generated
- Existing local pickup flow unchanged

## Security & Access

### Rate Fetching
- Requires authenticated user
- Uses Supabase anon key (safe for frontend calls)

### Label Purchase
- Requires authenticated user
- Verifies user is the seller
- Uses Supabase service role key for database updates
- Cannot be called by buyers

## Testing

### Test Mode
1. Use Shippo test API key during development
2. Test labels are generated but not actually shipped
3. No charges applied to Shippo account

### Test Addresses
Use Shippo's test addresses:
```javascript
const testAddress = {
  name: "Shippo Test",
  street1: "215 Clayton St.",
  city: "San Francisco",
  state: "CA",
  zip: "94117",
  country: "US"
};
```

## Error Handling

### Common Errors
1. **Invalid address**: Shippo returns validation errors
2. **No rates available**: Typically due to invalid parcel dimensions or address
3. **Label purchase failure**: Transaction declined or already purchased
4. **Rate ID expired**: Shippo rates expire after 1 hour

### Error Messages
All errors are logged to console and shown to user via toast notifications.

## Monitoring

### Key Metrics to Track
1. **Label cost vs charged**: Ensure margin is maintained
2. **Failed label generations**: Track Shippo API errors
3. **Shipping method distribution**: USPS vs UPS usage
4. **Average shipping cost**: Monitor for unusual spikes

### Database Queries
```sql
-- Average shipping margin
SELECT AVG(shipping_margin_cents) / 100 as avg_margin_dollars
FROM orders
WHERE shipping_margin_cents IS NOT NULL;

-- Label generation success rate
SELECT 
  COUNT(*) FILTER (WHERE label_url IS NOT NULL) as success,
  COUNT(*) as total
FROM orders
WHERE payment_status = 'paid';

-- Total shipping revenue
SELECT SUM(shipping_margin_cents) / 100 as total_shipping_profit_dollars
FROM orders
WHERE shipping_margin_cents > 0;
```

## Future Enhancements

### Potential Improvements
1. **Dynamic margins**: Adjust markup based on shipping cost
2. **Insurance options**: Add insurance for high-value items
3. **International shipping**: Extend to USPS International
4. **Bulk label generation**: Generate multiple labels at once
5. **Shipping analytics**: Detailed reports on shipping performance
6. **Rate shopping**: Compare multiple carriers automatically

## Support

### Shippo Resources
- API Docs: https://goshippo.com/docs/
- Dashboard: https://goshippo.com/
- Support: support@goshippo.com

### GrailSeeker Integration
- Edge Functions: `/supabase/functions/get-shipping-rates` and `/purchase-shipping-label`
- Components: `/src/components/ShippingRateSelector.tsx`
- Utilities: `/src/lib/shippo.ts`
