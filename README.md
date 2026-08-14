# Aryam's Jewelry مجوهرات أريام

Static landing + online shop + admin. Portable to its own domain later.

## Folders

| Path | What |
| --- | --- |
| `index.html` | Marketing landing (SEO, gold prices, visit) |
| `shop/` | Storefront, product detail (zoom), cart, Stripe-ready checkout |
| `admin/` | Product CRUD, sell $/g pricing, stock, Merchant Center CSV |
| `data/products.seed.json` | Demo catalog (swap when client photos arrive) |
| `images/products/` | Drop real piece photos here |
| `supabase/schema.sql` | Database + RLS |
| `supabase/functions/create-checkout/` | Stripe Checkout Edge Function |
| `env.example` | Keys checklist |
| `PROPOSAL.md` | Client maintenance / media proposition (edit your name in) |
| `js/shop/config.js` | Public config (Supabase URL, anon key, Stripe pk) |

## Deploy on Vercel (via GitHub)

1. Push this repo to GitHub (already set up if you followed the agent push).
2. Go to [vercel.com/new](https://vercel.com/new) → **Import** this repository.
3. Framework Preset: **Other** (static HTML). Leave build/output blank.
4. Deploy. You’ll get a URL like `https://aryam-jewelry.vercel.app`.
5. Optional: add a custom domain in Vercel → Project → Settings → Domains.

  After the first deploy, every push to `main` auto-redeploys.

  Custom domain: add **aryam.us** in Vercel → Domains. `siteUrl` in `js/shop/config.js` is already set to `https://aryam.us`.

## Local preview

```powershell
python -m http.server 8317
```

- Landing: http://localhost:8317/
- Shop: http://localhost:8317/shop/
- Admin: http://localhost:8317/admin/ (demo password in `env.example` / `config.js`)

## Pricing model

`display_price = weight_grams × sell_price_per_gram + making_charge`

Admin shows live market $/g (from gold-api.com) and can set sell $/g to market or market + markup %.

## Client photos (Google Drive)

Imported from the shared folder into `images/products/` (10 pieces with grams/karat from the labels).
Re-run anytime:

```powershell
python scripts\fetch_drive.py
python scripts\prepare_products.py
```

Then open Admin → **Reset to seed data** (or hard-refresh) so the browser picks up the new catalog.
Instagram on the photos: [@aryamjewelry0](https://www.instagram.com/aryamjewelry0/).

## Live Google reviews

1. Run [`supabase/reviews.sql`](supabase/reviews.sql) in the SQL editor.
2. Enable **Places API** in Google Cloud and create an API key.
3. Set Edge Function secrets:
   - `GOOGLE_MAPS_API_KEY`
   - `GOOGLE_PLACE_ID=ChIJvZYXdLTDQIYRthuVnPvmRzI`
4. Deploy: `supabase functions deploy refresh-google-reviews`
5. Call the function once (or schedule daily). The homepage caches reviews for **24 hours** (localStorage + Supabase), including reviewer profile photos from Google.

Until the API key is set, the page shows the seed reviews with avatar placeholders.


1. In Supabase → **Storage** → create a public bucket named `product-images`.
2. Run [`supabase/storage.sql`](supabase/storage.sql) in the SQL editor.
3. On your phone open `/admin/` → **Add piece** → **Camera / gallery**.

Photos are compressed in the browser, then uploaded to Storage. If Storage isn’t set up yet, a local preview is still saved so you can keep working.


1. Create a Supabase project → run `supabase/schema.sql`.  
2. Create public Storage bucket `product-images` if uploading there.  
3. Put `SUPABASE_URL` + `SUPABASE_ANON_KEY` in `js/shop/config.js`.  
4. Deploy `create-checkout` function; set secret `STRIPE_SECRET_KEY`.  
5. Add `STRIPE_PUBLISHABLE_KEY` to config.  
6. Until then, checkout runs in **demo mode** (no card charge; stock still decrements locally).

## Deploy on aryam.us (Vercel)

1. Import the GitHub repo into Vercel and deploy.
2. In Vercel → Project → **Settings → Domains**, add `aryam.us` and `www.aryam.us`.
3. At your domain registrar, point DNS as Vercel instructs (usually A/`www` CNAME).
4. After DNS propagates, the site serves at https://aryam.us

Add to `robots.txt` (or Vercel project):

```
Sitemap: https://aryam.us/sitemap.xml
```

## Google Merchant Center

In Admin → **Export Merchant Center CSV**. Import into GMC / use as feed. Requires absolute `siteUrl` in config for image/product links.
