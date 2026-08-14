/* Compress phone photos + upload to Supabase Storage (or local data URL fallback) */
(function (global) {
  "use strict";

  var BUCKET = "product-images";

  function compressFile(file, maxSide, quality) {
    maxSide = maxSide || 1600;
    quality = quality || 0.82;
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        var w = Math.round(img.width * scale);
        var h = Math.round(img.height * scale);
        var canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        canvas.toBlob(
          function (blob) {
            if (!blob) reject(new Error("Could not compress image"));
            else resolve(blob);
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read image"));
      };
      img.src = url;
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

  function uploadProductImage(file, slugHint) {
    return compressFile(file).then(function (blob) {
      var sb = AryamCatalog.client && AryamCatalog.client();
      var safe = String(slugHint || "piece")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "piece";
      var path = safe + "-" + Date.now() + ".jpg";

      if (sb) {
        return sb.storage
          .from(BUCKET)
          .upload(path, blob, { contentType: "image/jpeg", upsert: true })
          .then(function (res) {
            if (res.error) throw res.error;
            var pub = sb.storage.from(BUCKET).getPublicUrl(path);
            return pub.data.publicUrl;
          })
          .catch(function (err) {
            console.warn("Storage upload failed, using local preview URL:", err);
            return blobToDataUrl(blob);
          });
      }
      return blobToDataUrl(blob);
    });
  }

  global.AryamUpload = {
    compressFile: compressFile,
    uploadProductImage: uploadProductImage,
    BUCKET: BUCKET
  };
})(window);
