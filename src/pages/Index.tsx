import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useModal } from "@/contexts/ModalContext";
import { useTerms } from "@/hooks/useTerms";
import { TermsPopup } from "@/components/TermsPopup";
import { toastSuccess, toastError } from "@/lib/toastUtils";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ItemCard from "@/components/ItemCard";
import LocalDiscovery from "@/components/LocalDiscovery";
import EventsCarousel from "@/components/EventsCarousel";
import MapView from "@/components/MapView";

import Footer from "@/components/Footer";
import { calculateSellerFee } from "@/components/PricingCalculator";
import { useNotifications } from "@/hooks/useNotifications";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter, Package, MapPin, Clock, Info, Bell, BellOff, Shield, TrendingUp, Star, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import comicSample1 from "@/assets/comic-sample-1.jpg";
import comicSample2 from "@/assets/comic-sample-2.jpg";
import cardSample1 from "@/assets/card-sample-1.jpg";
import cardSample2 from "@/assets/card-sample-2.jpg";

const mockItems = [
  // 10 SENTINEL-STYLE $2 BIN AUCTIONS (5-min timers)
  {
    id: "a1",
    title: "Amazing Spider-Man #361 - Carnage",
    price: 2,
    condition: "VF",
    image: comicSample1,
    isLocal: false,
    category: "comic" as const,
    isAuction: true,
    timeRemaining: 287, // 4:47
  },
  {
    id: "a2",
    title: "X-Force #2 - Deadpool Card",
    price: 2,
    condition: "NM",
    image: comicSample2,
    isLocal: false,
    category: "comic" as const,
    isAuction: true,
    timeRemaining: 142, // 2:22
  },
  {
    id: "a3",
    title: "1991 Fleer Michael Jordan",
    price: 2,
    condition: "EX",
    image: cardSample1,
    isLocal: false,
    category: "card" as const,
    isAuction: true,
    timeRemaining: 201, // 3:21
  },
  {
    id: "a4",
    title: "Spawn #1 Todd McFarlane",
    price: 2,
    condition: "VF+",
    image: comicSample1,
    isLocal: false,
    category: "comic" as const,
    isAuction: true,
    timeRemaining: 89, // 1:29
  },
  {
    id: "a5",
    title: "1986 Fleer Larry Bird",
    price: 2,
    condition: "VG",
    image: cardSample2,
    isLocal: false,
    category: "card" as const,
    isAuction: true,
    timeRemaining: 267, // 4:27
  },
  {
    id: "a6",
    title: "Batman Adventures #12 - Harley Quinn",
    price: 2,
    condition: "FN",
    image: comicSample2,
    isLocal: false,
    category: "comic" as const,
    isAuction: true,
    timeRemaining: 178, // 2:58
  },
  {
    id: "a7",
    title: "1989 Upper Deck Griffey Jr.",
    price: 2,
    condition: "VF",
    image: cardSample1,
    isLocal: false,
    category: "card" as const,
    isAuction: true,
    timeRemaining: 124, // 2:04
  },
  {
    id: "a8",
    title: "New Mutants #98 - Deadpool 1st",
    price: 2,
    condition: "VG+",
    image: comicSample1,
    isLocal: false,
    category: "comic" as const,
    isAuction: true,
    timeRemaining: 56, // 0:56
  },
  {
    id: "a9",
    title: "1992 Topps Shaquille O'Neal RC",
    price: 2,
    condition: "NM",
    image: cardSample2,
    isLocal: false,
    category: "card" as const,
    isAuction: true,
    timeRemaining: 299, // 4:59
  },
  {
    id: "a10",
    title: "Venom: Lethal Protector #1",
    price: 2,
    condition: "VF/NM",
    image: comicSample1,
    isLocal: false,
    category: "comic" as const,
    isAuction: true,
    timeRemaining: 213, // 3:33
  },

  // 5 LOCAL LISTINGS (within 500mi)
  {
    id: "l1",
    title: "Amazing Spider-Man #300 - First Venom",
    price: 450,
    condition: "NM+",
    image: comicSample1,
    isLocal: true,
    location: "Chicago, IL",
    distance: 127,
    category: "comic" as const,
  },
  {
    id: "l2",
    title: "X-Men #1 Jim Lee Variant CGC 9.8",
    price: 125,
    condition: "GEM MT",
    image: comicSample2,
    isLocal: true,
    location: "Milwaukee, WI",
    distance: 89,
    category: "comic" as const,
  },
  {
    id: "l3",
    title: "2003 LeBron James Topps Chrome RC",
    price: 2800,
    condition: "PSA 10",
    image: cardSample1,
    isLocal: true,
    location: "Indianapolis, IN",
    distance: 186,
    category: "card" as const,
  },
  {
    id: "l4",
    title: "Batman: The Killing Joke First Print",
    price: 280,
    condition: "FN+",
    image: comicSample1,
    isLocal: true,
    location: "Detroit, MI",
    distance: 278,
    category: "comic" as const,
  },
  {
    id: "l5",
    title: "1952 Topps Mickey Mantle (Reprint)",
    price: 85,
    condition: "VF",
    image: cardSample2,
    isLocal: true,
    location: "Grand Rapids, MI",
    distance: 173,
    category: "card" as const,
  },

  // 3 TRENDING COMICS
  {
    id: "tc1",
    title: "Incredible Hulk #181 - Wolverine 1st",
    price: 3200,
    condition: "VG/FN",
    image: comicSample1,
    isLocal: false,
    category: "comic" as const,
  },
  {
    id: "tc2",
    title: "Ultimate Fallout #4 - Miles Morales",
    price: 275,
    condition: "NM+",
    image: comicSample2,
    isLocal: false,
    category: "comic" as const,
  },
  {
    id: "tc3",
    title: "Saga #1 First Print",
    price: 180,
    condition: "NM",
    image: comicSample1,
    isLocal: false,
    category: "comic" as const,
  },

  // 3 TRENDING SPORTS CARDS
  {
    id: "ts1",
    title: "2021 Patrick Mahomes Prizm Silver",
    price: 195,
    condition: "MINT",
    image: cardSample2,
    isLocal: false,
    category: "card" as const,
  },
  {
    id: "ts2",
    title: "2018 Luka Doncic Prizm RC PSA 10",
    price: 890,
    condition: "GEM MT",
    image: cardSample1,
    isLocal: false,
    category: "card" as const,
  },
  {
    id: "ts3",
    title: "2020 Justin Herbert Prizm Auto",
    price: 425,
    condition: "PSA 9",
    image: cardSample2,
    isLocal: false,
    category: "card" as const,
  },
];

