import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CartIconButtonProps {
  className?: string;
}

export function CartIconButton({ className = "" }: CartIconButtonProps) {
  const navigate = useNavigate();
  const { itemCount } = useCart();

  return (
    <Button
      variant="ghost"
      size="icon"
      className={`relative ${className}`}
      onClick={() => navigate("/cart")}
      aria-label={`Cart with ${itemCount} items`}
    >
      <ShoppingCart className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] grid place-items-center font-medium">
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
    </Button>
  );
}
