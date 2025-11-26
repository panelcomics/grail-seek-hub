import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MakeOfferModal } from "@/components/MakeOfferModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { MessageCircle, Repeat2, AlertCircle, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Helmet } from "react-helmet-async";

interface TradeItem {
  id: string;
  title: string;
  series: string;
  issue_number: string;
  grade: string;
  cgc_grade: string;
  condition: string;
  in_search_of: string;
  trade_notes: string;
  images: any;
  details: string;
  user_id: string;
  profiles?: {
    username: string;
  };
}

export default function TradeDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [item, setItem] = useState<TradeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTradeItem();
      if (user) {
        checkIfBlocked();
      }
    }
  }, [id, user]);

  const fetchTradeItem = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("id", id)
        .eq("is_for_trade", true)
        .single();

      if (error) throw error;
      if (!data) {
        toast.error("Trade listing not found");
        navigate("/trades");
        return;
      }

      // Fetch username separately
      const { data: profile } = await supabase
        .from("public_profiles")
        .select("username")
        .eq("user_id", data.user_id)
        .single();

      setItem({
        ...data,
        profiles: { username: profile?.username || "User" }
      } as TradeItem);
    } catch (error) {
      console.error("Error fetching trade item:", error);
      toast.error("Failed to load trade listing");
    } finally {
      setLoading(false);
    }
  };

  const checkIfBlocked = async () => {
    if (!user || !item) return;
    
    try {
      const { data, error } = await supabase
        .from("user_blocks")
        .select("id")
        .eq("blocker_user_id", item.user_id)
        .eq("blocked_user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      setIsBlocked(!!data);
    } catch (error) {
      console.error("Error checking block status:", error);
    }
  };

  const handleMessageSeller = async () => {
    if (!user) {
      toast.error("Please sign in to message sellers");
      navigate("/auth");
      return;
    }

    if (!item) return;

    try {
      // Check if conversation exists
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("buyer_id", user.id)
        .eq("seller_id", item.user_id)
        .maybeSingle();

      if (existingConv) {
        navigate(`/messages?conversation=${existingConv.id}`);
        return;
      }

      // Create new conversation (need a sale_id, using item.id as placeholder)
      const { data: newConv, error } = await supabase
        .from("conversations")
        .insert({
          buyer_id: user.id,
          seller_id: item.user_id,
          sale_id: item.id, // Using inventory item as reference
        })
        .select()
        .single();

      if (error) throw error;

      // Send initial message
      await supabase.from("messages").insert({
        conversation_id: newConv.id,
        sender_id: user.id,
        text: `Hi, I'm interested in your ${item.series || item.title}${item.issue_number ? ` #${item.issue_number}` : ""} trade listing.`,
      });

      navigate(`/messages?conversation=${newConv.id}`);
    } catch (error: any) {
      console.error("Error creating conversation:", error);
      toast.error("Failed to start conversation");
    }
  };

  const getImageUrl = (images: any) => {
    if (!images) return "/placeholder.svg";
    if (typeof images === "string") return images;
    if (Array.isArray(images) && images.length > 0) return images[0];
    if (images.front) return images.front;
    return "/placeholder.svg";
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!item) {
    return null;
  }

  const isOwnItem = user?.id === item.user_id;

  return (
    <>
      <Helmet>
        <title>{`${item.series || item.title}${item.issue_number ? ` #${item.issue_number}` : ""} - Trade - GrailSeeker`}</title>
        <meta name="description" content={`Trade for ${item.series || item.title}. ${item.in_search_of}`} />
      </Helmet>

      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Image Section */}
              <div className="space-y-4">
                <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted">
                  <img
                    src={getImageUrl(item.images)}
                    alt={item.title || "Trade item"}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Details Section */}
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Repeat2 className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium text-primary">Available for Trade</span>
                  </div>
                  <h1 className="text-3xl font-bold mb-2">
                    {item.series || item.title}
                    {item.issue_number && ` #${item.issue_number}`}
                  </h1>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Link to={`/seller/${item.user_id}`} className="hover:text-primary">
                      @{item.profiles?.username || "User"}
                    </Link>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {item.grade && <Badge variant="secondary">{item.grade}</Badge>}
                  {item.cgc_grade && <Badge variant="secondary">CGC {item.cgc_grade}</Badge>}
                  {item.condition && <Badge variant="outline">{item.condition}</Badge>}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">In Search Of</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{item.in_search_of || "See trade notes"}</p>
                  </CardContent>
                </Card>

                {item.trade_notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Trade Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap text-muted-foreground">{item.trade_notes}</p>
                    </CardContent>
                  </Card>
                )}

                {item.details && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Item Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap text-muted-foreground">{item.details}</p>
                    </CardContent>
                  </Card>
                )}

                {isBlocked && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You cannot interact with this seller.
                    </AlertDescription>
                  </Alert>
                )}

                {!isOwnItem && !isBlocked && user && (
                  <div className="flex gap-3">
                    <Button onClick={handleMessageSeller} variant="outline" className="flex-1">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Message Seller
                    </Button>
                    <Button onClick={() => setShowOfferModal(true)} className="flex-1">
                      <Star className="mr-2 h-4 w-4" />
                      Make Offer
                    </Button>
                  </div>
                )}

                {!user && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <Link to="/auth" className="font-medium underline">
                        Sign in
                      </Link>{" "}
                      to message the seller or make an offer
                    </AlertDescription>
                  </Alert>
                )}

                {isOwnItem && (
                  <Alert>
                    <AlertDescription>This is your trade listing</AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </div>
        </div>
      </AppLayout>

      {user && item && !isOwnItem && (
        <MakeOfferModal
          isOpen={showOfferModal}
          onClose={() => setShowOfferModal(false)}
          listingId={item.id}
          itemTitle={`${item.series || item.title}${item.issue_number ? ` #${item.issue_number}` : ""}`}
        />
      )}
    </>
  );
}
