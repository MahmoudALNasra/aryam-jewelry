/* Google Merchant Center–friendly CSV export */
(function (global) {
  "use strict";

  function csvEscape(v) {
    var s = String(v == null ? "" : v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function absoluteUrl(path, siteUrl) {
    if (!path) return "";
    if (/^https?:/i.test(path)) return path;
    var base = (siteUrl || "").replace(/\/$/, "");
    return base + "/" + String(path).replace(/^\.\.\//, "");
  }

  function buildRows(products, siteUrl) {
    var headers = [
      "id", "title", "description", "link", "image_link", "availability",
      "price", "brand", "condition", "mpn", "google_product_category",
      "custom_label_0", "custom_label_1", "custom_label_2"
    ];
    var lines = [headers.join(",")];

    products.forEach(function (p) {
      if (!p.published) return;
      var price = AryamPricing.displayPrice(p);
      var avail = p.stock_qty > 0 ? "in_stock" : "out_of_stock";
      var link = (siteUrl || "").replace(/\/$/, "") + "/shop/product.html?slug=" + encodeURIComponent(p.slug);
      var row = [
        p.sku || p.id,
        p.title,
        p.seo_description || p.description || "",
        link,
        absoluteUrl(p.image_url, siteUrl),
        avail,
        price.toFixed(2) + " USD",
        "Aryam's Jewelry",
        "new",
        p.sku || p.slug,
        "Apparel & Accessories > Jewelry",
        p.karat + "K",
        p.weight_grams + "g",
        p.category
      ];
      lines.push(row.map(csvEscape).join(","));
    });

    return lines.join("\n");
  }

  function download(products) {
    var siteUrl = (global.ARYAM_CONFIG && global.ARYAM_CONFIG.siteUrl) || "";
    var csv = buildRows(products, siteUrl);
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "aryam-merchant-center-" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  global.AryamGMC = { buildRows: buildRows, download: download };
})(window);
