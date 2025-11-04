import { useNavigate } from "react-router-dom";
import { Crown, Star, Award, ArrowLeft, Trophy } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const leaderboardData = [
  {
    rank: 1,
    name: "Kiss Komixx",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=KK",
    grailPoints: 1240,
    isTopSeller: true,
  },
  {
    rank: 2,
    name: "ThePanelVault",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=TPV",
    grailPoints: 1180,
  },
  {
    rank: 3,
    name: "MaskedMerc",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=MM",
    grailPoints: 1010,
  },
  {
    rank: 4,
    name: "BronzeAgeBlaze",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=BAB",
    grailPoints: 950,
  },
  {
    rank: 5,
    name: "SlabCity",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=SC",
    grailPoints: 910,
  },
  {
    rank: 6,
    name: "NOLA_Comics",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=NC",
    grailPoints: 860,
  },
  {
    rank: 7,
    name: "RetroVault",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=RV",
    grailPoints: 820,
  },
  {
    rank: 8,
    name: "ComicCraze",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=CC",
    grailPoints: 790,
  },
  {
    rank: 9,
    name: "GrailHunter",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=GH",
    grailPoints: 760,
  },
  {
    rank: 10,
    name: "PanelMaster",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=PM",
    grailPoints: 740,
  },
];

const Leaderboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
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
              <h1 className="text-4xl md:text-5xl font-bold">Top Sellers Leaderboard</h1>
            </div>
            <p className="text-muted-foreground text-lg">
              Celebrating our most trusted and active sellers
            </p>
          </div>
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
                        <th className="text-left p-4 font-semibold">Grail Points</th>
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
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-lg">{seller.name}</span>
                                  {seller.isTopSeller && (
                                    <Badge className="bg-yellow-500 text-yellow-950 hover:bg-yellow-500/90">
                                      🏅 Monthly Top Seller
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Star className="h-5 w-5 text-primary" />
                              <span className="font-bold text-lg">{seller.grailPoints.toLocaleString()}</span>
                              <span className="text-muted-foreground">GP</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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

      <Footer />
    </div>
  );
};

export default Leaderboard;