// Mock Seller Spotlight Data
const spotlightSellers = [
  {
    id: "s1",
    name: "ComicVault Collectibles",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=CV",
    rating: 4.9,
    totalSales: 347,
    specialization: "Golden Age Comics",
    featuredItem: {
      title: "Detective Comics #27 Replica",
      price: 450,
      image: comicSample1,
    }
  },
  {
    id: "s2",
    name: "CardMaster Pro",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=CM",
    rating: 4.8,
    totalSales: 521,
    specialization: "Vintage Sports Cards",
    featuredItem: {
      title: "1986 Fleer Michael Jordan PSA 9",
      price: 3200,
      image: cardSample2,
    }
  },
  {
    id: "s3",
    name: "Grail Hunter Comics",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=GH",
    rating: 5.0,
    totalSales: 189,
    specialization: "Modern Keys",
    featuredItem: {
      title: "Spider-Gwen #1 Variant",
      price: 125,
      image: comicSample2,
    }
  },
];

// Mock Top Sellers Leaderboard
const topSellers = [
  {
    rank: 1,
    name: "Elite Collectibles",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=EC",
    totalSales: 1247,
    revenue: 125000,
    rating: 4.9,
  },
  {
    rank: 2,
    name: "CardMaster Pro",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=CM",
    totalSales: 1089,
    revenue: 98500,
    rating: 4.8,
  },
  {
    rank: 3,
    name: "Vintage Vault",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=VV",
    totalSales: 892,
    revenue: 87200,
    rating: 4.9,
  },
  {
    rank: 4,
    name: "Grail Seekers Inc",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=GS",
    totalSales: 756,
    revenue: 72100,
    rating: 5.0,
  },
  {
    rank: 5,
    name: "Comic Kingdom",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=CK",
    totalSales: 634,
    revenue: 61800,
    rating: 4.7,
  },
];

