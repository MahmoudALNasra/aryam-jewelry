// Supabase Edge Function — refresh latest Instagram posts (max 9, ~24h cache)
// Secrets: INSTAGRAM_ACCESS_TOKEN (required), INSTAGRAM_USER_ID (optional — defaults to /me)
// Token: Meta Instagram API with Instagram Login (long-lived user token)
// Deploy: supabase functions deploy refresh-instagram

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HANDLE = "aryamjewelry0";
const PROFILE = "https://www.instagram.com/aryamjewelry0/";
const MAX_POSTS = 9;

type IgMedia = {
  id?: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
};

function mapPost(m: IgMedia) {
  const type = (m.media_type || "").toUpperCase();
  const isVideo = type === "VIDEO" || type === "REELS" || type === "REEL";
  return {
    id: m.id || null,
    url: m.permalink || PROFILE,
    cover: m.thumbnail_url || m.media_url || null,
    media_url: m.media_url || null,
    caption: (m.caption || "").trim().slice(0, 120) || "View on Instagram",
    type: isVideo ? "reel" : "image",
    timestamp: m.timestamp || null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const token = Deno.env.get("INSTAGRAM_ACCESS_TOKEN");
    const userId = Deno.env.get("INSTAGRAM_USER_ID") || "me";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!token) {
      return new Response(JSON.stringify({ error: "INSTAGRAM_ACCESS_TOKEN not set" }), {
        status: 503,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";
    const apiUrl =
      `https://graph.instagram.com/v21.0/${encodeURIComponent(userId)}/media` +
      `?fields=${encodeURIComponent(fields)}` +
      `&limit=${MAX_POSTS}` +
      `&access_token=${encodeURIComponent(token)}`;

    const igRes = await fetch(apiUrl);
    const igJson = await igRes.json();

    if (!igRes.ok || igJson.error) {
      return new Response(JSON.stringify({
        error: igJson.error?.message || "Instagram API error",
        detail: igJson,
      }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const posts = (igJson.data || [])
      .map(mapPost)
      .filter((p: { url: string }) => !!p.url)
      .slice(0, MAX_POSTS);

    const payload = {
      handle: HANDLE,
      profile_url: PROFILE,
      posts,
      updated_at: new Date().toISOString(),
    };

    await fetch(
      `${supabaseUrl}/rest/v1/instagram_posts_cache?handle=eq.${encodeURIComponent(HANDLE)}`,
      {
        method: "DELETE",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      },
    );

    await fetch(`${supabaseUrl}/rest/v1/instagram_posts_cache`, {
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
    const message = err instanceof Error ? err.message : "Instagram refresh failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
