-- Collector Signals v1: Market intelligence based on collector behavior
-- NO pricing advice, NO ML, NO automation, NO external APIs

-- Table: collector_signals
-- Aggregated signals showing collector interest patterns
CREATE TABLE public.collector_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comic_title TEXT NOT NULL,
  issue_number TEXT,
  variant TEXT,
  publisher TEXT,
  signal_score INTEGER NOT NULL DEFAULT 0,
  watchlist_count INTEGER NOT NULL DEFAULT 0,
  search_count INTEGER NOT NULL DEFAULT 0,
  scanner_count INTEGER NOT NULL DEFAULT 0,
  active_listing_count INTEGER NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: collector_signal_events (optional logging for transparency)
-- Logs individual signal events for explainability
CREATE TABLE public.collector_signal_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_id UUID NOT NULL REFERENCES public.collector_signals(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('watchlist', 'search', 'scan', 'supply_imbalance')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_collector_signals_score ON public.collector_signals(signal_score DESC);
CREATE INDEX idx_collector_signals_last_activity ON public.collector_signals(last_activity_at DESC);
CREATE INDEX idx_collector_signals_lookup ON public.collector_signals(comic_title, issue_number, publisher);
CREATE INDEX idx_collector_signal_events_signal_id ON public.collector_signal_events(signal_id);

-- Enable RLS
ALTER TABLE public.collector_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collector_signal_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collector_signals
-- All authenticated users can read (gating handled in UI)
CREATE POLICY "Authenticated users can view signals"
ON public.collector_signals
FOR SELECT
USING (auth.role() = 'authenticated');

-- Service role can manage signals
CREATE POLICY "Service role can manage signals"
ON public.collector_signals
FOR ALL
USING (auth.role() = 'service_role');

-- RLS Policies for collector_signal_events
-- All authenticated users can read events
CREATE POLICY "Authenticated users can view signal events"
ON public.collector_signal_events
FOR SELECT
USING (auth.role() = 'authenticated');

-- Service role can manage events
CREATE POLICY "Service role can manage signal events"
ON public.collector_signal_events
FOR ALL
USING (auth.role() = 'service_role');