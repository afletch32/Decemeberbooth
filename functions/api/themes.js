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

async function readThemes(env) {
  const raw = await env.THEMES_KV.get("themes");
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_err) {
    return {};
  }
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return buildJsonResponse({ ok: true });
  }

  if (!env || !env.THEMES_KV) {
    return buildJsonResponse(
      { ok: false, error: "THEMES_KV binding is not configured." },
      500
    );
  }

  if (request.method === "GET") {
    return buildJsonResponse(await readThemes(env));
  }

  if (request.method === "PUT") {
    try {
      const payload = await request.json();
      await env.THEMES_KV.put("themes", JSON.stringify(payload || {}));
      return buildJsonResponse({ ok: true });
    } catch (err) {
      return buildJsonResponse(
        { ok: false, error: err && err.message ? err.message : "Invalid themes payload." },
        400
      );
    }
  }

  return buildJsonResponse({ ok: false, error: "Method not allowed." }, 405);
}
