-- Google reviews cache (refreshed by Edge Function every ~24h)
create table if not exists public.google_reviews_cache (
  id bigint generated always as identity primary key,
  place_id text not null,
  rating numeric(2,1),
  user_ratings_total int,
  reviews jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists google_reviews_cache_updated_idx
  on public.google_reviews_cache (updated_at desc);

alter table public.google_reviews_cache enable row level security;

drop policy if exists "Public read google reviews cache" on public.google_reviews_cache;
create policy "Public read google reviews cache"
  on public.google_reviews_cache for select
  using (true);

-- Writes only via service role / edge function (bypass RLS)
