import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AddToCartButtonProps {
  listingId: string;
  sellerId: string;
  disabled?: boolean;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showText?: boolean;
}

export function AddToCartButton({
  listingId,
  sellerId,
  disabled = false,
  variant = "outline",
  size = "default",
  className = "",
  showText = true,
}: AddToCartButtonProps) {
  const { addToCart, isInCart, removeFromCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const inCart = isInCart(listingId);

  const handleClick = async () => {
    setIsLoading(true);
    
    try {
      if (inCart) {
        await removeFromCart(listingId);
      } else {
        await addToCart(listingId, sellerId);
      }
    } catch (error) {
      console.error("[CART] Error toggling cart:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Button variant={variant} size={size} className={className} disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        {showText && <span className="ml-2">...</span>}
      </Button>
    );
  }

  if (inCart) {
    return (
      <Button
        variant="secondary"
        size={size}
        className={className}
        onClick={handleClick}
        disabled={disabled}
      >
        <Check className="h-4 w-4" />
        {showText && <span className="ml-2">In Cart</span>}
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
      disabled={disabled}
    >
      <ShoppingCart className="h-4 w-4" />
      {showText && <span className="ml-2">Add to Cart</span>}
    </Button>
  );
}
