// Supabase Edge Function — create Stripe Checkout Session
// Deploy: supabase functions deploy create-checkout
// Secrets: stripe secret key → STRIPE_SECRET_KEY
// Never expose STRIPE_SECRET_KEY to the browser.

import Stripe from "https://esm.sh/stripe@14?target=deno";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const secret = Deno.env.get("STRIPE_SECRET_KEY");
    if (!secret) {
      return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY not configured" }), {
        status: 503,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(secret, { apiVersion: "2023-10-16" });
    const body = await req.json();
    const { items, customer_email, success_url, cancel_url } = body;

    if (!Array.isArray(items) || !items.length) {
      return new Response(JSON.stringify({ error: "No items" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const line_items = items.map((item: {
      title: string;
      unit_price: number;
      qty: number;
      image_url?: string;
    }) => ({
      quantity: item.qty,
      price_data: {
        currency: "usd",
        unit_amount: Math.round(Number(item.unit_price) * 100),
        product_data: {
          name: item.title,
          images: item.image_url ? [item.image_url] : [],
        },
      },
    }));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: customer_email || undefined,
      line_items,
      success_url: success_url || "https://example.com/shop/checkout.html?success=1",
      cancel_url: cancel_url || "https://example.com/shop/cart.html",
    });

    return new Response(JSON.stringify({ url: session.url, id: session.id }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
