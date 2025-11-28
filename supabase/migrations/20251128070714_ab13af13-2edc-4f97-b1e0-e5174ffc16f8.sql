-- Function to sync inventory price changes to live listings
CREATE OR REPLACE FUNCTION public.sync_inventory_price_to_listings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only sync if listed_price or shipping_price changed
  IF (OLD.listed_price IS DISTINCT FROM NEW.listed_price) OR 
     (OLD.shipping_price IS DISTINCT FROM NEW.shipping_price) THEN
    
    -- Update all active listings linked to this inventory item
    UPDATE public.listings
    SET 
      price = NEW.listed_price,
      price_cents = CASE 
        WHEN NEW.listed_price IS NOT NULL THEN (NEW.listed_price * 100)::INTEGER
        ELSE NULL
      END,
      shipping_price = NEW.shipping_price,
      updated_at = NOW()
    WHERE inventory_item_id = NEW.id
      AND status = 'active';
    
    -- Log the sync for debugging
    IF FOUND THEN
      RAISE NOTICE 'Synced price changes from inventory % to active listings', NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically sync prices on inventory update
DROP TRIGGER IF EXISTS sync_inventory_price_trigger ON public.inventory_items;

CREATE TRIGGER sync_inventory_price_trigger
AFTER UPDATE ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_inventory_price_to_listings();

COMMENT ON FUNCTION public.sync_inventory_price_to_listings() IS 
'Automatically propagates price changes from inventory_items to active listings';

COMMENT ON TRIGGER sync_inventory_price_trigger ON public.inventory_items IS 
'Syncs listed_price and shipping_price changes to linked active listings';