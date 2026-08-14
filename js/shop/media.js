/* Cloudinary delivery helpers (public cloud name only — no API secrets here) */
(function (global) {
  "use strict";

  function isCloudinaryUrl(url) {
    return typeof url === "string" && /res\.cloudinary\.com\//.test(url);
  }

  /**
   * Insert transformation segment after /upload/ for responsive delivery.
   * Stored originals stay full quality; shop/PDP can request smaller optimized URLs.
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

  global.AryamMedia = {
    isCloudinaryUrl: isCloudinaryUrl,
    withTransform: withTransform,
    displayUrl: displayUrl
  };
})(window);
