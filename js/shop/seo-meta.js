/* Shared Open Graph / Twitter meta helpers for public pages. */
(function (global) {
  "use strict";

  var SITE = (global.ARYAM_CONFIG && global.ARYAM_CONFIG.siteUrl) || "https://aryam.us";
  var DEFAULT_IMAGE = SITE + "/images/hero.jpg";
  var SITE_NAME = "Aryam's Jewelry مجوهرات أريام";
  var DEFAULT_DESC =
    "21K & 22K Arabic gold jewelry in Houston — bridal sets, bangles, chains, rings & coins. Live gold prices. Call (832) 762-7620.";

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

  function ensureMeta(attr, key) {
    var sel = attr === "property"
      ? 'meta[property="' + key + '"]'
      : 'meta[name="' + key + '"]';
    var el = document.querySelector(sel);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    return el;
  }

  function setMeta(attr, key, value) {
    if (value == null || value === "") return;
    ensureMeta(attr, key).setAttribute("content", String(value));
  }

  function ensureLink(rel) {
    var el = document.querySelector('link[rel="' + rel + '"]');
    if (!el) {
      el = document.createElement("link");
      el.setAttribute("rel", rel);
      document.head.appendChild(el);
    }
    return el;
  }

  function apply(opts) {
    opts = opts || {};
    var title = opts.title || (SITE_NAME + " — Arabic Gold Jewelry in Houston, TX");
    var description = opts.description || DEFAULT_DESC;
    var url = opts.url || (SITE + (location.pathname || "/") + (location.search || ""));
    var image = absUrl(opts.image || DEFAULT_IMAGE);
    var type = opts.type || "website";
    var imageAlt = opts.imageAlt || "Aryam's Jewelry — Arabic gold in Houston, TX";

    if (opts.updateDocumentTitle !== false) {
      document.title = title;
    }

    setMeta("name", "description", description);
    setMeta("property", "og:type", type);
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", image);
    setMeta("property", "og:image:secure_url", image);
    setMeta("property", "og:image:alt", imageAlt);
    setMeta("property", "og:locale", "en_US");

    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", image);
    setMeta("name", "twitter:image:alt", imageAlt);

    ensureLink("canonical").setAttribute("href", url.split("#")[0]);
  }

  global.AryamSeo = {
    SITE: SITE,
    SITE_NAME: SITE_NAME,
    DEFAULT_IMAGE: DEFAULT_IMAGE,
    DEFAULT_DESC: DEFAULT_DESC,
    absUrl: absUrl,
    apply: apply
  };
})(window);
