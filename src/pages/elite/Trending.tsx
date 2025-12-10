/**
 * ELITE TRENDING PAGE
 * View trending comics based on sales data
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEliteAccess } from "@/hooks/useEliteAccess";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  Flame, TrendingUp, TrendingDown, Crown, Lock, 
  ArrowUpRight, ArrowDownRight, RefreshCw, Filter
} from "lucide-react";
import { toast } from "sonner";

interface TrendingComic {
  id: string;
  comic_title: string;
  issue_number: string | null;
  publisher: string | null;
  cover_image_url: string | null;
  avg_sold_price: number | null;
  sold_count: number;
  price_change_7d: number | null;
  price_change_30d: number | null;
  heat_score: number;
  rank: number;
}

export default function Trending() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isElite, loading: eliteLoading } = useEliteAccess();
  const [comics, setComics] = useState<TrendingComic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (authLoading || eliteLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchTrending();
  }, [user, authLoading, eliteLoading]);

  const fetchTrending = async () => {
    try {
      const { data, error } = await supabase
        .from('trending_comics')
        .select('*')
        .order('rank', { ascending: true })
        .limit(isElite ? 100 : 5);

      if (error) throw error;
      setComics(data || []);
    } catch (err) {
      console.error('[TRENDING] Error:', err);
      toast.error('Failed to load trending data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!isElite) return;
    setRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke('trending-comics-refresh');
      if (error) throw error;
      await fetchTrending();
      toast.success('Trending data refreshed');
    } catch (err) {
      console.error('[TRENDING] Refresh error:', err);
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const getHeatColor = (score: number) => {
    if (score >= 80) return 'text-red-500';
    if (score >= 60) return 'text-orange-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-blue-500';
  };

  if (loading || authLoading) {
    return (
      <AppLayout>
        <main className="container py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-10 w-64" />
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          </div>
        </main>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Helmet>
        <title>Trending Comics | GrailSeeker Elite</title>
      </Helmet>
      <main className="container py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Flame className="h-8 w-8 text-orange-500" />
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  Trending Comics
                  {isElite ? (
                    <Badge className="gap-1 bg-primary/10 text-primary border-primary/20">
                      <Crown className="h-3 w-3" />
                      Elite
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <Lock className="h-3 w-3" />
                      Preview
                    </Badge>
                  )}
                </h1>
                <p className="text-muted-foreground">
                  {isElite ? 'Top 100 trending comics based on sales data' : 'Top 5 preview - Upgrade for full list'}
                </p>
              </div>
            </div>
            {isElite && (
              <Button 
                variant="outline" 
                onClick={handleRefresh}
                disabled={refreshing}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
          </div>

          {/* Trending List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                Hot Comics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {comics.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Flame className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No trending data available yet.</p>
                  {isElite && (
                    <Button onClick={handleRefresh} variant="outline" className="mt-4">
                      Generate Trending Data
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {comics.map((comic, index) => (
                    <div 
                      key={comic.id}
                      className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                        !isElite && index >= 5 ? 'blur-sm opacity-50' : 'hover:bg-muted/50'
                      }`}
                    >
                      {/* Rank */}
                      <div className="w-8 text-center font-bold text-2xl text-muted-foreground">
                        {comic.rank}
                      </div>

                      {/* Cover */}
                      <div className="w-12 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                        {comic.cover_image_url ? (
                          <img 
                            src={comic.cover_image_url} 
                            alt={comic.comic_title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Flame className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {comic.comic_title} {comic.issue_number && `#${comic.issue_number}`}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {comic.publisher && <span>{comic.publisher}</span>}
                          <span>{comic.sold_count} sold</span>
                        </div>
                      </div>

                      {/* Heat Score */}
                      <div className="w-24">
                        <div className="flex items-center justify-between mb-1">
                          <Flame className={`h-4 w-4 ${getHeatColor(comic.heat_score)}`} />
                          <span className={`font-bold ${getHeatColor(comic.heat_score)}`}>
                            {comic.heat_score}
                          </span>
                        </div>
                        <Progress value={comic.heat_score} className="h-1.5" />
                      </div>

                      {/* Price Info */}
                      <div className="text-right w-28">
                        <p className="font-bold">${(comic.avg_sold_price || 0).toFixed(0)}</p>
                        {comic.price_change_7d !== null && (
                          <p className={`text-sm flex items-center justify-end gap-1 ${
                            comic.price_change_7d >= 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {comic.price_change_7d >= 0 ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3" />
                            )}
                            {comic.price_change_7d >= 0 ? '+' : ''}{comic.price_change_7d.toFixed(1)}%
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Free user upgrade prompt */}
                  {!isElite && (
                    <div className="relative mt-4">
                      <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent z-10" />
                      <div className="relative z-20 text-center py-8">
                        <p className="text-muted-foreground mb-4">
                          Unlock the full top 100 trending comics list
                        </p>
                        <Button onClick={() => navigate('/plans')} className="gap-2">
                          <Crown className="h-4 w-4" />
                          Upgrade to Elite
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </AppLayout>
  );
}
