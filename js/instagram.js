/* Instagram — live public profile embed (no token, no manual paste).
   Instagram updates the feed; we only mount the official embed. */
(function () {
  "use strict";

  var HANDLE = "aryamjewelry0";
  var PROFILE = "https://www.instagram.com/aryamjewelry0/";
  var host = document.getElementById("igLiveFeed");
  if (!host) return;

  host.innerHTML =
    '<div class="ig-live">' +
      '<iframe class="ig-live-frame" title="@' + HANDLE + ' on Instagram" ' +
        'src="https://www.instagram.com/' + HANDLE + '/embed" ' +
        'loading="lazy" allowtransparency="true"></iframe>' +
      '<div class="ig-live-side">' +
        '<p class="ig-live-kicker">@' + HANDLE + "</p>" +
        "<h3>Follow the showroom</h3>" +
        "<p>New gold pieces, bridal sets, and reels from Houston — this feed updates from Instagram automatically.</p>" +
        '<a class="btn btn-gold" href="' + PROFILE + '" target="_blank" rel="noopener">Go to Instagram</a>' +
      "</div>" +
    "</div>";
})();
