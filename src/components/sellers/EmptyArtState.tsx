import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Palette, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface EmptyArtStateProps {
  artistName: string;
}

export function EmptyArtState({ artistName }: EmptyArtStateProps) {
  return (
    <div className="py-16">
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Palette className="w-8 h-8 text-muted-foreground" />
          </div>
          
          <h3 className="text-xl font-semibold mb-2">
            No original art for sale yet
          </h3>
          
          <p className="text-muted-foreground mb-6 max-w-md">
            {artistName} hasn't listed any original art yet. Check back soon or browse other sellers.
          </p>
          
          <Button asChild size="lg" className="gap-2">
            <Link to="/marketplace">
              Browse Marketplace
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
