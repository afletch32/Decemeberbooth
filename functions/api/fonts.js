const DEFAULT_FONTS_PAYLOAD = {
  available: [
    {
      name: "Comic Neue",
      weights: [400, 700],
      preview: "Welcome to the celebration!",
    },
    {
      name: "Creepster",
      weights: [400],
      preview: "Spooky season starts now!",
    },
    {
      name: "Nosifer",
      weights: [400],
      preview: "Dripping thrills at Fletch Photobooth!",
    },
    {
      name: "Montserrat",
      weights: [400, 600, 700],
      preview: "Modern, clean, and easy to read.",
    },
    {
      name: "Bangers",
      weights: [400],
      preview: "Let's make some noise tonight!",
    },
    {
      name: "Great Vibes",
      weights: [400],
      preview: "Love is in the air.",
    },
  ],
  defaults: {
    heading: "Comic Neue",
    body: "Montserrat",
  },
  pairings: [
    {
      heading: "Creepster",
      body: "Comic Neue",
      notes: "Halloween ready mix",
      preview: "Spooky season starts now!",
    },
    {
      heading: "Nosifer",
      body: "Inter",
      notes: "Dripping horror headline",
      preview: "Dripping thrills at Fletch Photobooth!",
    },
    {
      heading: "Bangers",
      body: "Montserrat",
      notes: "Bold energy + legible copy",
      preview: "Let's make some noise tonight!",
    },
    {
      heading: "Great Vibes",
      body: "Montserrat",
      notes: "Romantic headline with modern body",
      preview: "Love is in the air.",
    },
  ],
};

function buildJsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

async function readFonts(env) {
  const raw = await env.FONTS_KV.get("fonts");
  if (!raw) return DEFAULT_FONTS_PAYLOAD;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? parsed
      : DEFAULT_FONTS_PAYLOAD;
  } catch (_err) {
    return DEFAULT_FONTS_PAYLOAD;
  }
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return buildJsonResponse({ ok: true });
  }

  if (!env || !env.FONTS_KV) {
    return buildJsonResponse(
      { ok: false, error: "FONTS_KV binding is not configured." },
      500
    );
  }

  if (request.method === "GET") {
    return buildJsonResponse(await readFonts(env));
  }

  if (request.method === "PUT") {
    try {
      const payload = await request.json();
      await env.FONTS_KV.put("fonts", JSON.stringify(payload || []));
      return buildJsonResponse({ ok: true });
    } catch (err) {
      return buildJsonResponse(
        { ok: false, error: err && err.message ? err.message : "Invalid fonts payload." },
        400
      );
    }
  }

  return buildJsonResponse({ ok: false, error: "Method not allowed." }, 405);
}
