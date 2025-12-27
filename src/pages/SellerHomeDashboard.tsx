// Additive seller dashboard — progress-first, no refactors
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Camera, ArrowRight, CheckCircle2, BookOpen, Tag } from "lucide-react";
import { FoundingSellerBadge } from "@/components/FoundingSellerBadge";
import { useFoundingSeller } from "@/hooks/useFoundingSeller";

interface InventoryItem {
  id: string;
  title: string | null;
  issue_number: string | null;
  listing_status: string | null;
  images: any;
  created_at: string;
}

interface TodayProgress {
  booksScanned: number;
  listingsCreated: number;
  listingsLive: number;
}

interface SellerStatus {
  accountActive: boolean;
  listingsVisible: boolean;
  localPickupEnabled: boolean;
}

const SellerHomeDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFoundingSeller } = useFoundingSeller();
  const [isLoading, setIsLoading] = useState(true);
  const [todayProgress, setTodayProgress] = useState<TodayProgress>({
    booksScanned: 0,
    listingsCreated: 0,
    listingsLive: 0,
  });
  const [draftCount, setDraftCount] = useState(0);
  const [recentItems, setRecentItems] = useState<InventoryItem[]>([]);
  const [sellerStatus, setSellerStatus] = useState<SellerStatus>({
    accountActive: false,
    listingsVisible: false,
    localPickupEnabled: false,
  });
  const [hasAnyData, setHasAnyData] = useState(false);

  // Dynamic subheaders - choose one randomly on mount
  const subheaders = [
    "Your inventory is growing",
    "Ready to list and sell",
    "Let's keep things moving",
  ];
  const [subheader] = useState(() => 
    subheaders[Math.floor(Math.random() * subheaders.length)]
  );

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
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Fetch all inventory items
      const { data: items, error } = await supabase
        .from("inventory_items")
        .select("id, title, issue_number, listing_status, images, created_at, local_pickup")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("[SELLER-HOME] Error fetching items:", error);
        return;
      }

      const allItems = items || [];
      setHasAnyData(allItems.length > 0);

      // Calculate today's progress
      const todayItems = allItems.filter(
        (item) => new Date(item.created_at) >= today
      );
      const booksScanned = todayItems.length;
      const listingsCreated = todayItems.filter(
        (item) => item.listing_status && item.listing_status !== "draft"
      ).length;
      const listingsLive = allItems.filter(
        (item) => item.listing_status === "listed" || item.listing_status === "active"
      ).length;

      setTodayProgress({
        booksScanned,
        listingsCreated,
        listingsLive,
      });

      // Count drafts
      const drafts = allItems.filter(
        (item) => !item.listing_status || item.listing_status === "draft"
      );
      setDraftCount(drafts.length);

      // Recent items (up to 12 for the strip)
      setRecentItems(allItems.slice(0, 12));

      // Check seller status
      const hasLocalPickup = allItems.some((item) => item.local_pickup === true);
      setSellerStatus({
        accountActive: true,
        listingsVisible: listingsLive > 0,
        localPickupEnabled: hasLocalPickup,
      });
    } catch (error) {
      console.error("[SELLER-HOME] Error loading dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getImageUrl = (item: InventoryItem): string | null => {
    if (!item.images) return null;
    if (typeof item.images === "object") {
      const images = item.images as any;
      return images.front || images.back || null;
    }
    return null;
  };

  const hasProgress = 
    todayProgress.booksScanned > 0 || 
    todayProgress.listingsCreated > 0 || 
    todayProgress.listingsLive > 0;

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-24" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  // Empty state - no data at all
  if (!hasAnyData) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Seller Dashboard</h1>
          <p className="text-muted-foreground">{subheader}</p>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Camera className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Scan your first book to get started</h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
              It only takes seconds — snap a photo and we'll identify it for you.
            </p>
            <Button size="lg" onClick={() => navigate("/scanner")}>
              <Camera className="mr-2 h-5 w-5" />
              Scan First Book
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Section 1: Dashboard Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold">Seller Dashboard</h1>
          {isFoundingSeller && <FoundingSellerBadge size="md" />}
        </div>
        <p className="text-muted-foreground">{subheader}</p>
      </div>

      {/* Founding Seller Recognition Note */}
      {isFoundingSeller && (
        <Card className="mb-4 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <CardContent className="py-3 px-4">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Thanks for being a Founding Seller — your feedback helps shape the platform.
            </p>
          </CardContent>
        </Card>
      )}
      {/* Section 2: Today's Progress Card */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Today</CardTitle>
        </CardHeader>
        <CardContent>
          {hasProgress ? (
            <div className="flex flex-wrap gap-4">
              {todayProgress.booksScanned > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span className="font-medium">{todayProgress.booksScanned}</span>
                  <span className="text-muted-foreground">books scanned</span>
                </div>
              )}
              {todayProgress.listingsCreated > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="h-4 w-4 text-primary" />
                  <span className="font-medium">{todayProgress.listingsCreated}</span>
                  <span className="text-muted-foreground">listings created</span>
                </div>
              )}
              {todayProgress.listingsLive > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="font-medium">{todayProgress.listingsLive}</span>
                  <span className="text-muted-foreground">listings live</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Ready when you are — start scanning to build your inventory
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Next Action Card */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Next Up</CardTitle>
        </CardHeader>
        <CardContent>
          {draftCount > 0 ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {draftCount} book{draftCount !== 1 ? "s" : ""} ready to finish listing
              </p>
              <Button onClick={() => navigate("/my-inventory")} size="sm">
                Finish Listings
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Scan your next book</p>
              <Button onClick={() => navigate("/scanner")} size="sm">
                <Camera className="mr-2 h-4 w-4" />
                Start Scanning
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Recent Activity Strip */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Recently Added</CardTitle>
        </CardHeader>
        <CardContent className="px-3">
          {recentItems.length > 0 ? (
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-3 pb-2">
                {recentItems.map((item) => {
                  const imageUrl = getImageUrl(item);
                  const isDraft = !item.listing_status || item.listing_status === "draft";
                  
                  return (
                    <Link
                      key={item.id}
                      to={`/inventory/${item.id}`}
                      className="relative shrink-0 group"
                    >
                      <div className="w-20 h-28 rounded-lg overflow-hidden bg-muted border border-border group-hover:border-primary transition-colors">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={item.title || "Comic cover"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      {isDraft && (
                        <div className="absolute bottom-1 left-1 right-1">
                          <div className="bg-background/90 text-[10px] text-center py-0.5 rounded text-muted-foreground">
                            Draft
                          </div>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Your scanned books will appear here
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section 5: Seller Status Micro-Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Seller Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>
              {sellerStatus.localPickupEnabled
                ? "Local pickup enabled"
                : sellerStatus.listingsVisible
                ? "Listings visible to buyers"
                : "Seller account active"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SellerHomeDashboard;
