(function (global) {
  "use strict";

  var SESSION = "aryamAdminSession";

  function isAuthed() {
    try {
      return sessionStorage.getItem(SESSION) === "1";
    } catch (e) {
      return false;
    }
  }

  function login(password) {
    var cfg = global.ARYAM_CONFIG || {};
    var expected = cfg.adminDemoPassword || "aryam-admin-2026";
    if (password === expected) {
      sessionStorage.setItem(SESSION, "1");
      return true;
    }
    return false;
  }

  function logout() {
    sessionStorage.removeItem(SESSION);
  }

  function requireAuth() {
    if (!isAuthed() && !/index\.html?$/.test(location.pathname) && !location.pathname.endsWith("/admin/") && !location.pathname.endsWith("/admin")) {
      location.href = "index.html";
    }
  }

  global.AryamAdminAuth = { isAuthed: isAuthed, login: login, logout: logout, requireAuth: requireAuth };
})(window);
