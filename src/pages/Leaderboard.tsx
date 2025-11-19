import { useNavigate } from "react-router-dom";
import { Crown, Star, Award, ArrowLeft, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SellerBadge } from "@/components/SellerBadge";
import { SellerStats } from "@/components/SellerStats";

const leaderboardData = [
  {
    rank: 1,
    name: "Kiss Komixx",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=KK",
    sellerScore: (156 * 4.9) / 5, // 152.88
    rating: 4.9,
    sales: 156,
    favorites: 342,
    badge: "top" as const,
  },
  {
    rank: 2,
    name: "ThePanelVault",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=TPV",
    sellerScore: (142 * 4.8) / 5, // 136.32
    rating: 4.8,
    sales: 142,
    favorites: 298,
    badge: "pro" as const,
  },
  {
    rank: 3,
    name: "MaskedMerc",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=MM",
    sellerScore: (128 * 4.9) / 5, // 125.44
    rating: 4.9,
    sales: 128,
    favorites: 267,
    badge: "pro" as const,
  },
  {
    rank: 4,
    name: "BronzeAgeBlaze",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=BAB",
    sellerScore: (115 * 4.7) / 5, // 108.1
    rating: 4.7,
    sales: 115,
    favorites: 234,
    badge: "verified" as const,
  },
  {
    rank: 5,
    name: "SlabCity",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=SC",
    sellerScore: (108 * 4.8) / 5, // 103.68
    rating: 4.8,
    sales: 108,
    favorites: 221,
    badge: "verified" as const,
  },
  {
    rank: 6,
    name: "NOLA_Comics",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=NC",
    sellerScore: (98 * 4.6) / 5, // 90.16
    rating: 4.6,
    sales: 98,
    favorites: 198,
    badge: "verified" as const,
  },
  {
    rank: 7,
    name: "RetroVault",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=RV",
    sellerScore: (92 * 4.7) / 5, // 86.48
    rating: 4.7,
    sales: 92,
    favorites: 187,
    badge: null,
  },
  {
    rank: 8,
    name: "ComicCraze",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=CC",
    sellerScore: (86 * 4.5) / 5, // 77.4
    rating: 4.5,
    sales: 86,
    favorites: 165,
    badge: null,
  },
  {
    rank: 9,
    name: "GrailHunter",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=GH",
    sellerScore: (81 * 4.6) / 5, // 74.52
    rating: 4.6,
    sales: 81,
    favorites: 154,
    badge: null,
  },
  {
    rank: 10,
    name: "PanelMaster",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=PM",
    sellerScore: (76 * 4.5) / 5, // 68.4
    rating: 4.5,
    sales: 76,
    favorites: 142,
    badge: null,
  },
];

const Leaderboard = () => {
  const navigate = useNavigate();

  const formatScore = (score: number) => {
    if (score >= 1000) {
      return `${(score / 1000).toFixed(2)}K`;
    }
    return score.toFixed(1);
  };

  return (
    <main className="container mx-auto px-4 py-8 mt-16">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Marketplace
          </Button>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Trophy className="h-10 w-10 text-primary" />
              <h1 className="text-4xl md:text-5xl font-bold">Top Sellers of the Month</h1>
            </div>
            <p className="text-muted-foreground text-lg">
              The most trusted and active sellers across Grail Seeker — ranked by verified sales and community ratings.
            </p>
          </div>
        </div>

        {/* Tagline */}
        <div className="text-center mb-8">
          <p className="text-xl font-semibold text-foreground">
            Trading. Trusted. Transparent. <span className="text-primary">See who's setting the bar high on Grail Seeker.</span>
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Leaderboard Table */}
          <div className="lg:col-span-3">
            <Card className="comic-texture border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-6 w-6 text-primary" />
                  Top 10 Sellers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 font-semibold">Rank</th>
                        <th className="text-left p-4 font-semibold">Seller</th>
                        <th className="text-left p-4 font-semibold">Seller Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboardData.map((seller) => (
                        <tr
                          key={seller.rank}
                          className={`border-b hover:bg-muted/30 transition-all duration-300 ${
                            seller.rank === 1
                              ? "border-l-4 border-l-yellow-500 bg-yellow-500/5"
                              : seller.rank === 2
                              ? "border-l-4 border-l-gray-400 bg-gray-400/5"
                              : seller.rank === 3
                              ? "border-l-4 border-l-orange-600 bg-orange-600/5"
                              : ""
                          }`}
                        >
                          <td className="p-4">
                            <div className="relative inline-block">
                              <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-lg ${
                                  seller.rank === 1
                                    ? "gradient-gold text-yellow-950"
                                    : seller.rank === 2
                                    ? "gradient-silver text-gray-950"
                                    : seller.rank === 3
                                    ? "gradient-bronze text-orange-950"
                                    : "bg-muted text-foreground"
                                }`}
                              >
                                {seller.rank}
                              </div>
                              {seller.rank === 1 && (
                                <Crown className="absolute -top-2 -right-2 h-6 w-6 text-yellow-500 fill-yellow-500 animate-pulse" />
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-4">
                              <Avatar
                                className={`h-14 w-14 shadow-md ${
                                  seller.rank <= 3 ? "ring-2" : ""
                                } ${
                                  seller.rank === 1
                                    ? "ring-yellow-500 seller-glow"
                                    : seller.rank === 2
                                    ? "ring-gray-400"
                                    : seller.rank === 3
                                    ? "ring-orange-600"
                                    : ""
                                }`}
                              >
                                <AvatarImage src={seller.avatar} alt={seller.name} />
                                <AvatarFallback>{seller.name.slice(0, 2)}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="font-semibold text-lg mb-1">{seller.name}</div>
                                <div className="flex items-center gap-2">
                                  <SellerStats
                                    rating={seller.rating}
                                    salesCount={seller.sales}
                                    favoritesTotal={seller.favorites}
                                    showAllStats={false}
                                  />
                                  <SellerBadge tier={seller.badge} />
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Star className="h-5 w-5 text-primary" />
                              <span className="font-bold text-lg">{formatScore(seller.sellerScore)}</span>
                              <span className="text-muted-foreground">pts</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-6 pt-4 border-t">
                  <p className="text-sm text-center text-muted-foreground italic">
                    Ranking is based on verified sales and buyer ratings. Seller earnings remain private.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Hall of Fame Sidebar */}
          <div className="lg:col-span-1">
            <Card className="comic-texture border-2 sticky top-20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Hall of Fame
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-6 rounded-lg bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-2 border-yellow-500/20">
                  <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-2">2024 Champion</p>
                  <p className="font-bold text-xl">Coming Soon</p>
                </div>
                
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    <p className="mb-2">The Hall of Fame honors yearly top sellers who have:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Exceptional customer ratings</li>
                      <li>Consistent high-volume sales</li>
                      <li>Outstanding community engagement</li>
                    </ul>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-xs text-center text-muted-foreground italic">
                    Winners announced annually
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Back Button */}
        <div className="text-center mt-12">
          <Button
            size="lg"
            onClick={() => navigate("/")}
            className="min-w-[200px]"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Marketplace
          </Button>
      </div>
    </main>
  );
};

export default Leaderboard;
