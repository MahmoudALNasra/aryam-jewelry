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
  var photoStrip = document.getElementById("photoStrip");
  var photoCamera = document.getElementById("photoCamera");
  var photoGallery = document.getElementById("photoGallery");
  var uploadStatus = document.getElementById("uploadStatus");
  var uploadProgress = document.getElementById("uploadProgress");
  var uploadProgressBar = document.getElementById("uploadProgressBar");
  var uploadProgressTrack = document.getElementById("uploadProgressTrack");
  var imageUrlField = document.getElementById("imageUrlField");
  var imageUrlsField = document.getElementById("imageUrlsField");
  var spotOz = null;
  var MAX_PHOTOS = 8;

  function clearPhotoInputs() {
    if (photoCamera) photoCamera.value = "";
    if (photoGallery) photoGallery.value = "";
  }

  function getImageUrls() {
    try {
      var parsed = JSON.parse((imageUrlsField && imageUrlsField.value) || "[]");
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch (e) {
      return [];
    }
  }

  function setImageUrls(urls) {
    var list = (urls || []).filter(Boolean).slice(0, MAX_PHOTOS);
    if (imageUrlsField) imageUrlsField.value = JSON.stringify(list);
    if (imageUrlField) imageUrlField.value = list[0] || "";
    renderPhotoGallery(list);
  }

  function displayThumb(url) {
    if (typeof AryamMedia !== "undefined") return AryamMedia.displayUrl(url, "thumb");
    return url;
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

  function renderPhotoGallery(urls) {
    urls = urls || getImageUrls();
    if (!photoPreview) return;
    if (!urls.length) {
      photoPreview.classList.remove("has-image");
      photoPreview.textContent = "Tap below to add photos";
      if (photoStrip) {
        photoStrip.hidden = true;
        photoStrip.innerHTML = "";
      }
      return;
    }
    photoPreview.classList.add("has-image");
    photoPreview.innerHTML = '<img src="' + displayThumb(urls[0]) + '" alt="Cover photo" />';
    if (!photoStrip) return;
    photoStrip.hidden = false;
    photoStrip.innerHTML = urls.map(function (url, i) {
      return (
        '<div class="photo-thumb' + (i === 0 ? " is-cover" : "") + '" data-photo-index="' + i + '">' +
          '<img src="' + displayThumb(url) + '" alt="Photo ' + (i + 1) + '" />' +
          (i === 0 ? '<span class="thumb-cover">Cover</span>' : "") +
          '<button type="button" class="thumb-remove" data-remove-photo="' + i + '" aria-label="Remove photo">×</button>' +
        "</div>"
      );
    }).join("");
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
    if (typeof AryamMedia !== "undefined") return AryamMedia.displayUrl(u, "thumb");
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
    f.sku.value = product ? (product.sku || "") : "";
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
    setImageUrls(product ? (product.image_urls && product.image_urls.length ? product.image_urls : (product.image_url ? [product.image_url] : [])) : []);
    f.published.checked = product ? !!product.published : true;
    document.getElementById("editorTitle").textContent = product ? "Edit piece" : "New piece";
    if (uploadStatus) uploadStatus.textContent = "";
    if (uploadProgress) uploadProgress.hidden = true;
    var fe = document.getElementById("formError");
    if (fe) { fe.hidden = true; fe.textContent = ""; }
    var pe = document.getElementById("photoError");
    if (pe) pe.hidden = true;
    var wrap = editor.querySelector(".photo-upload");
    if (wrap) wrap.classList.remove("is-invalid");
    Array.prototype.forEach.call(editor.querySelectorAll("[data-validate]"), function (el) {
      el.classList.remove("is-invalid", "is-valid");
      var lab = el.closest("label");
      if (lab) lab.classList.remove("is-invalid");
    });
    skuManual = !!(product && product.sku);
    if (!skuManual) refreshSku(true);
    updatePreview();
  }

  function buildAutoSku() {
    var title = (editor.title.value || "").trim();
    var gramsRaw = String(editor.weight_grams.value || "").trim();
    var karat = String(editor.karat.value || "21");
    var namePart = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 28);
    var gramsPart = "";
    if (gramsRaw !== "" && isFinite(Number(gramsRaw)) && Number(gramsRaw) > 0) {
      gramsPart = Number(gramsRaw).toFixed(3).replace(/\.?0+$/, "") + "g";
    }
    var parts = ["ARY", karat + "K"];
    if (gramsPart) parts.push(gramsPart);
    if (namePart) parts.push(namePart);
    return parts.join("-").toUpperCase();
  }

  var skuManual = false;

  function refreshSku(force) {
    if (!editor || !editor.sku) return;
    if (!force && skuManual) return;
    var next = buildAutoSku();
    editor.sku.value = next === "ARY-21K" ? "" : next;
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

    ["title", "weight_grams", "karat"].forEach(function (name) {
      editor[name].addEventListener("input", function () { refreshSku(false); });
      editor[name].addEventListener("change", function () { refreshSku(false); });
    });

    editor.sku.addEventListener("input", function () {
      skuManual = editor.sku.value.trim().length > 0;
      if (!skuManual) refreshSku(true);
    });
    editor.sku.addEventListener("blur", function () {
      if (!editor.sku.value.trim()) {
        skuManual = false;
        refreshSku(true);
      }
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
      clearPhotoInputs();
      setImageUrls([]);
      if (uploadStatus) uploadStatus.textContent = "";
      if (uploadProgress) uploadProgress.hidden = true;
      if (uploadProgressBar) uploadProgressBar.style.width = "0%";
    });

    if (photoStrip) {
      photoStrip.addEventListener("click", function (e) {
        var removeBtn = e.target.closest("[data-remove-photo]");
        if (removeBtn) {
          e.preventDefault();
          var removeIdx = Number(removeBtn.getAttribute("data-remove-photo"));
          var next = getImageUrls().filter(function (_u, i) { return i !== removeIdx; });
          setImageUrls(next);
          return;
        }
        var thumb = e.target.closest("[data-photo-index]");
        if (!thumb) return;
        var idx = Number(thumb.getAttribute("data-photo-index"));
        var urls = getImageUrls();
        if (idx <= 0 || idx >= urls.length) return;
        var chosen = urls.splice(idx, 1)[0];
        urls.unshift(chosen);
        setImageUrls(urls);
      });
    }

    function uploadFilesSequentially(files) {
      var list = Array.prototype.slice.call(files || [], 0).filter(Boolean);
      if (!list.length) return Promise.resolve();
      var existing = getImageUrls();
      var room = MAX_PHOTOS - existing.length;
      if (room <= 0) {
        alert("Maximum " + MAX_PHOTOS + " photos per piece.");
        return Promise.resolve();
      }
      if (list.length > room) {
        list = list.slice(0, room);
        alert("Only " + room + " more photo(s) can be added (max " + MAX_PHOTOS + ").");
      }

      var hint = editor.slug.value || editor.title.value || "piece";
      var uploaded = existing.slice();
      var i = 0;

      function next() {
        if (i >= list.length) {
          setImageUrls(uploaded);
          setUploadProgress(100, list.length > 1 ? "Uploaded " + list.length + " photos." : "Photo uploaded in high quality.", true);
          hideUploadProgressSoon();
          return Promise.resolve();
        }
        var file = list[i];
        var n = i + 1;
        setUploadProgress(5, "Uploading photo " + n + " of " + list.length + " (" + AryamUpload.formatBytes(file.size) + ")…", true);
        return AryamUpload.uploadProductImage(file, hint + "-" + n, function (info) {
          var base = ((n - 1) / list.length) * 100;
          var span = 100 / list.length;
          var pct = Math.round(base + ((info.percent || 0) / 100) * span);
          setUploadProgress(pct, "Photo " + n + "/" + list.length + ": " + (info.message || "Uploading…"), true);
        }).then(function (url) {
          if (url) uploaded.push(url);
          i += 1;
          return next();
        });
      }

      return next().catch(function (err) {
        setImageUrls(uploaded);
        setUploadProgress(0, "Upload failed: " + (err.message || err), true);
      });
    }

    function onPhotoPicked(input) {
      var files = input.files;
      if (!files || !files.length) return;
      uploadFilesSequentially(files).then(function () {
        clearPhotoInputs();
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
        photoGallery.removeAttribute("capture");
        photoGallery.value = "";
        photoGallery.click();
      });
    }

    var formError = document.getElementById("formError");
    var photoError = document.getElementById("photoError");
    var CATEGORIES = ["bridal", "bangles", "necklaces", "rings", "coins", "earrings", "other"];
    var KARATS = [18, 21, 22, 24];

    function setFieldState(el, ok, touched) {
      if (!el) return;
      var label = el.closest("label");
      el.classList.toggle("is-invalid", touched && !ok);
      el.classList.toggle("is-valid", touched && ok);
      if (label) label.classList.toggle("is-invalid", touched && !ok);
    }

    function validateField(el, touched) {
      if (!el || !el.getAttribute("data-validate")) return true;
      var kind = el.getAttribute("data-validate");
      var raw = String(el.value == null ? "" : el.value).trim();
      var ok = true;
      if (kind === "required") ok = raw.length > 0;
      else if (kind === "weight") ok = Number(raw) > 0 && isFinite(Number(raw));
      else if (kind === "price") ok = raw !== "" && Number(raw) >= 0 && isFinite(Number(raw));
      else if (kind === "making") ok = raw === "" || (Number(raw) >= 0 && isFinite(Number(raw)));
      else if (kind === "stock") ok = raw !== "" && Number(raw) >= 0 && Number.isFinite(Number(raw)) && Math.floor(Number(raw)) === Number(raw);
      else if (kind === "category") ok = CATEGORIES.indexOf(raw) >= 0;
      else if (kind === "karat") ok = KARATS.indexOf(Number(raw)) >= 0;
      if (touched) setFieldState(el, ok, true);
      return ok;
    }

    function validatePhotos(touched) {
      var urls = getImageUrls();
      var published = !!(editor.published && editor.published.checked);
      var ok = !published || urls.length > 0;
      var wrap = editor.querySelector(".photo-upload");
      if (wrap && touched) wrap.classList.toggle("is-invalid", !ok);
      if (photoError) photoError.hidden = ok || !touched;
      return ok;
    }

    function validateForm(touched) {
      var ok = true;
      var fields = editor.querySelectorAll("[data-validate]");
      Array.prototype.forEach.call(fields, function (el) {
        if (!validateField(el, touched)) ok = false;
      });
      if (!validatePhotos(touched)) ok = false;
      return ok;
    }

    function showFormError(msg) {
      if (!formError) return;
      if (!msg) {
        formError.hidden = true;
        formError.textContent = "";
        return;
      }
      formError.hidden = false;
      formError.textContent = msg;
    }

    Array.prototype.forEach.call(editor.querySelectorAll("[data-validate]"), function (el) {
      el.addEventListener("blur", function () { validateField(el, true); });
      el.addEventListener("input", function () {
        if (el.classList.contains("is-invalid") || el.classList.contains("is-valid")) {
          validateField(el, true);
        }
        showFormError("");
      });
      el.addEventListener("change", function () {
        validateField(el, true);
        showFormError("");
      });
    });

    if (editor.published) {
      editor.published.addEventListener("change", function () {
        validatePhotos(true);
      });
    }

    editor.addEventListener("submit", function (e) {
      e.preventDefault();
      showFormError("");
      if (!validateForm(true)) {
        showFormError("Please fix the highlighted required fields before saving.");
        var firstBad = editor.querySelector(".is-invalid");
        if (firstBad && firstBad.scrollIntoView) firstBad.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      var urls = getImageUrls();
      var btn = document.getElementById("btnSave");
      btn.disabled = true;
      btn.textContent = "Saving…";
      var product = {
        id: editor.id.value || undefined,
        slug: editor.slug.value.trim(),
        sku: editor.sku.value.trim() || null,
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
        image_url: urls[0] || "",
        image_urls: urls,
        published: editor.published.checked
      };
      AryamCatalog.saveProduct(product).then(function () {
        editor.hidden = true;
        var tb = document.getElementById("mainToolbar");
        if (tb) tb.hidden = false;
        loadTable();
      }).catch(function (err) {
        var msg = (err && err.message) || String(err);
        if (/row-level security|row level security|RLS/i.test(msg)) {
          msg = "Save blocked by Supabase security policy. Run supabase/admin-rls.sql in the Supabase SQL Editor, then try again.";
        }
        showFormError("Save failed: " + msg);
        alert("Save failed: " + msg);
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
