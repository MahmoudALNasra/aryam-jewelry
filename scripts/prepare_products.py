"""Rename Drive photos to slug files, light-compress, write products.seed.json."""
import json
import shutil
from pathlib import Path

try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "images" / "products"
SEED = ROOT / "data" / "products.seed.json"

# Source filename -> product definition
PRODUCTS = [
    {
        "src": "1A4F36C9-0D32-44FF-A11A-3B56A4DB98C7.jpeg",
        "file": "beaded-cuff-bangles-pair.jpg",
        "id": "ary-bng-001",
        "slug": "beaded-cuff-bangles-pair",
        "sku": "ARY-BNG-001",
        "title": "Beaded Cuff Bangles (Pair)",
        "title_ar": "غوايش كف مع خرز (زوج)",
        "description": "Matching open-cuff yellow gold bangles with a frosted outer band and a center row of polished beads. Pair weights 28.3g + 28.9g as shown on the photo.",
        "description_ar": "زوج غوايش ذهب صفراء مفتوحة مع صف خرز في الوسط.",
        "seo_title": "Beaded Gold Cuff Bangles Pair | Aryam's Jewelry Houston",
        "seo_description": "Pair of beaded cuff bangles, 57.2g total. Shop Arabic gold at Aryam's Jewelry Houston.",
        "category": "bangles",
        "karat": 21,
        "weight_grams": 57.2,
        "sell_price_per_gram": 128.0,
        "making_charge": 120,
        "stock_qty": 1,
    },
    {
        "src": "3db645c0-0b64-4e04-90bd-7f661ff00c41.jpeg",
        "file": "18k-triple-strand-bracelet.jpg",
        "id": "ary-brc-001",
        "slug": "18k-triple-strand-bracelet",
        "sku": "ARY-BRC-001",
        "title": "18K Triple-Strand Bead Bracelet",
        "title_ar": "سوار ثلاثي عيار ١٨",
        "description": "18K gold bracelet with three textured strands and three accent beads — two diamond-cut, one frosted. Lightweight everyday piece.",
        "description_ar": "سوار ذهب عيار ١٨ بثلاثة خيوط وخرز مزخرف.",
        "seo_title": "18K Triple Strand Gold Bracelet 14.9g | Aryam's Jewelry",
        "seo_description": "18K gold triple-strand bracelet, 14.9g. Aryam's Jewelry Houston.",
        "category": "bangles",
        "karat": 18,
        "weight_grams": 14.9,
        "sell_price_per_gram": 112.0,
        "making_charge": 55,
        "stock_qty": 1,
    },
    {
        "src": "5ED02579-EFEF-46B4-AC12-04CAB18D845B.jpeg",
        "file": "textured-bangle-ring-set.jpg",
        "id": "ary-set-001",
        "slug": "textured-bangle-ring-set",
        "sku": "ARY-SET-001",
        "title": "Textured Bangle & Ring Set",
        "title_ar": "طقم سوار وخاتم مزخرف",
        "description": "Matching torque-style bangle and ring with scale texture and pavé stone end caps. Sold as a set — 35g as labeled. @aryamjewelry0",
        "description_ar": "طقم سوار وخاتم بتصميم مزخرف وأحجار — ٣٥ جرام.",
        "seo_title": "Gold Bangle and Ring Set 35g | Aryam's Jewelry Houston",
        "seo_description": "Textured gold bangle and ring set, 35g. Aryam's Jewelry Houston · @aryamjewelry0",
        "category": "bridal",
        "karat": 21,
        "weight_grams": 35.0,
        "sell_price_per_gram": 129.0,
        "making_charge": 150,
        "stock_qty": 1,
    },
    {
        "src": "7FD1BFAD-D6DE-404F-A470-0A4423CF9147.jpeg",
        "file": "woven-x-stone-bangles.jpg",
        "id": "ary-bng-002",
        "slug": "woven-x-stone-bangles",
        "sku": "ARY-BNG-002",
        "title": "Woven X-Stone Bangles (Pair)",
        "title_ar": "غوايش مضفرة مع أحجار (زوج)",
        "description": "Pair of hinged woven yellow gold bangles with pavé crystal X motifs. 33.1g as labeled. @aryamjewelry0",
        "description_ar": "زوج غوايش ذهب مضفرة مع علامة X مرصعة — ٣٣٫١ جرام.",
        "seo_title": "Woven Gold Bangles with X Stones 33.1g | Aryam's Jewelry",
        "seo_description": "Woven gold bangle pair with crystal X detail, 33.1g. Houston · @aryamjewelry0",
        "category": "bangles",
        "karat": 21,
        "weight_grams": 33.1,
        "sell_price_per_gram": 130.0,
        "making_charge": 140,
        "stock_qty": 1,
    },
    {
        "src": "09C982EA-621C-4EE3-B600-E82005EF8449.jpeg",
        "file": "21k-hind-gem-cuffs.jpg",
        "id": "ary-bng-003",
        "slug": "21k-hind-gem-cuffs",
        "sku": "ARY-BNG-003",
        "title": "21K HIND Gemstone Cuffs (3)",
        "title_ar": "غوايش عيار ٢١ بحجر (ثلاث)",
        "description": "Set of three 21K open cuffs with twisted bands and square gem heads (green, blue, magenta) halo-set with clear stones. Engraved HIND. 53.2g.",
        "description_ar": "ثلاث غوايش عيار ٢١ بحجارة ملونة ونقش HIND — ٥٣٫٢ جرام.",
        "seo_title": "21K Gemstone Gold Cuffs 53.2g | Aryam's Jewelry Houston",
        "seo_description": "21K gold gemstone cuff set, 53.2g. Aryam's Jewelry Houston.",
        "category": "bangles",
        "karat": 21,
        "weight_grams": 53.2,
        "sell_price_per_gram": 132.0,
        "making_charge": 200,
        "stock_qty": 1,
    },
    {
        "src": "34EFEB53-2245-42C3-AD07-A1603A7ACFF9.jpeg",
        "file": "triple-bead-wrap-bracelet.jpg",
        "id": "ary-brc-002",
        "slug": "triple-bead-wrap-bracelet",
        "sku": "ARY-BRC-002",
        "title": "Triple Bead Wrap Bracelet",
        "title_ar": "سوار لفات بثلاث صفوف خرز",
        "description": "Open wrap bracelet with three rows of diamond-cut gold beads and engraved end bars. 22g as labeled.",
        "description_ar": "سوار ذهب بثلاث صفوف خرز لامع — ٢٢ جرام.",
        "seo_title": "Triple Bead Gold Wrap Bracelet 22g | Aryam's Jewelry",
        "seo_description": "Triple-row bead wrap bracelet, 22g. Aryam's Jewelry Houston.",
        "category": "bangles",
        "karat": 21,
        "weight_grams": 22.0,
        "sell_price_per_gram": 127.0,
        "making_charge": 75,
        "stock_qty": 1,
    },
    {
        "src": "884CC7D8-B52E-4C05-88E0-D1560AD57DF8.jpeg",
        "file": "rope-x-cuff-bangles.jpg",
        "id": "ary-bng-004",
        "slug": "rope-x-cuff-bangles",
        "sku": "ARY-BNG-004",
        "title": "Rope Cable X-Cuffs (Pair)",
        "title_ar": "غوايش حبل مع X (زوج)",
        "description": "Pair of twisted rope open cuffs with a pavé crystal X motif at center. 29.3g. @aryamjewelry0",
        "description_ar": "زوج غوايش حبل ذهب مع علامة X مرصعة — ٢٩٫٣ جرام.",
        "seo_title": "Rope Gold Cuff Bangles 29.3g | Aryam's Jewelry Houston",
        "seo_description": "Twisted rope gold cuff pair with X stones, 29.3g. @aryamjewelry0",
        "category": "bangles",
        "karat": 21,
        "weight_grams": 29.3,
        "sell_price_per_gram": 128.0,
        "making_charge": 110,
        "stock_qty": 1,
    },
    {
        "src": "14276643-c1df-420e-bfb3-2d5a307b1497.jpeg",
        "file": "18k-rose-white-rope-bracelets.jpg",
        "id": "ary-brc-003",
        "slug": "18k-rose-white-rope-bracelets",
        "sku": "ARY-BRC-003",
        "title": "18K Rose & White Rope Bracelets",
        "title_ar": "سواران حبل عيار ١٨ وردي وأبيض",
        "description": "Pair of 18K twisted cable bracelets — one rose gold, one white — with pavé accents at the clasp. 26.6g combined.",
        "description_ar": "سواران عيار ١٨ حبل وردي وأبيض — ٢٦٫٦ جرام.",
        "seo_title": "18K Rose and White Gold Rope Bracelets 26.6g | Aryam's",
        "seo_description": "18K rose and white gold rope bracelet pair, 26.6g. Aryam's Jewelry Houston.",
        "category": "bangles",
        "karat": 18,
        "weight_grams": 26.6,
        "sell_price_per_gram": 114.0,
        "making_charge": 95,
        "stock_qty": 1,
    },
    {
        "src": "EADF7A39-664A-49DA-84DA-3D10FD1D8AF2.jpeg",
        "file": "five-row-bead-bracelet.jpg",
        "id": "ary-brc-004",
        "slug": "five-row-bead-bracelet",
        "sku": "ARY-BRC-004",
        "title": "Five-Row Diamond-Cut Bead Bracelet",
        "title_ar": "سوار خمس صفوف خرز لامع",
        "description": "Wide five-row faceted bead bracelet with lobster clasp and extender chain. 30.3g as labeled.",
        "description_ar": "سوار عريض بخمس صفوف خرز لامع — ٣٠٫٣ جرام.",
        "seo_title": "Five-Row Gold Bead Bracelet 30.3g | Aryam's Jewelry",
        "seo_description": "Five-row diamond-cut bead bracelet, 30.3g. Aryam's Jewelry Houston.",
        "category": "bangles",
        "karat": 21,
        "weight_grams": 30.3,
        "sell_price_per_gram": 129.0,
        "making_charge": 90,
        "stock_qty": 1,
    },
    {
        "src": "EC7F7CDE-E85A-45B4-BA8D-7934BA609C2C.jpeg",
        "file": "rope-pear-emerald-stone-bangles.jpg",
        "id": "ary-bng-005",
        "slug": "rope-pear-emerald-stone-bangles",
        "sku": "ARY-BNG-005",
        "title": "Rope Bangles with Pear & Emerald Stones",
        "title_ar": "غوايش حبل بأحجار كمثرى ومستطيل",
        "description": "Pair of braided open bangles — each with a pear-cut and emerald-cut clear stone end (stone tag 0.17g). 26g gold weight as labeled. @aryamjewelry0",
        "description_ar": "زوج غوايش حبل بأحجار — ٢٦ جرام. @aryamjewelry0",
        "seo_title": "Rope Gold Bangles with Stones 26g | Aryam's Jewelry",
        "seo_description": "Rope gold bangles with pear and emerald-cut stones, 26g. Houston · @aryamjewelry0",
        "category": "bangles",
        "karat": 21,
        "weight_grams": 26.0,
        "sell_price_per_gram": 131.0,
        "making_charge": 160,
        "stock_qty": 1,
    },
]


def compress(src: Path, dest: Path, max_side=1600, quality=82):
    if not HAS_PIL:
        shutil.copy2(src, dest)
        return
    img = Image.open(src)
    img = img.convert("RGB")
    w, h = img.size
    scale = min(1.0, max_side / max(w, h))
    if scale < 1:
        img = img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    img.save(dest, "JPEG", quality=quality, optimize=True)


def main():
    rows = []
    for p in PRODUCTS:
        src = SRC / p["src"]
        if not src.exists():
            print("MISSING", src)
            continue
        dest = SRC / p["file"]
        compress(src, dest)
        print(f"{p['file']}: {dest.stat().st_size // 1024} KB")
        row = {k: p[k] for k in (
            "id", "slug", "sku", "title", "title_ar", "description", "description_ar",
            "seo_title", "seo_description", "category", "karat", "weight_grams",
            "sell_price_per_gram", "making_charge", "stock_qty"
        )}
        row["image_url"] = f"../images/products/{p['file']}"
        row["published"] = True
        rows.append(row)

    SEED.write_text(json.dumps(rows, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(rows)} products to {SEED}")


if __name__ == "__main__":
    main()
