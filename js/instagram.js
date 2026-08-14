/* Instagram showcase — embeds real posts when permalinks are set; otherwise reel-style covers */
(function () {
  "use strict";

  var IG_PROFILE = "https://www.instagram.com/aryamjewelry0/";
  var root = document.getElementById("igShowcase");
  var track = document.getElementById("igTrack");
  if (!root || !track) return;

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

  function stop() {
    if (rotateTimer) {
      clearInterval(rotateTimer);
      rotateTimer = null;
    }
  }

  function slideWidth() {
    var card = track.querySelector(".ig-card");
    if (!card) return 280;
    var gap = 16;
    return card.getBoundingClientRect().width + gap;
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

  function coverCard(post) {
    var href = esc(post.url || IG_PROFILE);
    var cover = esc(post.cover || "/images/hero.jpg");
    var caption = esc(post.caption || "View on Instagram");
    var isReel = (post.type || "reel") === "reel";
    return (
      '<a class="ig-card ig-card-cover" href="' + href + '" target="_blank" rel="noopener">' +
        '<div class="ig-media">' +
          '<img src="' + cover + '" alt="" loading="lazy" />' +
          (isReel
            ? '<span class="ig-play" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M8 5v14l11-7Z"/></svg></span>'
            : "") +
          '<span class="ig-grad" aria-hidden="true"></span>' +
        "</div>" +
        '<div class="ig-meta">' +
          '<span class="ig-handle">@aryamjewelry0</span>' +
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
    var posts = (data && data.posts) || [];
    if (!posts.length) {
      track.innerHTML =
        '<a class="ig-card ig-card-cover" href="' + IG_PROFILE + '" target="_blank" rel="noopener">' +
          '<div class="ig-media"><img src="/images/hero.jpg" alt="" /><span class="ig-play" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M8 5v14l11-7Z"/></svg></span><span class="ig-grad"></span></div>' +
          '<div class="ig-meta"><span class="ig-handle">@aryamjewelry0</span><p>See the latest on Instagram</p></div>' +
        "</a>";
      return;
    }

    track.innerHTML = posts.map(function (p) {
      return isPostPermalink(p.url) ? embedCard(p) : coverCard(p);
    }).join("");

    // Duplicate for seamless-ish loop feel when only covers
    if (posts.length >= 3 && !posts.some(function (p) { return isPostPermalink(p.url); })) {
      track.innerHTML += posts.map(coverCard).join("");
    }

    var count = track.querySelectorAll(".ig-card").length;
    index = 0;
    go(0, count);
    start(count);

    root.onmouseenter = stop;
    root.onmouseleave = function () { start(count); };
    window.addEventListener("resize", function () { go(index, count); });
  }

  fetch("/data/instagram.posts.json", { cache: "no-store" })
    .then(function (r) { return r.json(); })
    .then(render)
    .catch(function () {
      render({ posts: [] });
    });
})();
