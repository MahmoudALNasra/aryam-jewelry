/**
 * Social crawler Open Graph responses for aryam.us.
 * Humans still get the normal static pages; bots get meta tags + a thumbnail
 * so shared links always preview with an image (except /admin).
 */

export const config = {
  matcher: [
    "/",
    "/shop",
    "/shop/",
    "/shop/product",
    "/shop/product/",
    "/shop/cart",
    "/shop/cart/",
    "/shop/checkout",
    "/shop/checkout/"
  ]
};

var SITE = "https://aryam.us";
var DEFAULT_IMAGE = SITE + "/images/hero.jpg";
var SITE_NAME = "Aryam's Jewelry مجوهرات أريام";
var SUPABASE_URL = "https://bchtmthgapxyralrcsxf.supabase.co";
var SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjaHRtdGhnYXB4eXJhbHJjc3hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3MjY5NjQsImV4cCI6MjEwMjMwMjk2NH0._u8ge3lmHewZa0ruInNB7ooyKQQhl51kt1BGVYZbmbM";

var BOT_UA =
  /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|TelegramBot|Pinterest|Googlebot|bingbot|Applebot|Embedly|Quora Link Preview|Showyoubot|outbrain|vkShare|redditbot|Emberfire|meta-externalagent|Bytespider|TikTok|Snapchat|Iframely|SkypeUriPreview|Yahoo! Slurp|DuckDuckBot|Baiduspider|YandexBot|SemrushBot|AhrefsBot|DotBot|PetalBot|Storebot-Google|Google-InspectionTool|Chrome-Lighthouse/i;

var CATEGORY_LABELS = {
  bridal: "Bridal",
  bangles: "Bangles",
  necklaces: "Necklaces",
  rings: "Rings",
  coins: "Coins",
  earrings: "Earrings",
  other: "Gold"
};

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
  });
}

