# Baselane Pack v1 - Marketplace Rails

## Overview

Database-driven feature flags for Baselane-inspired marketplace rails that increase trust, clarity, and seller confidence.

## Feature Flags

All flags are stored in the `baselane_feature_flags` table and default to **OFF**.

| Flag Key | Description |
|----------|-------------|
| `ENABLE_BASELANE_PACK_V1` | **Master toggle** - When ON, enables ALL features below |
| `ENABLE_ORDER_TIMELINE` | Order status timeline on order detail pages |
| `ENABLE_SELLER_WALLET` | Seller wallet with Pending/Available/On-Hold balances |
| `ENABLE_EARNINGS_DASHBOARD` | Monthly earnings breakdown with CSV export |
| `ENABLE_RISK_HOLDS` | Non-blocking risk assessment for high-value orders |
| `ENABLE_NOTIFICATIONS` | Notifications center with bell icon |

### Managing Flags

1. Go to **Admin → Feature Flags** tab
2. Toggle individual features or use "Enable All" / "Disable All"
3. Changes take effect immediately (no code deployment required)

## Database Tables

### New Tables (Additive Only)

| Table | Purpose |
|-------|---------|
| `baselane_feature_flags` | Runtime feature flag storage |
| `order_status_events` | Timeline events for orders |
| `seller_balance_ledger` | Transaction ledger for wallet |
| `seller_wallet_summary` | Cached balance totals |
| `payout_requests` | Seller payout request queue |
| `order_risk_assessments` | Risk scoring for orders |

### Modified Tables

| Table | Change |
|-------|--------|
| `notifications` | Added `title` and `metadata` columns |

## Admin Tools

Located in **Admin → Admin Tools** tab:

1. **Sync Wallet From Orders** - Creates ledger entries for completed orders
2. **Recalculate Single Seller Wallet** - Recalculates summary for one seller
3. **Backfill Order Timeline Events** - Creates initial events for orders

All tools are **idempotent** - safe to run multiple times.

## Routes

| Route | Feature Flag |
|-------|--------------|
| `/seller/wallet` | `ENABLE_SELLER_WALLET` |
| `/seller/earnings` | `ENABLE_EARNINGS_DASHBOARD` |

## Code Structure

```
src/
├── hooks/
│   ├── useBaselaneFlags.ts      # Database-driven flag hook
│   └── useMarketplaceRails.ts   # Feature gating hook
├── components/
│   ├── admin/
│   │   ├── BaselaneFlagsAdmin.tsx   # Admin flag toggles
│   │   └── BaselaneAdminTools.tsx   # Backfill tools
│   └── marketplace-rails/
│       ├── OrderTimeline.tsx
│       ├── SellerWalletCard.tsx
│       ├── WalletLedger.tsx
│       └── ...
└── pages/
    ├── SellerWallet.tsx
    └── SellerEarnings.tsx
```

## Safety Rules

✅ All flags default OFF  
✅ No changes to existing checkout/payment logic  
✅ No changes to scanner/OCR functionality  
✅ Read-only inference when data missing  
✅ Graceful fallback (show $0, "No data yet")  
✅ Additive-only database changes  

## Testing Checklist

- [ ] With all flags OFF: App works exactly as before
- [ ] `ENABLE_SELLER_WALLET` ON: Wallet shows $0 with empty ledger
- [ ] `ENABLE_EARNINGS_DASHBOARD` ON: Earnings page renders, CSV exports
- [ ] `ENABLE_ORDER_TIMELINE` ON: Timeline renders with inference
- [ ] Master toggle ON: All features activate