const Index = () => {
  const [filter, setFilter] = useState<"all" | "comic" | "card">("all");
  const [claimSales, setClaimSales] = useState<any[]>([]);
  const [claimSaleItems, setClaimSaleItems] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [selectedClaimItem, setSelectedClaimItem] = useState<{ saleId: string; itemId: string; price: number; title: string } | null>(null);
  const [shippingMethod, setShippingMethod] = useState<'local_pickup' | 'ship_nationwide'>('ship_nationwide');
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(true);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const notifications = useNotifications();
  const { openModal } = useModal();
  const { showTermsPopup, requireTerms, handleAcceptTerms, handleDeclineTerms } = useTerms();

  // Check if user has completed onboarding
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("grail-seek-onboarding-completed");
    if (!hasSeenOnboarding) {
      // Show onboarding after a short delay for better UX
      setTimeout(() => {
        openModal("onboarding", {
          onComplete: handleOnboardingComplete
        });
      }, 500);
    }
    
    // Check if user has dismissed the welcome banner
    const hideWelcomeBanner = localStorage.getItem("hideWelcomeBanner");
    if (hideWelcomeBanner === "true") {
      setShowWelcomeBanner(false);
    }
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem("grail-seek-onboarding-completed", "true");
    toastSuccess.onboardingComplete();
  };

  // Fetch active claim sales and events
  useEffect(() => {
    const fetchData = async () => {
      // Fetch claim sales
      const { data, error } = await supabase
        .from("claim_sales" as any)
        .select("*")
        .eq("status", "active")
        .order("start_time", { ascending: false });

      if (error) {
        console.error("Error fetching claim sales:", error);
      } else {
        setClaimSales(data || []);

        // Fetch items for each claim sale
        if (data && data.length > 0) {
          const { data: items, error: itemsError } = await supabase
            .from("claim_sale_items" as any)
            .select("*")
            .in("claim_sale_id", data.map((s: any) => s.id))
            .eq("is_claimed", false);

          if (!itemsError) {
            setClaimSaleItems(items || []);
          }
        }
      }

      // Fetch upcoming events
      const { data: eventsData, error: eventsError } = await supabase
        .from("events" as any)
        .select("*")
        .gte("start_date", new Date().toISOString())
        .order("start_date", { ascending: true })
        .limit(6);

      if (!eventsError) {
        setEvents(eventsData || []);
      }
    };

    fetchData();

    // Set up real-time subscription
    const channel = supabase
      .channel("grail_seek_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "claim_sales",
        },
        (payload) => {
          fetchData();
          // Send notification for new claim sales
          if (payload.eventType === 'INSERT' && payload.new) {
            const newSale = payload.new as any;
            if (newSale.status === 'active' && notifications.permission === 'granted') {
              notifications.sendNewClaimSaleNotification(
                newSale.title,
                `${newSale.total_items} items available`
              );
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "claim_sale_items",
        },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "events",
        },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const openClaimDialog = (saleId: string, itemId: string, price: number, title: string) => {
    if (!user) {
      toastError.authRequired();
      navigate("/auth");
      return;
    }
    setSelectedClaimItem({ saleId, itemId, price, title });
    setClaimDialogOpen(true);
  };

  const handleClaimAction = async () => {
    if (!selectedClaimItem) return;

    const { saleId, itemId, price, title } = selectedClaimItem;
    const sellerFee = calculateSellerFee(price, shippingMethod);
    const youReceive = price - sellerFee;

    try {
      // Insert claim
      const { error } = await supabase.from("claims" as any).insert({
        user_id: user!.id,
        claim_sale_id: saleId,
        item_id: itemId,
        quantity: 1,
        shipping_method: shippingMethod,
        item_price: price,
        seller_fee: sellerFee,
        total_price: price,
      });

      if (error) throw error;

      // Update item as claimed
      await supabase
        .from("claim_sale_items" as any)
        .update({ is_claimed: true })
        .eq("id", itemId);

      // Update claimed count
      const sale = claimSales.find((s: any) => s.id === saleId);
      if (sale) {
        await supabase
          .from("claim_sales" as any)
          .update({ claimed_items: sale.claimed_items + 1 })
          .eq("id", saleId);
      }

      // Send push notification
      notifications.sendClaimSecuredNotification(title, youReceive);

      toastSuccess.claimSubmitted();

      setClaimDialogOpen(false);
      setSelectedClaimItem(null);

      // Show safety guide for local pickup
      if (shippingMethod === 'local_pickup') {
        const hasSeenSafetyGuide = localStorage.getItem("grail-seek-safety-guide-seen");
        if (!hasSeenSafetyGuide) {
          // Get item location from claimSaleItems
          const item = claimSaleItems.find((i: any) => i.id === itemId);
          const location = item?.city ? `${item.city}, ${item.state}` : "your area";
          setTimeout(() => {
            openModal("safetyGuide", {
              meetupLocation: location,
              onClose: () => {
                localStorage.setItem("grail-seek-safety-guide-seen", "true");
              }
            });
          }, 1000);
        }
      }
    } catch (error: any) {
      toastError.claimFailed(error.message || "unknown error");
    }
  };

  const handleClaim = () => {
    requireTerms(handleClaimAction);
  };

  // Separate auction items (ending soon) from regular items
  const auctionItems = mockItems.filter(item => item.isAuction).sort((a, b) => {
    const timeA = a.timeRemaining || Infinity;
    const timeB = b.timeRemaining || Infinity;
    return timeA - timeB;
  });

  const trendingItems = filter === "all" 
    ? mockItems.filter(item => !item.isAuction && !item.isLocal)
    : mockItems.filter(item => !item.isAuction && !item.isLocal && item.category === filter);

  // Convert claim sales to items format
  const claimSaleCards = claimSales.flatMap((sale: any) => {
    const items = claimSaleItems.filter((item: any) => item.claim_sale_id === sale.id);
    return items.slice(0, 3).map((item: any) => ({
      id: item.id,
      title: item.title,
      price: sale.price,
      condition: item.condition,
      image: item.category === "comic" ? comicSample1 : cardSample1,
      category: item.category,
      isClaimSale: true,
      claimSaleId: sale.id,
      itemsLeft: sale.total_items - sale.claimed_items,
      onClaim: () => openClaimDialog(sale.id, item.id, sale.price, item.title),
    }));
  });

  const allTrendingItems = [...claimSaleCards, ...trendingItems];

  // Get items with location for map
  const itemsWithLocation = claimSaleItems
    .filter((item: any) => item.latitude && item.longitude)
    .map((item: any) => ({
      id: item.id,
      latitude: item.latitude,
      longitude: item.longitude,
      title: item.title,
      price: 2,
    }));

  const eventsWithLocation = events.map((event: any) => ({
    id: event.id,
    latitude: event.latitude,
    longitude: event.longitude,
    name: event.name,
    city: event.city,
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* TEST MODE BANNER */}
      <div className="bg-destructive text-destructive-foreground py-2 text-center font-semibold text-sm">
        🧪 TEST MODE - No real payments processed
      </div>
      <Navbar onShowOnboarding={() => {
        openModal("onboarding", {
          onComplete: handleOnboardingComplete
        });
      }} />
      
      {/* Notification Permission Banner */}
      {notifications.isSupported && notifications.permission === "default" && (
        <div className="bg-primary/10 border-b border-primary/20">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold text-sm">Enable push notifications</p>
                <p className="text-xs text-muted-foreground">Get alerts for new claim sales and secured items</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => notifications.sendTestNotification()}
              >
                Test Alert
              </Button>
              <Button 
                size="sm"
                onClick={() => notifications.requestPermission()}
              >
                Enable
              </Button>
            </div>
          </div>
        </div>
      )}

      {notifications.permission === "granted" && (
        <div className="bg-green-500/10 border-b border-green-500/20">
          <div className="container mx-auto px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Bell className="h-4 w-4 text-green-600" />
              <span className="text-green-700 dark:text-green-400">Push notifications enabled</span>
            </div>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => notifications.sendTestNotification()}
              className="h-7 text-xs"
            >
              Send Test
            </Button>
          </div>
        </div>
      )}
      
      <Hero />

      {/* Welcome Banner */}
      {showWelcomeBanner && (
        <div className="border-b bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm font-medium">
                Run claim sales without the Facebook hassle. Lower fees than eBay.
              </p>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm"
                  onClick={() => navigate("/dashboard")}
                >
                  Create Claim Sale
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => document.getElementById("trending-listings")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Explore
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setShowWelcomeBanner(false);
                    localStorage.setItem("hideWelcomeBanner", "true");
                  }}
                >
                  Maybe later ×
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. TRENDING GRAILS */}
      <section id="trending-listings" className="container py-16">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-primary" />
            <div>
              <h2 className="text-3xl font-bold">Trending Grails</h2>
              <p className="text-muted-foreground">Discover the hottest collectibles available now</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-auto">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="comic">Comics</TabsTrigger>
                <TabsTrigger value="card">Cards</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {allTrendingItems.map((item) => (
            <ItemCard key={item.id} {...item} />
          ))}
        </div>
      </section>

      {/* 2. ENDING SOON */}
      <section className="container pb-16">
        <div className="flex items-center gap-3 mb-8">
          <Clock className="h-8 w-8 text-destructive" />
          <div>
            <h2 className="text-3xl font-bold">Ending Soon</h2>
            <p className="text-muted-foreground">Claim these $2 bin auctions before time runs out</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {auctionItems.map((item) => (
            <ItemCard key={item.id} {...item} />
          ))}
        </div>
      </section>

      {/* 3. SELLER SPOTLIGHT */}
      <section className="bg-muted/30 py-16">
        <div className="container">
          <div className="flex items-center gap-3 mb-8">
            <Star className="h-8 w-8 text-yellow-500" />
            <div>
              <h2 className="text-3xl font-bold">Seller Spotlight</h2>
              <p className="text-muted-foreground">Featured trusted sellers with top-rated collections</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {spotlightSellers.map((seller) => (
              <div key={seller.id} className="bg-card rounded-lg border p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-4 mb-4">
                  <img 
                    src={seller.avatar} 
                    alt={seller.name} 
                    className="w-16 h-16 rounded-full"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{seller.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                      <span>{seller.rating} • {seller.totalSales} sales</span>
                    </div>
                  </div>
                </div>
                
                <Badge variant="secondary" className="mb-4">
                  {seller.specialization}
                </Badge>

                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-2">Featured Item</p>
                  <div className="flex gap-3">
                    <img 
                      src={seller.featuredItem.image} 
                      alt={seller.featuredItem.title}
                      className="w-20 h-20 object-cover rounded"
                    />
                    <div>
                      <p className="font-medium text-sm line-clamp-2">{seller.featuredItem.title}</p>
                      <p className="text-lg font-bold text-primary mt-1">
                        ${seller.featuredItem.price}
                      </p>
                    </div>
                  </div>
                </div>

                <Button className="w-full mt-4" variant="outline">
                  View Store
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. TOP SELLERS LEADERBOARD */}
      <section className="container py-16">
        <div className="flex items-center gap-3 mb-8">
          <Award className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-3xl font-bold">Top Sellers Leaderboard</h2>
            <p className="text-muted-foreground">Our highest performing sellers this month</p>
          </div>
        </div>

        <div className="bg-card rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-4 font-semibold">Rank</th>
                  <th className="text-left p-4 font-semibold">Seller</th>
                  <th className="text-left p-4 font-semibold">Total Sales</th>
                  <th className="text-left p-4 font-semibold">Revenue</th>
                  <th className="text-left p-4 font-semibold">Rating</th>
                </tr>
              </thead>
              <tbody>
                {topSellers.map((seller) => (
                  <tr key={seller.rank} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        seller.rank === 1 ? 'bg-yellow-500 text-yellow-950' :
                        seller.rank === 2 ? 'bg-gray-400 text-gray-950' :
                        seller.rank === 3 ? 'bg-orange-600 text-orange-950' :
                        'bg-muted text-foreground'
                      }`}>
                        {seller.rank}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={seller.avatar} 
                          alt={seller.name}
                          className="w-10 h-10 rounded-full"
                        />
                        <span className="font-medium">{seller.name}</span>
                      </div>
                    </td>
                    <td className="p-4 font-medium">{seller.totalSales.toLocaleString()}</td>
                    <td className="p-4 font-medium text-green-600">
                      ${(seller.revenue / 1000).toFixed(1)}K
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                        <span className="font-medium">{seller.rating}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Claim Dialog */}
      <Dialog open={claimDialogOpen} onOpenChange={setClaimDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Claim Item</DialogTitle>
            <DialogDescription>
              Choose your shipping method and review seller fees
            </DialogDescription>
          </DialogHeader>

          {selectedClaimItem && (
            <div className="space-y-6 mt-4">
              <div className="space-y-3">
                <Label>Shipping Method</Label>
                <RadioGroup value={shippingMethod} onValueChange={(value) => setShippingMethod(value as 'local_pickup' | 'ship_nationwide')}>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent transition-colors">
                    <RadioGroupItem value="local_pickup" id="claim-local" />
                    <Label htmlFor="claim-local" className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Local Pickup</span>
                          <Shield className="h-4 w-4 text-green-600" />
                        </div>
                        <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400">
                          0% Fee
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        No platform fees • Safety tips will be provided
                      </p>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent transition-colors">
                    <RadioGroupItem value="ship_nationwide" id="claim-ship" />
                    <Label htmlFor="claim-ship" className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Ship Nationwide</span>
                        <Badge variant="outline">5% Fee ($5 min)</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Platform handles shipping protection
                      </p>
                    </Label>
                  </div>
                </RadioGroup>

                {/* Safety Mode Notice for Local Pickup */}
                {shippingMethod === 'local_pickup' && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                    <div className="flex gap-2">
                      <Shield className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1">
                        <p className="font-medium text-green-700 dark:text-green-400">
                          Safe Mode Active
                        </p>
                        <p className="text-green-700/90 dark:text-green-300/90">
                          You'll receive safety tips after claiming. Meet at police stations or public places.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Item Price</span>
                  <span className="font-medium">${selectedClaimItem.price.toFixed(2)}</span>
                </div>

                {(() => {
                  const fee = calculateSellerFee(selectedClaimItem.price, shippingMethod);
                  const youReceive = selectedClaimItem.price - fee;
                  
                  return (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          Seller Fee
                          {shippingMethod === 'ship_nationwide' && fee === 5 && (
                            <Info className="h-3 w-3" />
                          )}
                        </span>
                        <span className={`font-medium ${fee > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                          -${fee.toFixed(2)}
                        </span>
                      </div>

                      <Separator />

                      <div className="flex justify-between">
                        <span className="font-semibold">You Receive</span>
                        <span className="font-bold text-lg text-green-600 dark:text-green-400">
                          ${youReceive.toFixed(2)}
                        </span>
                      </div>

                      {shippingMethod === 'ship_nationwide' && fee === 5 && selectedClaimItem.price < 100 && (
                        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                          <div className="flex gap-2">
                            <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                              Items under $100 shipped have a minimum $5 fee to cover transaction costs.
                            </p>
                          </div>
                        </div>
                      )}

                      {shippingMethod === 'local_pickup' && (
                        <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
                          <div className="flex gap-2">
                            <Info className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-green-700 dark:text-green-300">
                              Local pickup has no platform fees! Keep 100% of your sale price.
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              <Button onClick={handleClaim} className="w-full" size="lg">
                Confirm Claim
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Terms Popup */}
      <TermsPopup
        open={showTermsPopup}
        onAccept={handleAcceptTerms}
        onDecline={handleDeclineTerms}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Index;
