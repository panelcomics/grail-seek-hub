/**
 * Collector Signals Page
 * ======================
 * Displays market intelligence based on collector behavior.
 * 
 * GATING:
 * - Free users: See top 3 signals + upgrade CTA
 * - Elite users: See full list (up to 50)
 * 
 * SAFETY:
 * - Read-only display
 * - No pricing predictions
 * - Explainable signal logic
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { useAuth } from "@/contexts/AuthContext";
import { EliteLockedPreview } from "@/components/subscription/EliteLockedPreview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  Eye, 
  Search, 
  Camera, 
  Package,
  ChevronDown,
  ChevronUp,
  Info,
  Crown,
  Flame
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface CollectorSignal {
  id: string;
  comic_title: string;
  issue_number: string | null;
  variant: string | null;
  publisher: string | null;
  signal_score: number;
  watchlist_count: number;
  search_count: number;
  scanner_count: number;
  active_listing_count: number;
  last_activity_at: string;
}

export default function Signals() {
  const { user } = useAuth();
  const { isElite, loading: tierLoading } = useSubscriptionTier();
  const navigate = useNavigate();
  
  const [signals, setSignals] = useState<CollectorSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSignals() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('collector_signals')
          .select('*')
          .order('signal_score', { ascending: false })
          .limit(50);

        if (error) {
          console.error('[SIGNALS] Error fetching signals:', error);
        } else {
          setSignals(data || []);
        }
      } catch (err) {
        console.error('[SIGNALS] Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSignals();
  }, [user]);

  // Determine how many signals to show
  const FREE_LIMIT = 3;
  const visibleSignals = isElite ? signals : signals.slice(0, FREE_LIMIT);
  const hiddenCount = isElite ? 0 : Math.max(0, signals.length - FREE_LIMIT);

  // Get heat score label - presentation only based on score ranges
  const getHeatScore = (score: number): { label: string; color: string } => {
    if (score >= 70) return { label: "Heating Up", color: "bg-red-500" };
    if (score >= 40) return { label: "Sustained Interest", color: "bg-amber-500" };
    if (score >= 10) return { label: "Cooling Off", color: "bg-blue-500" };
    return { label: "Low Activity", color: "bg-gray-500" };
  };

  // Generate explainability bullets
  const getExplainBullets = (signal: CollectorSignal): string[] => {
    const bullets: string[] = [];
    
    if (signal.scanner_count > 0) {
      bullets.push(`${signal.scanner_count} collector${signal.scanner_count > 1 ? 's' : ''} scanned this comic recently`);
    }
    if (signal.search_count > 0) {
      bullets.push(`${signal.search_count} saved search${signal.search_count > 1 ? 'es' : ''} matching this title`);
    }
    if (signal.watchlist_count > 0) {
      bullets.push(`${signal.watchlist_count} watchlist addition${signal.watchlist_count > 1 ? 's' : ''} in the last 7 days`);
    }
    if (signal.active_listing_count === 0) {
      bullets.push("No active listings found (low supply)");
    } else if (signal.active_listing_count < 3) {
      bullets.push(`Only ${signal.active_listing_count} active listing${signal.active_listing_count > 1 ? 's' : ''} (limited supply)`);
    }
    
    // Supply/demand imbalance
    const demand = signal.scanner_count + signal.search_count + signal.watchlist_count;
    if (demand > signal.active_listing_count * 2) {
      bullets.push("Demand signals outpace current supply");
    }

    return bullets;
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Sign in to view the Heat Index
            </p>
            <Button onClick={() => navigate('/auth')}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Helmet>
        <title>🔥 Heat Index | GrailSeeker</title>
        <meta name="description" content="Comics getting real collector attention right now — based on what collectors are searching, saving, and tracking." />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Flame className="h-8 w-8 text-orange-500" />
            <h1 className="text-3xl font-bold">🔥 Heat Index</h1>
            {isElite && (
              <Badge variant="secondary" className="bg-amber-500/20 text-amber-500">
                <Crown className="h-3 w-3 mr-1" />
                Elite
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Heat Index highlights comics that collectors are actively paying attention to right now.
            Instead of relying on listings or asking prices, Heat Index is based on collector behavior — including searches, wantlists, and tracking activity — helping surface momentum before sellers react.
          </p>
          
          {/* How It Works */}
          <div className="mt-6 bg-muted/50 rounded-lg p-4">
            <h2 className="font-semibold mb-2">How Heat Index Works</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Heat Index is driven by real collector behavior, not seller listings or promotions.
              Books rise when collectors search for them more often, add them to wantlists, and actively track them over time.
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2"><span className="text-primary">•</span> Based on searches, saves, and wantlists</li>
              <li className="flex items-center gap-2"><span className="text-primary">•</span> No sponsored placement</li>
              <li className="flex items-center gap-2"><span className="text-primary">•</span> Updates automatically as activity changes</li>
            </ul>
          </div>

          {/* What Makes a Book Hot */}
          <div className="mt-4 bg-muted/30 rounded-lg p-4">
            <h2 className="font-semibold mb-2">What Makes a Book "Hot"?</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Each book receives a Heat Score that reflects current collector attention.
              A higher score means more collectors are watching a book — not that prices are guaranteed to rise.
            </p>
            <div className="text-sm text-muted-foreground space-y-1 mb-3">
              <p className="font-medium text-foreground text-xs">Visible factors:</p>
              <li className="flex items-center gap-2"><span className="text-primary">•</span> Increase in searches</li>
              <li className="flex items-center gap-2"><span className="text-primary">•</span> Adds to wantlists</li>
              <li className="flex items-center gap-2"><span className="text-primary">•</span> Page views</li>
              <li className="flex items-center gap-2"><span className="text-primary">•</span> Recent activity</li>
            </div>
            <p className="text-xs text-muted-foreground italic">
              Heat Index reflects attention, not price predictions.
            </p>
          </div>
        </div>

        {/* Loading state */}
        {(loading || tierLoading) && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-16 w-12 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !tierLoading && signals.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Flame className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nothing heating up yet</h3>
              <p className="text-muted-foreground">
                Heat Index is generated from collector activity. 
                Check back soon as more collectors use the scanner and watchlists.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Heat Index list */}
        {!loading && !tierLoading && visibleSignals.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Comics getting real collector attention right now
            </h2>
            <p className="text-sm text-muted-foreground -mt-2">
              No paid boosts. No seller hype. Just collector activity.
            </p>

            {visibleSignals.map((signal, index) => {
              const heatScore = getHeatScore(signal.signal_score);
              const bullets = getExplainBullets(signal);
              const isExpanded = expandedId === signal.id;

              return (
                <Card key={signal.id} className="overflow-hidden">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-4">
                      {/* Rank indicator */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                        {index + 1}
                      </div>

                      {/* Comic info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold truncate">
                            {signal.comic_title}
                          </h3>
                          {signal.issue_number && (
                            <span className="text-muted-foreground">
                              #{signal.issue_number}
                            </span>
                          )}
                        </div>
                        
                        {signal.publisher && (
                          <p className="text-sm text-muted-foreground">
                            {signal.publisher}
                          </p>
                        )}

                        {/* Signal indicators */}
                        <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                          {signal.scanner_count > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="flex items-center gap-1">
                                  <Camera className="h-3.5 w-3.5" />
                                  {signal.scanner_count}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                Scanner selections
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {signal.search_count > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="flex items-center gap-1">
                                  <Search className="h-3.5 w-3.5" />
                                  {signal.search_count}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                Saved searches
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {signal.watchlist_count > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="flex items-center gap-1">
                                  <Eye className="h-3.5 w-3.5" />
                                  {signal.watchlist_count}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                Watchlist adds
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex items-center gap-1">
                                <Package className="h-3.5 w-3.5" />
                                {signal.active_listing_count}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              Active listings (supply)
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>

                      {/* Heat score badge with tooltip */}
                      <div className="flex-shrink-0 text-right">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="inline-flex items-center gap-1 cursor-help">
                              <Badge className={`${heatScore.color} text-white`}>
                                🔥 Heat: {signal.signal_score}
                              </Badge>
                              <Info className="h-3 w-3 text-muted-foreground opacity-50" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-[220px] text-xs">
                            <p className="font-medium mb-1">Heat Score reflects collector activity</p>
                            <p className="text-muted-foreground">
                              Based on searches and wantlists. It does not predict prices or guarantee value.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                        <p className="text-xs text-muted-foreground mt-1">
                          {heatScore.label}
                        </p>
                      </div>
                    </div>

                    {/* Expandable explanation */}
                    <Collapsible open={isExpanded} onOpenChange={() => setExpandedId(isExpanded ? null : signal.id)}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="mt-3 w-full justify-center text-muted-foreground">
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-1" />
                              Hide details
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-1" />
                              Why this is heating up
                            </>
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-3">
                        <div className="bg-muted/50 rounded-lg p-4">
                          <h4 className="text-sm font-medium mb-2">Collector Activity Breakdown</h4>
                          <ul className="space-y-1.5">
                            {bullets.map((bullet, i) => (
                              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-primary mt-1">•</span>
                                {bullet}
                              </li>
                            ))}
                          </ul>
                          <p className="text-xs text-muted-foreground mt-3 italic">
                            Powered by the Grail Index™, GrailSeeker's internal collector activity scoring system.
                          </p>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Free user upgrade CTA */}
        {!loading && !tierLoading && !isElite && hiddenCount > 0 && (
          <div className="mt-8">
            <EliteLockedPreview
              title={`${hiddenCount} more heating up`}
              description="Elite members get full access to the Heat Index and early collector intelligence."
            />
          </div>
        )}

        {/* Footer disclaimer */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>
            Heat Index reflects attention, not price predictions. 
            No paid boosts. No seller hype. Just collector activity.
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}
