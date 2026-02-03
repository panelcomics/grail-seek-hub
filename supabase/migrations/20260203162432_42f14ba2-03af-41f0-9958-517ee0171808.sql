-- =====================================================
-- MARKETPLACE RAILS: Phase 1-5 Tables
-- Safe, additive tables for transaction tracking
-- =====================================================

-- Phase 1: Order Status Events (Timeline)
CREATE TABLE IF NOT EXISTS public.order_status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  actor_user_id UUID,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('buyer', 'seller', 'system', 'admin')),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'paid', 'label_created', 'shipped', 'delivered', 'completed',
    'funds_released', 'funds_on_hold', 'dispute_opened', 'dispute_resolved'
  )),
  event_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast order timeline lookups
CREATE INDEX IF NOT EXISTS idx_order_status_events_order_id ON public.order_status_events(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_events_created_at ON public.order_status_events(created_at DESC);

-- Phase 2: Seller Balance Ledger
CREATE TABLE IF NOT EXISTS public.seller_balance_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN (
    'pending_credit', 'available_credit', 'hold', 'release_hold', 'fee', 'payout'
  )),
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seller_balance_ledger_seller_id ON public.seller_balance_ledger(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_balance_ledger_created_at ON public.seller_balance_ledger(created_at DESC);

-- Phase 2: Seller Wallet Summary (computed snapshot)
CREATE TABLE IF NOT EXISTS public.seller_wallet_summary (
  seller_id UUID PRIMARY KEY,
  pending_cents INTEGER NOT NULL DEFAULT 0,
  available_cents INTEGER NOT NULL DEFAULT 0,
  on_hold_cents INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Phase 2: Payout Requests
CREATE TABLE IF NOT EXISTS public.payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'paid', 'rejected')),
  note TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payout_requests_seller_id ON public.payout_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON public.payout_requests(status);

-- Phase 4: Order Risk Assessments
CREATE TABLE IF NOT EXISTS public.order_risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
  reasons JSONB,
  payout_hold BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_risk_assessments_order_id ON public.order_risk_assessments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_risk_assessments_risk_level ON public.order_risk_assessments(risk_level);

-- =====================================================
-- Row Level Security Policies
-- =====================================================

-- Order Status Events: buyers and sellers can view their own order events
ALTER TABLE public.order_status_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events for their orders"
  ON public.order_status_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_status_events.order_id
      AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

CREATE POLICY "System can insert order events"
  ON public.order_status_events FOR INSERT
  WITH CHECK (actor_user_id = auth.uid() OR actor_role = 'system');

-- Seller Balance Ledger: sellers can only view their own ledger
ALTER TABLE public.seller_balance_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view their own ledger"
  ON public.seller_balance_ledger FOR SELECT
  USING (seller_id = auth.uid());

-- Seller Wallet Summary: sellers can only view their own summary
ALTER TABLE public.seller_wallet_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view their own wallet summary"
  ON public.seller_wallet_summary FOR SELECT
  USING (seller_id = auth.uid());

-- Payout Requests: sellers can view and create their own requests
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view their own payout requests"
  ON public.payout_requests FOR SELECT
  USING (seller_id = auth.uid());

CREATE POLICY "Sellers can create payout requests"
  ON public.payout_requests FOR INSERT
  WITH CHECK (seller_id = auth.uid());

-- Order Risk Assessments: order participants can view
ALTER TABLE public.order_risk_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view risk assessments for their orders"
  ON public.order_risk_assessments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_risk_assessments.order_id
      AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

-- =====================================================
-- Enable Realtime for key tables
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payout_requests;