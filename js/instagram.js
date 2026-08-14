/* Instagram showcase — refresh at most every 24h, show up to 9 newest posts */
(function () {
  "use strict";

  var CACHE_KEY = "aryamInstagramPostsV1";
  var DAY_MS = 24 * 60 * 60 * 1000;
  var MAX_POSTS = 9;
  var IG_PROFILE = "https://www.instagram.com/aryamjewelry0/";
  var HANDLE = "aryamjewelry0";

  var root = document.getElementById("igShowcase");
  var track = document.getElementById("igTrack");
  if (!root || !track) return;

  var cfg = window.ARYAM_CONFIG || {};
  var rotateTimer = null;
  var index = 0;

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function isPostPermalink(url) {
    return /instagram\.com\/(p|reel|tv)\//i.test(url || "");
  }

  function embedSrc(url) {
    var clean = String(url || "").split("?")[0].replace(/\/$/, "");
    return clean + "/embed/captioned/?cr=1&v=14";
  }

  function postTs(p) {
    if (!p || !p.timestamp) return 0;
    var t = Date.parse(p.timestamp);
    return isNaN(t) ? 0 : t;
  }

  function newestFirst(posts) {
    return (posts || []).slice().sort(function (a, b) {
      return postTs(b) - postTs(a);
    }).slice(0, MAX_POSTS);
  }

  function stop() {
    if (rotateTimer) {
      clearInterval(rotateTimer);
      rotateTimer = null;
    }
  }

  function slideWidth() {
    var card = track.querySelector(".ig-card");
    if (!card) return 280;
    return card.getBoundingClientRect().width + 16;
  }

  function go(i, count) {
    index = ((i % count) + count) % count;
    track.style.transform = "translateX(" + (-index * slideWidth()) + "px)";
  }

  function start(count) {
    stop();
    if (count <= 1) return;
    rotateTimer = setInterval(function () {
      go(index + 1, count);
    }, 3800);
  }

  function shortCaption(text) {
    var t = String(text || "").replace(/\s+/g, " ").trim();
    if (!t) return "View on Instagram";
    return t.length > 72 ? t.slice(0, 72).replace(/\s+\S*$/, "") + "…" : t;
  }

  function coverCard(post) {
    var href = esc(post.url || IG_PROFILE);
    var cover = esc(post.cover || post.media_url || "/images/hero.jpg");
    var caption = esc(shortCaption(post.caption));
    var isReel = (post.type || "") === "reel" || /reel/i.test(post.url || "");
    return (
      '<a class="ig-card ig-card-cover" href="' + href + '" target="_blank" rel="noopener">' +
        '<div class="ig-media">' +
          '<img src="' + cover + '" alt="" loading="lazy" referrerpolicy="no-referrer" />' +
          (isReel
            ? '<span class="ig-play" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M8 5v14l11-7Z"/></svg></span>'
            : "") +
          '<span class="ig-grad" aria-hidden="true"></span>' +
        "</div>" +
        '<div class="ig-meta">' +
          '<span class="ig-handle">@' + HANDLE + "</span>" +
          "<p>" + caption + "</p>" +
        "</div>" +
      "</a>"
    );
  }

  function embedCard(post) {
    var src = esc(embedSrc(post.url));
    var href = esc(post.url);
    return (
      '<div class="ig-card ig-card-embed">' +
        '<iframe src="' + src + '" title="Instagram post" loading="lazy" ' +
          'allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" ' +
          'allowfullscreen scrolling="no"></iframe>' +
        '<a class="ig-open" href="' + href + '" target="_blank" rel="noopener">Open post</a>' +
      "</div>"
    );
  }

  function render(data) {
    var posts = newestFirst((data && data.posts) || []);
    stop();

    if (!posts.length) {
      track.innerHTML =
        '<a class="ig-card ig-card-cover" href="' + IG_PROFILE + '" target="_blank" rel="noopener">' +
          '<div class="ig-media"><img src="/images/hero.jpg" alt="" /><span class="ig-play" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M8 5v14l11-7Z"/></svg></span><span class="ig-grad"></span></div>' +
          '<div class="ig-meta"><span class="ig-handle">@' + HANDLE + '</span><p>See the latest on Instagram</p></div>' +
        "</a>";
      return;
    }

    // Prefer cover cards with Instagram media (plays via click-through); use embeds when no cover
    track.innerHTML = posts.map(function (p) {
      if (p.cover || p.media_url) return coverCard(p);
      if (isPostPermalink(p.url)) return embedCard(p);
      return coverCard(p);
    }).join("");

    if (posts.length >= 3) {
      track.innerHTML += posts.map(function (p) {
        return coverCard(p);
      }).join("");
    }

    var count = track.querySelectorAll(".ig-card").length;
    index = 0;
    go(0, count);
    start(count);

    root.onmouseenter = stop;
    root.onmouseleave = function () { start(count); };
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

  function isFresh(payload) {
    if (!payload || !payload.updated_at) return false;
    return Date.now() - new Date(payload.updated_at).getTime() < DAY_MS;
  }

  function loadSeed() {
    return fetch("/data/instagram.posts.json", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .catch(function () {
        return { handle: HANDLE, profile_url: IG_PROFILE, posts: [], updated_at: new Date().toISOString() };
      });
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
        var row = rows[0];
        return {
          handle: row.handle || HANDLE,
          profile_url: row.profile_url || IG_PROFILE,
          posts: row.posts || [],
          updated_at: row.updated_at
        };
      })
      .catch(function () { return null; });
  }

  function refreshViaEdge() {
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
        if (j && Array.isArray(j.posts)) return j;
        return null;
      })
      .catch(function () { return null; });
  }

  function boot() {
    var local = readLocal();
    if (local && isFresh(local) && (local.posts || []).length) {
      render(local);
      return;
    }
    if (local) render(local);

    loadFromSupabase().then(function (remote) {
      if (remote && isFresh(remote) && (remote.posts || []).length) {
        writeLocal(remote);
        render(remote);
        return;
      }
      if (remote && (remote.posts || []).length) {
        writeLocal(remote);
        render(remote);
      }

      return refreshViaEdge().then(function (fresh) {
        if (fresh && fresh.posts && fresh.posts.length) {
          writeLocal(fresh);
          render(fresh);
          return;
        }
        if (!local && !(remote && remote.posts && remote.posts.length)) {
          return loadSeed().then(function (seed) {
            writeLocal(seed);
            render(seed);
          });
        }
      });
    }).catch(function () {
      loadSeed().then(function (seed) {
        writeLocal(seed);
        render(seed);
      });
    });
  }

  window.addEventListener("resize", function () {
    var count = track.querySelectorAll(".ig-card").length;
    if (count) go(index, count);
  });

  boot();
})();
