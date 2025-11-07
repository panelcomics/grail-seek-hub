import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { calculateTradeFee } from "@/lib/fees";

interface EbayBookCardProps {
  item: {
    itemId: string;
    title: string;
    price?: { value: string; currency: string };
    image?: { imageUrl: string };
    condition?: string;
    seller?: {
      username: string;
      feedbackPercentage: string;
      feedbackScore: number;
    };
  };
  onClick: () => void;
}

export function EbayBookCard({ item, onClick }: EbayBookCardProps) {
  const priceValue = parseFloat(item.price?.value || "0");
  const tradeFee = calculateTradeFee(priceValue * 2); // Assuming equal value trade

  return (
    <Card 
      className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1"
      onClick={onClick}
    >
      <div className="aspect-[3/4] bg-muted overflow-hidden">
        {item.image?.imageUrl ? (
          <img
            src={item.image.imageUrl}
            alt={item.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-muted">
            <span className="text-muted-foreground text-sm">No Image</span>
          </div>
        )}
      </div>
      
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm line-clamp-2 flex-1">
            {item.title}
          </h3>
        </div>

        {item.condition && (
          <Badge variant="outline" className="text-xs">
            {item.condition}
          </Badge>
        )}

        <div className="space-y-1">
          {item.price && (
            <div className="text-lg font-bold text-primary">
              ${parseFloat(item.price.value).toFixed(2)}
            </div>
          )}
          
          <div className="text-xs text-muted-foreground">
            Swap Fee: <span className="font-semibold text-foreground">${tradeFee.each_user_fee.toFixed(2)}</span> each
          </div>
        </div>

        {item.seller && (
          <div className="pt-2 border-t text-xs text-muted-foreground">
            <div className="truncate">Seller: {item.seller.username}</div>
            <div className="text-success">
              {item.seller.feedbackPercentage}% positive ({item.seller.feedbackScore.toLocaleString()})
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
