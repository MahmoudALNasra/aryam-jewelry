/* Cloudinary delivery helpers (public cloud name only — no API secrets here) */
(function (global) {
  "use strict";

  function isCloudinaryUrl(url) {
    return typeof url === "string" && /res\.cloudinary\.com\//.test(url);
  }

  function isVideoUrl(url) {
    if (!url || typeof url !== "string") return false;
    if (/\/video\/upload\//.test(url)) return true;
    if (/^data:video\//i.test(url)) return true;
    return /\.(mp4|webm|mov|m4v|avi|mkv)(\?|#|$)/i.test(url);
  }

  /**
   * Insert transformation segment after /upload/ for responsive delivery.
   */
  function withTransform(url, transform) {
    if (!url || !transform || !isCloudinaryUrl(url)) return url;
    if (url.indexOf("/upload/") < 0) return url;
    if (url.indexOf("/upload/" + transform + "/") >= 0) return url;
    return url.replace("/upload/", "/upload/" + transform + "/");
  }

  function displayUrl(url, kind) {
    var u = url || "";
    if (u.indexOf("../") === 0) u = "/" + u.replace(/^\.\.\//, "");
    if (isVideoUrl(u)) return u;
    if (!isCloudinaryUrl(u)) return u;
    if (kind === "thumb") {
      return withTransform(u, "f_auto,q_auto:good,c_limit,w_900");
    }
    if (kind === "detail") {
      return withTransform(u, "f_auto,q_auto:best,c_limit,w_1800");
    }
    if (kind === "full") {
      return withTransform(u, "f_auto,q_auto:best,c_limit,w_2400");
    }
    return u;
  }

  /** Still frame / poster for video thumbs (Cloudinary) */
  function posterUrl(url, kind) {
    var u = url || "";
    if (u.indexOf("../") === 0) u = "/" + u.replace(/^\.\.\//, "");
    if (!isVideoUrl(u)) return displayUrl(u, kind || "thumb");
    if (!isCloudinaryUrl(u)) return u;
    var w = kind === "full" ? 2400 : kind === "detail" ? 1800 : 900;
    var transform = "so_0,f_jpg,q_auto:good,c_limit,w_" + w;
    if (/\/video\/upload\//.test(u)) {
      return withTransform(u, transform).replace(/\.(mp4|webm|mov|m4v)(\?|#|$)/i, ".jpg$2");
    }
    return withTransform(u, transform);
  }

  function mediaTag(url, opts) {
    opts = opts || {};
    var u = url || "";
    var alt = opts.alt || "";
    var cls = opts.className || "";
    var kind = opts.kind || "detail";
    if (isVideoUrl(u)) {
      var poster = posterUrl(u, kind);
      var attrs = [
        'src="' + u + '"',
        poster && poster !== u ? 'poster="' + poster + '"' : "",
        'playsinline',
        'webkit-playsinline',
        opts.controls === false ? "" : "controls",
        opts.muted !== false ? "muted" : "",
        opts.loop ? "loop" : "",
        opts.autoplay ? "autoplay" : "",
        cls ? 'class="' + cls + '"' : "",
        opts.id ? 'id="' + opts.id + '"' : ""
      ].filter(Boolean).join(" ");
      return "<video " + attrs + "></video>";
    }
    var src = displayUrl(u, kind);
    return '<img src="' + src + '" alt="' + alt + '"' +
      (cls ? ' class="' + cls + '"' : "") +
      (opts.id ? ' id="' + opts.id + '"' : "") +
      (opts.loading ? ' loading="' + opts.loading + '"' : "") +
      " />";
  }

  global.AryamMedia = {
    isCloudinaryUrl: isCloudinaryUrl,
    isVideoUrl: isVideoUrl,
    withTransform: withTransform,
    displayUrl: displayUrl,
    posterUrl: posterUrl,
    mediaTag: mediaTag
  };
})(window);
