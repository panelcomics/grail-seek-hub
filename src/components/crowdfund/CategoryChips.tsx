import { useState } from "react";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = [
  { value: "all", label: "All Projects", icon: "🎯" },
  { value: "Comic Series", label: "Comic Series", icon: "📚" },
  { value: "Graphic Novel", label: "Graphic Novels", icon: "📖" },
  { value: "One-Shot", label: "One-Shots", icon: "⚡" },
  { value: "Artbook", label: "Artbooks", icon: "🎨" },
  { value: "Anthology", label: "Anthologies", icon: "📑" },
  { value: "Manga", label: "Manga", icon: "🗾" },
];

interface CategoryChipsProps {
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
}

export function CategoryChips({ selectedCategory = "all", onCategoryChange }: CategoryChipsProps) {
  const [selected, setSelected] = useState(selectedCategory);

  const handleSelect = (category: string) => {
    setSelected(category);
    onCategoryChange?.(category);
  };

  return (
    <div className="py-8 border-y bg-muted/30">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map((category) => (
            <Badge
              key={category.value}
              variant={selected === category.value ? "default" : "outline"}
              className={`cursor-pointer whitespace-nowrap px-4 py-2 text-sm transition-all hover:scale-105 ${
                selected === category.value
                  ? 'shadow-md'
                  : 'hover:bg-accent'
              }`}
              onClick={() => handleSelect(category.value)}
            >
              <span className="mr-2">{category.icon}</span>
              {category.label}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
