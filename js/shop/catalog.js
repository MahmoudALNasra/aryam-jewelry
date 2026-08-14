/* Catalog: Supabase when configured, else seed JSON + localStorage overrides */
(function (global) {
  "use strict";

  var LOCAL_KEY = "aryamProductsLocalV2";
  var cfg = function () { return global.ARYAM_CONFIG || {}; };

  function supabaseLib() {
    return global.supabase || null;
  }

  function hasSupabase() {
    var c = cfg();
    var lib = supabaseLib();
    return !!(c.supabaseUrl && c.supabaseAnonKey && lib && typeof lib.createClient === "function");
  }

  function client() {
    if (!hasSupabase()) return null;
    if (!global.__aryamSb) {
      global.__aryamSb = supabaseLib().createClient(cfg().supabaseUrl, cfg().supabaseAnonKey);
    }
    return global.__aryamSb;
  }

  function normalize(p) {
    var img = p.image_url || p.image_path || "";
    if (img.indexOf("../") === 0) img = "/" + img.replace(/^\.\.\//, "");
    return {
      id: p.id,
      slug: p.slug,
      sku: p.sku || "",
      title: p.title,
      title_ar: p.title_ar || "",
      description: p.description || "",
      description_ar: p.description_ar || "",
      seo_title: p.seo_title || p.title,
      seo_description: p.seo_description || p.description || "",
      category: p.category || "other",
      karat: Number(p.karat),
      weight_grams: Number(p.weight_grams),
      sell_price_per_gram: Number(p.sell_price_per_gram),
      making_charge: Number(p.making_charge) || 0,
      stock_qty: Number(p.stock_qty) || 0,
      image_url: img,
      published: p.published !== false
    };
  }

  function readLocal() {
    try {
      var raw = localStorage.getItem(LOCAL_KEY);
      return raw ? JSON.parse(raw).map(normalize) : null;
    } catch (e) {
      return null;
    }
  }

  function writeLocal(list) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  }

  function loadSeed() {
    var base = document.querySelector("script[data-seed-base]");
    var url = (base && base.getAttribute("data-seed-base")) || "/data/products.seed.json";
    return fetch(url, { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("seed");
        return r.json();
      })
      .then(function (rows) { return rows.map(normalize); });
  }

  function loadAll(includeUnpublished) {
    var sb = client();
    if (sb) {
      var q = sb.from("products").select("*").order("created_at", { ascending: false });
      if (!includeUnpublished) q = q.eq("published", true);
      return q.then(function (res) {
        if (res.error) throw res.error;
        return (res.data || []).map(normalize);
      }).catch(function () {
        return loadLocalOrSeed(includeUnpublished);
      });
    }
    return loadLocalOrSeed(includeUnpublished);
  }

  function loadLocalOrSeed(includeUnpublished) {
    var local = readLocal();
    if (local && local.length) {
      return Promise.resolve(
        includeUnpublished ? local : local.filter(function (p) { return p.published; })
      );
    }
    return loadSeed().then(function (seed) {
      writeLocal(seed);
      return includeUnpublished ? seed : seed.filter(function (p) { return p.published; });
    });
  }

  function bySlug(slug) {
    return loadAll(true).then(function (list) {
      return list.find(function (p) { return p.slug === slug; }) || null;
    });
  }

  function byId(id) {
    return loadAll(true).then(function (list) {
      return list.find(function (p) { return p.id === id; }) || null;
    });
  }

  function saveProduct(product) {
    var sb = client();
    var row = normalize(product);
    if (!row.id) row.id = "local-" + Date.now();
    if (!row.slug) {
      row.slug = (row.title || "piece")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") + "-" + String(Date.now()).slice(-4);
    }

    if (sb) {
      var payload = Object.assign({}, row);
      delete payload.id;
      if (String(row.id).indexOf("seed-") === 0 || String(row.id).indexOf("local-") === 0) {
        return sb.from("products").insert(row).select().single().then(function (res) {
          if (res.error) throw res.error;
          return normalize(res.data);
        });
      }
      return sb.from("products").update(payload).eq("id", row.id).select().single().then(function (res) {
        if (res.error) throw res.error;
        return normalize(res.data);
      });
    }

    return loadLocalOrSeed(true).then(function (list) {
      var idx = list.findIndex(function (p) { return p.id === row.id; });
      if (idx >= 0) list[idx] = row;
      else list.unshift(row);
      writeLocal(list);
      return row;
    });
  }

  function deleteProduct(id) {
    var sb = client();
    if (sb && String(id).indexOf("seed-") !== 0 && String(id).indexOf("local-") !== 0) {
      return sb.from("products").delete().eq("id", id).then(function (res) {
        if (res.error) throw res.error;
      });
    }
    return loadLocalOrSeed(true).then(function (list) {
      writeLocal(list.filter(function (p) { return p.id !== id; }));
    });
  }

  function adjustStock(id, delta) {
    return byId(id).then(function (p) {
      if (!p) return;
      p.stock_qty = Math.max(0, (Number(p.stock_qty) || 0) + delta);
      return saveProduct(p);
    });
  }

  global.AryamCatalog = {
    hasSupabase: hasSupabase,
    client: client,
    loadAll: loadAll,
    bySlug: bySlug,
    byId: byId,
    saveProduct: saveProduct,
    deleteProduct: deleteProduct,
    adjustStock: adjustStock,
    normalize: normalize,
    writeLocal: writeLocal,
    LOCAL_KEY: LOCAL_KEY
  };
})(window);
