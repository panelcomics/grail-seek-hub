import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Star, Award, TrendingUp, MessageSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { ShippingPresets } from "@/components/ShippingPresets";

interface UserBadge {
  id: string;
  badge_type: string;
  badge_name: string;
  badge_description: string;
  earned_at: string;
}

interface Rating {
  id: string;
  rating: number;
  review_text: string;
  transaction_type: string;
  created_at: string;
  reviewer_id: string;
}

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalRatings, setTotalRatings] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        toast.error('Please sign in to view your profile');
        navigate('/auth');
        return;
      }

      setUser(currentUser);

      // Fetch badges
      const { data: badgesData, error: badgesError } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('earned_at', { ascending: false });

      if (badgesError) throw badgesError;
      setBadges(badgesData || []);

      // Fetch ratings
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('user_ratings')
        .select('*')
        .eq('reviewed_user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (ratingsError) throw ratingsError;
      setRatings(ratingsData || []);

      // Calculate average rating
      if (ratingsData && ratingsData.length > 0) {
        const avg = ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length;
        setAverageRating(Math.round(avg * 10) / 10);
        setTotalRatings(ratingsData.length);
      }

    } catch (error: any) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-5 w-5 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  const getBadgeIcon = (type: string) => {
    switch (type) {
      case 'trader':
        return <TrendingUp className="h-6 w-6" />;
      case 'community':
        return <MessageSquare className="h-6 w-6" />;
      default:
        return <Award className="h-6 w-6" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8 mt-20">
          <div className="text-center">Loading...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 mt-20">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="text-2xl">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold mb-2">
                  {user?.email?.split('@')[0] || 'User'}
                </h1>
                <p className="text-muted-foreground mb-4">{user?.email}</p>
                
                <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                  <div className="flex">
                    {renderStars(Math.round(averageRating))}
                  </div>
                  <span className="font-semibold text-lg">{averageRating.toFixed(1)}</span>
                  <span className="text-muted-foreground">({totalRatings} ratings)</span>
                </div>

                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  {badges.slice(0, 3).map((badge) => (
                    <Badge key={badge.id} variant="secondary" className="gap-1">
                      {getBadgeIcon(badge.badge_type)}
                      {badge.badge_name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="achievements" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="shipping">Shipping Presets</TabsTrigger>
          </TabsList>

          <TabsContent value="achievements">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Achievements
                </CardTitle>
                <CardDescription>Badges earned through trading</CardDescription>
              </CardHeader>
              <CardContent>
                {badges.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No badges earned yet. Complete trades to earn achievements!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {badges.map((badge) => (
                      <div
                        key={badge.id}
                        className="flex items-start gap-3 p-4 rounded-lg bg-muted/50"
                      >
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          {getBadgeIcon(badge.badge_type)}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{badge.badge_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {badge.badge_description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Earned {new Date(badge.earned_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Recent Reviews
                </CardTitle>
                <CardDescription>What others say about trading with you</CardDescription>
              </CardHeader>
              <CardContent>
                {ratings.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No reviews yet. Complete your first trade to get reviewed!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {ratings.slice(0, 5).map((rating) => (
                      <div key={rating.id} className="p-4 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {renderStars(rating.rating)}
                          </div>
                          {rating.transaction_type && (
                            <Badge variant="outline" className="text-xs">
                              {rating.transaction_type}
                            </Badge>
                          )}
                        </div>
                        {rating.review_text && (
                          <p className="text-sm mb-2">{rating.review_text}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(rating.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shipping">
            <ShippingPresets />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
