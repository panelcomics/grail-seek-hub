import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Clock, MapPin, Tag, Package, TrendingUp } from "lucide-react";
import Navbar from "@/components/Navbar";

interface ClaimSale {
  id: string;
  title: string;
  description: string;
  price: number;
  total_items: number;
  claimed_items: number;
  start_time: string;
  end_time: string;
  status: string;
  city: string;
  state: string;
}

interface ClaimSaleItem {
  id: string;
  image_url: string;
  title: string;
  is_claimed: boolean;
  category: string;
  condition: string;
}

interface UserClaim {
  id: string;
  claimed_at: string;
  rank: number;
}

const ClaimSaleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sale, setSale] = useState<ClaimSale | null>(null);
  const [items, setItems] = useState<ClaimSaleItem[]>([]);
  const [userClaim, setUserClaim] = useState<UserClaim | null>(null);
  const [countdown, setCountdown] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSaleData();
  }, [id, user]);

  useEffect(() => {
    if (!sale) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const end = new Date(sale.end_time).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setCountdown("Sale ended");
        setIsUrgent(false);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        if (diff <= 5 * 60 * 1000) {
          // Less than 5 minutes
          setCountdown(`${minutes}m ${seconds}s left!`);
          setIsUrgent(true);
        } else if (hours > 0) {
          setCountdown(`${hours}h ${minutes}m left`);
          setIsUrgent(false);
        } else {
          setCountdown(`${minutes}m left`);
          setIsUrgent(false);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sale]);

  const fetchSaleData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch sale data
      const { data: saleData, error: saleError } = await supabase
        .from("claim_sales")
        .select("*")
        .eq("id", id)
        .single();

      if (saleError) throw saleError;
      if (!saleData) {
        toast.error("Claim sale not found");
        navigate("/");
        return;
      }

      setSale(saleData as ClaimSale);

      // Fetch items
      const { data: itemsData, error: itemsError } = await supabase
        .from("claim_sale_items")
        .select("*")
        .eq("claim_sale_id", id);

      if (itemsError) throw itemsError;
      setItems(itemsData as ClaimSaleItem[]);

      // If user is logged in, check if they have claimed
      if (user) {
        const { data: claimsData, error: claimsError } = await supabase
          .from("claims")
          .select("id, claimed_at")
          .eq("claim_sale_id", id)
          .order("claimed_at", { ascending: true });

        if (claimsError) throw claimsError;

        // Find user's claim
        const { data: userClaimData } = await supabase
          .from("claims")
          .select("id, claimed_at")
          .eq("claim_sale_id", id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (userClaimData) {
          // Calculate rank
          const rank = claimsData.findIndex(c => c.id === userClaimData.id) + 1;
          setUserClaim({
            id: userClaimData.id,
            claimed_at: userClaimData.claimed_at,
            rank,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching claim sale:", error);
      toast.error("Failed to load claim sale");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!user) {
      toast.error("Please sign in to claim items");
      navigate("/auth");
      return;
    }

    if (!sale) return;

    const now = new Date();
    const endTime = new Date(sale.end_time);

    if (now >= endTime || sale.status === "closed") {
      toast.error("This sale has ended");
      return;
    }

    if (userClaim) {
      toast.error("You have already claimed from this sale");
      return;
    }

    setIsClaiming(true);

    try {
      // Insert claim
      const { data: claimData, error: claimError } = await supabase
        .from("claims")
        .insert({
          user_id: user.id,
          claim_sale_id: id,
          item_id: items[0]?.id, // We'll use the first available item
          item_price: sale.price,
          total_price: sale.price,
          shipping_method: "local_pickup",
          shipping_tier: "standard",
          seller_fee: 0,
        })
        .select()
        .single();

      if (claimError) throw claimError;

      // Update claim sale claimed items count
      const { error: updateError } = await supabase
        .from("claim_sales")
        .update({ claimed_items: (sale.claimed_items || 0) + 1 })
        .eq("id", id);

      if (updateError) throw updateError;

      toast.success("Item claimed successfully!");
      
      // Refresh data to get rank
      await fetchSaleData();
    } catch (error) {
      console.error("Error claiming item:", error);
      toast.error("Failed to claim item");
    } finally {
      setIsClaiming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto py-12 px-4">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading claim sale...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto py-12 px-4">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Claim sale not found</p>
          </div>
        </div>
      </div>
    );
  }

  const itemsLeft = sale.total_items - (sale.claimed_items || 0);
  const isEnded = new Date() >= new Date(sale.end_time) || sale.status === "closed";
  const canClaim = user && !isEnded && !userClaim && itemsLeft > 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{sale.title}</h1>
              <div className="flex flex-wrap gap-2">
                {items.length > 0 && (
                  <>
                    <Badge variant="secondary" className="gap-1">
                      <Tag className="h-3 w-3" />
                      {items[0].category}
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Package className="h-3 w-3" />
                      {items[0].condition}
                    </Badge>
                  </>
                )}
                <Badge variant="secondary" className="gap-1">
                  <MapPin className="h-3 w-3" />
                  {sale.city}, {sale.state}
                </Badge>
              </div>
            </div>
            
            <Card className={isUrgent ? "border-destructive" : ""}>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Clock className={`h-6 w-6 mx-auto mb-2 ${isUrgent ? "text-destructive" : "text-muted-foreground"}`} />
                  <p className={`text-2xl font-bold ${isUrgent ? "text-destructive" : "text-primary"}`}>
                    {countdown}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isEnded ? "Sale Ended" : "Time Remaining"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Description */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Claim Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{sale.description}</p>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">${sale.price}</p>
                  <p className="text-sm text-muted-foreground mt-1">Price per Item</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">{itemsLeft}</p>
                  <p className="text-sm text-muted-foreground mt-1">Items Available</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">{sale.claimed_items || 0}</p>
                  <p className="text-sm text-muted-foreground mt-1">Already Claimed</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Claim Widget */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Claim Your Item</CardTitle>
              <CardDescription>
                {userClaim
                  ? `You claimed this item! You're #${userClaim.rank} in line.`
                  : canClaim
                  ? "Click below to claim an item from this sale"
                  : !user
                  ? "Please sign in to claim items"
                  : isEnded
                  ? "This sale has ended"
                  : itemsLeft === 0
                  ? "All items have been claimed"
                  : "You have already claimed from this sale"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userClaim ? (
                <div className="flex items-center gap-4 p-4 bg-success/10 border border-success rounded-lg">
                  <TrendingUp className="h-8 w-8 text-success" />
                  <div>
                    <p className="font-semibold text-success">You're in line!</p>
                    <p className="text-sm text-muted-foreground">
                      Position #{userClaim.rank} • Claimed {new Date(userClaim.claimed_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ) : (
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleClaim}
                  disabled={!canClaim || isClaiming}
                >
                  {isClaiming ? "Claiming..." : !user ? "Sign In to Claim" : "Claim Now"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Gallery */}
        <Card>
          <CardHeader>
            <CardTitle>Item Gallery ({items.length} items)</CardTitle>
            <CardDescription>Click on any image to view full size</CardDescription>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No images available</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {items.map((item) => (
                  <Dialog key={item.id}>
                    <DialogTrigger asChild>
                      <div className="relative group cursor-pointer">
                        <img
                          src={item.image_url || "/placeholder.svg"}
                          alt={item.title}
                          className="w-full h-40 object-cover rounded-lg transition-transform group-hover:scale-105"
                        />
                        {item.is_claimed && (
                          <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
                            <Badge variant="secondary">Claimed</Badge>
                          </div>
                        )}
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                      <img
                        src={item.image_url || "/placeholder.svg"}
                        alt={item.title}
                        className="w-full h-auto rounded-lg"
                      />
                      <p className="text-center text-sm text-muted-foreground mt-2">
                        {item.title}
                      </p>
                    </DialogContent>
                  </Dialog>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClaimSaleDetail;