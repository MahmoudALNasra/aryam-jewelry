-- Multi-image support for products (run in Supabase SQL Editor)
-- Keeps image_url as the cover/primary photo for older clients & GMC.

alter table public.products
  add column if not exists image_urls jsonb not null default '[]'::jsonb;

-- Backfill: if a product has image_url but empty image_urls, seed the array
update public.products
set image_urls = jsonb_build_array(image_url)
where coalesce(image_url, '') <> ''
  and (image_urls is null or image_urls = '[]'::jsonb);
