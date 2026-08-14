(function () {
  "use strict";
  var form = document.getElementById("checkoutForm");
  if (!form) return;

  var items = AryamCart.read();
  var summary = document.getElementById("checkoutSummary");
  var notice = document.getElementById("checkoutNotice");
  var cfg = window.ARYAM_CONFIG || {};

  if (!items.length) {
    summary.innerHTML = '<p class="empty-state">Nothing to check out. <a href="index.html">Shop pieces</a></p>';
    form.hidden = true;
    return;
  }

  summary.innerHTML =
    "<ul style='list-style:none;padding:0;margin:0 0 1rem'>" +
    items.map(function (i) {
      return "<li style='display:flex;justify-content:space-between;gap:1rem;padding:0.4rem 0;color:var(--muted)'>" +
        "<span>" + i.qty + "× " + i.title + "</span>" +
        "<span>" + AryamPricing.formatMoney(i.unit_price * i.qty) + "</span></li>";
    }).join("") +
    "</ul>" +
    '<p class="total" style="font-family:var(--font-display);font-size:1.5rem;color:var(--gold-2)">' +
      "Total " + AryamPricing.formatMoney(AryamCart.subtotal()) +
    "</p>";

  var stripeReady = !!(cfg.stripePublishableKey && cfg.supabaseUrl);
  if (!stripeReady) {
    notice.className = "notice warn";
    notice.innerHTML =
      "<strong>Demo checkout</strong> — Stripe keys are not configured yet. " +
      "You can still place a demo order (no card charge). When ready, add keys in " +
      "<code>js/shop/config.js</code> and deploy the <code>create-checkout</code> Edge Function.";
  } else {
    notice.className = "notice ok";
    notice.textContent = "Secure checkout via Stripe is enabled.";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = {
      customer_name: form.name.value.trim(),
      customer_email: form.email.value.trim(),
      customer_phone: form.phone.value.trim(),
      notes: form.notes.value.trim(),
      items: items,
      subtotal: AryamCart.subtotal()
    };

    var btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.textContent = "Working…";

    if (stripeReady) {
      startStripe(data).catch(function (err) {
        notice.className = "notice warn";
        notice.textContent = err.message || "Stripe checkout failed — try demo or call the store.";
        btn.disabled = false;
        btn.textContent = "Pay with Stripe";
      });
      return;
    }

    placeDemo(data).then(function () {
      AryamCart.clear();
      notice.className = "notice ok";
      notice.innerHTML =
        "<strong>Demo order recorded.</strong> No payment was taken. " +
        "We’ll treat this as a hold request — call <a href='tel:+18327627620'>(832) 762-7620</a> to confirm. " +
        '<a href="index.html">Back to shop</a>';
      form.hidden = true;
      summary.hidden = true;
    }).catch(function () {
      notice.className = "notice warn";
      notice.textContent = "Could not save the demo order. Please call the store.";
      btn.disabled = false;
      btn.textContent = "Place demo order";
    });
  });

  function placeDemo(data) {
    var sb = AryamCatalog.client && AryamCatalog.client();
    var payload = {
      status: "demo",
      customer_name: data.customer_name,
      customer_email: data.customer_email,
      customer_phone: data.customer_phone,
      notes: data.notes,
      items: data.items,
      subtotal: data.subtotal,
      currency: "USD"
    };

    var stockOps = data.items.map(function (i) {
      return AryamCatalog.adjustStock(i.id, -i.qty);
    });

    if (sb) {
      return sb.from("orders").insert(payload).then(function (res) {
        if (res.error) throw res.error;
        return Promise.all(stockOps);
      });
    }

    try {
      var key = "aryamDemoOrders";
      var prev = JSON.parse(localStorage.getItem(key) || "[]");
      prev.push(Object.assign({ id: "demo-" + Date.now(), created_at: new Date().toISOString() }, payload));
      localStorage.setItem(key, JSON.stringify(prev));
    } catch (e) { /* ignore */ }
    return Promise.all(stockOps);
  }

  function startStripe(data) {
    var success = location.origin + location.pathname.replace(/[^/]*$/, "") + "checkout.html?success=1";
    var cancel = location.origin + location.pathname.replace(/[^/]*$/, "") + "cart.html";
    var url = cfg.supabaseUrl.replace(/\/$/, "") + "/functions/v1/create-checkout";

    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + cfg.supabaseAnonKey
      },
      body: JSON.stringify({
        items: data.items.map(function (i) {
          return {
            title: i.title,
            unit_price: i.unit_price,
            qty: i.qty,
            image_url: absoluteImg(i.image_url)
          };
        }),
        customer_email: data.customer_email,
        success_url: success,
        cancel_url: cancel
      })
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (j.error || !j.url) throw new Error(j.error || "No checkout URL");
      location.href = j.url;
    });
  }

  function absoluteImg(path) {
    if (!path) return "";
    if (/^https?:/i.test(path)) return path;
    var base = (cfg.siteUrl || "").replace(/\/$/, "");
    return base + "/" + path.replace(/^\.\.\//, "");
  }

  if (new URLSearchParams(location.search).get("success") === "1") {
    AryamCart.clear();
    notice.className = "notice ok";
    notice.innerHTML = "<strong>Payment received.</strong> Thank you — Aryam’s Jewelry will confirm your order shortly.";
    form.hidden = true;
  }
})();
