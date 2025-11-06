-- Create user_comics table for storing user's comic collection
create table public.user_comics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  comicvine_id int not null,
  title text,
  issue_number text,
  volume_name text,
  cover_date date,
  image_url text,
  added_at timestamp with time zone default now(),
  unique(user_id, comicvine_id)
);

-- Enable RLS
alter table public.user_comics enable row level security;

-- Users can manage their own comics
create policy "Users can view their own comics"
  on public.user_comics
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own comics"
  on public.user_comics
  for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own comics"
  on public.user_comics
  for delete
  using (auth.uid() = user_id);