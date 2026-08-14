(function () {
  "use strict";

  AryamAdminAuth.requireAuth();

  var MAX = 9;
  var HANDLE = "aryamjewelry0";
  var cfg = window.ARYAM_CONFIG || {};

  var rowsEl = document.getElementById("igRows");
  var statusEl = document.getElementById("igStatus");
  var previewEl = document.getElementById("igPreview");
  var errEl = document.getElementById("igFormError");
  var okEl = document.getElementById("igFormOk");
  var logoutBtn = document.getElementById("logoutBtn");
  var navToggle = document.getElementById("navToggle");
  var backdrop = document.getElementById("adminBackdrop");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      AryamAdminAuth.logout();
      location.href = "/admin/";
    });
  }

  function closeNav() {
    document.body.classList.remove("admin-nav-open");
    if (backdrop) backdrop.hidden = true;
  }
  function openNav() {
    document.body.classList.add("admin-nav-open");
    if (backdrop) backdrop.hidden = false;
  }
  if (navToggle) {
    navToggle.addEventListener("click", function () {
      if (document.body.classList.contains("admin-nav-open")) closeNav();
      else openNav();
    });
  }
  if (backdrop) backdrop.addEventListener("click", closeNav);

  function isPostPermalink(url) {
    return /instagram\.com\/(p|reel|tv)\/[A-Za-z0-9_-]+/i.test(url || "");
  }

  function cleanUrl(url) {
    return String(url || "").trim().split("?")[0].replace(/\/$/, "");
  }

  function buildRows(posts) {
    var list = posts || [];
    var html = "";
    for (var i = 0; i < MAX; i++) {
      var p = list[i] || {};
      var url = p.url || "";
      var type = p.type === "reel" || /\/reel\//i.test(url) ? "reel" : "image";
      html +=
        '<div class="ig-admin-row">' +
          '<span class="ig-admin-num">' + (i + 1) + "</span>" +
          '<label class="ig-admin-url">Post / Reel URL' +
            '<input type="url" name="url" data-i="' + i + '" placeholder="https://www.instagram.com/reel/…" value="' +
            String(url).replace(/"/g, "&quot;") + '" />' +
          "</label>" +
          '<label class="ig-admin-type">Type' +
            '<select data-i="' + i + '" name="type">' +
              '<option value="reel"' + (type === "reel" ? " selected" : "") + ">Reel</option>" +
              '<option value="image"' + (type === "image" ? " selected" : "") + ">Post</option>" +
            "</select>" +
          "</label>" +
        "</div>";
    }
    rowsEl.innerHTML = html;
  }

  function collectPosts() {
    var urls = rowsEl.querySelectorAll('input[name="url"]');
    var types = rowsEl.querySelectorAll('select[name="type"]');
    var posts = [];
    for (var i = 0; i < urls.length; i++) {
      var url = cleanUrl(urls[i].value);
      if (!url) continue;
      if (!isPostPermalink(url)) {
        throw new Error("Row " + (i + 1) + " needs a /reel/ or /p/ link (not the profile URL).");
      }
      var type = types[i].value === "reel" || /\/reel\//i.test(url) ? "reel" : "image";
      posts.push({
        url: url,
        type: type,
        timestamp: new Date(Date.now() - i * 60000).toISOString()
      });
    }
    return posts.slice(0, MAX);
  }

  function renderPreview(posts) {
    var list = (posts || []).filter(function (p) { return isPostPermalink(p.url); });
    if (!list.length) {
      previewEl.innerHTML = '<p style="color:var(--muted)">No embeds yet — paste links above and save.</p>';
      return;
    }
    previewEl.innerHTML = list.map(function (p) {
      var url = cleanUrl(p.url);
      return (
        '<article class="ig-admin-embed">' +
          '<iframe src="' + url + '/embed/?cr=1&v=14&wp=400" title="Instagram embed" loading="lazy" ' +
            'allowtransparency="true" scrolling="no"></iframe>' +
        "</article>"
      );
    }).join("");
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function loadFromSupabase() {
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return Promise.resolve(null);
    var url = cfg.supabaseUrl.replace(/\/$/, "") +
      "/rest/v1/instagram_posts_cache?select=*&order=updated_at.desc&limit=1";
    return fetch(url, {
      headers: {
        apikey: cfg.supabaseAnonKey,
        Authorization: "Bearer " + cfg.supabaseAnonKey
      }
    })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) {
        if (!rows || !rows.length) return null;
        return rows[0];
      })
      .catch(function () { return null; });
  }

  function loadFile() {
    return fetch("/data/instagram.posts.json", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .catch(function () { return { posts: [] }; });
  }

  function load() {
    errEl.hidden = true;
    okEl.hidden = true;
    setStatus("Loading current posts…");
    Promise.all([loadFromSupabase(), loadFile()]).then(function (pair) {
      var remote = pair[0];
      var file = pair[1];
      var data = remote && (remote.posts || []).length ? remote : file;
      var posts = (data && data.posts) || [];
      buildRows(posts);
      renderPreview(posts);
      if (remote && remote.updated_at) {
        setStatus("Live on site · last published " + new Date(remote.updated_at).toLocaleString() + " · @" + HANDLE);
      } else {
        setStatus("Using local JSON seed · save to publish to the live site · @" + HANDLE);
      }
    });
  }

  function save() {
    errEl.hidden = true;
    okEl.hidden = true;
    var posts;
    try {
      posts = collectPosts();
    } catch (e) {
      errEl.hidden = false;
      errEl.textContent = e.message || "Invalid links";
      return;
    }

    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
      errEl.hidden = false;
      errEl.textContent = "Supabase is not configured.";
      return;
    }

    var password = (AryamAdminAuth.getPassword && AryamAdminAuth.getPassword()) || "";
    // auth may only store a flag on older sessions — ask if missing
    if (!password) {
      password = window.prompt("Confirm admin password to publish Instagram posts:") || "";
    }
    if (!password) {
      errEl.hidden = false;
      errEl.textContent = "Password required to publish.";
      return;
    }

    setStatus("Publishing…");
    var url = cfg.supabaseUrl.replace(/\/$/, "") + "/functions/v1/update-instagram-posts";
    fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + cfg.supabaseAnonKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ password: password, posts: posts })
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok) {
          errEl.hidden = false;
          errEl.textContent = (res.j && res.j.error) || "Publish failed";
          setStatus("Publish failed");
          return;
        }
        okEl.hidden = false;
        okEl.textContent = "Published " + (res.j.posts || []).length + " embeds. Homepage will pick them up on refresh.";
        buildRows(res.j.posts || []);
        renderPreview(res.j.posts || []);
        setStatus("Live on site · last published " + new Date(res.j.updated_at).toLocaleString());
      })
      .catch(function () {
        errEl.hidden = false;
        errEl.textContent = "Network error while publishing.";
        setStatus("Publish failed");
      });
  }

  document.getElementById("btnSaveIg").addEventListener("click", save);
  document.getElementById("btnReloadIg").addEventListener("click", load);

  load();
})();
