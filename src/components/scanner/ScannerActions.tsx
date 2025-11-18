import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingBag, BookMarked } from "lucide-react";

interface ScannerActionsProps {
  onSellNow: () => void;
  onAddToCollection: () => void;
  disabled?: boolean;
}

export function ScannerActions({ onSellNow, onAddToCollection, disabled }: ScannerActionsProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 gap-3">
          <Button
            size="lg"
            onClick={onSellNow}
            disabled={disabled}
            className="w-full"
          >
            <ShoppingBag className="h-4 w-4 mr-2" />
            Sell Now
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={onAddToCollection}
            disabled={disabled}
            className="w-full"
          >
            <BookMarked className="h-4 w-4 mr-2" />
            Add to Collection
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-3">
          Choose to sell this comic or add it to your personal collection
        </p>
      </CardContent>
    </Card>
  );
}
