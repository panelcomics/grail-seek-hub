-- Create listings table for selling comics
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  comic_id uuid references public.user_comics(id) on delete cascade not null,
  type text not null check (type in ('fixed', 'auction')),
  price numeric,
  start_bid numeric,
  reserve numeric,
  duration_days integer,
  status text not null default 'active' check (status in ('active', 'sold', 'ended', 'cancelled')),
  image_url text,
  title text not null,
  issue_number text,
  volume_name text,
  cover_date text,
  condition_notes text,
  shipping_price numeric default 5.00,
  private_notes text,
  created_at timestamp with time zone default now(),
  ends_at timestamp with time zone,
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.listings enable row level security;

-- RLS Policies for listings
create policy "Anyone can view active listings"
  on public.listings for select
  using (status = 'active');

create policy "Users can view their own listings"
  on public.listings for select
  using (auth.uid() = user_id);

create policy "Users can create their own listings"
  on public.listings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own listings"
  on public.listings for update
  using (auth.uid() = user_id);

create policy "Users can delete their own listings"
  on public.listings for delete
  using (auth.uid() = user_id);

-- Create bids table for auctions
create table public.bids (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  bid_amount numeric not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.bids enable row level security;

-- RLS Policies for bids
create policy "Anyone can view bids on active listings"
  on public.bids for select
  using (exists (
    select 1 from public.listings
    where id = listing_id and status = 'active'
  ));

create policy "Authenticated users can place bids"
  on public.bids for insert
  with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.listings
      where id = listing_id 
        and status = 'active'
        and type = 'auction'
        and user_id != auth.uid()
    )
  );

-- Create trigger for updated_at
create trigger update_listings_updated_at
  before update on public.listings
  for each row
  execute function public.update_updated_at_column();

-- Create index for faster queries
create index idx_listings_user_id on public.listings(user_id);
create index idx_listings_status on public.listings(status);
create index idx_bids_listing_id on public.bids(listing_id);
create index idx_bids_user_id on public.bids(user_id);