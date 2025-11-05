-- Create function to handle price drop notifications on claim sales
CREATE OR REPLACE FUNCTION public.notify_claim_sale_price_drop()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  fav_record RECORD;
  item_record RECORD;
  listing_url TEXT;
  notification_exists BOOLEAN;
BEGIN
  -- Only proceed if price decreased
  IF NEW.price >= OLD.price OR NEW.price IS NULL OR OLD.price IS NULL THEN
    RETURN NEW;
  END IF;

  -- Loop through all items in this claim sale
  FOR item_record IN 
    SELECT id, title FROM claim_sale_items WHERE claim_sale_id = NEW.id
  LOOP
    listing_url := '/item/' || item_record.id;

    -- Find users who favorited any item from this claim sale
    FOR fav_record IN 
      SELECT DISTINCT f.user_id, p.notify_via_email
      FROM favorites f
      INNER JOIN profiles p ON p.user_id = f.user_id
      WHERE f.listing_id = item_record.id
    LOOP
      -- Check if notification was already sent in last 24 hours
      SELECT EXISTS (
        SELECT 1 
        FROM notification_sent 
        WHERE user_id = fav_record.user_id 
          AND reference_id = NEW.id 
          AND notification_type = 'price_drop'
          AND created_at > NOW() - INTERVAL '24 hours'
      ) INTO notification_exists;

      -- Skip if already notified recently
      IF notification_exists THEN
        CONTINUE;
      END IF;

      -- Create in-app notification
      INSERT INTO notifications (user_id, type, message, link)
      VALUES (
        fav_record.user_id,
        'price_drop',
        'Price dropped on a favorite: ' || item_record.title || ' is now $' || NEW.price || '.',
        listing_url
      );

      -- Track notification sent
      INSERT INTO notification_sent (user_id, reference_id, notification_type)
      VALUES (fav_record.user_id, NEW.id, 'price_drop');

      -- Send email if user has email notifications enabled and RESEND is configured
      IF fav_record.notify_via_email THEN
        PERFORM pg_notify(
          'price_drop_email',
          json_build_object(
            'userId', fav_record.user_id,
            'title', item_record.title,
            'price', NEW.price,
            'link', listing_url
          )::text
        );
      END IF;
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger on claim_sales for price changes
DROP TRIGGER IF EXISTS trigger_claim_sale_price_drop ON claim_sales;
CREATE TRIGGER trigger_claim_sale_price_drop
  AFTER UPDATE OF price ON claim_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_claim_sale_price_drop();