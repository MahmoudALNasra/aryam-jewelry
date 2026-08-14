"""Upsert seed products into Supabase (service role)."""
import json
import os
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_env():
    env = {}
    path = ROOT / ".env"
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def main():
    env = load_env()
    base = env["SUPABASE_URL"].rstrip("/")
    key = env["SUPABASE_SERVICE_ROLE_KEY"]
    site = env.get("SITE_URL", "https://aryam.us").rstrip("/")

    seed = json.loads((ROOT / "data" / "products.seed.json").read_text(encoding="utf-8"))
    rows = []
    for p in seed:
        img = p.get("image_url") or ""
        if img.startswith("../"):
            img = site + "/" + img.replace("../", "")
        elif img and not img.startswith("http"):
            img = site + "/" + img.lstrip("/")
        rows.append({
            "slug": p["slug"],
            "sku": p.get("sku"),
            "title": p["title"],
            "title_ar": p.get("title_ar"),
            "description": p.get("description"),
            "description_ar": p.get("description_ar"),
            "seo_title": p.get("seo_title"),
            "seo_description": p.get("seo_description"),
            "category": p.get("category") or "other",
            "karat": int(p["karat"]),
            "weight_grams": float(p["weight_grams"]),
            "sell_price_per_gram": float(p["sell_price_per_gram"]),
            "making_charge": float(p.get("making_charge") or 0),
            "stock_qty": int(p.get("stock_qty") or 0),
            "image_url": img,
            "published": bool(p.get("published", True)),
        })

    url = f"{base}/rest/v1/products?on_conflict=slug"
    body = json.dumps(rows).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=representation",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            data = json.loads(r.read().decode("utf-8"))
            print(f"Upserted {len(data)} products:")
            for row in data:
                print(f"  - {row.get('sku')}  {row.get('title')}  ({row.get('weight_grams')}g)")
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", "ignore")
        print(f"HTTP {e.code}: {err}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
