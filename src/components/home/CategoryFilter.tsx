import { Zap, Shield, Palette, MapPin, Sparkles, Image } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CategoryFilterProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export function CategoryFilter({ activeCategory, onCategoryChange }: CategoryFilterProps) {
  const categories = [
    { id: "marvel", label: "Marvel", icon: Zap },
    { id: "dc", label: "DC", icon: Shield },
    { id: "horror", label: "Horror", icon: Sparkles },
    { id: "variants", label: "Variants", icon: Palette },
    { id: "slabs", label: "Slabs", icon: Shield },
    { id: "original-art", label: "Original Art", icon: Image },
    { id: "local", label: "Local Deals", icon: MapPin },
  ];

  return (
    <section className="py-6 px-4 bg-muted/30 border-y-2 border-border sticky top-0 z-40">
      <div className="container mx-auto">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Button
                key={category.id}
                variant={activeCategory === category.id ? "default" : "outline"}
                className="whitespace-nowrap flex-shrink-0 font-bold"
                onClick={() => onCategoryChange(category.id)}
              >
                <Icon className="h-4 w-4 mr-2" />
                {category.label}
              </Button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
