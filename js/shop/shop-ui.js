/* Storefront grid + filters */
(function () {
  "use strict";

  var grid = document.getElementById("productGrid");
  if (!grid) return;

  var state = { category: "all", karat: "all", inStockOnly: false, products: [] };

  function cardHTML(p) {
    var price = AryamPricing.formatMoney(AryamPricing.displayPrice(p));
    var out = p.stock_qty <= 0;
    var img = p.image_url || "../images/hero.jpg";
    return (
      '<a class="product-card" href="/shop/product?slug=' + encodeURIComponent(p.slug) + '" data-reveal>' +
        '<div class="media">' +
          (out ? '<span class="soldout">Sold out</span>' : "") +
          '<img src="' + (img.indexOf("http") === 0 || img.indexOf("/") === 0 ? img : "/" + img.replace(/^\.\.\//, "")) + '" alt="' + escapeAttr(p.title) + '" loading="lazy" width="600" height="800" />' +
        "</div>" +
        '<div class="body">' +
          '<span class="meta">' + p.karat + "K · " + labelCat(p.category) + "</span>" +
          "<h2>" + escapeHtml(p.title) + "</h2>" +
          (p.title_ar ? '<p class="ar" lang="ar" dir="rtl">' + escapeHtml(p.title_ar) + "</p>" : "") +
          '<div class="price-row">' +
            '<span class="price">' + price + "</span>" +
            '<span class="grams">' + p.weight_grams + " g</span>" +
          "</div>" +
        "</div>" +
      "</a>"
    );
  }

  function labelCat(c) {
    var map = {
      bridal: "Bridal", bangles: "Bangles", necklaces: "Necklaces",
      rings: "Rings", coins: "Coins", earrings: "Earrings", other: "Gold"
    };
    return map[c] || "Gold";
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }
  function escapeAttr(s) { return escapeHtml(s); }

  function render() {
    var list = state.products.filter(function (p) {
      if (state.category !== "all" && p.category !== state.category) return false;
      if (state.karat !== "all" && String(p.karat) !== String(state.karat)) return false;
      if (state.inStockOnly && p.stock_qty <= 0) return false;
      return true;
    });

    if (!list.length) {
      grid.innerHTML = '<p class="empty-state">No pieces match these filters. Try another karat or category — or <a href="tel:+18327627620">call the store</a>.</p>';
      return;
    }
    grid.innerHTML = list.map(cardHTML).join("");
    animateIn();
  }

  function animateIn() {
    if (typeof gsap === "undefined") return;
    gsap.from(".product-card", {
      y: 28, autoAlpha: 0, duration: 0.7, stagger: 0.06, ease: "power3.out"
    });
  }

  document.querySelectorAll("[data-filter]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var group = btn.getAttribute("data-filter");
      var val = btn.getAttribute("data-value");
      if (group === "stock") {
        state.inStockOnly = !state.inStockOnly;
        btn.classList.toggle("active", state.inStockOnly);
      } else {
        state[group] = val;
        document.querySelectorAll('[data-filter="' + group + '"]').forEach(function (b) {
          b.classList.toggle("active", b === btn);
        });
      }
      render();
    });
  });

  AryamCatalog.loadAll(false).then(function (products) {
    state.products = products;
    render();
  }).catch(function () {
    grid.innerHTML = '<p class="empty-state">Could not load the catalog. Refresh or call (832) 762-7620.</p>';
  });
})();
