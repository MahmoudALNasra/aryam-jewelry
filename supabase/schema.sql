-- Aryam's Jewelry — Supabase schema
-- Run in Supabase SQL Editor. Then create a Storage bucket named "product-images" (public).

create extension if not exists "pgcrypto";

-- Products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  sku text unique,
  title text not null,
  title_ar text,
  description text,
  description_ar text,
  seo_title text,
  seo_description text,
  category text not null default 'other'
    check (category in ('bridal','bangles','necklaces','rings','coins','earrings','other')),
  karat int not null check (karat in (18, 21, 22, 24)),
  weight_grams numeric(10,3) not null check (weight_grams > 0),
  sell_price_per_gram numeric(12,4) not null check (sell_price_per_gram >= 0),
  making_charge numeric(12,2) not null default 0,
  stock_qty int not null default 0 check (stock_qty >= 0),
  image_path text,
  image_url text,
  image_urls jsonb not null default '[]'::jsonb,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_published_idx on public.products (published);
create index if not exists products_category_idx on public.products (category);
create index if not exists products_karat_idx on public.products (karat);

-- Orders (demo + Stripe)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending'
    check (status in ('pending','paid','cancelled','demo')),
  customer_name text,
  customer_email text,
  customer_phone text,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null default 0,
  currency text not null default 'USD',
  stripe_session_id text,
  notes text,
  created_at timestamptz not null default now()
);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- RLS
alter table public.products enable row level security;
alter table public.orders enable row level security;

-- Public can read published products
drop policy if exists "Public read published products" on public.products;
create policy "Public read published products"
  on public.products for select
  using (published = true);

-- Authenticated admins full access to products
drop policy if exists "Admin full products" on public.products;
create policy "Admin full products"
  on public.products for all
  to authenticated
  using (true)
  with check (true);

-- Anyone can insert orders (checkout); only authenticated can read/update
drop policy if exists "Anyone insert orders" on public.orders;
create policy "Anyone insert orders"
  on public.orders for insert
  with check (true);

drop policy if exists "Admin read orders" on public.orders;
create policy "Admin read orders"
  on public.orders for select
  to authenticated
  using (true);

drop policy if exists "Admin update orders" on public.orders;
create policy "Admin update orders"
  on public.orders for update
  to authenticated
  using (true);

-- Optional: decrement stock RPC (call after paid / demo order)
create or replace function public.decrement_stock(p_id uuid, p_qty int)
returns void
language plpgsql
security definer
as $$
begin
  update public.products
  set stock_qty = greatest(stock_qty - p_qty, 0)
  where id = p_id;
end;
$$;
