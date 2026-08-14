// Save curated Instagram post embeds from Admin (no Instagram login required)
// Body: { password, posts: [{ url, type?, timestamp? }] }
// Secret: ADMIN_DEMO_PASSWORD

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HANDLE = "aryamjewelry0";
const PROFILE = "https://www.instagram.com/aryamjewelry0/";
const MAX_POSTS = 9;

function isPostPermalink(url: string) {
  return /instagram\.com\/(p|reel|tv)\/[A-Za-z0-9_-]+/i.test(url || "");
}

function cleanUrl(url: string) {
  return String(url || "").trim().split("?")[0].replace(/\/$/, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const adminPass = Deno.env.get("ADMIN_DEMO_PASSWORD") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body = await req.json().catch(() => ({}));
    if (!adminPass || body.password !== adminPass) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const incoming = Array.isArray(body.posts) ? body.posts : [];
    const posts = incoming
      .map((p: { url?: string; type?: string; timestamp?: string; caption?: string }, i: number) => {
        const url = cleanUrl(p.url || "");
        if (!isPostPermalink(url)) return null;
        const isReel = /\/reel\//i.test(url) || (p.type || "") === "reel";
        return {
          url,
          type: isReel ? "reel" : (p.type || "image"),
          caption: p.caption || "",
          timestamp: p.timestamp || new Date(Date.now() - i * 60000).toISOString(),
        };
      })
      .filter(Boolean)
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
    const message = err instanceof Error ? err.message : "Save failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
