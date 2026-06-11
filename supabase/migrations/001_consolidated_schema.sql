-- Consolidated schema for Floriography (Supabase / Postgres)
-- Includes tables from both original Supabase migrations and OCI schema migrations.

create extension if not exists "pgcrypto";

-- ---------- ENUMS ----------
do $$ begin
  create type public.card_status as enum ('available', 'sold', 'custom_only');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.order_request_status as enum (
    'new',
    'contacted',
    'scheduled',
    'completed',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

-- ---------- TABLES ----------

-- 1. Users Table (Synced from Auth)
create table if not exists public.users (
    id text primary key,
    email text not null unique,
    full_name text,
    avatar_url text,
    role text not null default 'user',
    created_at timestamptz default current_timestamp,
    updated_at timestamptz default current_timestamp
);

-- 2. Assets Table (Inventory & Flowers)
create table if not exists public.assets (
    id text primary key,
    name text not null,
    type text not null default 'flower', -- 'flower' or 'card'
    url text,
    price numeric not null default 0,
    category text,
    tags text[],
    metadata jsonb,
    stock_quantity integer not null default 0,
    min_stock_level integer not null default 5,
    is_active boolean not null default true,
    created_at timestamptz default current_timestamp,
    updated_at timestamptz default current_timestamp
);

-- 3. Cards Table
create table if not exists public.cards (
  id text primary key,
  title text not null,
  price_twd integer not null check (price_twd >= 0),
  status public.card_status not null default 'available',
  images text[] not null default '{}'::text[],
  size text,
  materials text[] not null default '{}'::text[],
  lead_time_days integer,
  blurb text,
  tags_occasions text[] not null default '{}'::text[],
  tags_colors text[] not null default '{}'::text[],
  tags_flowers text[] not null default '{}'::text[],
  tags_moods text[] not null default '{}'::text[],
  semantic_embedding jsonb,
  visual_embedding jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Flowers Table
create table if not exists public.flowers (
  id text primary key,
  name text not null unique,
  meanings text[] not null default '{}'::text[],
  story text,
  related_tags text[] not null default '{}'::text[],
  semantic_embedding jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Designs Table (Workshop Studio / Portfolio)
create table if not exists public.designs (
    id text primary key,
    name text not null,
    description text,
    preview_url text,
    total_price numeric not null default 0,
    created_at timestamptz default current_timestamp,
    updated_at timestamptz default current_timestamp,
    user_id text references public.users(id) on delete set null
);

-- 6. Orders Table
create table if not exists public.orders (
    id text primary key,
    customer_name text not null,
    customer_phone text,
    shipping_address text,
    notes text,
    total_price numeric not null default 0,
    status text not null default 'pending',
    created_at timestamptz default current_timestamp,
    updated_at timestamptz default current_timestamp,
    user_id text references public.users(id) on delete set null
);

-- 7. Order Requests Table (Booking Forms)
create table if not exists public.order_requests (
  id text primary key,
  created_at timestamptz not null default now(),
  status public.order_request_status not null default 'new',
  card_id text references public.cards(id) on delete set null,
  customer_name text not null,
  contact text not null,
  preferred_pickup text not null,
  time_window text not null,
  budget_twd integer check (budget_twd >= 0),
  purpose text,
  notes text,
  custom_request text
);

-- 8. Inventory Logs Table
create table if not exists public.inventory_logs (
    id serial primary key,
    asset_id text references public.assets(id) on delete cascade,
    change_amount integer not null,
    reason text,
    created_at timestamptz default current_timestamp
);

-- 9. Shared Cards Table (Gallery)
create table if not exists public.shared_cards (
    id text primary key,
    image_data text not null,
    message text,
    flower_names text[],
    flower_meanings text[],
    author_name text default '匿名花友',
    view_count integer not null default 0,
    card_title text,
    personal_note text,
    is_public boolean not null default true,
    like_count integer not null default 0,
    comments jsonb default '[]'::jsonb,
    created_at timestamptz default current_timestamp
);

-- 10. User Favorites Table (Designs)
create table if not exists public.user_favorites (
    user_id text references public.users(id) on delete cascade,
    design_id text references public.designs(id) on delete cascade,
    primary key (user_id, design_id)
);

-- 11. User Favorite Flowers Table (Assets)
create table if not exists public.user_favorite_flowers (
    user_id text references public.users(id) on delete cascade,
    flower_id text references public.assets(id) on delete cascade,
    created_at timestamptz default current_timestamp,
    primary key (user_id, flower_id)
);

-- ---------- INDEXES ----------
create index if not exists cards_created_at_idx on public.cards (created_at desc);
create index if not exists order_requests_created_at_idx on public.order_requests (created_at desc);
create index if not exists flowers_name_idx on public.flowers (name);
create index if not exists idx_shared_cards_created_at on public.shared_cards (created_at desc);

-- ---------- TRIGGERS & FUNCTIONS ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply triggers
drop trigger if exists cards_set_updated_at on public.cards;
create trigger cards_set_updated_at before update on public.cards for each row execute procedure public.set_updated_at();

drop trigger if exists flowers_set_updated_at on public.flowers;
create trigger flowers_set_updated_at before update on public.flowers for each row execute procedure public.set_updated_at();

drop trigger if exists tr_users_updated_at on public.users;
create trigger tr_users_updated_at before update on public.users for each row execute procedure public.set_updated_at();

drop trigger if exists tr_assets_updated_at on public.assets;
create trigger tr_assets_updated_at before update on public.assets for each row execute procedure public.set_updated_at();

drop trigger if exists tr_orders_updated_at on public.orders;
create trigger tr_orders_updated_at before update on public.orders for each row execute procedure public.set_updated_at();

drop trigger if exists tr_designs_updated_at on public.designs;
create trigger tr_designs_updated_at before update on public.designs for each row execute procedure public.set_updated_at();

-- ---------- RLS & POLICIES ----------
alter table public.cards enable row level security;
alter table public.flowers enable row level security;
alter table public.order_requests enable row level security;
alter table public.users enable row level security;
alter table public.assets enable row level security;
alter table public.designs enable row level security;
alter table public.orders enable row level security;
alter table public.shared_cards enable row level security;
alter table public.user_favorites enable row level security;
alter table public.user_favorite_flowers enable row level security;

-- Public read policies
create policy "cards_public_read" on public.cards for select to anon, authenticated using (true);
create policy "flowers_public_read" on public.flowers for select to anon, authenticated using (true);
create policy "assets_public_read" on public.assets for select to anon, authenticated using (true);
create policy "designs_public_read" on public.designs for select to anon, authenticated using (true);
create policy "shared_cards_public_read" on public.shared_cards for select to anon, authenticated using (true);

-- Insert policies
create policy "order_requests_public_insert" on public.order_requests for insert to anon, authenticated with check (true);
create policy "shared_cards_public_insert" on public.shared_cards for insert to anon, authenticated with check (true);

-- Admin/User policies for order_requests
create policy "order_requests_admin_read" on public.order_requests for select to authenticated using (true);
create policy "order_requests_admin_update" on public.order_requests for update to authenticated using (true) with check (true);

-- User profile read/write
create policy "users_read_own" on public.users for select to authenticated using (auth.uid()::text = id);
create policy "users_update_own" on public.users for update to authenticated using (auth.uid()::text = id) with check (auth.uid()::text = id);