function absUrl(u) {
  if (!u) return DEFAULT_IMAGE;
  u = String(u).trim();
  if (!u) return DEFAULT_IMAGE;
  if (/^https?:\/\//i.test(u)) return u;
  if (u.indexOf("//") === 0) return "https:" + u;
  if (u.indexOf("../") === 0) u = "/" + u.replace(/^\.\.\//, "");
  if (u.charAt(0) !== "/") u = "/" + u;
  return SITE + u;
}

function firstImage(product) {
  if (!product) return DEFAULT_IMAGE;
  var raw = product.image_url;
  if (!raw && Array.isArray(product.image_urls) && product.image_urls[0]) {
    raw = product.image_urls[0];
  }
  if (!raw) return DEFAULT_IMAGE;
  var u = absUrl(raw);
  if (/\.(mp4|mov|webm|m4v)(\?|$)/i.test(u) || /\/video\/upload\//i.test(u)) {
    if (/res\.cloudinary\.com/i.test(u) && /\/video\/upload\//i.test(u)) {
      u = u.replace("/video/upload/", "/video/upload/so_0,f_jpg/");
      u = u.replace(/\.(mp4|mov|webm|m4v)(\?|$)/i, ".jpg$2");
      return u;
    }
    return DEFAULT_IMAGE;
  }
  return u;
}

function ogHtml(meta) {
  var title = escapeHtml(meta.title);
  var description = escapeHtml(meta.description);
  var url = escapeHtml(meta.url);
  var image = escapeHtml(absUrl(meta.image));
  var type = escapeHtml(meta.type || "website");
  var imageAlt = escapeHtml(meta.imageAlt || "Aryam's Jewelry Houston");

  return (
    "<!DOCTYPE html><html lang=\"en\"><head>" +
    "<meta charset=\"utf-8\" />" +
    "<title>" + title + "</title>" +
    "<meta name=\"description\" content=\"" + description + "\" />" +
    "<link rel=\"canonical\" href=\"" + url + "\" />" +
    "<meta property=\"og:type\" content=\"" + type + "\" />" +
    "<meta property=\"og:site_name\" content=\"" + escapeHtml(SITE_NAME) + "\" />" +
    "<meta property=\"og:title\" content=\"" + title + "\" />" +
    "<meta property=\"og:description\" content=\"" + description + "\" />" +
    "<meta property=\"og:url\" content=\"" + url + "\" />" +
    "<meta property=\"og:image\" content=\"" + image + "\" />" +
    "<meta property=\"og:image:secure_url\" content=\"" + image + "\" />" +
    "<meta property=\"og:image:alt\" content=\"" + imageAlt + "\" />" +
    "<meta property=\"og:locale\" content=\"en_US\" />" +
    "<meta name=\"twitter:card\" content=\"summary_large_image\" />" +
    "<meta name=\"twitter:title\" content=\"" + title + "\" />" +
    "<meta name=\"twitter:description\" content=\"" + description + "\" />" +
    "<meta name=\"twitter:image\" content=\"" + image + "\" />" +
    "<meta name=\"twitter:image:alt\" content=\"" + imageAlt + "\" />" +
    "</head><body>" +
    "<h1>" + title + "</h1>" +
    "<p>" + description + "</p>" +
    "<p><img src=\"" + image + "\" alt=\"" + imageAlt + "\" width=\"1200\" /></p>" +
    "<p><a href=\"" + url + "\">View on Aryam's Jewelry</a></p>" +
    "</body></html>"
  );
}

async function fetchProductBySlug(slug) {
  if (!slug) return null;
  try {
    var endpoint =
      SUPABASE_URL +
      "/rest/v1/products?slug=eq." +
      encodeURIComponent(slug) +
      "&published=eq.true&select=title,title_ar,description,seo_title,seo_description,image_url,image_urls,karat,weight_grams,category,slug&limit=1";
    var res = await fetch(endpoint, {
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: "Bearer " + SUPABASE_ANON
      }
    });
    if (!res.ok) return null;
    var rows = await res.json();
    return rows && rows[0] ? rows[0] : null;
  } catch (e) {
    return null;
  }
}

function pageMeta(pathname, searchParams) {
  var path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/shop") {
    var cat = (searchParams.get("category") || "").toLowerCase();
    if (cat && CATEGORY_LABELS[cat]) {
      var label = CATEGORY_LABELS[cat];
      return {
        title: label + " | " + SITE_NAME,
        description:
          "Shop " +
          label.toLowerCase() +
          " in 21K & 22K Arabic gold at Aryam's Jewelry Houston. Grams, karat and price on every listing.",
        image: DEFAULT_IMAGE,
        type: "website",
        imageAlt: label + " collection at Aryam's Jewelry Houston"
      };
    }
    return {
      title: "Shop Arabic Gold Jewelry | " + SITE_NAME,
      description:
        "Shop 21K and 22K Arabic gold jewelry online from Aryam's Jewelry in Houston — bridal sets, bangles, chains, rings and coins.",
      image: DEFAULT_IMAGE,
      type: "website",
      imageAlt: "Arabic gold jewelry collection at Aryam's Jewelry Houston"
    };
  }
  if (path === "/shop/cart") {
    return {
      title: "Cart | " + SITE_NAME,
      description: "Your Aryam's Jewelry shopping cart.",
      image: DEFAULT_IMAGE,
      type: "website"
    };
  }
  if (path === "/shop/checkout") {
    return {
      title: "Checkout | " + SITE_NAME,
      description: "Checkout securely at Aryam's Jewelry Houston.",
      image: DEFAULT_IMAGE,
      type: "website"
    };
  }
  return {
    title: SITE_NAME + " — Arabic Gold Jewelry in Houston, TX",
    description:
      "21K & 22K Arabic gold jewelry in Houston: bridal sets, bangles, chains, rings & coins. Live gold prices updated daily. 4.9★ from 172+ Google reviews.",
    image: DEFAULT_IMAGE,
    type: "website",
    imageAlt: "22K Arabic gold necklaces and bangles at Aryam's Jewelry, Houston"
  };
}

export default async function middleware(request) {
  var ua = request.headers.get("user-agent") || "";
  if (!BOT_UA.test(ua)) return;

  var url = new URL(request.url);
  if (url.pathname.indexOf("/admin") === 0) return;

  var path = url.pathname.replace(/\/+$/, "") || "/";
  var meta;

  if (path === "/shop/product") {
    var slug = url.searchParams.get("slug") || "";
    var product = await fetchProductBySlug(slug);
    if (product) {
      var grams = product.weight_grams != null ? String(product.weight_grams) + " g" : "";
      var karat = product.karat != null ? String(product.karat) + "K" : "";
      var bits = [karat, grams].filter(Boolean).join(" · ");
      meta = {
        title: (product.seo_title || product.title || "Gold Piece") + " | Aryam's Jewelry",
        description:
          product.seo_description ||
          product.description ||
          ((product.title || "Arabic gold") +
            (bits ? " — " + bits : "") +
            " at Aryam's Jewelry Houston."),
        image: firstImage(product),
        type: "product",
        imageAlt: product.title || "Gold jewelry at Aryam's Jewelry"
      };
    } else {
      meta = {
        title: "Gold Piece | Aryam's Jewelry Houston",
        description: "Arabic gold jewelry detail — karat, grams and price at Aryam's Jewelry Houston.",
        image: DEFAULT_IMAGE,
        type: "product"
      };
    }
  } else {
    meta = pageMeta(path, url.searchParams);
  }

  meta.url = SITE + url.pathname + url.search;

  return new Response(ogHtml(meta), {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, s-maxage=600, stale-while-revalidate=86400"
    }
  });
}
