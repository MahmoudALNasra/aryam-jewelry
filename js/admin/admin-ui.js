(function () {
  "use strict";

  var loginForm = document.getElementById("loginForm");
  if (loginForm) {
    if (AryamAdminAuth.isAuthed()) {
      location.href = "products.html";
      return;
    }
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = AryamAdminAuth.login(loginForm.password.value);
      var err = document.getElementById("loginError");
      if (ok) location.href = "products.html";
      else {
        err.hidden = false;
        err.textContent = "Wrong password. Check env.example / config.js (ADMIN_DEMO_PASSWORD).";
      }
    });
    return;
  }

  AryamAdminAuth.requireAuth();

  var logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      AryamAdminAuth.logout();
      location.href = "index.html";
    });
  }

  var tableBody = document.getElementById("productRows");
  var editor = document.getElementById("productEditor");
  var spotBar = document.getElementById("spotBar");
  var spotOz = null;

  function refreshSpot() {
    if (!spotBar) return;
    AryamPricing.fetchSpot().then(function (spot) {
      spotOz = spot;
      if (!spot) {
        spotBar.innerHTML = "Live gold spot unavailable — enter sell $/g manually.";
        return;
      }
      spotBar.innerHTML =
        "Live spot <strong>" + AryamPricing.formatMoney(spot) + "/oz</strong>" +
        " · 24K ~<strong>" + AryamPricing.formatMoney(AryamPricing.marketPerGram(spot, 24)) + "/g</strong>" +
        " · 22K ~<strong>" + AryamPricing.formatMoney(AryamPricing.marketPerGram(spot, 22)) + "/g</strong>" +
        " · 21K ~<strong>" + AryamPricing.formatMoney(AryamPricing.marketPerGram(spot, 21)) + "/g</strong>" +
        " · 18K ~<strong>" + AryamPricing.formatMoney(AryamPricing.marketPerGram(spot, 18)) + "/g</strong>";
      updatePreview();
    });
  }

  function loadTable() {
    if (!tableBody) return;
    AryamCatalog.loadAll(true).then(function (list) {
      if (!list.length) {
        tableBody.innerHTML = '<tr><td colspan="8">No products yet. Add one.</td></tr>';
        return;
      }
      tableBody.innerHTML = list.map(function (p) {
        var price = AryamPricing.formatMoney(AryamPricing.displayPrice(p));
        return (
          "<tr>" +
            '<td><img class="thumb" src="' + (p.image_url || "../images/hero.jpg") + '" alt="" /></td>' +
            "<td><strong>" + esc(p.title) + "</strong><br><span style='color:var(--muted);font-size:0.8rem'>" + esc(p.sku || p.slug) + "</span></td>" +
            "<td>" + p.karat + "K</td>" +
            "<td>" + p.weight_grams + " g</td>" +
            "<td>" + price + "</td>" +
            "<td>" + p.stock_qty + "</td>" +
            "<td>" + (p.published ? "Live" : "Draft") + "</td>" +
            '<td class="actions">' +
              '<button type="button" class="btn btn-ghost btn-small" data-edit="' + p.id + '">Edit</button>' +
              '<button type="button" class="btn btn-ghost btn-small" data-del="' + p.id + '">Delete</button>' +
            "</td>" +
          "</tr>"
        );
      }).join("");
    });
  }

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function openEditor(product) {
    if (!editor) return;
    editor.hidden = false;
    editor.scrollIntoView({ behavior: "smooth", block: "start" });
    var f = editor;
    f.id.value = product ? product.id : "";
    f.slug.value = product ? product.slug : "";
    f.sku.value = product ? product.sku : "";
    f.title.value = product ? product.title : "";
    f.title_ar.value = product ? product.title_ar : "";
    f.description.value = product ? product.description : "";
    f.description_ar.value = product ? product.description_ar : "";
    f.seo_title.value = product ? product.seo_title : "";
    f.seo_description.value = product ? product.seo_description : "";
    f.category.value = product ? product.category : "other";
    f.karat.value = product ? product.karat : 21;
    f.weight_grams.value = product ? product.weight_grams : "";
    f.sell_price_per_gram.value = product ? product.sell_price_per_gram : "";
    f.making_charge.value = product ? product.making_charge : 0;
    f.stock_qty.value = product ? product.stock_qty : 1;
    f.image_url.value = product ? product.image_url : "../images/products/";
    f.published.checked = product ? !!product.published : true;
    document.getElementById("editorTitle").textContent = product ? "Edit piece" : "New piece";
    updatePreview();
  }

  function updatePreview() {
    if (!editor || editor.hidden) return;
    var mock = {
      weight_grams: Number(editor.weight_grams.value) || 0,
      sell_price_per_gram: Number(editor.sell_price_per_gram.value) || 0,
      making_charge: Number(editor.making_charge.value) || 0,
      karat: Number(editor.karat.value) || 21
    };
    var price = AryamPricing.displayPrice(mock);
    var el = document.getElementById("pricePreview");
    var market = spotOz != null ? AryamPricing.marketPerGram(spotOz, mock.karat) : null;
    var margin = market != null ? mock.sell_price_per_gram - market : null;
    el.innerHTML =
      '<div class="big">' + AryamPricing.formatMoney(price) + "</div>" +
      "<div>" + mock.weight_grams + " g × " + AryamPricing.formatMoney(mock.sell_price_per_gram) + "/g" +
      (mock.making_charge ? " + " + AryamPricing.formatMoney(mock.making_charge) + " making" : "") +
      "</div>" +
      (market != null
        ? "<div style='margin-top:0.5rem;color:var(--muted)'>Market ~" + AryamPricing.formatMoney(market) +
          "/g for " + mock.karat + "K · your rate is " +
          (margin >= 0 ? "+" : "") + AryamPricing.formatMoney(margin) + "/g vs market</div>"
        : "");
  }

  if (editor) {
    ["weight_grams", "sell_price_per_gram", "making_charge", "karat"].forEach(function (name) {
      editor[name].addEventListener("input", updatePreview);
    });

    document.getElementById("btnNew").addEventListener("click", function () {
      openEditor(null);
    });

    document.getElementById("btnCancel").addEventListener("click", function () {
      editor.hidden = true;
    });

    document.getElementById("btnUseMarket").addEventListener("click", function () {
      if (spotOz == null) return;
      var k = Number(editor.karat.value) || 21;
      var m = AryamPricing.marketPerGram(spotOz, k);
      if (m != null) {
        editor.sell_price_per_gram.value = (Math.round(m * 100) / 100).toFixed(2);
        updatePreview();
      }
    });

    document.getElementById("btnMarkup").addEventListener("click", function () {
      if (spotOz == null) return;
      var pct = Number(prompt("Markup % over market (e.g. 5 for 5%)", "5"));
      if (isNaN(pct)) return;
      var k = Number(editor.karat.value) || 21;
      var m = AryamPricing.marketPerGram(spotOz, k);
      if (m != null) {
        editor.sell_price_per_gram.value = (Math.round(m * (1 + pct / 100) * 100) / 100).toFixed(2);
        updatePreview();
      }
    });

    editor.addEventListener("submit", function (e) {
      e.preventDefault();
      var product = {
        id: editor.id.value || undefined,
        slug: editor.slug.value.trim(),
        sku: editor.sku.value.trim(),
        title: editor.title.value.trim(),
        title_ar: editor.title_ar.value.trim(),
        description: editor.description.value.trim(),
        description_ar: editor.description_ar.value.trim(),
        seo_title: editor.seo_title.value.trim(),
        seo_description: editor.seo_description.value.trim(),
        category: editor.category.value,
        karat: Number(editor.karat.value),
        weight_grams: Number(editor.weight_grams.value),
        sell_price_per_gram: Number(editor.sell_price_per_gram.value),
        making_charge: Number(editor.making_charge.value) || 0,
        stock_qty: Number(editor.stock_qty.value) || 0,
        image_url: editor.image_url.value.trim(),
        published: editor.published.checked
      };
      AryamCatalog.saveProduct(product).then(function () {
        editor.hidden = true;
        loadTable();
      }).catch(function (err) {
        alert("Save failed: " + (err.message || err));
      });
    });

    tableBody.addEventListener("click", function (e) {
      var editId = e.target.getAttribute("data-edit");
      var delId = e.target.getAttribute("data-del");
      if (editId) {
        AryamCatalog.byId(editId).then(openEditor);
      }
      if (delId && confirm("Delete this piece?")) {
        AryamCatalog.deleteProduct(delId).then(loadTable);
      }
    });
  }

  var exportBtn = document.getElementById("btnExport");
  if (exportBtn) {
    exportBtn.addEventListener("click", function () {
      AryamCatalog.loadAll(true).then(function (list) {
        AryamGMC.download(list);
      });
    });
  }

  var resetBtn = document.getElementById("btnResetSeed");
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      if (!confirm("Reset local catalog to seed data? Unsaved local edits will be lost.")) return;
      localStorage.removeItem(AryamCatalog.LOCAL_KEY);
      loadTable();
    });
  }

  refreshSpot();
  loadTable();
})();
