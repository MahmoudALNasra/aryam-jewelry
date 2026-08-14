/* Google reviews — 24h cache, newest-first rotating carousel */
(function () {
  "use strict";

  var CACHE_KEY = "aryamGoogleReviewsV5";
  var DAY_MS = 24 * 60 * 60 * 1000;
  var PLACE_ID = "ChIJvZYXdLTDQIYRthuVnPvmRzI";
  var MAPS_REVIEWS_URL =
    "https://www.google.com/maps/search/?api=1&query=Aryam%27s%20Jewelry&query_place_id=" +
    encodeURIComponent(PLACE_ID);
  var SHORT_MAPS = "https://maps.app.goo.gl/hD6xfHHKVSbvvXcBA";
  var CLAMP_CHARS = 160;
  var ROTATE_MS = 3200;
  var MAX_SHOW = 18;

  var grid = document.getElementById("reviewsGrid");
  if (!grid) return;

  var cfg = window.ARYAM_CONFIG || {};
  var rotateTimer = null;
  var pageIndex = 0;
  var perPage = 3;

  function stars(n) {
    var r = Math.round(Number(n) || 5);
    return "★★★★★".slice(0, Math.max(1, Math.min(5, r)));
  }

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function avatarUrl(review) {
    if (review.profile_photo_url) return review.profile_photo_url;
    var name = encodeURIComponent(review.author_name || "Guest");
    return "https://ui-avatars.com/api/?name=" + name + "&background=1a1612&color=d4af37&size=128&bold=true";
  }

  function reviewTs(review) {
    var ts = review.time != null ? Number(review.time) : NaN;
    if (!isNaN(ts) && ts > 0) {
      if (ts < 1e12) ts = ts * 1000;
      return ts;
    }
    return relativeToTs(review.relative_time_description);
  }

  function relativeToTs(desc) {
    var s = String(desc || "").toLowerCase().trim();
    if (!s || s === "google review") return 0;
    var n = 1;
    var m = s.match(/(\d+)/);
    if (m) n = parseInt(m[1], 10);
    else if (/\ba\b|\ban\b/.test(s)) n = 1;
    var ms = 0;
    if (s.indexOf("hour") >= 0 || s.indexOf("minute") >= 0 || s.indexOf("just") >= 0) {
      ms = s.indexOf("minute") >= 0 ? n * 6e4 : (s.indexOf("just") >= 0 ? 0 : n * 36e5);
    } else if (s.indexOf("day") >= 0) ms = n * 864e5;
    else if (s.indexOf("week") >= 0) ms = n * 7 * 864e5;
    else if (s.indexOf("month") >= 0) ms = n * 30 * 864e5;
    else if (s.indexOf("year") >= 0) ms = n * 365 * 864e5;
    else return 0;
    return Date.now() - ms;
  }

  function sortNewestFirst(reviews) {
    return reviews.slice().sort(function (a, b) {
      return reviewTs(b) - reviewTs(a);
    });
  }

  function formatRelativeTime(review) {
    if (review.relative_time_description &&
        review.relative_time_description !== "Google review") {
      return review.relative_time_description;
    }
    var ts = reviewTs(review);
    if (!ts) return "";
    var diff = Math.max(0, Date.now() - ts);
    var sec = Math.floor(diff / 1000);
    var min = Math.floor(sec / 60);
    var hr = Math.floor(min / 60);
    var day = Math.floor(hr / 24);
    var week = Math.floor(day / 7);
    var month = Math.floor(day / 30);
    var year = Math.floor(day / 365);
    if (sec < 60) return "just now";
    if (min < 60) return min === 1 ? "1 minute ago" : min + " minutes ago";
    if (hr < 24) return hr === 1 ? "1 hour ago" : hr + " hours ago";
    if (day < 7) return day === 1 ? "1 day ago" : day + " days ago";
    if (week < 5) return week === 1 ? "1 week ago" : week + " weeks ago";
    if (month < 12) return month === 1 ? "1 month ago" : month + " months ago";
    return year === 1 ? "1 year ago" : year + " years ago";
  }

  function reviewLink(r) {
    if (r.author_url) return r.author_url;
    return MAPS_REVIEWS_URL || SHORT_MAPS;
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

  function startRotate(pageCount) {
    stopRotate();
    if (pageCount <= 1) return;
    rotateTimer = setInterval(function () {
      pageIndex = (pageIndex + 1) % pageCount;
      goToPage(pageIndex, pageCount);
    }, ROTATE_MS);
  }

  function goToPage(i, pageCount) {
    pageIndex = ((i % pageCount) + pageCount) % pageCount;
    var track = grid.querySelector(".review-track");
    if (!track) return;
    track.style.transform = "translateX(-" + pageIndex * 100 + "%)";
    var dots = grid.querySelectorAll(".review-dots button");
    for (var d = 0; d < dots.length; d++) {
      dots[d].setAttribute("aria-current", d === pageIndex ? "true" : "false");
    }
  }

  function reviewKey(r) {
    return String(r.author_name || "").toLowerCase().trim() + "|" +
      String(r.text || "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 90);
  }

  function mergeReviews() {
    var map = {};
    var lists = Array.prototype.slice.call(arguments);
    for (var i = 0; i < lists.length; i++) {
      var list = lists[i] || [];
      for (var j = 0; j < list.length; j++) {
        var r = list[j];
        if (!r || !r.text) continue;
        var k = reviewKey(r);
        if (!map[k] || reviewTs(r) > reviewTs(map[k])) map[k] = r;
      }
    }
    // Collapse same author (seed + Google duplicates)
    var byAuthor = {};
    Object.keys(map).forEach(function (k) {
      var r = map[k];
      var a = String(r.author_name || "").toLowerCase().trim();
      var prev = byAuthor[a];
      if (!prev) {
        byAuthor[a] = r;
        return;
      }
      var prefer =
        reviewTs(r) > reviewTs(prev) ||
        ((r.profile_photo_url || "").indexOf("googleusercontent") >= 0 &&
          (prev.profile_photo_url || "").indexOf("googleusercontent") < 0) ||
        String(r.text || "").length > String(prev.text || "").length;
      if (prefer) byAuthor[a] = r;
    });
    return sortNewestFirst(Object.keys(byAuthor).map(function (a) { return byAuthor[a]; }));
  }

  function cardHtml(r) {
    var full = String(r.text || "").trim();
    var long = full.length > CLAMP_CHARS;
    var shown = long ? full.slice(0, CLAMP_CHARS).replace(/\s+\S*$/, "") + "…" : full;
    var href = esc(reviewLink(r));
    var when = esc(formatRelativeTime(r));

    return (
      '<a class="review-card" href="' + href + '" target="_blank" rel="noopener" ' +
        'aria-label="Read ' + esc(r.author_name || "Google") + '\'s review on Google">' +
        '<span class="review-when-top">' + when + "</span>" +
        '<div class="stars" aria-label="' + (r.rating || 5) + ' out of 5 stars">' + stars(r.rating) + "</div>" +
        '<p class="review-quote">&ldquo;' + esc(shown) + "&rdquo;</p>" +
        (long ? '<span class="review-more">Read more on Google</span>' : '<span class="review-more" hidden></span>') +
        '<div class="review-by">' +
          '<img class="review-avatar" src="' + esc(avatarUrl(r)) + '" alt="" width="44" height="44" loading="lazy" referrerpolicy="no-referrer" />' +
          '<div class="who"><strong>' + esc(r.author_name || "Google reviewer") + "</strong></div>" +
          '<span class="review-badge">Google reviews</span>' +
        "</div>" +
      "</a>"
    );
  }

  function paint(payload) {
    lastPayload = payload;
    var reviews = sortNewestFirst((payload && payload.reviews) || []).slice(0, MAX_SHOW);
    var rating = payload && payload.rating != null ? payload.rating : 4.9;
    var total = payload && payload.user_ratings_total != null ? payload.user_ratings_total : 172;
    var updated = payload && payload.updated_at ? new Date(payload.updated_at) : null;

    var ratingEl = document.getElementById("reviewsRatingLabel");
    if (ratingEl) ratingEl.textContent = String(rating);

    var meta = document.getElementById("reviewsMeta");
    if (meta) {
      meta.textContent =
        rating + "★ average · " + total + "+ Google reviews" +
        (updated ? " · refreshed " + updated.toLocaleString("en-US", {
          timeZone: "America/Chicago", month: "short", day: "numeric",
          hour: "numeric", minute: "2-digit"
        }) + " (Houston)" : "");
    }

    var eyebrow = document.querySelector(".hero-eyebrow");
    if (eyebrow) {
      eyebrow.innerHTML =
        '<span class="stars" aria-label="Rated ' + rating + ' out of 5">★★★★★</span> ' +
        rating + " · " + total + "+ Google Reviews · Houston, Texas";
    }

    stopRotate();
    pageIndex = 0;

    if (!reviews.length) {
      grid.innerHTML = '<p class="empty-state" style="color:var(--muted)">Reviews will appear here shortly.</p>';
      return;
    }

    perPage = visibleCount();
    var pages = [];
    for (var i = 0; i < reviews.length; i += perPage) {
      pages.push(reviews.slice(i, i + perPage));
    }

    var trackHtml = pages.map(function (page) {
      return '<div class="review-page">' + page.map(cardHtml).join("") + "</div>";
    }).join("");

    var dotsHtml = "";
    if (pages.length > 1) {
      dotsHtml =
        '<div class="review-dots" role="tablist" aria-label="Review slides">' +
        pages.map(function (_, i) {
          return (
            '<button type="button" aria-label="Show reviews page ' + (i + 1) + '"' +
            (i === 0 ? ' aria-current="true"' : "") + "></button>"
          );
        }).join("") +
        "</div>";
    }

    grid.innerHTML =
      '<div class="review-viewport">' +
        '<div class="review-track">' + trackHtml + "</div>" +
      "</div>" +
      dotsHtml;

    var dots = grid.querySelectorAll(".review-dots button");
    for (var d = 0; d < dots.length; d++) {
      (function (idx) {
        dots[idx].addEventListener("click", function () {
          goToPage(idx, pages.length);
          startRotate(pages.length);
        });
      })(d);
    }

    grid.onmouseenter = stopRotate;
    grid.onmouseleave = function () { startRotate(pages.length); };

    startRotate(pages.length);
  }

  function render(payload) {
    paint(payload);
  }

  // Carousel page layout CSS injected once
  (function injectLayoutCss() {
    if (document.getElementById("reviewCarouselCss")) return;
    var s = document.createElement("style");
    s.id = "reviewCarouselCss";
    s.textContent =
      ".review-viewport{overflow:hidden;width:100%}" +
      ".review-track{display:flex;width:100%;transition:transform .45s cubic-bezier(.22,1,.36,1)}" +
      ".review-page{display:flex;gap:clamp(1.2rem,2.5vw,2rem);flex:0 0 100%;min-width:100%;box-sizing:border-box}" +
      ".review-page .review-card{flex:1 1 0;min-width:0}" +
      "@media (max-width:900px){.review-page{gap:0}}";
    document.head.appendChild(s);
  })();

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
    return fetch("/data/reviews.seed.json", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .catch(function () {
        return {
          rating: 4.9,
          user_ratings_total: 172,
          updated_at: new Date().toISOString(),
          reviews: []
        };
      });
  }

  function loadFromSupabase() {
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return Promise.resolve(null);
    var url = cfg.supabaseUrl.replace(/\/$/, "") +
      "/rest/v1/google_reviews_cache?select=*&order=updated_at.desc&limit=1";
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
          rating: row.rating,
          user_ratings_total: row.user_ratings_total,
          updated_at: row.updated_at,
          reviews: row.reviews || []
        };
      })
      .catch(function () { return null; });
  }

  function refreshViaEdge() {
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return Promise.resolve(null);
    var url = cfg.supabaseUrl.replace(/\/$/, "") + "/functions/v1/refresh-google-reviews";
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
        if (j && j.reviews) return j;
        return null;
      })
      .catch(function () { return null; });
  }

  var resizeTimer = null;
  var lastPayload = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (lastPayload && visibleCount() !== perPage) paint(lastPayload);
    }, 200);
  });

  function boot() {
    var local = readLocal();

    function withSeed(payload) {
      return loadSeed().then(function (seed) {
        var merged = {
          rating: (payload && payload.rating != null) ? payload.rating : seed.rating,
          user_ratings_total: (payload && payload.user_ratings_total != null)
            ? payload.user_ratings_total : seed.user_ratings_total,
          updated_at: (payload && payload.updated_at) || seed.updated_at || new Date().toISOString(),
          reviews: mergeReviews((payload && payload.reviews) || [], seed.reviews || [])
        };
        writeLocal(merged);
        paint(merged);
        return merged;
      });
    }

    if (local && isFresh(local) && (local.reviews || []).length >= 6) {
      paint(local);
      return;
    }
    if (local) paint(local);

    loadFromSupabase().then(function (remote) {
      if (remote && isFresh(remote)) {
        return withSeed(remote);
      }
      if (remote) paint(remote);

      return refreshViaEdge().then(function (fresh) {
        if (fresh && fresh.reviews) return withSeed(fresh);
        if (remote) return withSeed(remote);
        if (local) return withSeed(local);
        return withSeed(null);
      });
    }).catch(function () {
      withSeed(local);
    });
  }

  boot();
})();
