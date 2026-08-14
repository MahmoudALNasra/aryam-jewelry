/* Instagram — live public profile embed (no token, no manual paste).
   Uses Instagram’s official /embed feed + public profile meta. */
(function () {
  "use strict";

  var HANDLE = "aryamjewelry0";
  var PROFILE = "https://www.instagram.com/aryamjewelry0/";
  var AVATAR =
    "https://www.instagram.com/aryamjewelry0/media/?size=t";
  // Prefer a stable CDN avatar from public og:image when available via our own proxy-free link:
  // Visitors load Instagram’s embed for the actual posts grid.
  var host = document.getElementById("igLiveFeed");
  if (!host) return;

  host.innerHTML =
    '<div class="ig-live">' +
      '<iframe class="ig-live-frame" title="ARYAM JEWELRY (@' + HANDLE + ') on Instagram" ' +
        'src="https://www.instagram.com/' + HANDLE + '/embed" ' +
        'loading="lazy" allowtransparency="true"></iframe>' +
      '<aside class="ig-live-side">' +
        '<div class="ig-live-brand">' +
          '<img class="ig-live-avatar" src="https://scontent-hou1-1.cdninstagram.com/v/t51.2885-19/489007170_1196515978766026_5777782967977086896_n.jpg?stp=dst-jpg_s150x150_tt6" ' +
            'alt="ARYAM JEWELRY Instagram profile" width="72" height="72" loading="lazy" referrerpolicy="no-referrer" ' +
            'onerror="this.style.display=\'none\'" />' +
          '<div>' +
            '<p class="ig-live-kicker">@' + HANDLE + "</p>" +
            "<h3>ARYAM JEWELRY</h3>" +
          "</div>" +
        "</div>" +
        '<ul class="ig-live-stats" aria-label="Instagram stats">' +
          "<li><strong>4,820</strong><span>Followers</span></li>" +
          "<li><strong>427</strong><span>Posts</span></li>" +
          "<li><strong>974</strong><span>Following</span></li>" +
        "</ul>" +
        '<p class="ig-live-bio">Gold, diamond, silver &amp; watches — 18K, 21K, 22K, 24K. Houston showroom. English, Arabic &amp; Spanish.</p>' +
        '<p class="ig-live-note">The feed on the left is Instagram’s live public embed — new posts appear there automatically. No pasting or API token needed.</p>' +
        '<a class="btn btn-gold" href="' + PROFILE + '" target="_blank" rel="noopener">Go to Instagram</a>' +
      "</aside>" +
    "</div>";
})();
