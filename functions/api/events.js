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

function normalizeEventsPayload(payload) {
  if (Array.isArray(payload)) {
    return { events: payload, activeEventId: "" };
  }
  return {
    events: Array.isArray(payload && payload.events) ? payload.events : [],
    activeEventId:
      typeof (payload && payload.activeEventId) === "string"
        ? payload.activeEventId
        : "",
  };
}

async function readEvents(env) {
  const raw = await env.THEMES_KV.get("events");
  if (!raw) return { events: [], activeEventId: "" };
  try {
    return normalizeEventsPayload(JSON.parse(raw));
  } catch (_err) {
    return { events: [], activeEventId: "" };
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
    return buildJsonResponse(await readEvents(env));
  }

  if (request.method === "PUT") {
    try {
      const payload = normalizeEventsPayload(await request.json());
      await env.THEMES_KV.put("events", JSON.stringify(payload));
      return buildJsonResponse({ ok: true });
    } catch (err) {
      return buildJsonResponse(
        { ok: false, error: err && err.message ? err.message : "Invalid events payload." },
        400
      );
    }
  }

  return buildJsonResponse({ ok: false, error: "Method not allowed." }, 405);
}
