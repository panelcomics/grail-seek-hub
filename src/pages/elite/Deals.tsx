import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEliteAccess } from "@/hooks/useEliteAccess";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Zap, 
  TrendingDown, 
  ExternalLink, 
  Clock, 
  Crown,
  Plus,
  RefreshCw,
  Eye,
  X
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { UpgradeToEliteModal } from "@/components/subscription/UpgradeToEliteModal";

interface DealResult {
  id: string;
  title: string;
  listing_price: number;
  fair_market_value: number;
  discount_percent: number;
  source: string;
  source_url: string | null;
  image_url: string | null;
  is_viewed: boolean;
  is_dismissed: boolean;
  created_at: string;
}

interface DealAlert {
  id: string;
  search_id: string;
  last_checked_at: string | null;
  created_at: string;
  saved_searches: {
    id: string;
    query: Record<string, any>;
  } | null;
}

export default function EliteDeals() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isElite, loading: tierLoading } = useEliteAccess();
  const [deals, setDeals] = useState<DealResult[]>([]);
  const [alerts, setAlerts] = useState<DealAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    if (authLoading || tierLoading) return;
    
    if (!user) {
      navigate("/auth");
      return;
    }
    
    if (!isElite) {
      setLoading(false);
      return;
    }
    
    fetchData();
  }, [user, authLoading, tierLoading, isElite]);

  const fetchData = async () => {
    if (!user) return;
    
    try {
      // Fetch deals
      const { data: dealsData, error: dealsError } = await supabase
        .from("deal_finder_results")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false })
        .limit(50);

      if (dealsError) throw dealsError;
      setDeals((dealsData || []) as DealResult[]);

      // Fetch alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from("elite_deal_alerts")
        .select(`
          id,
          search_id,
          last_checked_at,
          created_at,
          saved_searches(id, query)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (alertsError) throw alertsError;
      setAlerts((alertsData || []) as unknown as DealAlert[]);
    } catch (error) {
      console.error("Error fetching deals:", error);
      toast.error("Failed to load deals");
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("deal-finder-scan");
      
      if (error) throw error;
      
      toast.success(`Scan complete! Found ${data?.dealsFound || 0} new deals.`);
      fetchData();
    } catch (error) {
      console.error("Error scanning:", error);
      toast.error("Failed to scan for deals");
    } finally {
      setScanning(false);
    }
  };

  const handleDismiss = async (dealId: string) => {
    try {
      const { error } = await supabase
        .from("deal_finder_results")
        .update({ is_dismissed: true })
        .eq("id", dealId);

      if (error) throw error;
      setDeals(prev => prev.filter(d => d.id !== dealId));
    } catch (error) {
      console.error("Error dismissing deal:", error);
      toast.error("Failed to dismiss deal");
    }
  };

  const handleMarkViewed = async (dealId: string) => {
    try {
      await supabase
        .from("deal_finder_results")
        .update({ is_viewed: true })
        .eq("id", dealId);

      setDeals(prev => prev.map(d => 
        d.id === dealId ? { ...d, is_viewed: true } : d
      ));
    } catch (error) {
      console.error("Error marking viewed:", error);
    }
  };

  // Teaser for non-Elite users
  if (!tierLoading && !isElite) {
    return (
      <AppLayout>
        <Helmet>
          <title>Deal Finder | GrailSeeker Elite</title>
        </Helmet>
        
        <main className="container py-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <Crown className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
              <h1 className="text-3xl font-bold mb-2">Deal Finder</h1>
              <p className="text-lg text-muted-foreground">
                Elite members get instant alerts when undervalued comics match their saved searches.
              </p>
            </div>

            <Card className="mb-8">
              <CardContent className="py-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-left">
                    <Zap className="h-5 w-5 text-primary shrink-0" />
                    <p>Get notified when comics are listed 15%+ below market value</p>
                  </div>
                  <div className="flex items-center gap-3 text-left">
                    <TrendingDown className="h-5 w-5 text-primary shrink-0" />
                    <p>Automatic scanning based on your saved searches</p>
                  </div>
                  <div className="flex items-center gap-3 text-left">
                    <Clock className="h-5 w-5 text-primary shrink-0" />
                    <p>Be first to find underpriced grails before they sell</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button size="lg" onClick={() => setShowUpgradeModal(true)} className="gap-2">
              <Crown className="h-5 w-5" />
              Upgrade to Elite
            </Button>

            <UpgradeToEliteModal
              open={showUpgradeModal}
              onOpenChange={setShowUpgradeModal}
              feature="Deal Finder"
            />
          </div>
        </main>
      </AppLayout>
    );
  }

  if (authLoading || tierLoading || loading) {
    return (
      <AppLayout>
        <main className="container py-8">
          <div className="max-w-4xl mx-auto space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </main>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Helmet>
        <title>Deal Finder | GrailSeeker Elite</title>
        <meta name="description" content="Find undervalued comics matching your saved searches" />
      </Helmet>

      <main className="container py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <Zap className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  Deal Finder
                  <Badge variant="secondary" className="text-xs">ELITE</Badge>
                </h1>
                <p className="text-muted-foreground">
                  {deals.length} active {deals.length === 1 ? "deal" : "deals"}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleScan}
                disabled={scanning}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${scanning ? "animate-spin" : ""}`} />
                {scanning ? "Scanning..." : "Scan Now"}
              </Button>
              <Button onClick={() => navigate("/saved-searches")}>
                <Plus className="h-4 w-4 mr-2" />
                Add Searches
              </Button>
            </div>
          </div>

          {alerts.length === 0 && (
            <Card className="mb-6">
              <CardContent className="py-8 text-center">
                <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">No Deal Alerts Set Up</h2>
                <p className="text-muted-foreground mb-4">
                  Save searches to automatically find undervalued comics matching your interests.
                </p>
                <Button onClick={() => navigate("/search")}>
                  Start Searching
                </Button>
              </CardContent>
            </Card>
          )}

          {deals.length === 0 && alerts.length > 0 && (
            <Card className="mb-6">
              <CardContent className="py-8 text-center">
                <TrendingDown className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">No Deals Found Yet</h2>
                <p className="text-muted-foreground mb-4">
                  We'll scan for undervalued comics matching your {alerts.length} saved searches.
                </p>
                <Button onClick={handleScan} disabled={scanning}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${scanning ? "animate-spin" : ""}`} />
                  Scan Now
                </Button>
              </CardContent>
            </Card>
          )}

          {deals.length > 0 && (
            <div className="space-y-4">
              {deals.map((deal) => (
                <Card 
                  key={deal.id} 
                  className={`hover:bg-muted/50 transition-colors ${!deal.is_viewed ? 'border-primary/50' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {deal.image_url && (
                        <img
                          src={deal.image_url}
                          alt={deal.title}
                          className="w-20 h-28 object-cover rounded"
                        />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            {!deal.is_viewed && (
                              <Badge variant="default" className="mb-1 text-xs">NEW</Badge>
                            )}
                            <h3 className="font-medium line-clamp-2">{deal.title}</h3>
                          </div>
                          <Badge variant="destructive" className="shrink-0">
                            {deal.discount_percent.toFixed(0)}% OFF
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm mb-2">
                          <span className="font-bold text-lg text-green-600">
                            ${deal.listing_price.toFixed(2)}
                          </span>
                          <span className="text-muted-foreground line-through">
                            ${deal.fair_market_value.toFixed(2)} FMV
                          </span>
                        </div>
                        
                        <p className="text-xs text-muted-foreground">
                          Found {formatDistanceToNow(new Date(deal.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        {deal.source_url && (
                          <Button
                            size="sm"
                            onClick={() => {
                              handleMarkViewed(deal.id);
                              window.open(deal.source_url!, '_blank');
                            }}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDismiss(deal.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </AppLayout>
  );
}
