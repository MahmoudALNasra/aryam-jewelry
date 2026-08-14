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

Update `js/shop/config.js` `siteUrl` (and canonical URLs in HTML/sitemap if you want) to your Vercel or custom domain once you know it.

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

## Going live with Supabase + Stripe

1. Create a Supabase project → run `supabase/schema.sql`.  
2. Create public Storage bucket `product-images` if uploading there.  
3. Put `SUPABASE_URL` + `SUPABASE_ANON_KEY` in `js/shop/config.js`.  
4. Deploy `create-checkout` function; set secret `STRIPE_SECRET_KEY`.  
5. Add `STRIPE_PUBLISHABLE_KEY` to config.  
6. Until then, checkout runs in **demo mode** (no card charge; stock still decrements locally).

## Deploy under techrevenuebrief.com/aryam

Copy this folder to `/aryam/`. Paths are relative. If the path changes, find-replace `techrevenuebrief.com/aryam` in `index.html`, `shop/index.html`, `sitemap.xml`, and `config.js` `siteUrl`.

Add to robots.txt:

```
Sitemap: https://techrevenuebrief.com/aryam/sitemap.xml
```

## Google Merchant Center

In Admin → **Export Merchant Center CSV**. Import into GMC / use as feed. Requires absolute `siteUrl` in config for image/product links.
