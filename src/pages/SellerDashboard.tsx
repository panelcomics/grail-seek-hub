import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Package, DollarSign, ShoppingBag, MessageSquare, Search, SlidersHorizontal, ArrowRightLeft, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OfferDrawer } from "@/components/OfferDrawer";
import { TradeDrawer } from "@/components/TradeDrawer";

interface Trade {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  status: string;
  created_at: string;
  offer_title: string;
  offer_issue?: string | null;
  message?: string | null;
  listing_title?: string;
  listing_image?: string | null;
  buyer_username?: string;
  buyer_avatar?: string | null;
}

interface SellerStats {
  activeListings: number;
  soldCount: number;
  totalSales: number;
  pendingOffers: number;
  pendingTrades: number;
}

interface Listing {
  id: string;
  title: string;
  issue_number: string | null;
  listed_price: number | null;
  listing_status: string | null;
  created_at: string;
  images: any;
  is_for_trade?: boolean | null;
  grading_company?: string | null;
  series?: string | null;
}

interface Offer {
  id: string;
  listing_id: string;
  buyer_id: string;
  offer_amount: number;
  status: string;
  created_at: string;
  listing_title?: string;
  message?: string | null;
  listing_image?: string | null;
  buyer_username?: string;
  buyer_avatar?: string | null;
}


const SellerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<SellerStats>({
    activeListings: 0,
    soldCount: 0,
    totalSales: 0,
    pendingOffers: 0,
    pendingTrades: 0,
  });
  const [listings, setListings] = useState<Listing[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [tradeDrawerOpen, setTradeDrawerOpen] = useState(false);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [gradingFilter, setGradingFilter] = useState<string>("all");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("newest");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadDashboardData();
  }, [user, navigate]);

  const loadDashboardData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      await Promise.all([
        fetchListings(),
        fetchOffers(),
        fetchTrades(),
        fetchMarketplaceOrders(),
      ]);
    } catch (error) {
      console.error("[SELLER-DASHBOARD] Error loading dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMarketplaceOrders = async () => {
    if (!user) return;

    try {
      console.log("[SELLER-DASHBOARD] Fetching marketplace orders for seller:", user.id);

      // Query orders where this user is the seller and payment is completed
      const { data, error } = await supabase
        .from("orders")
        .select("id, amount_cents, status, payment_status")
        .eq("seller_id", user.id)
        .or("status.eq.paid,payment_status.eq.paid")
        .not("status", "eq", "cancelled")
        .not("status", "eq", "refunded");

      if (error) {
        console.error("[SELLER-DASHBOARD] Error fetching marketplace orders:", error);
        return;
      }

      const orders = data || [];
      console.log("[SELLER-DASHBOARD] Found orders:", orders.length);

      // Calculate total sales amount
      const totalSalesCents = orders.reduce((sum, order) => sum + (order.amount_cents || 0), 0);
      const totalSalesDollars = totalSalesCents / 100;

      console.log("[SELLER-DASHBOARD] Total sales amount:", totalSalesDollars.toFixed(2));

      setStats(prev => ({
        ...prev,
        soldCount: orders.length,
        totalSales: totalSalesDollars,
      }));
    } catch (error) {
      console.error("[SELLER-DASHBOARD] Error in fetchMarketplaceOrders:", error);
    }
  };

  const fetchListings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, title, issue_number, listed_price, listing_status, created_at, images, sold_at, is_for_trade, grading_company, series")
        .eq("user_id", user.id)
        .in("listing_status", ["listed", "active", "sold", "draft", "inactive"])
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("[SELLER-DASHBOARD] Error fetching listings:", error);
        return;
      }

      setListings(data || []);

      // Calculate stats for active listings only (exclude zero quantity)
      // Sold count comes from marketplace orders, not inventory status
      const active = data?.filter(l => 
        (l.listing_status === "listed" || l.listing_status === "active") &&
        (l.listed_price || 0) > 0
      ).length || 0;

      setStats(prev => ({
        ...prev,
        activeListings: active,
      }));
    } catch (error) {
      console.error("[SELLER-DASHBOARD] Error in fetchListings:", error);
    }
  };

  const fetchOffers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("offers")
        .select("id, listing_id, offer_amount, status, created_at, message, buyer_id")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("[SELLER-DASHBOARD] Error fetching offers:", error);
        return;
      }

      // Fetch listing details and buyer info for each offer
      const offersWithDetails = await Promise.all(
        (data || []).map(async (offer) => {
          // Fetch listing info
          const { data: listing } = await supabase
            .from("inventory_items")
            .select("title, images")
            .eq("id", offer.listing_id)
            .single();

          // Fetch buyer profile
          const { data: buyerProfile } = await supabase
            .from("profiles")
            .select("username, profile_image_url")
            .eq("user_id", offer.buyer_id)
            .single();

          // Extract front image URL
          let listingImage = null;
          if (listing?.images && typeof listing.images === 'object') {
            const images = listing.images as any;
            listingImage = images.front || null;
          }
          
          return {
            ...offer,
            listing_title: listing?.title || "Unknown Listing",
            listing_image: listingImage,
            buyer_username: buyerProfile?.username || "Anonymous",
            buyer_avatar: buyerProfile?.profile_image_url || null
          };
        })
      );

      setOffers(offersWithDetails);

      const pending = offersWithDetails?.filter(o => o.status === "pending").length || 0;
      setStats(prev => ({ ...prev, pendingOffers: pending }));
    } catch (error) {
      console.error("[SELLER-DASHBOARD] Error in fetchOffers:", error);
    }
  };

  const fetchTrades = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("trade_requests")
        .select("id, listing_id, buyer_id, seller_id, status, created_at, offer_title, offer_issue, message")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("[SELLER-DASHBOARD] Error fetching trades:", error);
        return;
      }

      // Fetch listing details and buyer info for each trade
      const tradesWithDetails = await Promise.all(
        (data || []).map(async (trade) => {
          // Fetch listing info
          const { data: listing } = await supabase
            .from("inventory_items")
            .select("title, images")
            .eq("id", trade.listing_id)
            .maybeSingle();

          // Fetch buyer profile
          const { data: buyerProfile } = await supabase
            .from("profiles")
            .select("username, profile_image_url")
            .eq("user_id", trade.buyer_id)
            .maybeSingle();

          // Extract front image URL
          let listingImage = null;
          if (listing?.images && typeof listing.images === 'object') {
            const images = listing.images as any;
            listingImage = images.front || null;
          }
          
          return {
            ...trade,
            listing_title: listing?.title || "Unknown Listing",
            listing_image: listingImage,
            buyer_username: buyerProfile?.username || "Anonymous",
            buyer_avatar: buyerProfile?.profile_image_url || null
          };
        })
      );

      setTrades(tradesWithDetails);

      const pending = tradesWithDetails?.filter(t => t.status === "pending").length || 0;
      setStats(prev => ({ ...prev, pendingTrades: pending }));
    } catch (error) {
      console.error("[SELLER-DASHBOARD] Error in fetchTrades:", error);
    }
  };

  const handleOfferClick = (offer: Offer) => {
    setSelectedOffer(offer);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setSelectedOffer(null), 300);
  };

  const handleOfferUpdated = () => {
    // Refresh offers list after status update
    fetchOffers();
  };

  const handleTradeClick = (trade: Trade) => {
    setSelectedTrade(trade);
    setTradeDrawerOpen(true);
  };

  const handleCloseTradeDrawer = () => {
    setTradeDrawerOpen(false);
    setTimeout(() => setSelectedTrade(null), 300);
  };

  const handleTradeUpdated = () => {
    // Refresh trades list after status update
    fetchTrades();
  };


  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline">Draft</Badge>;
    
    switch (status.toLowerCase()) {
      case "active":
      case "listed":
        return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
      case "sold":
        return <Badge variant="secondary">Sold</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getOfferStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "accepted":
        return <Badge className="bg-green-500 hover:bg-green-600">Accepted</Badge>;
      case "declined":
        return <Badge variant="destructive">Declined</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTradeStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-500 hover:bg-green-600">Approved</Badge>;
      case "declined":
        return <Badge variant="destructive">Declined</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Filtered and sorted listings
  const filteredAndSortedListings = useMemo(() => {
    let filtered = [...listings];

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((listing) => {
        const status = listing.listing_status?.toLowerCase();
        if (statusFilter === "for_sale") return status === "listed" || status === "active";
        if (statusFilter === "auction") return status === "auction";
        if (statusFilter === "for_trade") return listing.is_for_trade === true;
        if (statusFilter === "inactive") return status === "draft" || status === "inactive";
        return true;
      });
    }

    // Grading filter
    if (gradingFilter !== "all") {
      filtered = filtered.filter((listing) => {
        const company = listing.grading_company?.toLowerCase();
        if (gradingFilter === "raw") return !company || company === "";
        if (gradingFilter === "cbcs") return company === "cbcs";
        if (gradingFilter === "cgc") return company === "cgc";
        return true;
      });
    }

    // Price filter
    const min = minPrice ? parseFloat(minPrice) : null;
    const max = maxPrice ? parseFloat(maxPrice) : null;
    if (min !== null || max !== null) {
      filtered = filtered.filter((listing) => {
        const price = listing.listed_price;
        if (price === null) return false;
        if (min !== null && price < min) return false;
        if (max !== null && price > max) return false;
        return true;
      });
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((listing) => {
        const title = listing.title?.toLowerCase() || "";
        const issue = listing.issue_number?.toLowerCase() || "";
        const series = listing.series?.toLowerCase() || "";
        return title.includes(query) || issue.includes(query) || series.includes(query);
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      if (sortBy === "price_low") {
        return (a.listed_price || 0) - (b.listed_price || 0);
      }
      if (sortBy === "price_high") {
        return (b.listed_price || 0) - (a.listed_price || 0);
      }
      if (sortBy === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      // Default: newest
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return filtered;
  }, [listings, statusFilter, gradingFilter, minPrice, maxPrice, searchQuery, sortBy]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Seller Dashboard</h1>
          <p className="text-muted-foreground">Overview of your listings, offers, and trades.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={loadDashboardData}
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Refresh Dashboard
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeListings}</div>
            <p className="text-xs text-muted-foreground">Currently for sale</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sold</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.soldCount}</div>
            <p className="text-xs text-muted-foreground">Successful sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalSales > 0 ? `$${stats.totalSales.toFixed(2)}` : "$0.00"}
            </div>
            <p className="text-xs text-muted-foreground">Marketplace revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Offers</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOffers}</div>
            <p className="text-xs text-muted-foreground">Awaiting response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Trades</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingTrades}</div>
            <p className="text-xs text-muted-foreground">Trade requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Your Listings */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Your Listings</CardTitle>
          <CardDescription>All your active and sold listings</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop Filters */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <Label htmlFor="status-filter" className="text-sm font-medium mb-1.5 block">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="for_sale">For Sale</SelectItem>
                  <SelectItem value="auction">Auction</SelectItem>
                  <SelectItem value="for_trade">For Trade</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="grading-filter" className="text-sm font-medium mb-1.5 block">Grading</Label>
              <Select value={gradingFilter} onValueChange={setGradingFilter}>
                <SelectTrigger id="grading-filter">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="raw">Raw</SelectItem>
                  <SelectItem value="cbcs">CBCS</SelectItem>
                  <SelectItem value="cgc">CGC</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sort-by" className="text-sm font-medium mb-1.5 block">Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger id="sort-by">
                  <SelectValue placeholder="Newest Added" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest Added</SelectItem>
                  <SelectItem value="oldest">Oldest Added</SelectItem>
                  <SelectItem value="price_low">Price (Low → High)</SelectItem>
                  <SelectItem value="price_high">Price (High → Low)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="search-filter" className="text-sm font-medium mb-1.5 block">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-filter"
                  placeholder="Title, issue, series..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="min-price" className="text-sm font-medium mb-1.5 block">Min Price</Label>
              <Input
                id="min-price"
                type="number"
                placeholder="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="max-price" className="text-sm font-medium mb-1.5 block">Max Price</Label>
              <Input
                id="max-price"
                type="number"
                placeholder="Any"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>
          </div>

          {/* Mobile Filters */}
          <div className="md:hidden mb-6">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="filters">
                <AccordionTrigger className="text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters & Sorting
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    <div>
                      <Label htmlFor="status-filter-mobile" className="text-sm font-medium mb-1.5 block">Status</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger id="status-filter-mobile">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="for_sale">For Sale</SelectItem>
                          <SelectItem value="auction">Auction</SelectItem>
                          <SelectItem value="for_trade">For Trade</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="grading-filter-mobile" className="text-sm font-medium mb-1.5 block">Grading</Label>
                      <Select value={gradingFilter} onValueChange={setGradingFilter}>
                        <SelectTrigger id="grading-filter-mobile">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="raw">Raw</SelectItem>
                          <SelectItem value="cbcs">CBCS</SelectItem>
                          <SelectItem value="cgc">CGC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="sort-by-mobile" className="text-sm font-medium mb-1.5 block">Sort By</Label>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger id="sort-by-mobile">
                          <SelectValue placeholder="Newest Added" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newest">Newest Added</SelectItem>
                          <SelectItem value="oldest">Oldest Added</SelectItem>
                          <SelectItem value="price_low">Price (Low → High)</SelectItem>
                          <SelectItem value="price_high">Price (High → Low)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="search-filter-mobile" className="text-sm font-medium mb-1.5 block">Search</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="search-filter-mobile"
                          placeholder="Title, issue, series..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="min-price-mobile" className="text-sm font-medium mb-1.5 block">Min Price</Label>
                        <Input
                          id="min-price-mobile"
                          type="number"
                          placeholder="0"
                          value={minPrice}
                          onChange={(e) => setMinPrice(e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor="max-price-mobile" className="text-sm font-medium mb-1.5 block">Max Price</Label>
                        <Input
                          id="max-price-mobile"
                          type="number"
                          placeholder="Any"
                          value={maxPrice}
                          onChange={(e) => setMaxPrice(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {listings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No listings yet. Start by creating your first listing!</p>
          ) : filteredAndSortedListings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No listings match your filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedListings.map((listing) => (
                    <TableRow key={listing.id}>
                      <TableCell className="font-medium">{listing.title || "Untitled"}</TableCell>
                      <TableCell>{listing.issue_number || "—"}</TableCell>
                      <TableCell>{listing.listed_price ? `$${listing.listed_price}` : "—"}</TableCell>
                      <TableCell>{getStatusBadge(listing.listing_status)}</TableCell>
                      <TableCell>{new Date(listing.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Link to={`/inventory/${listing.id}`} className="text-sm text-primary hover:underline">
                          View Listing
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Offers */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Recent Offers</CardTitle>
          <CardDescription>Latest price offers from buyers</CardDescription>
        </CardHeader>
        <CardContent>
          {offers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No offers received yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Listing</TableHead>
                    <TableHead>Offer Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offers.map((offer) => {
                    const statusLower = offer.status.toLowerCase();
                    const rowBgClass = 
                      statusLower === "accepted" ? "bg-green-50 dark:bg-green-950/20" :
                      statusLower === "declined" ? "bg-red-50 dark:bg-red-950/20" :
                      "";
                    
                    return (
                      <TableRow 
                        key={offer.id}
                        className={`cursor-pointer hover:bg-muted/50 transition-colors ${rowBgClass}`}
                        onClick={() => handleOfferClick(offer)}
                      >
                        <TableCell className="font-medium">
                          {offer.listing_title || "Unknown Listing"}
                        </TableCell>
                        <TableCell>${offer.offer_amount}</TableCell>
                        <TableCell>{getOfferStatusBadge(offer.status)}</TableCell>
                        <TableCell>{new Date(offer.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Trade Requests */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Recent Trade Requests</CardTitle>
          <CardDescription>Comic-for-comic trade proposals from buyers</CardDescription>
        </CardHeader>
        <CardContent>
          {trades.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No trade requests received yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Your Listing</TableHead>
                    <TableHead>They Offer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trades.map((trade) => {
                    const statusLower = trade.status.toLowerCase();
                    const rowBgClass = 
                      statusLower === "approved" ? "bg-green-50 dark:bg-green-950/20" :
                      statusLower === "declined" ? "bg-red-50 dark:bg-red-950/20" :
                      "";
                    
                    return (
                      <TableRow 
                        key={trade.id}
                        className={`cursor-pointer hover:bg-muted/50 transition-colors ${rowBgClass}`}
                        onClick={() => handleTradeClick(trade)}
                      >
                        <TableCell className="font-medium">
                          {trade.listing_title || "Unknown Listing"}
                        </TableCell>
                        <TableCell>
                          {trade.offer_title}
                          {trade.offer_issue && ` #${trade.offer_issue}`}
                        </TableCell>
                        <TableCell>{getTradeStatusBadge(trade.status)}</TableCell>
                        <TableCell>{new Date(trade.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Offer Detail Drawer */}
      <OfferDrawer 
        offer={selectedOffer}
        open={drawerOpen}
        onClose={handleCloseDrawer}
        onOfferUpdated={handleOfferUpdated}
      />

      {/* Trade Detail Drawer */}
      <TradeDrawer 
        trade={selectedTrade}
        open={tradeDrawerOpen}
        onClose={handleCloseTradeDrawer}
        onTradeUpdated={handleTradeUpdated}
      />

    </div>
  );
};

export default SellerDashboard;
