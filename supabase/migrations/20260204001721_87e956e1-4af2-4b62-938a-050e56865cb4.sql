-- Fix app_settings UPDATE policy to include WITH CHECK clause for upserts
DROP POLICY IF EXISTS "Admins can update settings" ON public.app_settings;

CREATE POLICY "Admins can update settings" 
ON public.app_settings 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));