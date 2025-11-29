import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ItemCard from "@/components/ItemCard";
import { resolvePrice } from "@/lib/listingPriceUtils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SellerBadge } from "@/components/SellerBadge";
import { SellerStats } from "@/components/SellerStats";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { MapPin, Star, Award, Shield, UserPlus, Package, Palette, Heart, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useFollowSeller } from "@/hooks/useFollowSeller";
import { VerifiedSellerBadge } from "@/components/VerifiedSellerBadge";
import { FeaturedSellerBadge } from "@/components/FeaturedSellerBadge";

interface SellerProfile {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  profile_image_url: string | null;
  seller_level: string;
  seller_tier: string | null;
  favorites_total?: number;
  verified_artist: boolean;
  is_verified_seller: boolean;
  is_featured_seller: boolean;
  bio: string | null;
  joined_at: string;
  completed_sales_count?: number;  // Will fetch separately if needed
}

interface SellerSettings {
  accept_offers: boolean;
  min_offer_percentage: number;
}

interface Listing {
  id: string;
  title: string | null;
  series: string | null;
  issue_number: string | null;
  listed_price: number | null;
  images: any;
  cgc_grade: string | null;
  grading_company: string | null;
  certification_number: string | null;
  condition: string | null;
  is_slab: boolean;
  for_auction: boolean;
  listing_status: string;
  created_at: string;
}

