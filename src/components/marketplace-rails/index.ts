/**
 * MARKETPLACE RAILS - README
 * ============================================================================
 * 
 * This module implements Baselane-inspired transaction rails for GrailSeeker:
 * - Order Timeline: Visual status tracking from payment to payout
 * - Seller Wallet: Balance management with pending/available/held funds
 * - Earnings Dashboard: Monthly reports with CSV export
 * - Risk Engine: Non-blocking risk assessment for payouts
 * - Notifications: Order status updates (extends existing system)
 * 
 * ============================================================================
 * FEATURE FLAG
 * ============================================================================
 * 
 * All features are gated behind `marketplaceRailsEnabled` in featureFlags.ts
 * 
 * Default: false (OFF)
 * 
 * To enable:
 * 1. Update src/config/featureFlags.ts:
 *    marketplaceRailsEnabled: true
 * 
 * 2. Or set via admin UI (when implemented)
 * 
 * ============================================================================
 * DATABASE TABLES (created by migration)
 * ============================================================================
 * 
 * 1. order_status_events
 *    - Tracks order lifecycle: paid → shipped → delivered → completed
 *    - Supports: buyer, seller, system, admin actors
 *    - RLS: Users can view events for their own orders
 * 
 * 2. seller_balance_ledger
 *    - Individual transaction entries for seller earnings
 *    - Types: pending_credit, available_credit, hold, release_hold, fee, payout
 *    - RLS: Sellers can only view their own entries
 * 
 * 3. seller_wallet_summary
 *    - Computed snapshot: pending_cents, available_cents, on_hold_cents
 *    - Can be rebuilt from ledger entries
 *    - RLS: Sellers can only view their own summary
 * 
 * 4. payout_requests
 *    - Seller-initiated payout requests
 *    - Status: requested → approved → paid (or rejected)
 *    - RLS: Sellers can create and view their own requests
 * 
 * 5. order_risk_assessments
 *    - Risk scoring: low, medium, high
 *    - Non-blocking: only affects payout timing, never checkout
 *    - RLS: Order participants can view
 * 
 * ============================================================================
 * COMPONENTS
 * ============================================================================
 * 
 * src/components/marketplace-rails/
 *   OrderTimeline.tsx        - Visual timeline for order detail page
 *   SellerWalletCard.tsx     - Balance summary card with payout button
 *   WalletLedger.tsx         - Transaction history list
 *   PayoutRequestsList.tsx   - Payout request status tracking
 *   OrderRiskBadge.tsx       - Risk level indicator
 * 
 * src/hooks/
 *   useSellerWallet.ts       - Wallet data fetching and payout logic
 *   useMarketplaceRails.ts   - Feature flag access hook
 * 
 * src/pages/
 *   SellerWallet.tsx         - Full wallet management page
 *   SellerEarnings.tsx       - Earnings dashboard with CSV export
 * 
 * ============================================================================
 * SAFETY GUARANTEES
 * ============================================================================
 * 
 * 1. ADDITIVE ONLY: No existing tables, routes, or logic modified
 * 2. FEATURE FLAG: Everything gated, default OFF
 * 3. NON-BLOCKING: Risk engine never blocks checkout
 * 4. READ-ONLY INFERENCE: Timeline works without events via status inference
 * 5. REVERSIBLE: Can be disabled instantly via feature flag
 * 
 * ============================================================================
 * ROUTES (add to App.tsx when enabling)
 * ============================================================================
 * 
 * /seller/wallet     - Seller Wallet page
 * /seller/earnings   - Earnings Dashboard page
 * 
 * These routes should only be registered when marketplaceRailsEnabled is true.
 * 
 * ============================================================================
 */

export { OrderTimeline } from "./OrderTimeline";
export { SellerWalletCard } from "./SellerWalletCard";
export { WalletLedger } from "./WalletLedger";
export { PayoutRequestsList } from "./PayoutRequestsList";
export { OrderRiskBadge, OrderRiskCard } from "./OrderRiskBadge";
