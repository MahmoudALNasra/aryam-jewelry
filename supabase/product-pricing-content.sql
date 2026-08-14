-- Pricing modes + rich product story content (run in Supabase SQL Editor)

alter table public.products
  add column if not exists price_mode text not null default 'formula'
    check (price_mode in ('formula', 'fixed'));

alter table public.products
  add column if not exists fixed_price numeric(12,2);

alter table public.products
  add column if not exists rich_content text;

alter table public.products
  add column if not exists rich_content_ar text;

-- Formula products keep using weight × $/g + making.
-- Fixed products use fixed_price as the customer total.
update public.products
set price_mode = 'formula'
where price_mode is null or price_mode = '';
