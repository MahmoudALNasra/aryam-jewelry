-- Admin product save fix (run in Supabase SQL Editor)
-- The browser admin uses the public anon key (password gate is UI-only),
-- so inserts/updates were blocked by RLS → "new row violates row-level security".

-- Allow the storefront + admin to read products.
-- Shop JS still filters to published=true for customers.
drop policy if exists "Public read published products" on public.products;
drop policy if exists "Anon read all products" on public.products;
create policy "Anon read all products"
  on public.products for select
  to anon, authenticated
  using (true);

-- Allow admin (anon key) to insert / update / delete catalog rows
drop policy if exists "Admin full products" on public.products;
drop policy if exists "Anon manage products" on public.products;
create policy "Anon manage products"
  on public.products for all
  to anon, authenticated
  using (true)
  with check (true);

-- Empty SKU should be NULL (unique constraint treats '' as a duplicate)
-- No schema change required; app now sends null for blank SKU.
