import { Share2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toastSuccess } from "@/lib/toastUtils";

interface ShareButtonProps {
  url: string;
  title: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost";
}

export const ShareButton = ({ url, title, size = "default", variant = "outline" }: ShareButtonProps) => {
  const handleShare = async () => {
    const fullUrl = `${window.location.origin}${url}`;
    
    // Try native share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          url: fullUrl,
        });
        return;
      } catch (err) {
        // User cancelled or share failed, fall back to clipboard
      }
    }
    
    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(fullUrl);
      toastSuccess.linkCopied();
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Button variant={variant} size={size} onClick={handleShare}>
      <Share2 className="h-4 w-4 mr-2" />
      Share
    </Button>
  );
};
