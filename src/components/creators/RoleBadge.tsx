import { Badge } from "@/components/ui/badge";
import { Palette, PenTool } from "lucide-react";

interface RoleBadgeProps {
  isArtist?: boolean;
  isWriter?: boolean;
  variant?: "default" | "secondary" | "outline";
}

export function RoleBadge({ isArtist, isWriter, variant = "default" }: RoleBadgeProps) {
  if (!isArtist && !isWriter) return null;

  return (
    <div className="flex gap-2">
      {isArtist && (
        <Badge variant={variant} className="gap-1">
          <Palette className="w-3 h-3" />
          Artist
        </Badge>
      )}
      {isWriter && (
        <Badge variant={variant} className="gap-1">
          <PenTool className="w-3 h-3" />
          Writer
        </Badge>
      )}
    </div>
  );
}
