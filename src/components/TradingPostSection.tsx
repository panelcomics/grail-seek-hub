import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Repeat2 } from "lucide-react";

interface TradeItem {
  id: string;
  title: string;
  series: string;
  issue_number: string;
  grade: string;
  in_search_of: string;
  images: any;
  user_id: string;
  profiles?: {
    username: string;
  };
}

export const TradingPostSection = () => {
  const [items, setItems] = useState<TradeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTradeItems();
  }, []);

  const fetchTradeItems = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select(`
          id,
          title,
          series,
          issue_number,
          grade,
          in_search_of,
          images,
          user_id
        `)
        .eq("is_for_trade", true)
        .order("created_at", { ascending: false })
        .limit(8);

      if (error) throw error;

      // Fetch usernames separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(item => item.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username")
          .in("user_id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p.username]));
        const itemsWithProfiles = data.map(item => ({
          ...item,
          profiles: { username: profileMap.get(item.user_id) || "User" }
        }));
        setItems(itemsWithProfiles as TradeItem[]);
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error("Error fetching trade items:", error);
    } finally {
      setLoading(false);
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat2 className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Trading Post</h2>
        </div>
        <Button variant="outline" asChild>
          <Link to="/trades">
            View All Trades
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <Link to={`/trade/${item.id}`}>
              <div className="aspect-[3/4] overflow-hidden bg-muted">
                <img
                  src={getImageUrl(item.images)}
                  alt={item.title || "Trade item"}
                  className="w-full h-full object-cover hover:scale-105 transition-transform"
                />
              </div>
            </Link>
            <CardContent className="p-4">
              <div className="space-y-2">
                <Link to={`/trade/${item.id}`}>
                  <h3 className="font-semibold line-clamp-1 hover:text-primary">
                    {item.series || item.title}
                    {item.issue_number && ` #${item.issue_number}`}
                  </h3>
                </Link>
                {item.grade && (
                  <Badge variant="secondary" className="text-xs">
                    {item.grade}
                  </Badge>
                )}
                <p className="text-sm text-muted-foreground line-clamp-2">
                  ISO: {item.in_search_of || "See listing"}
                </p>
                <p className="text-xs text-muted-foreground">
                  by {item.profiles?.username || "User"}
                </p>
              </div>
            </CardContent>
            <CardFooter className="p-4 pt-0">
              <Button asChild className="w-full" variant="outline">
                <Link to={`/trade/${item.id}`}>View Trade</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};
