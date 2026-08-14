/* Google reviews — refresh at most every 24h via Places API (Edge Function) + local/Supabase cache */
(function () {
  "use strict";

  var CACHE_KEY = "aryamGoogleReviewsV1";
  var DAY_MS = 24 * 60 * 60 * 1000;
  var grid = document.getElementById("reviewsGrid");
  if (!grid) return;

  var cfg = window.ARYAM_CONFIG || {};

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

  function render(payload) {
    var reviews = (payload && payload.reviews) || [];
    var rating = payload && payload.rating != null ? payload.rating : 4.9;
    var total = payload && payload.user_ratings_total != null ? payload.user_ratings_total : 172;
    var updated = payload && payload.updated_at ? new Date(payload.updated_at) : null;

    var ratingEl = document.getElementById("reviewsRatingLabel");
    if (ratingEl) ratingEl.textContent = String(rating);

    var meta = document.getElementById("reviewsMeta");
    if (meta) {
      meta.textContent =
        rating + "★ average · " + total + "+ Google reviews" +
        (updated ? " · refreshed " + updated.toLocaleString("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + " (Houston)" : "");
    }

    var eyebrow = document.querySelector(".hero-eyebrow");
    if (eyebrow) {
      eyebrow.innerHTML =
        '<span class="stars" aria-label="Rated ' + rating + ' out of 5">★★★★★</span> ' +
        rating + " · " + total + "+ Google Reviews · Houston, Texas";
    }

    if (!reviews.length) {
      grid.innerHTML = '<p class="empty-state" style="color:var(--muted)">Reviews will appear here shortly.</p>';
      return;
    }

    grid.innerHTML = reviews.slice(0, 6).map(function (r) {
      return (
        '<figure class="review-card">' +
          '<div class="stars" aria-label="' + (r.rating || 5) + ' out of 5 stars">' + stars(r.rating) + "</div>" +
          "<blockquote>&ldquo;" + esc(r.text) + "&rdquo;</blockquote>" +
          "<figcaption>" +
            '<img class="review-avatar" src="' + esc(avatarUrl(r)) + '" alt="" width="44" height="44" loading="lazy" referrerpolicy="no-referrer" />' +
            '<div class="who"><strong>' + esc(r.author_name || "Google reviewer") + "</strong>" +
            "<span>" + esc(r.relative_time_description || "Google review") + "</span></div>" +
          "</figcaption>" +
        "</figure>"
      );
    }).join("");
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

  function boot() {
    var local = readLocal();
    if (local && isFresh(local)) {
      render(local);
      return;
    }
    if (local) render(local);

    loadFromSupabase().then(function (remote) {
      if (remote && isFresh(remote)) {
        writeLocal(remote);
        render(remote);
        return;
      }
      if (remote) {
        writeLocal(remote);
        render(remote);
      }

      return refreshViaEdge().then(function (fresh) {
        if (fresh && fresh.reviews) {
          writeLocal(fresh);
          render(fresh);
          return;
        }
        if (!local && !remote) {
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

  boot();
})();
