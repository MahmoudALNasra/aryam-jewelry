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
    if (typeof saveDraftSoon === "function") saveDraftSoon();
  }

  function displayThumb(url) {
    if (typeof AryamMedia !== "undefined" && AryamMedia.isVideoUrl && AryamMedia.isVideoUrl(url)) {
      return AryamMedia.posterUrl(url, "thumb");
    }
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
      photoPreview.textContent = "Tap below to add photos or videos";
      if (photoStrip) {
        photoStrip.hidden = true;
        photoStrip.innerHTML = "";
      }
      return;
    }
    photoPreview.classList.add("has-image");
    var cover = urls[0];
    if (typeof AryamMedia !== "undefined" && AryamMedia.isVideoUrl(cover)) {
      photoPreview.innerHTML =
        '<video src="' + cover + '" poster="' + displayThumb(cover) + '" muted playsinline controls loop></video>' +
        '<span class="media-badge">Video</span>';
    } else {
      photoPreview.innerHTML = '<img src="' + displayThumb(cover) + '" alt="Cover media" />';
    }
    if (!photoStrip) return;
    photoStrip.hidden = false;
    photoStrip.innerHTML = urls.map(function (url, i) {
      var video = typeof AryamMedia !== "undefined" && AryamMedia.isVideoUrl(url);
      return (
        '<div class="photo-thumb' + (i === 0 ? " is-cover" : "") + (video ? " is-video" : "") + '" data-photo-index="' + i + '">' +
          '<img src="' + displayThumb(url) + '" alt="Media ' + (i + 1) + '" />' +
          (video ? '<span class="thumb-video">Video</span>' : "") +
          (i === 0 ? '<span class="thumb-cover">Cover</span>' : "") +
          '<button type="button" class="thumb-remove" data-remove-photo="' + i + '" aria-label="Remove">×</button>' +
        "</div>"
      );
    }).join("");
  }

  function refreshSpot() {
    if (!spotBar) return;
    AryamPricing.fetchSpot().then(function (spot) {
      spotOz = spot;
      if (!spot) {
        spotBar.innerHTML = "Live gold spot unavailable — enter sell $/g manually. <button type=\"button\" class=\"spot-refresh\" id=\"btnRefreshSpot\">Retry</button>";
        wireSpotRefresh();
        return;
      }
      var stamp = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      spotBar.innerHTML =
        "Live spot <strong>" + AryamPricing.formatMoney(spot) + "/oz</strong>" +
        " · 24K ~<strong>" + AryamPricing.formatMoney(AryamPricing.marketPerGram(spot, 24)) + "/g</strong>" +
        " · 22K ~<strong>" + AryamPricing.formatMoney(AryamPricing.marketPerGram(spot, 22)) + "/g</strong>" +
        " · 21K ~<strong>" + AryamPricing.formatMoney(AryamPricing.marketPerGram(spot, 21)) + "/g</strong>" +
        " · 18K ~<strong>" + AryamPricing.formatMoney(AryamPricing.marketPerGram(spot, 18)) + "/g</strong>" +
        " <span class=\"spot-stamp\">· updated " + stamp + "</span>" +
        " <button type=\"button\" class=\"spot-refresh\" id=\"btnRefreshSpot\">Refresh</button>";
      wireSpotRefresh();
      updatePreview();
    });
  }

  function wireSpotRefresh() {
    var btn = document.getElementById("btnRefreshSpot");
    if (!btn) return;
    btn.addEventListener("click", function () {
      if (spotBar) spotBar.textContent = "Refreshing live gold spot…";
      refreshSpot();
    });
  }

  function imgSrc(p) {
    var u = (p && p.image_url) || "/images/hero.jpg";
    if (u.indexOf("../") === 0) u = "/" + u.replace(/^\.\.\//, "");
    if (typeof AryamMedia !== "undefined") {
      if (AryamMedia.isVideoUrl(u)) return AryamMedia.posterUrl(u, "thumb");
      return AryamMedia.displayUrl(u, "thumb");
    }
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

    var draft = readDraft(product && product.id);
    var useDraft = !!(draft && draft.fields && (!product || !product.id));
    if (product && product.id && draft && draft.fields && draft.productId === String(product.id)) {
      useDraft = confirm("A saved draft for this piece was found. Restore it?");
    }

    var src = useDraft ? draft.fields : null;
    var f = editor;
    f.id.value = product ? product.id : (src && src.id) || "";
    f.slug.value = src ? (src.slug || "") : (product ? product.slug : "");
    f.sku.value = src ? (src.sku || "") : (product ? (product.sku || "") : "");
    f.title.value = src ? (src.title || "") : (product ? product.title : "");
    f.title_ar.value = src ? (src.title_ar || "") : (product ? product.title_ar : "");
    f.description.value = src ? (src.description || "") : (product ? product.description : "");
    f.description_ar.value = src ? (src.description_ar || "") : (product ? product.description_ar : "");
    f.seo_title.value = src ? (src.seo_title || "") : (product ? product.seo_title : "");
    f.seo_description.value = src ? (src.seo_description || "") : (product ? product.seo_description : "");
    f.category.value = src ? (src.category || "other") : (product ? product.category : "other");
    f.karat.value = src ? (src.karat || 21) : (product ? product.karat : 21);
    f.weight_grams.value = src ? (src.weight_grams || "") : (product ? product.weight_grams : "");
    f.sell_price_per_gram.value = src ? (src.sell_price_per_gram || "") : (product ? product.sell_price_per_gram : "");
    f.making_charge.value = src ? (src.making_charge || 0) : (product ? product.making_charge : 0);
    f.fixed_price.value = src
      ? (src.fixed_price != null ? src.fixed_price : "")
      : (product && product.fixed_price != null ? product.fixed_price : "");
    f.stock_qty.value = src ? (src.stock_qty != null ? src.stock_qty : 1) : (product ? product.stock_qty : 1);
    f.rich_content.value = src ? (src.rich_content || "") : (product ? (product.rich_content || "") : "");
    f.rich_content_ar.value = src ? (src.rich_content_ar || "") : (product ? (product.rich_content_ar || "") : "");
    var mode = src
      ? (src.price_mode === "fixed" ? "fixed" : "formula")
      : (product && product.price_mode === "fixed" ? "fixed" : "formula");
    Array.prototype.forEach.call(editor.querySelectorAll('input[name="price_mode"]'), function (r) {
      r.checked = r.value === mode;
    });
    syncPriceModeUI();
    imageUrlField.value = src ? (src.image_url || "") : (product ? (product.image_url || "") : "");
    setImageUrls(
      src
        ? (src.image_urls || [])
        : (product ? (product.image_urls && product.image_urls.length ? product.image_urls : (product.image_url ? [product.image_url] : [])) : [])
    );
    f.published.checked = src
      ? src.published !== false
      : (product ? !!product.published : true);

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

    if (useDraft && draft && draft.flags) {
      applyAutoFlags(draft.flags);
      // If SEO was never filled, keep auto mode on.
      if (!(draft.fields && String(draft.fields.seo_title || "").trim())) autoFlags.seoTitleManual = false;
      if (!(draft.fields && String(draft.fields.seo_description || "").trim())) autoFlags.seoDescManual = false;
      refreshSku(false);
      refreshSlug(false);
      refreshSeo(false);
      if (!fieldEl("seo_title") || !fieldEl("seo_title").value.trim()) refreshSeo(true);
      scheduleArabicTranslate();
      saveDraftSoon();
      showDraftStatus(draft);
    } else if (product) {
      applyAutoFlags({
        skuManual: !!product.sku,
        slugManual: !!product.slug,
        seoTitleManual: !!product.seo_title,
        seoDescManual: !!product.seo_description,
        titleArManual: !!product.title_ar,
        descArManual: !!product.description_ar,
        richArManual: !!product.rich_content_ar
      });
      if (!editor.sku.value) { autoFlags.skuManual = false; refreshSku(true); }
      if (!editor.slug.value) { autoFlags.slugManual = false; refreshSlug(true); }
      var seoTitleInput = fieldEl("seo_title");
      var seoDescInput = fieldEl("seo_description");
      if (!seoTitleInput || !seoTitleInput.value) autoFlags.seoTitleManual = false;
      if (!seoDescInput || !seoDescInput.value) autoFlags.seoDescManual = false;
      refreshSeo(true);
      if (!editor.title_ar.value || !editor.description_ar.value || !editor.rich_content_ar.value) {
        if (!editor.title_ar.value) autoFlags.titleArManual = false;
        if (!editor.description_ar.value) autoFlags.descArManual = false;
        if (!editor.rich_content_ar.value) autoFlags.richArManual = false;
        scheduleArabicTranslate();
      }
      saveDraftSoon();
      showDraftStatus(null);
    } else {
      applyAutoFlags({
        skuManual: false,
        slugManual: false,
        seoTitleManual: false,
        seoDescManual: false,
        titleArManual: false,
        descArManual: false,
        richArManual: false
      });
      refreshDerivedFields(true);
      showDraftStatus(null);
    }

    updatePreview();
  }

  var DRAFT_PREFIX = "aryamProductEditorDraftV1:";
  var autoFlags = {
    skuManual: false,
    slugManual: false,
    seoTitleManual: false,
    seoDescManual: false,
    titleArManual: false,
    descArManual: false,
    richArManual: false
  };
  var draftTimer = null;
  var translateTimer = null;
  var translateSeq = 0;

  function applyAutoFlags(flags) {
    Object.keys(autoFlags).forEach(function (k) {
      autoFlags[k] = !!(flags && flags[k]);
    });
  }

  function draftStorageKey(id) {
    return DRAFT_PREFIX + (id || "new");
  }

  function readDraft(id) {
    try {
      var raw = localStorage.getItem(draftStorageKey(id));
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function clearDraft(id) {
    try {
      localStorage.removeItem(draftStorageKey(id || "new"));
      if (id) localStorage.removeItem(draftStorageKey("new"));
    } catch (e) { /* ignore */ }
    showDraftStatus(null);
  }

  function collectDraftFields() {
    return {
      id: editor.id.value || "",
      slug: editor.slug.value,
      sku: editor.sku.value,
      title: editor.title.value,
      title_ar: editor.title_ar.value,
      description: editor.description.value,
      description_ar: editor.description_ar.value,
      rich_content: editor.rich_content.value,
      rich_content_ar: editor.rich_content_ar.value,
      seo_title: editor.seo_title.value,
      seo_description: editor.seo_description.value,
      category: editor.category.value,
      karat: editor.karat.value,
      weight_grams: editor.weight_grams.value,
      sell_price_per_gram: editor.sell_price_per_gram.value,
      making_charge: editor.making_charge.value,
      fixed_price: editor.fixed_price.value,
      stock_qty: editor.stock_qty.value,
      price_mode: currentPriceMode(),
      published: !!(editor.published && editor.published.checked),
      image_url: imageUrlField.value,
      image_urls: getImageUrls()
    };
  }

  function saveDraftSoon() {
    if (!editor || editor.hidden) return;
    clearTimeout(draftTimer);
    draftTimer = setTimeout(function () {
      try {
        var payload = {
          savedAt: new Date().toISOString(),
          productId: editor.id.value || "new",
          fields: collectDraftFields(),
          flags: Object.assign({}, autoFlags)
        };
        localStorage.setItem(draftStorageKey(editor.id.value || "new"), JSON.stringify(payload));
        showDraftStatus(payload);
      } catch (e) { /* ignore quota */ }
    }, 400);
  }

  function showDraftStatus(draft) {
    var el = document.getElementById("draftStatus");
    if (!el) return;
    if (!draft || !draft.savedAt) {
      el.hidden = true;
      el.textContent = "";
      return;
    }
    var when = new Date(draft.savedAt);
    var label = isNaN(when.getTime()) ? "recently" : when.toLocaleString();
    el.hidden = false;
    el.innerHTML = "Draft saved locally · " + esc(label) +
      ' <button type="button" id="btnClearDraft">Clear draft</button>';
    var btn = document.getElementById("btnClearDraft");
    if (btn) {
      btn.addEventListener("click", function () {
        clearDraft(editor.id.value || "new");
      });
    }
  }

  function categoryLabel(cat) {
    var map = {
      bridal: "bridal",
      bangles: "bangles",
      necklaces: "necklace",
      rings: "ring",
      coins: "gold coin",
      earrings: "earrings",
      other: "gold jewelry"
    };
    return map[cat] || "gold jewelry";
  }

  function buildAutoSlug() {
    var title = (editor.title.value || "").trim().toLowerCase();
    var slug = title.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    var grams = String(editor.weight_grams.value || "").trim();
    var karat = String(editor.karat.value || "").trim();
    if (karat) slug = (slug ? slug + "-" : "") + karat + "k";
    if (grams && isFinite(Number(grams))) {
      slug = (slug ? slug + "-" : "") + Number(grams).toFixed(3).replace(/\.?0+$/, "") + "g";
    }
    return slug.slice(0, 80);
  }

  function buildAutoSeoTitle() {
    var title = (editor.title.value || "").trim();
    if (!title) return "";
    var karat = editor.karat.value || "21";
    var grams = String(editor.weight_grams.value || "").trim();
    var gPart = grams && isFinite(Number(grams))
      ? Number(grams).toFixed(3).replace(/\.?0+$/, "") + "g "
      : "";
    return (title + " | " + karat + "K " + gPart + "Gold | Aryam's Jewelry").replace(/\s+/g, " ").trim();
  }

  function buildAutoSeoDescription() {
    var title = (editor.title.value || "").trim();
    if (!title) return "";
    var karat = editor.karat.value || "21";
    var grams = String(editor.weight_grams.value || "").trim();
    var cat = categoryLabel(editor.category.value);
    var desc = (editor.description.value || "").trim();
    var mock = {
      price_mode: currentPriceMode(),
      weight_grams: Number(editor.weight_grams.value) || 0,
      sell_price_per_gram: Number(editor.sell_price_per_gram.value) || 0,
      making_charge: Number(editor.making_charge.value) || 0,
      fixed_price: editor.fixed_price.value === "" ? null : Number(editor.fixed_price.value)
    };
    var price = AryamPricing.displayPrice(mock);
    var bits = [
      title + " in " + karat + "K gold",
      grams && isFinite(Number(grams)) ? Number(grams).toFixed(3).replace(/\.?0+$/, "") + " grams" : "",
      cat,
      price ? "from Aryam's Jewelry Houston — " + AryamPricing.formatMoney(price) : "from Aryam's Jewelry Houston"
    ].filter(Boolean);
    var base = bits.join(" · ") + ".";
    if (desc) base += " " + desc;
    return base.slice(0, 300);
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

  function refreshSku(force) {
    if (!editor || !editor.sku) return;
    if (!force && autoFlags.skuManual) return;
    var next = buildAutoSku();
    editor.sku.value = next === "ARY-21K" ? "" : next;
  }

  function refreshSlug(force) {
    if (!editor || !editor.slug) return;
    if (!force && autoFlags.slugManual) return;
    editor.slug.value = buildAutoSlug();
  }

  function fieldEl(name) {
    if (!editor) return null;
    return editor.elements[name] || editor.querySelector('[name="' + name + '"]');
  }

  function refreshSeo(force) {
    if (!editor) return;
    var titleEl = fieldEl("seo_title");
    var descEl = fieldEl("seo_description");
    if (titleEl && (force || !autoFlags.seoTitleManual)) {
      titleEl.value = buildAutoSeoTitle();
    }
    if (descEl && (force || !autoFlags.seoDescManual)) {
      descEl.value = buildAutoSeoDescription();
    }
  }

  function translateEnToAr(text) {
    text = String(text || "").trim();
    if (!text) return Promise.resolve("");
    if (text.length > 450) text = text.slice(0, 450);
    var url = "https://api.mymemory.translated.net/get?q=" + encodeURIComponent(text) + "&langpair=en|ar";
    return fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var t = data && data.responseData && data.responseData.translatedText;
        if (!t || /INVALID SOURCE|QUERY LENGTH|MYMEMORY WARNING/i.test(t)) return "";
        return String(t).trim();
      })
      .catch(function () { return ""; });
  }

  function scheduleArabicTranslate() {
    clearTimeout(translateTimer);
    translateTimer = setTimeout(runArabicTranslate, 750);
  }

  function runArabicTranslate() {
    if (!editor || editor.hidden) return;
    var seq = ++translateSeq;
    var jobs = [];

    if (!autoFlags.titleArManual && editor.title.value.trim()) {
      jobs.push(
        translateEnToAr(editor.title.value).then(function (ar) {
          if (seq !== translateSeq || autoFlags.titleArManual) return;
          if (ar) editor.title_ar.value = ar;
        })
      );
    }
    if (!autoFlags.descArManual && editor.description.value.trim()) {
      jobs.push(
        translateEnToAr(editor.description.value).then(function (ar) {
          if (seq !== translateSeq || autoFlags.descArManual) return;
          if (ar) editor.description_ar.value = ar;
        })
      );
    }
    if (!autoFlags.richArManual && editor.rich_content.value.trim()) {
      jobs.push(
        translateEnToAr(editor.rich_content.value).then(function (ar) {
          if (seq !== translateSeq || autoFlags.richArManual) return;
          if (ar) editor.rich_content_ar.value = ar;
        })
      );
    }

    if (!jobs.length) return;
    Promise.all(jobs).then(function () {
      saveDraftSoon();
    });
  }

  function refreshDerivedFields(force) {
    refreshSku(force);
    refreshSlug(force);
    refreshSeo(force);
    if (force) runArabicTranslate();
    else scheduleArabicTranslate();
    saveDraftSoon();
  }

  function currentPriceMode() {
    var checked = editor.querySelector('input[name="price_mode"]:checked');
    return checked && checked.value === "fixed" ? "fixed" : "formula";
  }

  function syncPriceModeUI() {
    var mode = currentPriceMode();
    var formulaFields = document.getElementById("formulaFields");
    var fixedField = document.getElementById("fixedPriceField");
    var tools = document.querySelector(".editor-tools");
    if (formulaFields) formulaFields.hidden = mode !== "formula";
    if (fixedField) fixedField.hidden = mode !== "fixed";
    if (tools) tools.hidden = mode !== "formula";
    if (editor.sell_price_per_gram) {
      if (mode === "formula") editor.sell_price_per_gram.setAttribute("data-validate", "price");
      else editor.sell_price_per_gram.removeAttribute("data-validate");
    }
    if (editor.fixed_price) {
      if (mode === "fixed") editor.fixed_price.setAttribute("data-validate", "fixed");
      else editor.fixed_price.removeAttribute("data-validate");
    }
  }

  function updatePreview() {
    if (!editor || editor.hidden) return;
    var mock = {
      price_mode: currentPriceMode(),
      weight_grams: Number(editor.weight_grams.value) || 0,
      sell_price_per_gram: Number(editor.sell_price_per_gram.value) || 0,
      making_charge: Number(editor.making_charge.value) || 0,
      fixed_price: editor.fixed_price.value === "" ? null : Number(editor.fixed_price.value),
      karat: Number(editor.karat.value) || 21
    };
    var price = AryamPricing.displayPrice(mock);
    var el = document.getElementById("pricePreview");
    var market = spotOz != null ? AryamPricing.marketPerGram(spotOz, mock.karat) : null;
    var margin = market != null ? mock.sell_price_per_gram - market : null;
    if (mock.price_mode === "fixed") {
      el.innerHTML =
        '<div class="big">' + AryamPricing.formatMoney(price) + "</div>" +
        "<div>Fixed total price</div>" +
        (market != null
          ? "<div style='margin-top:0.5rem;color:var(--muted)'>Market ref ~" + AryamPricing.formatMoney(market) +
            "/g for " + mock.karat + "K · " + mock.weight_grams + " g</div>"
          : "");
      return;
    }
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
    ["weight_grams", "sell_price_per_gram", "making_charge", "karat", "fixed_price"].forEach(function (name) {
      if (editor[name]) editor[name].addEventListener("input", updatePreview);
    });

    Array.prototype.forEach.call(editor.querySelectorAll('input[name="price_mode"]'), function (r) {
      r.addEventListener("change", function () {
        syncPriceModeUI();
        updatePreview();
        refreshSeo(false);
        saveDraftSoon();
        showFormError("");
      });
    });

    ["title", "weight_grams", "karat", "category"].forEach(function (name) {
      if (!editor[name]) return;
      editor[name].addEventListener("input", function () { refreshDerivedFields(false); });
      editor[name].addEventListener("change", function () { refreshDerivedFields(false); });
    });

    ["description", "sell_price_per_gram", "making_charge", "fixed_price", "stock_qty"].forEach(function (name) {
      if (!editor[name]) return;
      editor[name].addEventListener("input", function () {
        refreshSeo(false);
        if (name === "description") scheduleArabicTranslate();
        saveDraftSoon();
      });
      editor[name].addEventListener("change", function () {
        refreshSeo(false);
        saveDraftSoon();
      });
    });

    if (editor.rich_content) {
      editor.rich_content.addEventListener("input", function () {
        scheduleArabicTranslate();
        saveDraftSoon();
      });
    }

    function wireManual(field, flag, refreshFn) {
      var el = fieldEl(field);
      if (!el) return;
      el.addEventListener("input", function (e) {
        // Only real user edits lock auto-fill (ignores autofill / scripted updates).
        if (!e.isTrusted) return;
        autoFlags[flag] = el.value.trim().length > 0;
        if (!autoFlags[flag] && refreshFn) refreshFn(true);
        saveDraftSoon();
      });
      el.addEventListener("blur", function () {
        if (!el.value.trim()) {
          autoFlags[flag] = false;
          if (refreshFn) refreshFn(true);
        }
        saveDraftSoon();
      });
    }

    wireManual("sku", "skuManual", refreshSku);
    wireManual("slug", "slugManual", refreshSlug);
    wireManual("seo_title", "seoTitleManual", function () {
      var el = fieldEl("seo_title");
      if (el) el.value = buildAutoSeoTitle();
    });
    wireManual("seo_description", "seoDescManual", function () {
      var el = fieldEl("seo_description");
      if (el) el.value = buildAutoSeoDescription();
    });
    wireManual("title_ar", "titleArManual", function () { scheduleArabicTranslate(); });
    wireManual("description_ar", "descArManual", function () { scheduleArabicTranslate(); });
    wireManual("rich_content_ar", "richArManual", function () { scheduleArabicTranslate(); });

    if (editor.published) {
      editor.published.addEventListener("change", saveDraftSoon);
    }

    document.getElementById("btnNew").addEventListener("click", function () {
      openEditor(null);
    });

    document.getElementById("btnCancel").addEventListener("click", function () {
      saveDraftSoon();
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
        refreshSeo(false);
        saveDraftSoon();
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
        refreshSeo(false);
        saveDraftSoon();
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
      else if (kind === "fixed") ok = raw !== "" && Number(raw) >= 0 && isFinite(Number(raw));
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
      syncPriceModeUI();
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
      var mode = currentPriceMode();
      if (!autoFlags.slugManual || !editor.slug.value.trim()) refreshSlug(true);
      if (!autoFlags.seoTitleManual || !editor.seo_title.value.trim()) refreshSeo(true);
      if (!autoFlags.skuManual && !editor.sku.value.trim()) refreshSku(true);
      var btn = document.getElementById("btnSave");
      btn.disabled = true;
      btn.textContent = "Saving…";
      var draftId = editor.id.value || "new";
      var product = {
        id: editor.id.value || undefined,
        slug: editor.slug.value.trim() || buildAutoSlug(),
        sku: editor.sku.value.trim() || null,
        title: editor.title.value.trim(),
        title_ar: editor.title_ar.value.trim(),
        description: editor.description.value.trim(),
        description_ar: editor.description_ar.value.trim(),
        rich_content: editor.rich_content.value.trim(),
        rich_content_ar: editor.rich_content_ar.value.trim(),
        seo_title: editor.seo_title.value.trim() || buildAutoSeoTitle(),
        seo_description: editor.seo_description.value.trim() || buildAutoSeoDescription(),
        category: editor.category.value,
        karat: Number(editor.karat.value),
        weight_grams: Number(editor.weight_grams.value),
        sell_price_per_gram: mode === "formula" ? Number(editor.sell_price_per_gram.value) : Number(editor.sell_price_per_gram.value) || 0,
        making_charge: Number(editor.making_charge.value) || 0,
        price_mode: mode,
        fixed_price: mode === "fixed" ? Number(editor.fixed_price.value) : null,
        stock_qty: Number(editor.stock_qty.value) || 0,
        image_url: urls[0] || "",
        image_urls: urls,
        published: editor.published.checked
      };
      AryamCatalog.saveProduct(product).then(function () {
        clearDraft(draftId);
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
  setInterval(refreshSpot, 60 * 1000);
  loadTable();
})();
