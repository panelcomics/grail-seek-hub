import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

const CART_STORAGE_KEY = "grailseeker_cart";

export interface CartItem {
  listing_id: string;
  seller_id: string;
  added_at: string;
}

interface CartContextType {
  items: CartItem[];
  isLoading: boolean;
  addToCart: (listingId: string, sellerId: string) => Promise<boolean>;
  removeFromCart: (listingId: string) => Promise<void>;
  isInCart: (listingId: string) => boolean;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// LocalStorage helpers
function getLocalCart(): CartItem[] {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setLocalCart(items: CartItem[]) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error("[CART] Failed to save to localStorage:", error);
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load cart on mount and when user changes
  const loadCart = useCallback(async () => {
    setIsLoading(true);
    
    if (user) {
      // Logged in: load from database
      try {
        const { data, error } = await supabase
          .from("cart_items")
          .select("listing_id, seller_id, added_at")
          .eq("user_id", user.id)
          .order("added_at", { ascending: false });

        if (error) {
          console.error("[CART] Error loading cart from DB:", error);
          // Fallback to localStorage
          setItems(getLocalCart());
        } else {
          setItems(data || []);
          // Sync localStorage to DB if there were local items
          const localItems = getLocalCart();
          if (localItems.length > 0) {
            await syncLocalCartToDb(user.id, localItems);
            setLocalCart([]); // Clear local after sync
          }
        }
      } catch (error) {
        console.error("[CART] Exception loading cart:", error);
        setItems(getLocalCart());
      }
    } else {
      // Guest: load from localStorage
      setItems(getLocalCart());
    }
    
    setIsLoading(false);
  }, [user]);

  // Sync local cart items to database when user logs in
  const syncLocalCartToDb = async (userId: string, localItems: CartItem[]) => {
    for (const item of localItems) {
      try {
        await supabase.from("cart_items").upsert(
          {
            user_id: userId,
            listing_id: item.listing_id,
            seller_id: item.seller_id,
            added_at: item.added_at,
          },
          { onConflict: "user_id,listing_id" }
        );
      } catch (error) {
        console.error("[CART] Error syncing item to DB:", error);
      }
    }
  };

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const addToCart = async (listingId: string, sellerId: string): Promise<boolean> => {
    // Check if already in cart
    if (items.some((item) => item.listing_id === listingId)) {
      toast.info("This item is already in your saved items");
      return false;
    }

    const newItem: CartItem = {
      listing_id: listingId,
      seller_id: sellerId,
      added_at: new Date().toISOString(),
    };

    if (user) {
      // Logged in: save to database
      const { error } = await supabase.from("cart_items").insert({
        user_id: user.id,
        listing_id: listingId,
        seller_id: sellerId,
      });

      if (error) {
        console.error("[CART] Error adding to cart:", error);
        toast.error("Failed to add item to cart");
        return false;
      }
    } else {
      // Guest: save to localStorage
      const updatedItems = [...items, newItem];
      setLocalCart(updatedItems);
    }

    setItems((prev) => [...prev, newItem]);
    toast.success("Added to saved items");
    return true;
  };

  const removeFromCart = async (listingId: string) => {
    if (user) {
      // Logged in: remove from database
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", user.id)
        .eq("listing_id", listingId);

      if (error) {
        console.error("[CART] Error removing from cart:", error);
        toast.error("Failed to remove item");
        return;
      }
    } else {
      // Guest: remove from localStorage
      const updatedItems = items.filter((item) => item.listing_id !== listingId);
      setLocalCart(updatedItems);
    }

    setItems((prev) => prev.filter((item) => item.listing_id !== listingId));
    toast.success("Removed from saved items");
  };

  const isInCart = (listingId: string): boolean => {
    return items.some((item) => item.listing_id === listingId);
  };

  const clearCart = async () => {
    if (user) {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", user.id);

      if (error) {
        console.error("[CART] Error clearing cart:", error);
        return;
      }
    }
    
    setLocalCart([]);
    setItems([]);
  };

  const refreshCart = async () => {
    await loadCart();
  };

  return (
    <CartContext.Provider
      value={{
        items,
        isLoading,
        addToCart,
        removeFromCart,
        isInCart,
        clearCart,
        refreshCart,
        itemCount: items.length,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
