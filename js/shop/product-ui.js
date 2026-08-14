/* Product detail — gallery, story, related, cart */
(function () {
  "use strict";

  var root = document.getElementById("pdp");
  if (!root) return;

  var params = new URLSearchParams(location.search);
  var slug = params.get("slug");

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/`/g, "&#96;");
  }

  if (!slug) {
    root.innerHTML = '<p class="empty-state">Missing product. <a href="/shop/">Back to shop</a></p>';
    return;
  }

  if (typeof AryamCatalog === "undefined") {
    root.innerHTML = '<p class="empty-state">Shop scripts failed to load. <a href="/shop/">Back to shop</a></p>';
    return;
  }

  function cardHTML(p) {
    var price = AryamPricing.formatMoney(AryamPricing.displayPrice(p));
    var img = p.image_url || "/images/hero.jpg";
    if (typeof AryamMedia !== "undefined") img = AryamMedia.displayUrl(img, "thumb");
    else if (img.indexOf("../") === 0) img = "/" + img.replace(/^\.\.\//, "");
    return (
      '<a class="product-card related-card" href="/shop/product?slug=' + encodeURIComponent(p.slug) + '">' +
        '<div class="media"><img src="' + img + '" alt="' + escapeAttr(p.title) + '" loading="lazy" width="400" height="520" /></div>' +
        '<div class="body">' +
          '<span class="meta">' + p.karat + "K · " + p.weight_grams + " g</span>" +
          "<h3>" + escapeHtml(p.title) + "</h3>" +
          '<span class="price">' + price + "</span>" +
        "</div>" +
      "</a>"
    );
  }

  function pickRelated(current, all) {
    var pool = (all || []).filter(function (p) {
      return p && p.published !== false && p.id !== current.id && p.slug !== current.slug;
    });
    var sameCat = pool.filter(function (p) { return p.category === current.category; });
    var sameKarat = pool.filter(function (p) {
      return p.karat === current.karat && p.category !== current.category;
    });
    var rest = pool.filter(function (p) {
      return p.category !== current.category && p.karat !== current.karat;
    });
    var ordered = sameCat.concat(sameKarat).concat(rest);
    var seen = {};
    return ordered.filter(function (p) {
      if (seen[p.id]) return false;
      seen[p.id] = true;
      return true;
    }).slice(0, 4);
  }

  function injectJsonLd(p, price) {
    var old = document.getElementById("productJsonLd");
    if (old) old.remove();
    var img = p.image_url || "https://aryam.us/images/hero.jpg";
    if (img.indexOf("http") !== 0) img = "https://aryam.us" + (img.charAt(0) === "/" ? img : "/" + img);
    var data = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.title,
      description: p.seo_description || p.description || p.title,
      sku: p.sku || p.slug,
      image: (p.image_urls && p.image_urls.length ? p.image_urls : [img]).map(function (u) {
        if (u.indexOf("http") === 0) return u;
        return "https://aryam.us" + (u.charAt(0) === "/" ? u : "/" + u);
      }),
      brand: { "@type": "Brand", name: "Aryam's Jewelry" },
      material: p.karat + "K gold",
      offers: {
        "@type": "Offer",
        url: "https://aryam.us/shop/product?slug=" + encodeURIComponent(p.slug),
        priceCurrency: "USD",
        price: Number(price).toFixed(2),
        availability: p.stock_qty > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        itemCondition: "https://schema.org/NewCondition"
      }
    };
    var script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "productJsonLd";
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }

  Promise.all([
    AryamCatalog.bySlug(slug),
    AryamCatalog.loadAll(false)
  ]).then(function (results) {
    var p = results[0];
    var all = results[1] || [];
    if (!p || !p.published) {
      root.innerHTML = '<p class="empty-state">Piece not found. <a href="/shop/">Back to shop</a></p>';
      return;
    }

    document.title = (p.seo_title || p.title) + " | Aryam's Jewelry";
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", p.seo_description || p.description || "");

    var price = AryamPricing.displayPrice(p);
    var breakdown = AryamPricing.priceBreakdown(p);
    injectJsonLd(p, price);

    var gallery = (p.image_urls && p.image_urls.length)
      ? p.image_urls.slice()
      : (p.image_url ? [p.image_url] : ["/images/hero.jpg"]);
    gallery = gallery.map(function (u) {
      return u.indexOf("../") === 0 ? "/" + u.replace(/^\.\.\//, "") : u;
    });

    function detailSrc(u) {
      return typeof AryamMedia !== "undefined" ? AryamMedia.displayUrl(u, "detail") : u;
    }
    function fullSrc(u) {
      return typeof AryamMedia !== "undefined" ? AryamMedia.displayUrl(u, "full") : u;
    }
    function thumbSrc(u) {
      return typeof AryamMedia !== "undefined" ? AryamMedia.displayUrl(u, "thumb") : u;
    }

    var img = detailSrc(gallery[0]);
    var imgFull = fullSrc(gallery[0]);
    var inStock = p.stock_qty > 0;
    var thumbsHtml = gallery.length > 1
      ? '<div class="pdp-thumbs" id="pdpThumbs">' + gallery.map(function (u, i) {
          return (
            '<button type="button" class="pdp-thumb' + (i === 0 ? " is-active" : "") + '" data-gallery-index="' + i + '" aria-label="Photo ' + (i + 1) + '">' +
              '<img src="' + thumbSrc(u) + '" alt="" />' +
            "</button>"
          );
        }).join("") + "</div>"
      : "";

    var subprice = breakdown.mode === "fixed"
      ? "Fixed price"
      : AryamPricing.formatMoney(p.sell_price_per_gram) + "/g" +
        (p.making_charge ? " + " + AryamPricing.formatMoney(p.making_charge) + " making" : "");

    var richEn = AryamPricing.renderRichContent(p.rich_content);
    var richAr = AryamPricing.renderRichContent(p.rich_content_ar);
    var richHtml = (richEn || richAr)
      ? '<section class="pdp-rich" id="pdpRich">' +
          "<h2>About this piece</h2>" +
          (richEn ? '<div class="rich-body">' + richEn + "</div>" : "") +
          (richAr ? '<div class="rich-body rich-ar" lang="ar" dir="rtl">' + richAr + "</div>" : "") +
        "</section>"
      : "";

    var related = pickRelated(p, all);
    var relatedHtml = related.length
      ? '<section class="pdp-related" id="pdpRelated">' +
          "<h2>You may also like</h2>" +
          '<p class="related-lead">More pieces with a similar feel from Aryam&rsquo;s collection.</p>' +
          '<div class="related-grid">' + related.map(cardHTML).join("") + "</div>" +
        "</section>"
      : "";

    root.innerHTML =
      '<div class="pdp-layout">' +
        '<div class="pdp-gallery">' +
          '<div class="pdp-frame" id="zoomFrame" title="Click to enlarge">' +
            '<img id="zoomImg" src="' + img + '" data-full="' + imgFull + '" alt="' + escapeHtml(p.title) + '" />' +
          "</div>" +
          thumbsHtml +
          '<p class="pdp-hint">Hover to inspect detail · click to open full size' +
            (gallery.length > 1 ? " · tap thumbnails for more angles" : "") +
          "</p>" +
        "</div>" +
        '<div class="pdp-info">' +
          '<p class="eyebrow">' + p.karat + "K Gold · " + p.weight_grams + " g</p>" +
          "<h1>" + escapeHtml(p.title) + "</h1>" +
          (p.title_ar ? '<p class="ar-title" lang="ar" dir="rtl">' + escapeHtml(p.title_ar) + "</p>" : "") +
          '<p class="pdp-price" id="pdpPrice">' + AryamPricing.formatMoney(price) + "</p>" +
          '<p class="pdp-subprice">' + subprice + "</p>" +
          (p.description ? "<p>" + escapeHtml(p.description) + "</p>" : "") +
          (p.description_ar ? '<p lang="ar" dir="rtl" style="color:var(--muted)">' + escapeHtml(p.description_ar) + "</p>" : "") +
          '<dl class="specs">' +
            '<div class="spec"><dt>Karat</dt><dd>' + p.karat + "K</dd></div>" +
            '<div class="spec"><dt>Purity</dt><dd>' + Math.round(AryamPricing.purityFor(p.karat) * 1000) / 10 + "%</dd></div>" +
            '<div class="spec"><dt>Weight</dt><dd>' + p.weight_grams + " g</dd></div>" +
            '<div class="spec"><dt>Price</dt><dd>' + (breakdown.mode === "fixed" ? "Fixed" : "Formula") + "</dd></div>" +
            '<div class="spec"><dt>Stock</dt><dd class="' + (inStock ? "stock-ok" : "stock-out") + '">' +
              (inStock ? p.stock_qty + " available" : "Sold out — call store") +
            "</dd></div>" +
            (p.sku ? '<div class="spec"><dt>SKU</dt><dd>' + escapeHtml(p.sku) + "</dd></div>" : "") +
          "</dl>" +
          '<div class="pdp-actions">' +
            '<div class="qty-input">' +
              '<button type="button" id="qtyMinus" aria-label="Decrease">−</button>' +
              '<input id="qty" type="number" min="1" max="' + Math.max(1, p.stock_qty) + '" value="1" />' +
              '<button type="button" id="qtyPlus" aria-label="Increase">+</button>' +
            "</div>" +
            '<button class="btn btn-gold" id="addCart" ' + (inStock ? "" : "disabled") + '>' +
              (inStock ? "Add to cart" : "Unavailable") +
            "</button>" +
            '<a class="btn btn-ghost" href="tel:+18327627620">Call store</a>' +
          "</div>" +
        "</div>" +
      "</div>" +
      richHtml +
      relatedHtml +
      '<div class="lightbox" id="lightbox" role="dialog" aria-modal="true">' +
        '<button type="button" id="lbClose" aria-label="Close">×</button>' +
        '<img id="lightboxImg" src="' + imgFull + '" alt="" />' +
      "</div>";

    setupZoom();
    setupGallery(gallery, detailSrc, fullSrc);
    setupCart(p);
    AryamPricing.fetchSpot().then(function (spot) {
      if (!spot || breakdown.mode === "fixed") return;
      var m = AryamPricing.marketPerGram(spot, p.karat);
      var el = document.querySelector(".pdp-subprice");
      if (el && m != null) {
        el.innerHTML += " · market ref ~" + AryamPricing.formatMoney(m) + "/g";
      }
    });
  }).catch(function () {
    root.innerHTML = '<p class="empty-state">Could not load this piece. <a href="/shop/">Back to shop</a></p>';
  });

  function setupZoom() {
    var frame = document.getElementById("zoomFrame");
    var img = document.getElementById("zoomImg");
    var lb = document.getElementById("lightbox");
    var lbImg = document.getElementById("lightboxImg");
    if (!frame || !img || !lb) return;

    frame.addEventListener("mousemove", function (e) {
      if (window.matchMedia("(hover: none)").matches) return;
      var r = frame.getBoundingClientRect();
      var x = ((e.clientX - r.left) / r.width) * 100;
      var y = ((e.clientY - r.top) / r.height) * 100;
      img.style.transformOrigin = x + "% " + y + "%";
      img.style.transform = "scale(1.85)";
    });
    frame.addEventListener("mouseleave", function () {
      img.style.transform = "scale(1)";
    });
    frame.addEventListener("click", function () {
      if (lbImg) lbImg.src = img.getAttribute("data-full") || img.src;
      lb.classList.add("open");
    });
    document.getElementById("lbClose").addEventListener("click", function () {
      lb.classList.remove("open");
    });
    lb.addEventListener("click", function (e) {
      if (e.target === lb) lb.classList.remove("open");
    });
  }

  function setupGallery(gallery, detailSrc, fullSrc) {
    var thumbs = document.getElementById("pdpThumbs");
    var img = document.getElementById("zoomImg");
    var lbImg = document.getElementById("lightboxImg");
    if (!thumbs || !img || !gallery || gallery.length < 2) return;

    thumbs.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-gallery-index]");
      if (!btn) return;
      var idx = Number(btn.getAttribute("data-gallery-index"));
      if (isNaN(idx) || !gallery[idx]) return;
      img.src = detailSrc(gallery[idx]);
      img.setAttribute("data-full", fullSrc(gallery[idx]));
      if (lbImg) lbImg.src = fullSrc(gallery[idx]);
      Array.prototype.forEach.call(thumbs.querySelectorAll(".pdp-thumb"), function (el) {
        el.classList.toggle("is-active", el === btn);
      });
      img.style.transform = "scale(1)";
    });
  }

  function setupCart(p) {
    var qty = document.getElementById("qty");
    document.getElementById("qtyMinus").addEventListener("click", function () {
      qty.value = Math.max(1, (parseInt(qty.value, 10) || 1) - 1);
    });
    document.getElementById("qtyPlus").addEventListener("click", function () {
      var max = Math.max(1, p.stock_qty);
      qty.value = Math.min(max, (parseInt(qty.value, 10) || 1) + 1);
    });
    document.getElementById("addCart").addEventListener("click", function () {
      AryamCart.add(p, qty.value);
      var btn = document.getElementById("addCart");
      btn.textContent = "Added ✓";
      setTimeout(function () { btn.textContent = "Add to cart"; }, 1400);
    });
  }
})();
