import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, TrendingUp } from "lucide-react";

interface CollectionItem {
  id: string;
  title: string;
  listed_price?: number;
  grade?: string;
  images?: any;
}

export const CollectionSidebar = () => {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchCollection();
  }, []);

  const fetchCollection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get total count
      const { count } = await supabase
        .from('inventory_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setTotalCount(count || 0);

      // Get top 3 items by value
      const { data } = await supabase
        .from('inventory_items')
        .select('id, title, listed_price, grade, images')
        .eq('user_id', user.id)
        .order('listed_price', { ascending: false, nullsFirst: false })
        .limit(3);

      if (data) {
        setItems(data);
      }
    } catch (error) {
      console.error('Error fetching collection:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateFee = (value: number) => {
    if (value <= 50) return 0;
    if (value <= 100) return 2.5;
    if (value <= 250) return 6;
    if (value <= 500) return 11;
    return 17.5;
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full mb-4" />
          <Skeleton className="h-16 w-full mb-2" />
          <Skeleton className="h-16 w-full mb-2" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const progressPercentage = Math.min((totalCount / 10) * 100, 100);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-primary" />
          Your Collection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {totalCount} item{totalCount !== 1 ? 's' : ''} added
            </span>
            <Badge variant="secondary" className="gap-1">
              <Crown className="h-3 w-3" />
              Free Tier
            </Badge>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Add {Math.max(0, 10 - totalCount)} more to unlock Pro features
          </p>
        </div>

        {items.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Top Grails</p>
            {items.map((item) => {
              const price = item.listed_price || 0;
              const fee = calculateFee(price);
              
              return (
                <div 
                  key={item.id} 
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="h-12 w-9 bg-background rounded overflow-hidden flex-shrink-0">
                    {item.images?.[0] ? (
                      <img 
                        src={item.images[0]} 
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-primary/10" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{item.title}</p>
                    {item.grade && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {item.grade}
                      </Badge>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs font-semibold">
                        ${price.toFixed(2)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ${fee} fee
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">
            Unlock Pro for unlimited items + 30% fee cut
          </p>
          <Button variant="premium" size="sm" className="w-full">
            Upgrade to Pro
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