export default function SellerProfile() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [sellerSettings, setSellerSettings] = useState<SellerSettings | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [claimSales, setClaimSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [gradeFilter, setGradeFilter] = useState("all");
  const [publisherFilter, setPublisherFilter] = useState("all");
  const [eraFilter, setEraFilter] = useState("all");
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  
  const { isFollowing, followerCount, loading: followLoading, toggleFollow } = useFollowSeller(profileUserId || undefined);

  useEffect(() => {
    if (slug) {
      fetchSellerProfile();
    }
  }, [slug]);

  const fetchSellerProfile = async () => {
    if (!slug) return;
    
    setLoading(true);
    try {
      // Decode the slug
      const decodedSlug = decodeURIComponent(slug);
      
      // Try multiple matching strategies
      // 1. Exact username match (for emails like info@panelcomics.com)
      // 2. Display name match
      // 3. Slugified username match (panel-comics -> panel comics)
      const usernameVariant = decodedSlug.replace(/-/g, " ");
      
      const { data: profileData, error: profileError } = await supabase
        .from("public_profiles")
        .select("*")
        .or(`username.eq.${decodedSlug},username.ilike.${usernameVariant}`)
        .maybeSingle();

      if (profileError) throw profileError;
      
      if (!profileData) {
        toast.error("Seller not found");
        setLoading(false);
        return;
      }

      setProfile(profileData);
      setProfileUserId(profileData.user_id);

      // Fetch actual sales count for verified badge (from profiles table with proper auth)
      const { data: salesData } = await supabase
        .from("profiles")
        .select("completed_sales_count")
        .eq("user_id", profileData.user_id)
        .maybeSingle();

      if (salesData) {
        setProfile(prev => prev ? { ...prev, completed_sales_count: salesData.completed_sales_count || 0 } : null);
      }

      // Fetch seller settings
      const { data: settingsData } = await supabase
        .from("seller_settings")
        .select("accept_offers, min_offer_percentage")
        .eq("seller_id", profileData.user_id)
        .maybeSingle();

      if (settingsData) {
        setSellerSettings(settingsData);
      }

      // Fetch active listings
      const { data: listingsData, error: listingsError } = await supabase
        .from("inventory_items")
        .select("id, title, series, issue_number, listed_price, images, cgc_grade, grading_company, certification_number, condition, is_slab, for_auction, listing_status, created_at")
        .eq("user_id", profileData.user_id)
        .eq("listing_status", "listed")
        .or("for_sale.eq.true,for_auction.eq.true")
        .order("created_at", { ascending: false });

      if (listingsError) {
        console.error("Error fetching listings:", listingsError);
      } else {
        setListings(listingsData || []);
      }

      // Fetch active claim sales
      const { data: claimSalesData, error: claimSalesError } = await supabase
        .from("claim_sales")
        .select("id, title, price, status, total_items, claimed_items, start_time, end_time, city, state")
        .eq("seller_id", profileData.user_id)
        .in("status", ["upcoming", "active"])
        .order("start_time", { ascending: false });

      if (claimSalesError) {
        console.error("Error fetching claim sales:", claimSalesError);
      } else {
        setClaimSales(claimSalesData || []);
      }
    } catch (error) {
      console.error("Error fetching seller profile:", error);
      toast.error("Failed to load seller profile");
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">Loading seller profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Seller Not Found</h1>
          <p className="text-muted-foreground">The seller you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }


  // Filter listings based on tab
  const filteredListings = listings.filter((listing) => {
    if (activeTab === "all") return true;
    if (activeTab === "auctions") return listing.for_auction;
    if (activeTab === "buy-now") return !listing.for_auction;
    return true;
  });

  // Calculate time remaining for auctions
  const getTimeRemaining = (endsAt: string | null) => {
    if (!endsAt) return 0;
    const now = new Date().getTime();
    const end = new Date(endsAt).getTime();
    return Math.max(0, Math.floor((end - now) / 1000));
  };

  const canonicalUrl = `${window.location.origin}/seller/${slug}`;
  const sellerName = profile.username?.split('@')[0] || "Seller";
  const sellerImageUrl = profile.profile_image_url || profile.avatar_url;
  const description = `${sellerName}'s shop - ${profile.seller_level} seller. Browse their collection of comics and collectibles.`;

  // JSON-LD structured data for Person/Seller
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: sellerName,
    ...(profile.avatar_url && { image: profile.avatar_url }),
    jobTitle: "Seller",
    description: description,
    ...(profile.verified_artist && { 
      additionalType: "https://schema.org/Artist",
    }),
  };

  return (
    <AppLayout>
      <Helmet>
        <title>{sellerName}'s Shop | Comic Marketplace</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={`${sellerName}'s Shop`} />
        <meta property="og:description" content={description} />
        {sellerImageUrl && <meta property="og:image" content={sellerImageUrl} />}
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="profile" />
        <meta name="twitter:card" content="summary" />
        <link rel="canonical" href={canonicalUrl} />
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      {/* Banner */}
      <div className="h-48 bg-gradient-to-r from-primary/20 via-accent/20 to-secondary/20 relative">
        <div className="absolute inset-0 comic-texture opacity-30" />
      </div>

      {/* Profile Header */}
      <div className="container mx-auto px-4 -mt-16 relative z-10">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
              {/* Avatar */}
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden border-4 border-background shadow-lg">
                {sellerImageUrl ? (
                  <img
                    src={sellerImageUrl}
                    alt={sellerName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl font-bold text-primary">
                    {sellerName[0]?.toUpperCase() || "S"}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex flex-col gap-2 mb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-3xl font-bold">{sellerName}</h1>
                    {profile.is_featured_seller && <FeaturedSellerBadge />}
                    <VerifiedSellerBadge salesCount={profile.completed_sales_count || 0} size="md" />
                    {profile.seller_tier && <SellerBadge tier={profile.seller_tier} />}
                    {profile.verified_artist && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="secondary" className="gap-1.5 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-500/30">
                              <Palette className="h-3.5 w-3.5" />
                              Verified Artist
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Verified for original art and creator-authenticated listings.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <SellerStats
                      rating={4.9}
                      salesCount={0} // Hidden for privacy - use seller_level instead
                      favoritesTotal={followerCount}
                    />
                    <SellerBadge tier={profile.seller_tier} />
                  </div>
                  
                  {profile.bio && (
                    <p className="text-muted-foreground mt-2">{profile.bio}</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={toggleFollow}
                    variant={isFollowing ? "outline" : "default"}
                    disabled={followLoading}
                  >
                    {followLoading ? (
                      <>
                        <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        {isFollowing ? 'Unfollowing...' : 'Following...'}
                      </>
                    ) : (
                      <>
                        <Heart className={`w-4 h-4 mr-2 ${isFollowing ? 'fill-current' : ''}`} />
                        {isFollowing ? `Following (${followerCount})` : `Follow (${followerCount})`}
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      if (!user) {
                        toast.error("Please sign in to message sellers");
                        return;
                      }
                      navigate("/messages");
                    }}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Message
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Section */}
      <div className="container mx-auto px-4 py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Filters Sidebar */}
            <div className="w-full lg:w-64 space-y-6">
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">Price Range</h3>
                    <Slider
                      value={priceRange}
                      onValueChange={setPriceRange}
                      max={1000}
                      step={10}
                      className="mb-2"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>${priceRange[0]}</span>
                      <span>${priceRange[1]}</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Grade</h3>
                    <Select value={gradeFilter} onValueChange={setGradeFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Grades</SelectItem>
                        <SelectItem value="gem-mint">Gem Mint (10)</SelectItem>
                        <SelectItem value="mint">Mint (9-9.9)</SelectItem>
                        <SelectItem value="nm">Near Mint (8-8.5)</SelectItem>
                        <SelectItem value="vf">Very Fine (7-7.5)</SelectItem>
                        <SelectItem value="fn">Fine (5.5-6.5)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Publisher</h3>
                    <Select value={publisherFilter} onValueChange={setPublisherFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Publishers</SelectItem>
                        <SelectItem value="marvel">Marvel</SelectItem>
                        <SelectItem value="dc">DC Comics</SelectItem>
                        <SelectItem value="image">Image</SelectItem>
                        <SelectItem value="dark-horse">Dark Horse</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Era</h3>
                    <Select value={eraFilter} onValueChange={setEraFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Eras</SelectItem>
                        <SelectItem value="golden">Golden Age</SelectItem>
                        <SelectItem value="silver">Silver Age</SelectItem>
                        <SelectItem value="bronze">Bronze Age</SelectItem>
                        <SelectItem value="modern">Modern Age</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Items Grid */}
            <div className="flex-1">
              <TabsList className="mb-6">
                <TabsTrigger value="all">All ({listings.length + claimSales.length})</TabsTrigger>
                <TabsTrigger value="buy-now">Buy Now ({listings.filter(l => !l.for_auction).length})</TabsTrigger>
                <TabsTrigger value="auctions">Auctions ({listings.filter(l => l.for_auction).length})</TabsTrigger>
                <TabsTrigger value="claim-sales">Claim Sales ({claimSales.length})</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-0">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {/* Regular Listings */}
                  {activeTab !== "claim-sales" && filteredListings.map((listing) => {
                    const price = listing.listed_price;
                    const imageUrl = listing.images?.primary || listing.images?.others?.[0] || "/placeholder.svg";
                    return (
                      <ItemCard
                        key={listing.id}
                        id={listing.id}
                        title={listing.title || `${listing.series} #${listing.issue_number}`}
                        price={price === null ? undefined : price}
                        condition={listing.cgc_grade || listing.condition || "Unknown"}
                        image={imageUrl}
                        category="comic"
                        sellerName={sellerName}
                        sellerCity={profile.joined_at ? new Date(profile.joined_at).toLocaleDateString() : undefined}
                        sellerBadge={profile.seller_tier}
                        isVerifiedSeller={profile.is_verified_seller}
                        isAuction={listing.for_auction}
                        showMakeOffer={sellerSettings?.accept_offers}
                        minOfferPercentage={sellerSettings?.min_offer_percentage}
                        isSlab={listing.is_slab}
                        grade={listing.cgc_grade}
                        gradingCompany={listing.grading_company}
                        certificationNumber={listing.certification_number}
                        showFavorite={true}
                      />
                    );
                  })}

                  {/* Claim Sales */}
                  {(activeTab === "all" || activeTab === "claim-sales") && claimSales.map((sale) => (
                    <Card 
                      key={sale.id} 
                      className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer"
                      onClick={() => navigate(`/claim-sale/${sale.id}`)}
                    >
                      <div className="p-6 space-y-4">
                        <div>
                          <Badge variant="secondary" className="mb-2">Claim Sale</Badge>
                          <h3 className="font-semibold text-lg line-clamp-2">{sale.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {sale.city}, {sale.state}
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-2xl font-bold text-primary">${sale.price}</div>
                            <p className="text-xs text-muted-foreground">per item</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{sale.total_items - sale.claimed_items} left</div>
                            <p className="text-xs text-muted-foreground">of {sale.total_items}</p>
                          </div>
                        </div>
                        <Button size="sm" className="w-full">View Claim Sale</Button>
                      </div>
                    </Card>
                  ))}
                </div>

                {filteredListings.length === 0 && (activeTab !== "claim-sales" && activeTab !== "all") && (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No items found in this category.</p>
                  </div>
                )}

                {claimSales.length === 0 && activeTab === "claim-sales" && (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No claim sales available.</p>
                  </div>
                )}

                {listings.length === 0 && claimSales.length === 0 && activeTab === "all" && (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold mb-2">No Active Listings</h3>
                    <p className="text-muted-foreground">This seller doesn't have any active listings yet.</p>
                  </div>
                )}
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </AppLayout>
  );
}
