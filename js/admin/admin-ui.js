(function () {
  "use strict";

  var loginForm = document.getElementById("loginForm");
  if (loginForm) {
    if (AryamAdminAuth.isAuthed()) {
      location.href = "/admin/products";
      return;
    }
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = AryamAdminAuth.login(loginForm.password.value);
      var err = document.getElementById("loginError");
      if (ok) location.href = "/admin/products";
      else {
        err.hidden = false;
        err.textContent = "Wrong password.";
      }
    });
    return;
  }

  AryamAdminAuth.requireAuth();

  var logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      AryamAdminAuth.logout();
      location.href = "/admin/";
    });
  }

  /* Mobile nav */
  var navToggle = document.getElementById("navToggle");
  var backdrop = document.getElementById("adminBackdrop");
  function closeNav() { document.body.classList.remove("admin-nav-open"); if (backdrop) backdrop.hidden = true; }
  function openNav() { document.body.classList.add("admin-nav-open"); if (backdrop) backdrop.hidden = false; }
  if (navToggle) navToggle.addEventListener("click", function () {
    if (document.body.classList.contains("admin-nav-open")) closeNav();
    else openNav();
  });
  if (backdrop) backdrop.addEventListener("click", closeNav);

  var tableBody = document.getElementById("productRows");
  var cardsEl = document.getElementById("productCards");
  var editor = document.getElementById("productEditor");
  var spotBar = document.getElementById("spotBar");
  var photoPreview = document.getElementById("photoPreview");
  var photoCamera = document.getElementById("photoCamera");
  var photoGallery = document.getElementById("photoGallery");
  var uploadStatus = document.getElementById("uploadStatus");
  var uploadProgress = document.getElementById("uploadProgress");
  var uploadProgressBar = document.getElementById("uploadProgressBar");
  var uploadProgressTrack = document.getElementById("uploadProgressTrack");
  var imageUrlField = document.getElementById("imageUrlField");
  var spotOz = null;

  function clearPhotoInputs() {
    if (photoCamera) photoCamera.value = "";
    if (photoGallery) photoGallery.value = "";
  }

  function setUploadProgress(percent, message, visible) {
    if (uploadProgress) {
      if (visible === false) uploadProgress.hidden = true;
      else uploadProgress.hidden = false;
    }
    var p = Math.max(0, Math.min(100, Math.round(percent || 0)));
    if (uploadProgressBar) uploadProgressBar.style.width = p + "%";
    if (uploadProgressTrack) uploadProgressTrack.setAttribute("aria-valuenow", String(p));
    if (uploadStatus && message != null) uploadStatus.textContent = message;
  }

  function hideUploadProgressSoon() {
    setTimeout(function () {
      if (uploadProgress) uploadProgress.hidden = true;
      if (uploadProgressBar) uploadProgressBar.style.width = "0%";
    }, 1600);
  }

  function setPhotoPreview(url) {
    if (!photoPreview) return;
    if (url) {
      photoPreview.classList.add("has-image");
      photoPreview.innerHTML = '<img src="' + url + '" alt="Product photo" />';
    } else {
      photoPreview.classList.remove("has-image");
      photoPreview.textContent = "Tap below to take or choose a photo";
    }
  }

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

  function imgSrc(p) {
    var u = (p && p.image_url) || "/images/hero.jpg";
    if (u.indexOf("../") === 0) u = "/" + u.replace(/^\.\.\//, "");
    return u;
  }

  function loadTable() {
    AryamCatalog.loadAll(true).then(function (list) {
      if (!list.length) {
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="8">No products yet. Add one.</td></tr>';
        if (cardsEl) cardsEl.innerHTML = '<p class="empty-state" style="color:var(--muted);text-align:center;padding:2rem">No products yet. Tap <strong>Add piece</strong>.</p>';
        return;
      }

      if (cardsEl) {
        cardsEl.innerHTML = list.map(function (p) {
          var price = AryamPricing.formatMoney(AryamPricing.displayPrice(p));
          return (
            '<article class="admin-card">' +
              '<img src="' + imgSrc(p) + '" alt="" loading="lazy" />' +
              "<div>" +
                "<h3>" + esc(p.title) + "</h3>" +
                '<p class="meta">' + p.karat + "K · " + p.weight_grams + "g · stock " + p.stock_qty +
                  ' · <span class="' + (p.published ? "badge-live" : "badge-draft") + '">' +
                  (p.published ? "Live" : "Draft") + "</span></p>" +
                '<p class="price">' + price + "</p>" +
                '<div class="actions">' +
                  '<button type="button" class="btn btn-ghost btn-small" data-edit="' + p.id + '">Edit</button>' +
                  '<button type="button" class="btn btn-ghost btn-small" data-del="' + p.id + '">Delete</button>' +
                "</div>" +
              "</div>" +
            "</article>"
          );
        }).join("");
      }

      if (tableBody) {
        tableBody.innerHTML = list.map(function (p) {
          var price = AryamPricing.formatMoney(AryamPricing.displayPrice(p));
          return (
            "<tr>" +
              '<td><img class="thumb" src="' + imgSrc(p) + '" alt="" /></td>' +
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
      }
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
    var tb = document.getElementById("mainToolbar");
    if (tb) tb.hidden = true;
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
    imageUrlField.value = product ? (product.image_url || "") : "";
    f.published.checked = product ? !!product.published : true;
    document.getElementById("editorTitle").textContent = product ? "Edit piece" : "New piece";
    setPhotoPreview(imageUrlField.value);
    if (uploadStatus) uploadStatus.textContent = "";
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

  function onListClick(e) {
    var editId = e.target.getAttribute("data-edit");
    var delId = e.target.getAttribute("data-del");
    if (editId) AryamCatalog.byId(editId).then(openEditor);
    if (delId && confirm("Delete this piece?")) {
      AryamCatalog.deleteProduct(delId).then(loadTable);
    }
  }

  if (tableBody) tableBody.addEventListener("click", onListClick);
  if (cardsEl) cardsEl.addEventListener("click", onListClick);

  if (editor) {
    ["weight_grams", "sell_price_per_gram", "making_charge", "karat"].forEach(function (name) {
      editor[name].addEventListener("input", updatePreview);
    });

    document.getElementById("btnNew").addEventListener("click", function () {
      openEditor(null);
    });

    document.getElementById("btnCancel").addEventListener("click", function () {
      editor.hidden = true;
      var tb = document.getElementById("mainToolbar");
      if (tb) tb.hidden = false;
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

    document.getElementById("btnClearPhoto").addEventListener("click", function () {
      imageUrlField.value = "";
      clearPhotoInputs();
      setPhotoPreview("");
      if (uploadStatus) uploadStatus.textContent = "";
      if (uploadProgress) uploadProgress.hidden = true;
      if (uploadProgressBar) uploadProgressBar.style.width = "0%";
    });

    function onPhotoPicked(input) {
      var file = input.files && input.files[0];
      if (!file) return;
      var hint = editor.slug.value || editor.title.value || "piece";
      setUploadProgress(2, "Starting upload (" + AryamUpload.formatBytes(file.size) + ")…", true);
      AryamUpload.uploadProductImage(file, hint, function (info) {
        setUploadProgress(info.percent, info.message, true);
      })
        .then(function (url) {
          imageUrlField.value = url;
          setPhotoPreview(url);
          if (url.indexOf("data:") === 0) {
            setUploadProgress(100, "Saved as local preview (set up Storage for permanent cloud URLs).", true);
          } else {
            setUploadProgress(100, "Photo uploaded in high quality.", true);
          }
          hideUploadProgressSoon();
        })
        .catch(function (err) {
          setUploadProgress(0, "Upload failed: " + (err.message || err), true);
        });
    }

    function bindPhotoInput(input) {
      if (!input) return;
      input.addEventListener("change", function () {
        onPhotoPicked(input);
      });
    }

    bindPhotoInput(photoCamera);
    bindPhotoInput(photoGallery);

    var btnTakePhoto = document.getElementById("btnTakePhoto");
    var btnChooseGallery = document.getElementById("btnChooseGallery");

    if (btnTakePhoto && photoCamera) {
      btnTakePhoto.addEventListener("click", function () {
        photoCamera.value = "";
        photoCamera.click();
      });
    }

    if (btnChooseGallery && photoGallery) {
      btnChooseGallery.addEventListener("click", function () {
        // Ensure no capture attribute (iPhone opens camera if capture is set)
        photoGallery.removeAttribute("capture");
        photoGallery.value = "";
        photoGallery.click();
      });
    }

    editor.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!imageUrlField.value.trim()) {
        if (!confirm("No photo yet. Save anyway?")) return;
      }
      var btn = document.getElementById("btnSave");
      btn.disabled = true;
      btn.textContent = "Saving…";
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
        image_url: imageUrlField.value.trim(),
        published: editor.published.checked
      };
      AryamCatalog.saveProduct(product).then(function () {
        editor.hidden = true;
        var tb = document.getElementById("mainToolbar");
        if (tb) tb.hidden = false;
        loadTable();
      }).catch(function (err) {
        alert("Save failed: " + (err.message || err));
      }).finally(function () {
        btn.disabled = false;
        btn.textContent = "Save piece";
      });
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
