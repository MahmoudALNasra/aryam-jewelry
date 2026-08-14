(function (global) {
  "use strict";

  var SESSION = "aryamAdminSession";
  var PASS = "aryamAdminPass";

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
      try { sessionStorage.setItem(PASS, password); } catch (e) { /* ignore */ }
      return true;
    }
    return false;
  }

  function logout() {
    sessionStorage.removeItem(SESSION);
    sessionStorage.removeItem(PASS);
  }

  function getPassword() {
    try { return sessionStorage.getItem(PASS) || ""; } catch (e) { return ""; }
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

  global.AryamAdminAuth = {
    isAuthed: isAuthed,
    login: login,
    logout: logout,
    requireAuth: requireAuth,
    getPassword: getPassword
  };
})(window);
