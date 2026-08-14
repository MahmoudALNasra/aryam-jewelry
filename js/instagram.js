/* Instagram showcase — no account login required.
   Uses public post/reel links (up to 9) + official embeds.
   Re-reads the post list at most every 24 hours. */
(function () {
  "use strict";

  var CACHE_KEY = "aryamInstagramPostsV2";
  var DAY_MS = 24 * 60 * 60 * 1000;
  var MAX_POSTS = 9;
  var IG_PROFILE = "https://www.instagram.com/aryamjewelry0/";
  var HANDLE = "aryamjewelry0";

  var root = document.getElementById("igShowcase");
  var track = document.getElementById("igTrack");
  var embedHost = document.getElementById("igEmbedHost");
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
    return /instagram\.com\/(p|reel|tv)\/[A-Za-z0-9_-]+/i.test(url || "");
  }

  function embedSrc(url) {
    var clean = String(url || "").split("?")[0].replace(/\/$/, "");
    return clean + "/embed/?cr=1&v=14";
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
    var href = esc(isPostPermalink(post.url) ? post.url : IG_PROFILE);
    var cover = esc(post.cover || post.media_url || "/images/hero.jpg");
    var caption = esc(shortCaption(post.caption));
    var isReel = (post.type || "") === "reel" || /\/reel\//i.test(post.url || "");
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

  function renderProfileEmbed() {
    if (!embedHost) return;
    embedHost.innerHTML =
      '<iframe class="ig-profile-frame" title="Aryam Jewelry on Instagram" ' +
      'src="https://www.instagram.com/' + HANDLE + '/embed" ' +
      'loading="lazy" allowtransparency="true"></iframe>';
  }

  function render(data) {
    var posts = newestFirst((data && data.posts) || []);
    stop();
    renderProfileEmbed();

    var real = posts.filter(function (p) { return isPostPermalink(p.url); });
    var show = real.length ? real : posts;

    if (!show.length) {
      track.innerHTML =
        '<a class="ig-card ig-card-cover" href="' + IG_PROFILE + '" target="_blank" rel="noopener">' +
          '<div class="ig-media"><img src="/images/hero.jpg" alt="" /><span class="ig-play" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M8 5v14l11-7Z"/></svg></span><span class="ig-grad"></span></div>' +
          '<div class="ig-meta"><span class="ig-handle">@' + HANDLE + '</span><p>Open Instagram for the latest posts</p></div>' +
        "</a>";
      return;
    }

    track.innerHTML = show.map(function (p) {
      // Real public post/reel links → playable Instagram embed (no login needed)
      if (isPostPermalink(p.url)) return embedCard(p);
      return coverCard(p);
    }).join("");

    if (show.length >= 3 && !real.length) {
      track.innerHTML += show.map(coverCard).join("");
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

  function normalize(data) {
    return {
      handle: (data && data.handle) || HANDLE,
      profile_url: (data && (data.profile_url || data.profileUrl)) || IG_PROFILE,
      posts: newestFirst((data && data.posts) || []),
      updated_at: (data && data.updated_at) || new Date().toISOString()
    };
  }

  function loadFile() {
    // cache-bust once per day so updated post lists show within 24h
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
    if (local && isFresh(local) && (local.posts || []).length) {
      render(local);
      return;
    }
    if (local) render(local);

    // Prefer curated public links in Supabase or the JSON file — no Instagram password needed
    Promise.all([loadFromSupabase(), loadFile()]).then(function (pair) {
      var remote = pair[0];
      var file = pair[1];
      var pick = null;

      if (remote && isFresh(remote) && (remote.posts || []).length) pick = remote;
      else if (file && (file.posts || []).length) {
        // Prefer file if it has real permalinks; else remote; else file
        var fileHasLinks = (file.posts || []).some(function (p) { return isPostPermalink(p.url); });
        var remoteHasLinks = remote && (remote.posts || []).some(function (p) { return isPostPermalink(p.url); });
        if (fileHasLinks) pick = file;
        else if (remoteHasLinks) pick = remote;
        else pick = remote && (remote.posts || []).length ? remote : file;
      } else if (remote) pick = remote;
      else pick = file;

      if (pick) {
        writeLocal(pick);
        render(pick);
      }
    }).catch(function () {
      loadFile().then(function (file) {
        writeLocal(file);
        render(file);
      });
    });
  }

  window.addEventListener("resize", function () {
    var count = track.querySelectorAll(".ig-card").length;
    if (count) go(index, count);
  });

  boot();
})();
