/**
 * ELITE PORTFOLIO PAGE
 * Track collection value and changes over time
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEliteAccess } from "@/hooks/useEliteAccess";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  PieChart, TrendingUp, TrendingDown, Plus, Crown, Lock, 
  DollarSign, ArrowUpRight, ArrowDownRight, Minus, RefreshCw 
} from "lucide-react";
import { toast } from "sonner";

interface CollectionItem {
  id: string;
  comic_title: string;
  issue_number: string | null;
  variant: string | null;
  grade_estimate: string | null;
  purchase_price: number | null;
  current_value: number | null;
  value_7d_change: number | null;
  value_30d_change: number | null;
  cover_image_url: string | null;
  date_added: string;
}

export default function Portfolio() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isElite, loading: eliteLoading } = useEliteAccess();
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || eliteLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchCollection();
  }, [user, authLoading, eliteLoading]);

  const fetchCollection = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_collection')
        .select('*')
        .eq('user_id', user.id)
        .order('date_added', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('[PORTFOLIO] Error:', err);
      toast.error('Failed to load collection');
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const totalValue = items.reduce((sum, item) => sum + (item.current_value || 0), 0);
  const totalCost = items.reduce((sum, item) => sum + (item.purchase_price || 0), 0);
  const totalGain = totalValue - totalCost;
  const total7dChange = items.reduce((sum, item) => sum + (item.value_7d_change || 0), 0);
  const total30dChange = items.reduce((sum, item) => sum + (item.value_30d_change || 0), 0);

  // Free user teaser
  if (!eliteLoading && !isElite) {
    return (
      <AppLayout>
        <Helmet>
          <title>Portfolio Tracker | GrailSeeker Elite</title>
        </Helmet>
        <main className="container py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <PieChart className="h-8 w-8 text-muted-foreground" />
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  Portfolio Tracker
                  <Badge variant="outline" className="gap-1">
                    <Lock className="h-3 w-3" />
                    Elite
                  </Badge>
                </h1>
                <p className="text-muted-foreground">Track your collection value over time</p>
              </div>
            </div>

            {/* Blurred demo */}
            <div className="relative">
              <div className="blur-md pointer-events-none opacity-50 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Total Value</p>
                      <p className="text-3xl font-bold">$12,450</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">7-Day Change</p>
                      <p className="text-3xl font-bold text-green-500">+$340</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Total Gain</p>
                      <p className="text-3xl font-bold text-green-500">+$2,100</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Upgrade overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-lg">
                <Card className="max-w-md">
                  <CardContent className="pt-6 text-center space-y-4">
                    <Crown className="h-12 w-12 mx-auto text-primary" />
                    <h2 className="text-xl font-bold">Unlock Portfolio Tracking</h2>
                    <p className="text-muted-foreground">
                      Track your collection's value with daily price updates from eBay sales data.
                    </p>
                    <Button onClick={() => navigate('/plans')} className="gap-2">
                      <Crown className="h-4 w-4" />
                      Upgrade to Elite - $9.99/mo
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </AppLayout>
    );
  }

  if (loading || authLoading) {
    return (
      <AppLayout>
        <main className="container py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-10 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
            <Skeleton className="h-64" />
          </div>
        </main>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Helmet>
        <title>Portfolio Tracker | GrailSeeker Elite</title>
      </Helmet>
      <main className="container py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <PieChart className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  Portfolio Tracker
                  <Badge className="gap-1 bg-primary/10 text-primary border-primary/20">
                    <Crown className="h-3 w-3" />
                    Elite
                  </Badge>
                </h1>
                <p className="text-muted-foreground">{items.length} items in collection</p>
              </div>
            </div>
            <Button onClick={() => navigate('/my-inventory')} className="gap-2">
              <Plus className="h-4 w-4" />
              Add from Inventory
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">Total Value</span>
                </div>
                <p className="text-3xl font-bold">${totalValue.toLocaleString()}</p>
                {totalGain !== 0 && (
                  <p className={`text-sm flex items-center gap-1 ${totalGain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {totalGain >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {totalGain >= 0 ? '+' : ''}{((totalGain / totalCost) * 100).toFixed(1)}% from cost
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <span className="text-sm">7-Day Change</span>
                </div>
                <p className={`text-3xl font-bold flex items-center gap-1 ${total7dChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {total7dChange >= 0 ? <ArrowUpRight className="h-6 w-6" /> : <ArrowDownRight className="h-6 w-6" />}
                  {total7dChange >= 0 ? '+' : ''}${Math.abs(total7dChange).toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <span className="text-sm">30-Day Change</span>
                </div>
                <p className={`text-3xl font-bold flex items-center gap-1 ${total30dChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {total30dChange >= 0 ? <ArrowUpRight className="h-6 w-6" /> : <ArrowDownRight className="h-6 w-6" />}
                  {total30dChange >= 0 ? '+' : ''}${Math.abs(total30dChange).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Collection List */}
          {items.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <PieChart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">Start tracking your collection</h2>
                <p className="text-muted-foreground mb-4">
                  Add comics from your inventory to track their value over time
                </p>
                <Button onClick={() => navigate('/my-inventory')}>
                  Go to Inventory
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Collection Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-12 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                        {item.cover_image_url ? (
                          <img 
                            src={item.cover_image_url} 
                            alt={item.comic_title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <PieChart className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {item.comic_title} {item.issue_number && `#${item.issue_number}`}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {item.grade_estimate && <Badge variant="secondary">{item.grade_estimate}</Badge>}
                          {item.variant && <span>{item.variant}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${(item.current_value || 0).toLocaleString()}</p>
                        {item.value_7d_change !== null && item.value_7d_change !== 0 && (
                          <p className={`text-sm flex items-center justify-end gap-1 ${item.value_7d_change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {item.value_7d_change >= 0 ? '+' : ''}{item.value_7d_change}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </AppLayout>
  );
}
