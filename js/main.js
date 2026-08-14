/* Aryam's Jewelry مجوهرات أريام — site behavior
   - Live gold prices (gold-api.com, free, no key) → ticker + per-gram table
   - Open-now badge computed in Houston time (America/Chicago)
   - GSAP + Lenis scroll experience (progressive enhancement: page works without them)
*/
(function () {
  "use strict";

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var PHONE_TEXT = "(832) 762-7620";

  /* ============================================================
     Header state + mobile nav
     ============================================================ */
  var header = $("#siteHeader");
  var onScroll = function () {
    if (document.body.classList.contains("nav-open")) return;
    header.classList.toggle("scrolled", window.scrollY > 30);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var navToggle = $("#navToggle");
  var closeNav = function () {
    document.body.classList.remove("nav-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open menu");
    header.classList.toggle("scrolled", window.scrollY > 30);
  };
  var openNav = function () {
    document.body.classList.add("nav-open");
    navToggle.setAttribute("aria-expanded", "true");
    navToggle.setAttribute("aria-label", "Close menu");
    header.classList.remove("scrolled");
  };
  navToggle.addEventListener("click", function () {
    if (document.body.classList.contains("nav-open")) closeNav();
    else openNav();
  });
  $$(".primary-nav a").forEach(function (a) {
    a.addEventListener("click", closeNav);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeNav();
  });

  $("#year").textContent = String(new Date().getFullYear());

  /* ============================================================
     Opening hours — Houston time (America/Chicago)
     Mon–Fri 10:00–19:00 · Sat–Sun 10:30–18:00
     ============================================================ */
  var HOURS = {
    0: [630, 1080], // Sun 10:30–18:00
    1: [600, 1140], // Mon 10:00–19:00
    2: [600, 1140],
    3: [600, 1140],
    4: [600, 1140],
    5: [600, 1140], // Fri
    6: [630, 1080]  // Sat
  };
  var DAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  function minutesLabel(mins) {
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    var suffix = h >= 12 ? "PM" : "AM";
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + (m ? ":" + (m < 10 ? "0" + m : m) : "") + " " + suffix;
  }

  function houstonNow() {
    try {
      var parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Chicago",
        weekday: "short",
        hour: "numeric",
        minute: "numeric",
        hourCycle: "h23"
      }).formatToParts(new Date());
      var map = {};
      parts.forEach(function (p) { map[p.type] = p.value; });
      return {
        day: DAY_INDEX[map.weekday],
        minutes: parseInt(map.hour, 10) * 60 + parseInt(map.minute, 10)
      };
    } catch (e) {
      var d = new Date();
      return { day: d.getDay(), minutes: d.getHours() * 60 + d.getMinutes() };
    }
  }

  function updateOpenState() {
    var badge = $("#openBadge");
    if (!badge) return;
    var now = houstonNow();
    var todays = HOURS[now.day];

    $$(".hours-table tr").forEach(function (tr) {
      tr.classList.toggle("today", Number(tr.getAttribute("data-day")) === now.day);
    });

    var isOpen = now.minutes >= todays[0] && now.minutes < todays[1];
    badge.classList.toggle("is-open", isOpen);
    badge.classList.toggle("is-closed", !isOpen);

    if (isOpen) {
      badge.textContent = "Open now · until " + minutesLabel(todays[1]);
    } else if (now.minutes < todays[0]) {
      badge.textContent = "Closed · opens " + minutesLabel(todays[0]) + " today";
    } else {
      var next = HOURS[(now.day + 1) % 7];
      badge.textContent = "Closed · opens " + minutesLabel(next[0]) + " tomorrow";
    }
  }
  updateOpenState();
  setInterval(updateOpenState, 60 * 1000);

  /* ============================================================
     Live gold prices — gold-api.com (free, keyless)
     Spot USD/oz → USD per gram by karat purity
     ============================================================ */
  var TROY_OZ_GRAMS = 31.1034768;
  var KARATS = [
    { id: "g24", purity: 0.999 },
    { id: "g22", purity: 0.9167 },
    { id: "g21", purity: 0.875 },
    { id: "g18", purity: 0.75 }
  ];
  var usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  var CACHE_KEY = "aryamGoldSpot";
  var lastSpot = null;

  /* Spot gold trades ~23h on weekdays; it is frozen Fri 4 PM – Sun 5 PM CT
     and during the daily 4–5 PM CT settlement break. Say so, or a static
     price looks like a broken feed. */
  function goldMarketStatus() {
    var now = houstonNow();
    var CLOSE = 16 * 60, OPEN = 17 * 60;
    if (now.day === 6 || (now.day === 5 && now.minutes >= CLOSE) || (now.day === 0 && now.minutes < OPEN)) {
      return {
        open: false,
        note: "Market closed for the weekend — live prices resume Sunday 5 PM (Houston time).",
        tick: "Market closed · resumes Sun 5 PM"
      };
    }
    if (now.minutes >= CLOSE && now.minutes < OPEN) {
      return {
        open: false,
        note: "Market on its daily break — live prices resume at 5 PM (Houston time).",
        tick: "Market break · back at 5 PM"
      };
    }
    return { open: true };
  }

  function flash(el) {
    if (REDUCED_MOTION) return;
    el.classList.remove("flash");
    void el.offsetWidth; /* restart the animation */
    el.classList.add("flash");
  }

  function renderGold(spot, updatedAt, fromCache) {
    var market = goldMarketStatus();

    var spotEl = $("#spotPrice");
    if (spotEl) {
      spotEl.textContent = usd.format(spot);
      if (!fromCache && market.open) flash(spotEl);
    }

    var deltaEl = $("#spotDelta");
    if (deltaEl && !fromCache && lastSpot !== null && Math.abs(spot - lastSpot) >= 0.005) {
      var diff = spot - lastSpot;
      deltaEl.textContent = (diff > 0 ? "\u25B2 " : "\u25BC ") + usd.format(Math.abs(diff));
      deltaEl.classList.toggle("up", diff > 0);
      deltaEl.classList.toggle("down", diff < 0);
    }
    if (!fromCache) lastSpot = spot;

    KARATS.forEach(function (k) {
      var el = document.getElementById(k.id);
      if (!el) return;
      el.textContent = usd.format((spot / TROY_OZ_GRAMS) * k.purity);
      if (!fromCache && market.open) flash(el);
    });

    var updated = $("#priceUpdated");
    if (updated) {
      var when = updatedAt ? new Date(updatedAt) : new Date();
      var stamp = when.toLocaleString("en-US", {
        timeZone: "America/Chicago",
        month: "short", day: "numeric",
        hour: "numeric", minute: "2-digit", second: "2-digit"
      });
      if (fromCache) {
        updated.textContent = "Last known price · " + stamp + " (Houston time)";
      } else if (market.open) {
        updated.textContent = "Live spot price · updated " + stamp + " (Houston time)";
      } else {
        updated.textContent = market.note;
      }
    }

    var perGram21 = usd.format((spot / TROY_OZ_GRAMS) * 0.875);
    var perGram22 = usd.format((spot / TROY_OZ_GRAMS) * 0.9167);
    var tickerHTML =
      (market.open ? "" : '<span class="tick"><b>' + market.tick + "</b></span>") +
      '<span class="tick"><b>Gold ' + usd.format(spot) + "/oz</b></span>" +
      '<span class="tick">21K <b>' + perGram21 + '/g</b> <span lang="ar">عيار ٢١</span></span>' +
      '<span class="tick">22K <b>' + perGram22 + '/g</b> <span lang="ar">عيار ٢٢</span></span>' +
      '<span class="tick">Aryam&rsquo;s Jewelry · Houston, TX</span>' +
      '<span class="tick"><b>' + PHONE_TEXT + "</b></span>";
    $$("#tickerTrack .ticker-group").forEach(function (g) { g.innerHTML = tickerHTML; });
  }

  function goldFallback() {
    var updated = $("#priceUpdated");
    if (updated) updated.textContent = "Live feed unavailable — call " + PHONE_TEXT + " for today's prices.";
    var tickerHTML =
      '<span class="tick"><b>Aryam&rsquo;s Jewelry مجوهرات أريام</b></span>' +
      '<span class="tick">Arabic Gold · 21K &amp; 22K · Houston, TX</span>' +
      '<span class="tick"><b>' + PHONE_TEXT + "</b></span>";
    $$("#tickerTrack .ticker-group").forEach(function (g) { g.innerHTML = tickerHTML; });
  }

  function fetchGold() {
    fetch("https://api.gold-api.com/price/XAU", { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        if (!data || typeof data.price !== "number") throw new Error("bad payload");
        renderGold(data.price, data.updatedAt, false);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ price: data.price, at: data.updatedAt || new Date().toISOString() }));
        } catch (e) { /* storage may be unavailable; live rendering already done */ }
      })
      .catch(function () {
        var cached = null;
        try { cached = JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (e) { /* ignore */ }
        if (cached && typeof cached.price === "number") {
          renderGold(cached.price, cached.at, true);
        } else {
          goldFallback();
        }
      });
  }
  fetchGold();
  setInterval(fetchGold, 60 * 1000);

  /* ============================================================
     Scroll experience — GSAP + ScrollTrigger + Lenis
     (everything below is enhancement only)
     ============================================================ */
  if (REDUCED_MOTION || typeof gsap === "undefined") return;

  gsap.registerPlugin(ScrollTrigger);

  var lenis = null;
  if (typeof Lenis !== "undefined") {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* Smooth in-page anchors (with sticky-header offset) */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (id.length < 2) return;
      var target = $(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) {
        lenis.scrollTo(target, { offset: -70, duration: 1.4 });
      } else {
        target.scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  /* Hero entrance */
  var intro = gsap.timeline({ defaults: { ease: "power4.out" } });
  intro
    .from(".hero-title .line > span", { yPercent: 115, duration: 1.15, stagger: 0.14 }, 0.15)
    .from("[data-hero-fade]", { y: 26, autoAlpha: 0, duration: 0.9, stagger: 0.12 }, 0.55);

  /* Hero parallax */
  gsap.to(".hero-bg", {
    yPercent: 14,
    ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
  });
  gsap.to(".hero-ar-mark", {
    yPercent: -26,
    ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
  });

  /* Generic reveals */
  $$("[data-reveal]").forEach(function (el) {
    gsap.from(el, {
      y: 36,
      autoAlpha: 0,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 86%", once: true }
    });
  });

  /* Collection cards cascade (mobile scrolls natively; desktop pinned below) */
  gsap.from(".collection-card", {
    y: 60,
    autoAlpha: 0,
    duration: 1,
    ease: "power3.out",
    stagger: 0.08,
    scrollTrigger: { trigger: ".collections-viewport", start: "top 82%", once: true }
  });

  /* Pinned horizontal gallery on desktop */
  var mm = gsap.matchMedia();
  mm.add("(min-width: 1024px)", function () {
    var track = $("#collectionsTrack");
    var viewport = $(".collections-viewport");
    if (!track || !viewport) return;

    var distance = function () { return Math.max(0, track.scrollWidth - viewport.clientWidth); };
    if (distance() <= 0) return;

    var tween = gsap.to(track, {
      x: function () { return -distance(); },
      ease: "none",
      scrollTrigger: {
        trigger: ".collections-pin",
        start: "top top",
        end: function () { return "+=" + distance(); },
        scrub: 1,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true
      }
    });
    return function () { tween.scrollTrigger && tween.scrollTrigger.kill(); tween.kill(); };
  });

  /* Stat counters — markup already holds the real values, so the count-up
     is a pure enhancement (zero out only once GSAP is actually running) */
  $$(".stat-value[data-count]").forEach(function (el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
    var suffix = el.getAttribute("data-suffix") || "";
    var state = { v: 0 };
    el.textContent = "0";
    ScrollTrigger.create({
      trigger: el,
      start: "top 90%",
      once: true,
      onEnter: function () {
        gsap.to(state, {
          v: target,
          duration: 1.6,
          ease: "power2.out",
          onUpdate: function () { el.textContent = state.v.toFixed(decimals) + suffix; },
          onComplete: function () { el.textContent = target.toFixed(decimals) + suffix; }
        });
      }
    });
  });

  /* Keep pinned measurements honest once images finish loading */
  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();
