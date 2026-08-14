/* Instagram — official embeds in a grid (up to 9). Prefers Supabase cache; admin can force-update anytime. */
(function () {
  "use strict";

  var CACHE_KEY = "aryamInstagramPostsV4";
  var DAY_MS = 24 * 60 * 60 * 1000;
  var MAX_POSTS = 9;
  var IG_PROFILE = "https://www.instagram.com/aryamjewelry0/";
  var HANDLE = "aryamjewelry0";

  var grid = document.getElementById("igTrack");
  var emptyEl = document.getElementById("igEmpty");
  if (!grid) return;

  var cfg = window.ARYAM_CONFIG || {};

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function cleanUrl(url) {
    return String(url || "").trim().split("?")[0].replace(/\/$/, "");
  }

  function isPostPermalink(url) {
    return /instagram\.com\/(p|reel|tv)\/[A-Za-z0-9_-]+/i.test(url || "");
  }

  function postTs(p) {
    if (p && p.timestamp) {
      var t = Date.parse(p.timestamp);
      if (!isNaN(t)) return t;
    }
    return 0;
  }

  function newestFirst(posts) {
    return (posts || []).slice().sort(function (a, b) {
      return postTs(b) - postTs(a);
    }).slice(0, MAX_POSTS);
  }

  function embedIframe(post) {
    var url = cleanUrl(post.url);
    var src = esc(url + "/embed/?cr=1&v=14&wp=540");
    return (
      '<article class="ig-embed-item">' +
        '<iframe src="' + src + '" title="Instagram post from @' + HANDLE + '" ' +
          'loading="lazy" allowtransparency="true" ' +
          'allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" ' +
          'scrolling="no"></iframe>' +
        '<a class="ig-embed-open" href="' + esc(url) + '" target="_blank" rel="noopener">Open on Instagram</a>' +
      "</article>"
    );
  }

  function render(data) {
    var posts = newestFirst((data && data.posts) || []).filter(function (p) {
      return isPostPermalink(p.url);
    });

    if (!posts.length) {
      grid.innerHTML = "";
      grid.hidden = true;
      if (emptyEl) {
        emptyEl.hidden = false;
        emptyEl.innerHTML =
          '<div class="ig-fallback">' +
            '<iframe class="ig-profile-frame" title="@' + HANDLE + ' on Instagram" ' +
              'src="https://www.instagram.com/' + HANDLE + '/embed" loading="lazy" allowtransparency="true"></iframe>' +
            '<p>Instagram embeds are managed in Admin → Instagram posts. Paste public /reel/ or /p/ links (up to 9) and click Save &amp; publish.</p>' +
            '<a class="btn btn-gold" href="' + IG_PROFILE + '" target="_blank" rel="noopener">Go to Instagram</a>' +
          "</div>";
      }
      return;
    }

    if (emptyEl) {
      emptyEl.hidden = true;
      emptyEl.innerHTML = "";
    }
    grid.hidden = false;
    grid.innerHTML = posts.map(embedIframe).join("");
  }

  function readLocal() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeLocal(payload) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(payload)); } catch (e) { /* ignore */ }
  }

  function ts(payload) {
    if (!payload || !payload.updated_at) return 0;
    var t = Date.parse(payload.updated_at);
    return isNaN(t) ? 0 : t;
  }

  function normalize(data) {
    return {
      handle: (data && data.handle) || HANDLE,
      profile_url: (data && (data.profile_url || data.profileUrl)) || IG_PROFILE,
      posts: newestFirst((data && data.posts) || []),
      updated_at: (data && data.updated_at) || new Date().toISOString()
    };
  }

  function loadFile() {
    var day = Math.floor(Date.now() / DAY_MS);
    return fetch("/data/instagram.posts.json?v=" + day, { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(normalize);
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
        return normalize(rows[0]);
      })
      .catch(function () { return null; });
  }

  function boot() {
    var local = readLocal();
    if (local) render(local);

    // Always check Supabase so Admin "Save & publish" shows up immediately
    Promise.all([loadFromSupabase(), loadFile()]).then(function (pair) {
      var remote = pair[0];
      var file = pair[1];
      var pick = null;

      if (remote && ts(remote) >= ts(local) && ts(remote) >= ts(file)) pick = remote;
      else if (file && ts(file) > ts(remote)) pick = file;
      else pick = remote || file || local;

      if (pick) {
        writeLocal(pick);
        render(pick);
      }
    }).catch(function () {
      if (!local) {
        loadFile().then(function (file) {
          writeLocal(file);
          render(file);
        });
      }
    });
  }

  boot();
})();
