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

  function isLoginPage() {
    var path = location.pathname.replace(/\/+$/, "") || "/";
    return path === "/admin" || /\/admin\/index\.html$/i.test(location.pathname);
  }

  function requireAuth() {
    if (!isAuthed() && !isLoginPage()) {
      location.href = "/admin/";
    }
  }

  global.AryamAdminAuth = { isAuthed: isAuthed, login: login, logout: logout, requireAuth: requireAuth };
})(window);
