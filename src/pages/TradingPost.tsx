import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Repeat2, Search } from "lucide-react";
import { Helmet } from "react-helmet-async";

interface TradeItem {
  id: string;
  title: string;
  series: string;
  issue_number: string;
  grade: string;
  in_search_of: string;
  trade_notes: string;
  images: any;
  user_id: string;
  profiles?: {
    username: string;
  };
}

export default function TradingPost() {
  const [items, setItems] = useState<TradeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");

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
          trade_notes,
          images,
          user_id
        `)
        .eq("is_for_trade", true)
        .order("created_at", { ascending: false });

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

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !searchTerm ||
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.series?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.in_search_of?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGrade = gradeFilter === "all" || item.grade === gradeFilter;

    return matchesSearch && matchesGrade;
  });

  return (
    <>
      <Helmet>
        <title>Trading Post - GrailSeeker</title>
        <meta name="description" content="Trade comics and collectibles with other collectors. Find your grails through trades." />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Repeat2 className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Trading Post</h1>
                <p className="text-muted-foreground">
                  Find items available for trade from collectors
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, series, or ISO..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  <SelectItem value="CGC 9.8">CGC 9.8</SelectItem>
                  <SelectItem value="CGC 9.6">CGC 9.6</SelectItem>
                  <SelectItem value="CGC 9.4">CGC 9.4</SelectItem>
                  <SelectItem value="NM">Near Mint</SelectItem>
                  <SelectItem value="VF">Very Fine</SelectItem>
                  <SelectItem value="FN">Fine</SelectItem>
                  <SelectItem value="VG">Very Good</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-96" />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <Card className="p-12 text-center">
                <Repeat2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No Trade Items Found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || gradeFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Check back later for new trade listings"}
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredItems.map((item) => (
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
                        <div className="text-sm">
                          <p className="font-medium text-muted-foreground">In Search Of:</p>
                          <p className="line-clamp-2">{item.in_search_of || "See listing"}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          by {item.profiles?.username || "User"}
                        </p>
                      </div>
                    </CardContent>
                    <CardFooter className="p-4 pt-0 flex gap-2">
                      <Button asChild className="flex-1" variant="outline">
                        <Link to={`/trade/${item.id}`}>View Trade</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
