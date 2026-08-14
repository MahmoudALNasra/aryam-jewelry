// Supabase Edge Function — refresh Google Place reviews
// Places API returns up to 5 per call; we MERGE into existing cache (up to 24).
// Secrets: GOOGLE_MAPS_API_KEY, GOOGLE_PLACE_ID (optional)

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Review = {
  author_name: string;
  author_url: string | null;
  rating: number;
  text: string;
  profile_photo_url: string | null;
  relative_time_description: string;
  time: number | null;
};

function reviewKey(r: Review) {
  return (
    (r.author_name || "").toLowerCase().trim() +
    "|" +
    (r.text || "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 90)
  );
}

function mergeReviews(existing: Review[], incoming: Review[], max = 24): Review[] {
  const map = new Map<string, Review>();
  for (const r of [...existing, ...incoming]) {
    if (!r?.text) continue;
    const k = reviewKey(r);
    const prev = map.get(k);
    if (!prev || (r.time || 0) >= (prev.time || 0)) map.set(k, r);
  }
  return [...map.values()].sort((a, b) => (b.time || 0) - (a.time || 0)).slice(0, max);
}

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
    const incoming: Review[] = (result.reviews || []).map((r: {
      author_name?: string;
      author_url?: string;
      rating?: number;
      text?: string;
      profile_photo_url?: string;
      relative_time_description?: string;
      time?: number;
    }) => ({
      author_name: r.author_name || "Google reviewer",
      author_url: r.author_url || null,
      rating: r.rating || 5,
      text: r.text || "",
      profile_photo_url: r.profile_photo_url || null,
      relative_time_description: r.relative_time_description || "Google review",
      time: typeof r.time === "number" ? r.time : null,
    }));

    // Load existing cache to accumulate beyond Places' 5-review limit
    let existing: Review[] = [];
    try {
      const cacheRes = await fetch(
        `${supabaseUrl}/rest/v1/google_reviews_cache?place_id=eq.${encodeURIComponent(placeId)}&select=reviews&limit=1`,
        {
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
        },
      );
      const rows = await cacheRes.json();
      if (Array.isArray(rows) && rows[0]?.reviews) existing = rows[0].reviews;
    } catch {
      existing = [];
    }

    const reviews = mergeReviews(existing, incoming, 24);

    const payload = {
      place_id: placeId,
      rating: result.rating ?? null,
      user_ratings_total: result.user_ratings_total ?? null,
      reviews,
      updated_at: new Date().toISOString(),
    };

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
