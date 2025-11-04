import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Plus, MapPin, DollarSign, ExternalLink, Trash2, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";

interface Alert {
  id: string;
  alert_name: string;
  item_title: string;
  category: string;
  max_price: number;
  location_city?: string;
  location_state?: string;
  radius_miles?: number;
  is_active: boolean;
}

interface Deal {
  id: string;
  title: string;
  price: number;
  source: string;
  source_url?: string;
  image_url?: string;
  location?: string;
  distance_miles?: number;
  matched_at: string;
  is_viewed: boolean;
  alert_id: string;
}

export default function Deals() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [alertName, setAlertName] = useState("");
  const [itemTitle, setItemTitle] = useState("");
  const [category, setCategory] = useState("any");
  const [maxPrice, setMaxPrice] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [locationState, setLocationState] = useState("");
  const [radiusMiles, setRadiusMiles] = useState("50");
  const [notifyEmail, setNotifyEmail] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchAlerts();
    fetchDeals();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please sign in to view deals');
      navigate('/auth');
    }
  };

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error: any) {
      console.error('Error fetching alerts:', error);
      toast.error('Failed to load alerts');
    }
  };

  const fetchDeals = async () => {
    try {
      const { data, error } = await supabase
        .from('deal_matches')
        .select('*')
        .order('matched_at', { ascending: false });

      if (error) throw error;
      setDeals(data || []);
    } catch (error: any) {
      console.error('Error fetching deals:', error);
      toast.error('Failed to load deals');
    } finally {
      setLoading(false);
    }
  };

  const createAlert = async () => {
    if (!alertName || !itemTitle || !maxPrice) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('custom_alerts')
        .insert({
          user_id: user.id,
          alert_name: alertName,
          item_title: itemTitle,
          category,
          max_price: parseFloat(maxPrice),
          location_city: locationCity || null,
          location_state: locationState || null,
          radius_miles: radiusMiles ? parseInt(radiusMiles) : null,
          notify_email: notifyEmail
        });

      if (error) throw error;

      toast.success('Price alert created!');
      setDialogOpen(false);
      resetForm();
      fetchAlerts();
    } catch (error: any) {
      console.error('Error creating alert:', error);
      toast.error(error.message || 'Failed to create alert');
    }
  };

  const deleteAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('custom_alerts')
        .delete()
        .eq('id', alertId);

      if (error) throw error;
      toast.success('Alert deleted');
      fetchAlerts();
      fetchDeals();
    } catch (error: any) {
      console.error('Error deleting alert:', error);
      toast.error('Failed to delete alert');
    }
  };

  const markDealAsViewed = async (dealId: string) => {
    try {
      const { error } = await supabase
        .from('deal_matches')
        .update({ is_viewed: true })
        .eq('id', dealId);

      if (error) throw error;
      setDeals(deals.map(d => d.id === dealId ? { ...d, is_viewed: true } : d));
    } catch (error: any) {
      console.error('Error marking deal as viewed:', error);
    }
  };

  const resetForm = () => {
    setAlertName("");
    setItemTitle("");
    setCategory("any");
    setMaxPrice("");
    setLocationCity("");
    setLocationState("");
    setRadiusMiles("50");
    setNotifyEmail(true);
  };

  const newDealsCount = deals.filter(d => !d.is_viewed).length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 mt-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Deal Alerts</h1>
            <p className="text-muted-foreground">
              Set custom alerts and find underpriced grails
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Alert
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Price Alert</DialogTitle>
                <DialogDescription>
                  Get notified when items match your criteria
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="alert-name">Alert Name *</Label>
                  <Input
                    id="alert-name"
                    placeholder="e.g., X-Men Deal Alert"
                    value={alertName}
                    onChange={(e) => setAlertName(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="item-title">Item Title *</Label>
                  <Input
                    id="item-title"
                    placeholder="e.g., X-Men #1"
                    value={itemTitle}
                    onChange={(e) => setItemTitle(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="comic">Comics</SelectItem>
                      <SelectItem value="card">Cards</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="max-price">Maximum Price * ($)</Label>
                  <Input
                    id="max-price"
                    type="number"
                    placeholder="150"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="New York"
                      value={locationCity}
                      onChange={(e) => setLocationCity(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      placeholder="NY"
                      value={locationState}
                      onChange={(e) => setLocationState(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="radius">Search Radius (miles)</Label>
                  <Input
                    id="radius"
                    type="number"
                    placeholder="50"
                    value={radiusMiles}
                    onChange={(e) => setRadiusMiles(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="email-notify">Email Notifications</Label>
                  <Switch
                    id="email-notify"
                    checked={notifyEmail}
                    onCheckedChange={setNotifyEmail}
                  />
                </div>

                <Button onClick={createAlert} className="w-full">
                  Create Alert
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{alerts.filter(a => a.is_active).length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Monitoring deals for you
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Deals</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">{newDealsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Unviewed opportunities
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deals</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{deals.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Found across all sources
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Active Deals */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Active Deals</CardTitle>
            <CardDescription>
              {newDealsCount > 0 
                ? `${newDealsCount} underpriced grails nearby` 
                : 'No new deals found yet'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : deals.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No deals found yet</p>
                <p className="text-sm text-muted-foreground">Create an alert to start finding deals</p>
              </div>
            ) : (
              <div className="space-y-4">
                {deals.map((deal) => (
                  <Card 
                    key={deal.id} 
                    className={`overflow-hidden ${!deal.is_viewed ? 'border-primary' : ''}`}
                  >
                    <div className="flex gap-4 p-4">
                      <div className="w-24 h-24 flex-shrink-0 rounded overflow-hidden bg-muted">
                        <img
                          src={deal.image_url || '/placeholder.svg'}
                          alt={deal.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold line-clamp-1">{deal.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary">{deal.source}</Badge>
                              {!deal.is_viewed && <Badge>New</Badge>}
                            </div>
                            {deal.location && (
                              <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {deal.location}
                                {deal.distance_miles && ` (${deal.distance_miles} mi)`}
                              </p>
                            )}
                          </div>
                          
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-500">
                              ${deal.price.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(deal.matched_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 mt-3">
                          {deal.source_url && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="gap-2"
                              onClick={() => {
                                window.open(deal.source_url, '_blank');
                                markDealAsViewed(deal.id);
                              }}
                            >
                              <ExternalLink className="h-3 w-3" />
                              View Listing
                            </Button>
                          )}
                          {!deal.is_viewed && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => markDealAsViewed(deal.id)}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Mark Viewed
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>My Alerts</CardTitle>
            <CardDescription>Manage your price alert triggers</CardDescription>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No alerts created yet</p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Alert
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold">{alert.alert_name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {alert.item_title} • Max ${alert.max_price}
                        {alert.location_city && ` • ${alert.location_city}, ${alert.location_state}`}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant={alert.is_active ? "default" : "secondary"}>
                          {alert.is_active ? 'Active' : 'Paused'}
                        </Badge>
                        <Badge variant="outline">{alert.category}</Badge>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteAlert(alert.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
