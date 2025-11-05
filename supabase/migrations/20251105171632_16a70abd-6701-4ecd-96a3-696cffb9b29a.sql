-- Add about_artist field to artist_applications table
ALTER TABLE artist_applications
ADD COLUMN about_artist TEXT;