/* Product detail — zoom + add to cart */
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

  if (!slug) {
    root.innerHTML = '<p class="empty-state">Missing product. <a href="/shop/">Back to shop</a></p>';
    return;
  }

  if (typeof AryamCatalog === "undefined") {
    root.innerHTML = '<p class="empty-state">Shop scripts failed to load. <a href="/shop/">Back to shop</a></p>';
    return;
  }

  AryamCatalog.bySlug(slug).then(function (p) {
    if (!p || !p.published) {
      root.innerHTML = '<p class="empty-state">Piece not found. <a href="/shop/">Back to shop</a></p>';
      return;
    }

    document.title = (p.seo_title || p.title) + " | Aryam's Jewelry";
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", p.seo_description || p.description || "");

    var price = AryamPricing.displayPrice(p);
    var img = p.image_url || "/images/hero.jpg";
    if (img.indexOf("../") === 0) img = "/" + img.replace(/^\.\.\//, "");
    if (typeof AryamMedia !== "undefined") img = AryamMedia.displayUrl(img, "detail");
    var imgFull = (typeof AryamMedia !== "undefined")
      ? AryamMedia.displayUrl(p.image_url || img, "full")
      : img;
    var inStock = p.stock_qty > 0;

    root.innerHTML =
      '<div class="pdp-gallery">' +
        '<div class="pdp-frame" id="zoomFrame" title="Click to enlarge">' +
          '<img id="zoomImg" src="' + img + '" data-full="' + imgFull + '" alt="' + escapeHtml(p.title) + '" />' +
        "</div>" +
        '<p class="pdp-hint">Hover to inspect detail · click to open full size</p>' +
      "</div>" +
      '<div class="pdp-info">' +
        '<p class="eyebrow">' + p.karat + "K Gold · " + p.weight_grams + " g</p>" +
        "<h1>" + escapeHtml(p.title) + "</h1>" +
        (p.title_ar ? '<p class="ar-title" lang="ar" dir="rtl">' + escapeHtml(p.title_ar) + "</p>" : "") +
        '<p class="pdp-price" id="pdpPrice">' + AryamPricing.formatMoney(price) + "</p>" +
        '<p class="pdp-subprice">' + AryamPricing.formatMoney(p.sell_price_per_gram) + "/g" +
          (p.making_charge ? " + " + AryamPricing.formatMoney(p.making_charge) + " making" : "") +
        "</p>" +
        '<p>' + escapeHtml(p.description) + "</p>" +
        (p.description_ar ? '<p lang="ar" dir="rtl" style="color:var(--muted)">' + escapeHtml(p.description_ar) + "</p>" : "") +
        '<dl class="specs">' +
          '<div class="spec"><dt>Karat</dt><dd>' + p.karat + "K</dd></div>" +
          '<div class="spec"><dt>Purity</dt><dd>' + Math.round(AryamPricing.purityFor(p.karat) * 1000) / 10 + "%</dd></div>" +
          '<div class="spec"><dt>Weight</dt><dd>' + p.weight_grams + " g</dd></div>" +
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
        '<p class="muted" style="color:var(--muted);font-size:0.88rem">Prices follow the shop’s selling rate per gram (set in admin), not raw spot alone. Grams on photos will be confirmed when real catalog images are uploaded.</p>' +
      "</div>" +
      '<div class="lightbox" id="lightbox" role="dialog" aria-modal="true">' +
        '<button type="button" id="lbClose" aria-label="Close">×</button>' +
        '<img src="' + imgFull + '" alt="" />' +
      "</div>";

    setupZoom();
    setupCart(p);
    AryamPricing.fetchSpot().then(function (spot) {
      if (!spot) return;
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
    if (!frame || !img) return;

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
      lb.classList.add("open");
    });
    document.getElementById("lbClose").addEventListener("click", function () {
      lb.classList.remove("open");
    });
    lb.addEventListener("click", function (e) {
      if (e.target === lb) lb.classList.remove("open");
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
