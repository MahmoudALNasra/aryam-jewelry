-- Run in Supabase SQL Editor after creating a public Storage bucket named "product-images"
-- Dashboard → Storage → New bucket → name: product-images → Public bucket: ON

-- Allow public read
drop policy if exists "Public read product images" on storage.objects;
create policy "Public read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- Allow anon/authenticated uploads into product-images (tighten later with auth)
drop policy if exists "Anyone upload product images" on storage.objects;
create policy "Anyone upload product images"
  on storage.objects for insert
  with check (bucket_id = 'product-images');

drop policy if exists "Anyone update product images" on storage.objects;
create policy "Anyone update product images"
  on storage.objects for update
  using (bucket_id = 'product-images');
