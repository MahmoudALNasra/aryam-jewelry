/* High-quality product photos → Cloudinary (preferred) or Supabase Storage */
(function (global) {
  "use strict";

  var BUCKET = "product-images";
  /* Jewelry detail: keep near full phone resolution; only lightly encode */
  var MAX_SIDE = 4096;
  var JPEG_QUALITY = 0.94;
  /* Skip re-encode when already a solid JPEG under these limits */
  var KEEP_ORIGINAL_MAX_BYTES = 12 * 1024 * 1024;

  function cfg() {
    return global.ARYAM_CONFIG || {};
  }

  function formatBytes(n) {
    if (!n && n !== 0) return "";
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(0) + " KB";
    return (n / (1024 * 1024)).toFixed(1) + " MB";
  }

  function report(onProgress, payload) {
    if (typeof onProgress === "function") onProgress(payload);
  }

  function hasCloudinary() {
    var c = cfg();
    return !!(c.cloudinaryCloudName && c.cloudinaryUploadPreset);
  }

  function hasSupabaseStorage() {
    var c = cfg();
    return !!(c.supabaseUrl && c.supabaseAnonKey);
  }

  function loadImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read image"));
      };
      img.src = url;
    });
  }

  function canvasToJpegBlob(canvas, quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(
        function (blob) {
          if (!blob) reject(new Error("Could not encode image"));
          else resolve(blob);
        },
        "image/jpeg",
        quality
      );
    });
  }

  function shouldKeepOriginal(file, img) {
    var type = (file.type || "").toLowerCase();
    var isJpeg = type === "image/jpeg" || type === "image/jpg" || /\.jpe?g$/i.test(file.name || "");
    if (!isJpeg) return false;
    if (file.size > KEEP_ORIGINAL_MAX_BYTES) return false;
    var longest = Math.max(img.width, img.height);
    return longest <= MAX_SIDE;
  }

  function compressFile(file, onProgress) {
    report(onProgress, {
      phase: "preparing",
      percent: 5,
      message: "Reading photo (" + formatBytes(file.size) + ")…"
    });

    return loadImage(file).then(function (img) {
      if (shouldKeepOriginal(file, img)) {
        report(onProgress, {
          phase: "preparing",
          percent: 35,
          message: "Keeping original quality (" + img.width + "×" + img.height + ")…"
        });
        return file;
      }

      report(onProgress, {
        phase: "compressing",
        percent: 15,
        message: "Preparing high-quality image…"
      });

      var scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      var w = Math.max(1, Math.round(img.width * scale));
      var h = Math.max(1, Math.round(img.height * scale));
      var canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, w, h);

      report(onProgress, {
        phase: "compressing",
        percent: 30,
        message: "Encoding " + w + "×" + h + " at high quality…"
      });

      return canvasToJpegBlob(canvas, JPEG_QUALITY).then(function (blob) {
        report(onProgress, {
          phase: "compressing",
          percent: 40,
          message: "Ready to upload (" + formatBytes(blob.size) + ")…"
        });
        return blob;
      });
    });
  }

  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function safePath(slugHint) {
    var safe = String(slugHint || "piece")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "piece";
    return safe + "-" + Date.now() + ".jpg";
  }

  function trackUploadProgress(xhr, onProgress, label) {
    xhr.upload.onprogress = function (e) {
      if (!e.lengthComputable) {
        report(onProgress, {
          phase: "uploading",
          percent: 55,
          message: (label || "Uploading") + "…"
        });
        return;
      }
      var ratio = e.loaded / e.total;
      var percent = Math.round(40 + ratio * 55);
      report(onProgress, {
        phase: "uploading",
        percent: percent,
        message: (label || "Uploading") + " " + formatBytes(e.loaded) + " / " + formatBytes(e.total),
        loaded: e.loaded,
        total: e.total
      });
    };
  }

  function uploadToCloudinary(blob, path, onProgress) {
    var c = cfg();
    var cloud = c.cloudinaryCloudName;
    var preset = c.cloudinaryUploadPreset;
    var folder = c.cloudinaryFolder || "aryam/products";
    var url = "https://api.cloudinary.com/v1_1/" + encodeURIComponent(cloud) + "/image/upload";

    var fd = new FormData();
    fd.append("file", blob, path);
    fd.append("upload_preset", preset);
    fd.append("folder", folder);
    fd.append("public_id", path.replace(/\.jpe?g$/i, ""));

    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      trackUploadProgress(xhr, onProgress, "Cloudinary");

      xhr.onload = function () {
        var data = null;
        try { data = JSON.parse(xhr.responseText || "{}"); } catch (e) { data = {}; }
        if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) {
          report(onProgress, {
            phase: "done",
            percent: 100,
            message: "Uploaded to Cloudinary"
          });
          resolve(data.secure_url);
          return;
        }
        var detail = (data && (data.error && data.error.message)) || data.message || xhr.statusText || ("HTTP " + xhr.status);
        reject(new Error(detail));
      };

      xhr.onerror = function () {
        reject(new Error("Network error during Cloudinary upload"));
      };

      xhr.send(fd);
    });
  }

  function uploadToSupabase(blob, path, onProgress) {
    var c = cfg();
    var base = (c.supabaseUrl || "").replace(/\/$/, "");
    var key = c.supabaseAnonKey || "";
    if (!base || !key) {
      return Promise.reject(new Error("Supabase not configured"));
    }

    var url = base + "/storage/v1/object/" + BUCKET + "/" + encodeURIComponent(path).replace(/%2F/g, "/");

    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.setRequestHeader("apikey", key);
      xhr.setRequestHeader("Authorization", "Bearer " + key);
      xhr.setRequestHeader("Content-Type", "image/jpeg");
      xhr.setRequestHeader("x-upsert", "true");
      trackUploadProgress(xhr, onProgress, "Supabase");

      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          report(onProgress, {
            phase: "done",
            percent: 100,
            message: "Uploaded to Supabase Storage"
          });
          resolve(base + "/storage/v1/object/public/" + BUCKET + "/" + path);
          return;
        }
        var detail = xhr.responseText || xhr.statusText || ("HTTP " + xhr.status);
        reject(new Error(detail));
      };

      xhr.onerror = function () {
        reject(new Error("Network error during Supabase upload"));
      };

      xhr.send(blob);
    });
  }

  function uploadProductImage(file, slugHint, onProgress) {
    var path = safePath(slugHint);

    return compressFile(file, onProgress).then(function (blob) {
      var tryCloud = hasCloudinary()
        ? uploadToCloudinary(blob, path, onProgress)
        : Promise.reject(new Error("Cloudinary not configured"));

      return tryCloud.catch(function (cloudErr) {
        if (hasCloudinary()) {
          console.warn("Cloudinary upload failed, trying Supabase Storage:", cloudErr);
          report(onProgress, {
            phase: "uploading",
            percent: 42,
            message: "Cloudinary unavailable — trying Supabase…"
          });
        }
        if (!hasSupabaseStorage()) throw cloudErr;
        return uploadToSupabase(blob, path, onProgress);
      }).catch(function (err) {
        console.warn("Cloud upload failed, using local preview URL:", err);
        report(onProgress, {
          phase: "fallback",
          percent: 90,
          message: "Cloud upload failed — saving local preview…"
        });
        return blobToDataUrl(blob);
      });
    });
  }

  global.AryamUpload = {
    compressFile: compressFile,
    uploadProductImage: uploadProductImage,
    formatBytes: formatBytes,
    hasCloudinary: hasCloudinary,
    BUCKET: BUCKET,
    MAX_SIDE: MAX_SIDE,
    JPEG_QUALITY: JPEG_QUALITY
  };
})(window);
