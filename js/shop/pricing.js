/* Gold pricing helpers — shared by shop + admin */
(function (global) {
  "use strict";

  var TROY_OZ_GRAMS = 31.1034768;
  var PURITY = { 24: 0.999, 22: 0.9167, 21: 0.875, 18: 0.75 };

  var usd = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  function purityFor(karat) {
    return PURITY[Number(karat)] || 0.875;
  }

  function priceMode(product) {
    var mode = String((product && product.price_mode) || "formula").toLowerCase();
    return mode === "fixed" ? "fixed" : "formula";
  }

  function formulaPrice(product) {
    var g = Number(product.weight_grams) || 0;
    var rate = Number(product.sell_price_per_gram) || 0;
    var making = Number(product.making_charge) || 0;
    return g * rate + making;
  }

  function displayPrice(product) {
    if (priceMode(product) === "fixed") {
      var fixed = Number(product.fixed_price);
      if (isFinite(fixed) && fixed >= 0) return fixed;
    }
    return formulaPrice(product);
  }

  function priceBreakdown(product) {
    if (priceMode(product) === "fixed") {
      return {
        mode: "fixed",
        total: displayPrice(product),
        label: "Fixed price"
      };
    }
    return {
      mode: "formula",
      total: formulaPrice(product),
      grams: Number(product.weight_grams) || 0,
      rate: Number(product.sell_price_per_gram) || 0,
      making: Number(product.making_charge) || 0,
      label: "Weight × $/g + making"
    };
  }

  function marketPerGram(spotPerOz, karat) {
    if (!spotPerOz) return null;
    return (spotPerOz / TROY_OZ_GRAMS) * purityFor(karat);
  }

  function marginVsMarket(product, spotPerOz) {
    var market = marketPerGram(spotPerOz, product.karat);
    if (market == null || !product.sell_price_per_gram) return null;
    return Number(product.sell_price_per_gram) - market;
  }

  function formatMoney(n) {
    return usd.format(Number(n) || 0);
  }

  function fetchSpot() {
    return fetch("https://api.gold-api.com/price/XAU", { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("spot");
        return r.json();
      })
      .then(function (d) {
        return typeof d.price === "number" ? d.price : null;
      })
      .catch(function () { return null; });
  }

  /** Lightweight markdown → safe HTML for product story sections */
  function renderRichContent(raw) {
    var text = String(raw || "").replace(/\r\n/g, "\n").trim();
    if (!text) return "";

    function esc(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
      });
    }

    function inlineFormat(s) {
      s = esc(s);
      s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");
      s = s.replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noopener noreferrer" target="_blank">$1</a>');
      return s;
    }

    var blocks = text.split(/\n{2,}/);
    var html = blocks.map(function (block) {
      var lines = block.split("\n").map(function (l) { return l.trimEnd(); });
      var first = lines[0] || "";

      if (/^###\s+/.test(first)) {
        return "<h3>" + inlineFormat(first.replace(/^###\s+/, "")) + "</h3>" +
          (lines.length > 1 ? "<p>" + lines.slice(1).map(inlineFormat).join("<br>") + "</p>" : "");
      }
      if (/^##\s+/.test(first)) {
        return "<h2>" + inlineFormat(first.replace(/^##\s+/, "")) + "</h2>" +
          (lines.length > 1 ? "<p>" + lines.slice(1).map(inlineFormat).join("<br>") + "</p>" : "");
      }
      if (lines.every(function (l) { return /^[-*]\s+/.test(l); })) {
        return "<ul>" + lines.map(function (l) {
          return "<li>" + inlineFormat(l.replace(/^[-*]\s+/, "")) + "</li>";
        }).join("") + "</ul>";
      }
      return "<p>" + lines.map(inlineFormat).join("<br>") + "</p>";
    }).join("");

    return html;
  }

  global.AryamPricing = {
    TROY_OZ_GRAMS: TROY_OZ_GRAMS,
    PURITY: PURITY,
    purityFor: purityFor,
    priceMode: priceMode,
    formulaPrice: formulaPrice,
    displayPrice: displayPrice,
    priceBreakdown: priceBreakdown,
    marketPerGram: marketPerGram,
    marginVsMarket: marginVsMarket,
    formatMoney: formatMoney,
    fetchSpot: fetchSpot,
    renderRichContent: renderRichContent
  };
})(window);
