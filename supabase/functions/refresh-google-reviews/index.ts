// Supabase Edge Function — refresh Google Place reviews (max ~5 from Places API)
// Secrets: GOOGLE_MAPS_API_KEY, SUPABASE_SERVICE_ROLE_KEY (auto), GOOGLE_PLACE_ID (optional)
// Deploy: supabase functions deploy refresh-google-reviews
// Schedule: call this URL once/day (Vercel cron, Supabase cron, or GitHub Action)

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    const placeId = Deno.env.get("GOOGLE_PLACE_ID") || "ChIJvZYXdLTDQIYRthuVnPvmRzI";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GOOGLE_MAPS_API_KEY not set" }), {
        status: 503,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const placesUrl =
      "https://maps.googleapis.com/maps/api/place/details/json" +
      `?place_id=${encodeURIComponent(placeId)}` +
      "&fields=name,rating,user_ratings_total,reviews" +
      `&key=${encodeURIComponent(apiKey)}`;

    const placesRes = await fetch(placesUrl);
    const placesJson = await placesRes.json();
    if (placesJson.status !== "OK" || !placesJson.result) {
      return new Response(JSON.stringify({ error: placesJson.status || "Places error", detail: placesJson }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const result = placesJson.result;
    const reviews = (result.reviews || []).map((r: {
      author_name?: string;
      rating?: number;
      text?: string;
      profile_photo_url?: string;
      relative_time_description?: string;
      time?: number;
    }) => ({
      author_name: r.author_name || "Google reviewer",
      rating: r.rating || 5,
      text: r.text || "",
      profile_photo_url: r.profile_photo_url || null,
      relative_time_description: r.relative_time_description || "Google review",
      time: typeof r.time === "number" ? r.time : null,
    }));

    const payload = {
      place_id: placeId,
      rating: result.rating ?? null,
      user_ratings_total: result.user_ratings_total ?? null,
      reviews,
      updated_at: new Date().toISOString(),
    };

    // Replace cache row(s)
    await fetch(`${supabaseUrl}/rest/v1/google_reviews_cache?place_id=eq.${encodeURIComponent(placeId)}`, {
      method: "DELETE",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });

    await fetch(`${supabaseUrl}/rest/v1/google_reviews_cache`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    });

    return new Response(JSON.stringify(payload), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Review refresh failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
