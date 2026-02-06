
-- 1. Fix mutable search_path on trigger functions
CREATE OR REPLACE FUNCTION public.update_seller_policies_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_campaigns_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_creator_public_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2. Fix scan_vision_usage RLS policy - restrict INSERT to service_role only
DROP POLICY IF EXISTS "Service role can insert vision usage" ON public.scan_vision_usage;

CREATE POLICY "Service role can insert vision usage"
ON public.scan_vision_usage
FOR INSERT
TO service_role
WITH CHECK (true);
