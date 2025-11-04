import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, Plus, DollarSign, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface CollectionItem {
  id: string;
  title: string;
  category: string;
  grade: string;
  condition: string;
  purchase_price: number;
  purchase_date: string;
  current_value: number;
  image_url: string;
}

interface Alert {
  id: string;
  alert_type: string;
  percentage_change: number;
  is_read: boolean;
  created_at: string;
  collections: {
    title: string;
  };
}

export default function Portfolio() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchPortfolio();
    fetchAlerts();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please sign in to view your portfolio');
      navigate('/auth');
    }
  };

  const fetchPortfolio = async () => {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      console.error('Error fetching portfolio:', error);
      toast.error('Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('price_alerts')
        .select('*, collections(title)')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setAlerts(data || []);
    } catch (error: any) {
      console.error('Error fetching alerts:', error);
    }
  };

  const markAlertAsRead = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('price_alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      if (error) throw error;
      setAlerts(alerts.filter(a => a.id !== alertId));
    } catch (error: any) {
      console.error('Error marking alert as read:', error);
    }
  };

  // Calculate portfolio stats
  const totalValue = items.reduce((sum, item) => sum + Number(item.current_value), 0);
  const totalCost = items.reduce((sum, item) => sum + Number(item.purchase_price), 0);
  const totalGain = totalValue - totalCost;
  const roiPercentage = totalCost > 0 ? ((totalGain / totalCost) * 100) : 0;

  // Generate chart data (last 30 days)
  const chartData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    // Simulate growth for demo
    const variance = Math.random() * 200 - 100;
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: Math.max(0, totalValue + variance)
    };
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 mt-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">My Portfolio</h1>
            <p className="text-muted-foreground">Track your collection value and performance</p>
          </div>
          <Button onClick={() => navigate('/scanner')} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>

        {/* Portfolio Overview */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${totalValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {items.length} items in collection
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Gain/Loss</CardTitle>
              {totalGain >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${totalGain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {totalGain >= 0 ? '+' : ''}${totalGain.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Since purchase
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ROI</CardTitle>
              {roiPercentage >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${roiPercentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {roiPercentage >= 0 ? '+' : ''}{roiPercentage.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Return on investment
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Value Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Portfolio Value History</CardTitle>
            <CardDescription>Track your collection's value over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`$${value.toFixed(0)}`, 'Value']}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Price Alerts */}
        {alerts.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Price Alerts
              </CardTitle>
              <CardDescription>Recent value changes in your collection</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      {alert.percentage_change > 0 ? (
                        <TrendingUp className="h-5 w-5 text-green-500" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-500" />
                      )}
                      <div>
                        <p className="font-medium">{alert.collections?.title}</p>
                        <p className={`text-sm ${alert.percentage_change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {alert.percentage_change > 0 ? '↑' : '↓'} {Math.abs(alert.percentage_change).toFixed(1)}% change
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAlertAsRead(alert.id)}
                    >
                      Dismiss
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Collection Items */}
        <Card>
          <CardHeader>
            <CardTitle>My Collection</CardTitle>
            <CardDescription>All items in your portfolio</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No items in your collection yet</p>
                <Button onClick={() => navigate('/scanner')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Item
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => {
                  const gain = Number(item.current_value) - Number(item.purchase_price);
                  const gainPercent = (gain / Number(item.purchase_price)) * 100;
                  
                  return (
                    <Card key={item.id} className="overflow-hidden">
                      <div className="aspect-[3/4] overflow-hidden">
                        <img
                          src={item.image_url || '/placeholder.svg'}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-2 line-clamp-1">{item.title}</h3>
                        <div className="flex gap-2 mb-3">
                          <Badge variant="secondary">{item.category}</Badge>
                          {item.grade && <Badge variant="outline">{item.grade}</Badge>}
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Purchase:</span>
                            <span>${Number(item.purchase_price).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Current:</span>
                            <span className="font-semibold">${Number(item.current_value).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Gain/Loss:</span>
                            <span className={gain >= 0 ? 'text-green-500' : 'text-red-500'}>
                              {gain >= 0 ? '+' : ''}${gain.toLocaleString()} ({gainPercent >= 0 ? '+' : ''}{gainPercent.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
