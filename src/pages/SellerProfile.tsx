import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ItemCard from "@/components/ItemCard";
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
import { MapPin, Star, Award, Shield, UserPlus, Package, Palette } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SellerProfile {
  user_id: string;
  username: string;
  avatar_url: string | null;
  completed_sales_count: number;
  seller_tier: string | null;
  favorites_total: number;
  verified_artist: boolean;
}

interface SellerSettings {
  accept_offers: boolean;
  min_offer_percentage: number;
}

export default function SellerProfile() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [sellerSettings, setSellerSettings] = useState<SellerSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [gradeFilter, setGradeFilter] = useState("all");
  const [publisherFilter, setPublisherFilter] = useState("all");
  const [eraFilter, setEraFilter] = useState("all");
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchSellerProfile();
    }
  }, [slug]);

  const fetchSellerProfile = async () => {
    if (!slug) return;
    
    setLoading(true);
    try {
      // Convert slug back to username
      const username = slug.replace(/-/g, " ");
      
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url, completed_sales_count, seller_tier, favorites_total, verified_artist")
        .ilike("username", username)
        .maybeSingle();

      if (profileError) throw profileError;
      
      if (!profileData) {
        toast.error("Seller not found");
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // Fetch seller settings
      const { data: settingsData } = await supabase
        .from("seller_settings")
        .select("accept_offers, min_offer_percentage")
        .eq("seller_id", profileData.user_id)
        .maybeSingle();

      if (settingsData) {
        setSellerSettings(settingsData);
      }
    } catch (error) {
      console.error("Error fetching seller profile:", error);
      toast.error("Failed to load seller profile");
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      toast.error("Please sign in to follow sellers");
      return;
    }
    // TODO: Implement follow/unfollow logic
    setIsFollowing(!isFollowing);
    toast.success(isFollowing ? "Unfollowed seller" : "Following seller");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">Loading seller profile...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Seller Not Found</h1>
          <p className="text-muted-foreground">The seller you're looking for doesn't exist.</p>
        </div>
        <Footer />
      </div>
    );
  }


  // Mock data for items (replace with real data)
  const mockItems = [
    {
      id: "1",
      title: "Amazing Spider-Man #361",
      price: 45,
      condition: "VF",
      image: "/placeholder.svg",
      category: "comic" as const,
    },
    {
      id: "2",
      title: "X-Men #1 (1991)",
      price: 120,
      condition: "NM",
      image: "/placeholder.svg",
      category: "comic" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

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
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.username || "Seller"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl font-bold text-primary">
                    {profile.username?.[0]?.toUpperCase() || "S"}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex flex-col gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold">{profile.username}</h1>
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
                      salesCount={profile.completed_sales_count || 0}
                      favoritesTotal={profile.favorites_total || 0}
                    />
                    <SellerBadge tier={profile.seller_tier} />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleFollow}
                    variant={isFollowing ? "outline" : "default"}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {isFollowing ? "Following" : "Follow"}
                  </Button>
                  <Button variant="outline">Message</Button>
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
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="comics">Comics</TabsTrigger>
                <TabsTrigger value="cards">Cards</TabsTrigger>
                <TabsTrigger value="auctions">Auctions</TabsTrigger>
                <TabsTrigger value="claim-sales">Claim Sales</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {mockItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      {...item}
                      sellerName={profile.username || undefined}
                      sellerCity="New York"
                      sellerBadge={profile.seller_tier}
                      showMakeOffer={sellerSettings?.accept_offers}
                      minOfferPercentage={sellerSettings?.min_offer_percentage}
                    />
                  ))}
                </div>

                {mockItems.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No items found in this category.</p>
                  </div>
                )}
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}
