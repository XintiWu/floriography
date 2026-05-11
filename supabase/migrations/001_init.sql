-- Floriography schema (Supabase / Postgres)
-- Apply in Supabase SQL Editor or via supabase CLI migrations.

create extension if not exists "pgcrypto";

-- ---------- enums ----------
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

-- ---------- tables ----------
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.flowers (
  id text primary key,
  name text not null unique,
  meanings text[] not null default '{}'::text[],
  story text,
  related_tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

-- ---------- indexes ----------
create index if not exists cards_created_at_idx on public.cards (created_at desc);
create index if not exists order_requests_created_at_idx on public.order_requests (created_at desc);
create index if not exists flowers_name_idx on public.flowers (name);

-- ---------- updated_at triggers ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cards_set_updated_at on public.cards;
create trigger cards_set_updated_at
before update on public.cards
for each row execute procedure public.set_updated_at();

drop trigger if exists flowers_set_updated_at on public.flowers;
create trigger flowers_set_updated_at
before update on public.flowers
for each row execute procedure public.set_updated_at();

-- ---------- RLS ----------
alter table public.cards enable row level security;
alter table public.flowers enable row level security;
alter table public.order_requests enable row level security;

-- Public read for catalog content
drop policy if exists "cards_public_read" on public.cards;
create policy "cards_public_read"
on public.cards
for select
to anon, authenticated
using (true);

drop policy if exists "flowers_public_read" on public.flowers;
create policy "flowers_public_read"
on public.flowers
for select
to anon, authenticated
using (true);

-- Allow anyone to submit an order request (lead form)
drop policy if exists "order_requests_public_insert" on public.order_requests;
create policy "order_requests_public_insert"
on public.order_requests
for insert
to anon, authenticated
with check (true);

-- Admin usage (authenticated users only)
drop policy if exists "order_requests_admin_read" on public.order_requests;
create policy "order_requests_admin_read"
on public.order_requests
for select
to authenticated
using (true);

drop policy if exists "order_requests_admin_update" on public.order_requests;
create policy "order_requests_admin_update"
on public.order_requests
for update
to authenticated
using (true)
with check (true);

