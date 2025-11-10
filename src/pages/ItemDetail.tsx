import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, Package, Shield, Heart, Share2, Star } from "lucide-react";
import comicSample1 from "@/assets/comic-sample-1.jpg";

const ItemDetail = () => {
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image Section */}
          <div className="space-y-4">
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border bg-muted">
              <img
                src={comicSample1}
                alt="Item"
                className="h-full w-full object-cover"
              />
              <div className="absolute top-4 right-4 flex gap-2">
                <Button size="icon" variant="secondary" className="rounded-full">
                  <Heart className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="secondary" className="rounded-full">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-[3/4] rounded-lg border bg-muted overflow-hidden cursor-pointer hover:border-primary transition-colors">
                  <img src={comicSample1} alt={`Thumbnail ${i}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          {/* Details Section */}
          <div className="space-y-6">
            <div>
              <Badge variant="secondary" className="mb-3">
                NM+ Near Mint Plus
              </Badge>
              <h1 className="text-4xl font-bold mb-4">
                Amazing Spider-Man #300 - First Appearance of Venom
              </h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>Chicago, IL (Local Pickup)</span>
                </div>
                <div className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  <span>Ships Nationwide</span>
                </div>
              </div>
              
              <div className="flex items-baseline gap-3 mb-6">
                <div className="text-5xl font-bold text-primary">$450</div>
                <div className="text-sm text-muted-foreground">+ $12 shipping</div>
              </div>
            </div>

            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-primary-foreground">JD</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-semibold">John's Comics</div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="h-3 w-3 fill-secondary text-secondary" />
                    <span>4.9 (243 sales)</span>
                  </div>
                </div>
                <Button variant="outline" size="sm">View Shop</Button>
              </div>
              
              <div className="grid grid-cols-3 gap-3 pt-4 border-t text-center">
                <div>
                  <div className="text-lg font-bold">98%</div>
                  <div className="text-xs text-muted-foreground">Positive</div>
                </div>
                <div>
                  <div className="text-lg font-bold">156</div>
                  <div className="text-xs text-muted-foreground">Items</div>
                </div>
                <div>
                  <div className="text-lg font-bold">5yr</div>
                  <div className="text-xs text-muted-foreground">Member</div>
                </div>
              </div>
            </Card>

            <div className="space-y-3">
              <Button size="lg" className="w-full gap-2 text-lg h-14">
                <Shield className="h-5 w-5" />
                Buy Now - Protected
              </Button>
              <Button size="lg" variant="outline" className="w-full gap-2 text-lg h-14">
                <MapPin className="h-5 w-5" />
                Arrange Local Pickup
              </Button>
            </div>

            <Card className="p-4 bg-muted/50">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary mt-0.5" />
                <div className="text-sm">
                  <div className="font-semibold mb-1">Buyer Protection</div>
                  <p className="text-muted-foreground">
                    All purchases protected by Grail Seeker guarantee. Get your item as described or your money back.
                  </p>
                </div>
              </div>
            </Card>

            <div className="space-y-4 pt-6 border-t">
              <h3 className="font-semibold text-lg">Item Description</h3>
              <div className="prose prose-sm max-w-none text-muted-foreground">
                <p>
                  Near Mint Plus copy of the legendary Amazing Spider-Man #300! First full appearance of Venom 
                  (Eddie Brock). Classic Todd McFarlane cover and interior art. No restoration, no pressing.
                </p>
                <p className="mt-4">
                  This book has been stored in a smoke-free, climate-controlled environment. Minor wear on 
                  corners consistent with NM+ grade. Spine is tight with vibrant colors throughout.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm pt-4">
                <div className="space-y-1">
                  <div className="text-muted-foreground">Publisher</div>
                  <div className="font-medium">Marvel Comics</div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground">Year</div>
                  <div className="font-medium">1988</div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground">Issue</div>
                  <div className="font-medium">#300</div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground">Condition</div>
                  <div className="font-medium">NM+ 9.6</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemDetail;
