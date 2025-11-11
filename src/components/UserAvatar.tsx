import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

interface UserAvatarProps {
  imageUrl?: string | null;
  username?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function UserAvatar({ imageUrl, username, size = "md", className }: UserAvatarProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const fallbackText = username
    ? username.substring(0, 2).toUpperCase()
    : "U";

  return (
    <Avatar className={`${sizeClasses[size]} ${className || ""}`}>
      <AvatarImage src={imageUrl || undefined} alt={username || "User"} />
      <AvatarFallback className="bg-primary/10 text-primary">
        {imageUrl ? null : username ? (
          <span className="font-semibold">{fallbackText}</span>
        ) : (
          <User className={iconSizes[size]} />
        )}
      </AvatarFallback>
    </Avatar>
  );
}
