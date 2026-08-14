(function () {
  "use strict";
  var listEl = document.getElementById("cartLines");
  if (!listEl) return;

  function render() {
    var items = AryamCart.read();
    if (!items.length) {
      listEl.innerHTML = '<p class="empty-state">Your cart is empty. <a href="index.html">Browse the shop</a></p>';
      document.getElementById("cartSummary").hidden = true;
      return;
    }
    document.getElementById("cartSummary").hidden = false;
    listEl.innerHTML = items.map(function (i) {
      return (
        '<article class="cart-line" data-id="' + i.id + '">' +
          '<img src="' + (i.image_url || "../images/hero.jpg") + '" alt="" />' +
          "<div>" +
            "<h3>" + escape(i.title) + "</h3>" +
            '<p class="muted">' + i.karat + "K · " + i.weight_grams + " g · " +
              AryamPricing.formatMoney(i.unit_price) + " each</p>" +
            '<div class="qty-input" style="margin-top:0.6rem">' +
              '<button type="button" data-act="minus">−</button>' +
              '<input type="number" value="' + i.qty + '" min="1" data-act="qty" />' +
              '<button type="button" data-act="plus">+</button>' +
            "</div>" +
            '<button type="button" class="btn btn-ghost btn-small" style="margin-top:0.6rem" data-act="remove">Remove</button>' +
          "</div>" +
          '<div class="line-price">' + AryamPricing.formatMoney(i.unit_price * i.qty) + "</div>" +
        "</article>"
      );
    }).join("");

    document.getElementById("cartSubtotal").textContent = AryamPricing.formatMoney(AryamCart.subtotal());
  }

  function escape(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  listEl.addEventListener("click", function (e) {
    var line = e.target.closest(".cart-line");
    if (!line) return;
    var id = line.getAttribute("data-id");
    var act = e.target.getAttribute("data-act");
    var item = AryamCart.read().find(function (i) { return i.id === id; });
    if (!item) return;
    if (act === "minus") AryamCart.setQty(id, item.qty - 1);
    if (act === "plus") AryamCart.setQty(id, item.qty + 1);
    if (act === "remove") AryamCart.remove(id);
    render();
  });

  listEl.addEventListener("change", function (e) {
    if (e.target.getAttribute("data-act") !== "qty") return;
    var line = e.target.closest(".cart-line");
    AryamCart.setQty(line.getAttribute("data-id"), e.target.value);
    render();
  });

  render();
})();
