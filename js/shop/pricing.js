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

  function displayPrice(product) {
    var g = Number(product.weight_grams) || 0;
    var rate = Number(product.sell_price_per_gram) || 0;
    var making = Number(product.making_charge) || 0;
    return g * rate + making;
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

  global.AryamPricing = {
    TROY_OZ_GRAMS: TROY_OZ_GRAMS,
    PURITY: PURITY,
    purityFor: purityFor,
    displayPrice: displayPrice,
    marketPerGram: marketPerGram,
    marginVsMarket: marginVsMarket,
    formatMoney: formatMoney,
    fetchSpot: fetchSpot
  };
})(window);
