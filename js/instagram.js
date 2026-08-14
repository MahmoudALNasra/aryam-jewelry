/* Instagram embeds — rotate 3-at-a-time; revalidate from Supabase at least every 24h */
(function () {
  "use strict";

  var CACHE_KEY = "aryamInstagramPostsV6";
  var DAY_MS = 24 * 60 * 60 * 1000;
  var MAX_POSTS = 9;
  var ROTATE_MS = 4200;
  var IG_PROFILE = "https://www.instagram.com/aryamjewelry0/";
  var HANDLE = "aryamjewelry0";

  var root = document.getElementById("igCarousel");
  var emptyEl = document.getElementById("igEmpty");
  if (!root) return;

  var cfg = window.ARYAM_CONFIG || {};
  var rotateTimer = null;
  var pageIndex = 0;
  var perPage = 3;
  var lastPayload = null;

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

  function visibleCount() {
    if (window.matchMedia("(max-width: 900px)").matches) return 1;
    return 3;
  }

  function stopRotate() {
    if (rotateTimer) {
      clearInterval(rotateTimer);
      rotateTimer = null;
    }
  }

  function goToPage(i, pageCount) {
    pageIndex = ((i % pageCount) + pageCount) % pageCount;
    var track = root.querySelector(".ig-track");
    if (!track) return;
    track.style.transform = "translateX(-" + pageIndex * 100 + "%)";
    var dots = root.querySelectorAll(".ig-dots button");
    for (var d = 0; d < dots.length; d++) {
      dots[d].setAttribute("aria-current", d === pageIndex ? "true" : "false");
    }
  }

  function startRotate(pageCount) {
    stopRotate();
    if (pageCount <= 1) return;
    rotateTimer = setInterval(function () {
      goToPage(pageIndex + 1, pageCount);
    }, ROTATE_MS);
  }

  function embedCard(post) {
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
    lastPayload = data;
    var posts = newestFirst((data && data.posts) || []).filter(function (p) {
      return isPostPermalink(p.url);
    });

    stopRotate();
    pageIndex = 0;

    if (!posts.length) {
      root.innerHTML = "";
      root.hidden = true;
      if (emptyEl) {
        emptyEl.hidden = false;
        emptyEl.innerHTML =
          '<div class="ig-fallback">' +
            '<iframe class="ig-profile-frame" title="@' + HANDLE + ' on Instagram" ' +
              'src="https://www.instagram.com/' + HANDLE + '/embed" loading="lazy" allowtransparency="true"></iframe>' +
            '<p>Add up to 9 public /reel/ or /p/ links in Admin → Instagram posts, then Save &amp; publish.</p>' +
            '<a class="btn btn-gold" href="' + IG_PROFILE + '" target="_blank" rel="noopener">Go to Instagram</a>' +
          "</div>";
      }
      return;
    }

    if (emptyEl) {
      emptyEl.hidden = true;
      emptyEl.innerHTML = "";
    }
    root.hidden = false;

    perPage = visibleCount();
    var pages = [];
    for (var i = 0; i < posts.length; i += perPage) {
      pages.push(posts.slice(i, i + perPage));
    }

    var trackHtml = pages.map(function (page) {
      return '<div class="ig-page">' + page.map(embedCard).join("") + "</div>";
    }).join("");

    var dotsHtml = "";
    if (pages.length > 1) {
      dotsHtml =
        '<div class="ig-dots" role="tablist" aria-label="Instagram slides">' +
        pages.map(function (_, i) {
          return (
            '<button type="button" aria-label="Show Instagram page ' + (i + 1) + '"' +
            (i === 0 ? ' aria-current="true"' : "") + "></button>"
          );
        }).join("") +
        "</div>";
    }

    root.innerHTML =
      '<div class="ig-viewport">' +
        '<div class="ig-track">' + trackHtml + "</div>" +
      "</div>" +
      dotsHtml;

    var dots = root.querySelectorAll(".ig-dots button");
    for (var d = 0; d < dots.length; d++) {
      (function (idx) {
        dots[idx].addEventListener("click", function () {
          goToPage(idx, pages.length);
          startRotate(pages.length);
        });
      })(d);
    }

    root.onmouseenter = stopRotate;
    root.onmouseleave = function () { startRotate(pages.length); };
    startRotate(pages.length);
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
    try {
      var copy = Object.assign({}, payload, { _cached_at: new Date().toISOString() });
      localStorage.setItem(CACHE_KEY, JSON.stringify(copy));
    } catch (e) { /* ignore */ }
  }

  function cacheAgeMs(payload) {
    var stamp = payload && (payload._cached_at || payload.updated_at);
    if (!stamp) return Infinity;
    var t = Date.parse(stamp);
    return isNaN(t) ? Infinity : Date.now() - t;
  }

  function isFresh(payload) {
    return payload && cacheAgeMs(payload) < DAY_MS;
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

  /** Optional: if Meta token exists, try live IG pull; otherwise no-op */
  function tryLiveRefresh() {
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return Promise.resolve(null);
    var url = cfg.supabaseUrl.replace(/\/$/, "") + "/functions/v1/refresh-instagram";
    return fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + cfg.supabaseAnonKey,
        "Content-Type": "application/json"
      },
      body: "{}"
    })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && Array.isArray(j.posts) && j.posts.length) return normalize(j);
        return null;
      })
      .catch(function () { return null; });
  }

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (lastPayload && visibleCount() !== perPage) render(lastPayload);
      else {
        var count = root.querySelectorAll(".ig-page").length;
        if (count) goToPage(pageIndex, count);
      }
    }, 200);
  });

  function applyBest(remote, file, local) {
    var pick = null;
    if (remote && ts(remote) >= ts(file) && ts(remote) >= ts(local)) pick = remote;
    else if (file && ts(file) > ts(remote)) pick = file;
    else pick = remote || file || local;
    if (pick) {
      writeLocal(pick);
      render(pick);
    }
  }

  function boot() {
    var local = readLocal();

    // Show cached immediately only if younger than 24h
    if (local && isFresh(local)) {
      render(local);
    } else if (local) {
      render(local); // paint stale briefly, then force refresh
    }

    var needsRefresh = !local || !isFresh(local);

    Promise.all([loadFromSupabase(), loadFile()]).then(function (pair) {
      var remote = pair[0];
      var file = pair[1];

      // Prefer newer Supabase (admin publish) even inside the 24h window
      if (remote && ts(remote) > ts(local)) {
        applyBest(remote, file, local);
        return;
      }

      if (!needsRefresh && local && isFresh(local)) {
        // Still sync quietly if remote is same/newer
        if (remote) writeLocal(remote);
        return;
      }

      // Cache expired (≥24h): refresh from network; try live IG API if configured
      return tryLiveRefresh().then(function (live) {
        applyBest(live || remote, file, local);
      });
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
