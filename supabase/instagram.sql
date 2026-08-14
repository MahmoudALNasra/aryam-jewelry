-- Instagram posts cache (refreshed by Edge Function every ~24h, max 9)
create table if not exists public.instagram_posts_cache (
  id bigint generated always as identity primary key,
  handle text not null default 'aryamjewelry0',
  profile_url text not null default 'https://www.instagram.com/aryamjewelry0/',
  posts jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists instagram_posts_cache_updated_idx
  on public.instagram_posts_cache (updated_at desc);

alter table public.instagram_posts_cache enable row level security;

drop policy if exists "Public read instagram posts cache" on public.instagram_posts_cache;
create policy "Public read instagram posts cache"
  on public.instagram_posts_cache for select
  using (true);

-- Writes only via service role / edge function (bypass RLS)
