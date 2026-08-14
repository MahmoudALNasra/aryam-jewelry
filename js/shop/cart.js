/* Local cart — survives refresh; works with or without Supabase */
(function (global) {
  "use strict";

  var KEY = "aryamCartV1";

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function write(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    global.dispatchEvent(new CustomEvent("aryam:cart", { detail: { count: count() } }));
  }

  function count() {
    return read().reduce(function (n, i) { return n + (i.qty || 0); }, 0);
  }

  function add(product, qty) {
    qty = Math.max(1, parseInt(qty, 10) || 1);
    var items = read();
    var existing = items.find(function (i) { return i.id === product.id; });
    var max = Math.max(0, Number(product.stock_qty) || 0);
    if (existing) {
      existing.qty = Math.min(existing.qty + qty, max || existing.qty + qty);
    } else {
      items.push({
        id: product.id,
        slug: product.slug,
        title: product.title,
        image_url: product.image_url,
        karat: product.karat,
        weight_grams: product.weight_grams,
        sell_price_per_gram: product.sell_price_per_gram,
        making_charge: product.making_charge,
        unit_price: global.AryamPricing.displayPrice(product),
        qty: Math.min(qty, max || qty),
        stock_qty: max
      });
    }
    write(items);
    return items;
  }

  function setQty(id, qty) {
    qty = parseInt(qty, 10) || 0;
    var items = read().map(function (i) {
      if (i.id !== id) return i;
      var max = i.stock_qty > 0 ? i.stock_qty : 99;
      return Object.assign({}, i, { qty: Math.min(Math.max(0, qty), max) });
    }).filter(function (i) { return i.qty > 0; });
    write(items);
    return items;
  }

  function remove(id) {
    write(read().filter(function (i) { return i.id !== id; }));
  }

  function clear() {
    write([]);
  }

  function subtotal() {
    return read().reduce(function (s, i) {
      return s + (Number(i.unit_price) || 0) * (i.qty || 0);
    }, 0);
  }

  function updateBadges() {
    var n = count();
    document.querySelectorAll("[data-cart-count]").forEach(function (el) {
      el.textContent = String(n);
      el.hidden = n === 0;
    });
  }

  global.addEventListener("aryam:cart", updateBadges);
  document.addEventListener("DOMContentLoaded", updateBadges);

  global.AryamCart = {
    read: read,
    add: add,
    setQty: setQty,
    remove: remove,
    clear: clear,
    count: count,
    subtotal: subtotal,
    updateBadges: updateBadges
  };
})(window);
