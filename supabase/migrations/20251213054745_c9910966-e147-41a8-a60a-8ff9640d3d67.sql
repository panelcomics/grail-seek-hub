-- Add unique constraint on user_id for creator_roles table to fix upsert failures
ALTER TABLE public.creator_roles ADD CONSTRAINT creator_roles_user_id_unique UNIQUE (user_id);