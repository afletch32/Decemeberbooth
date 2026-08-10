function buildJsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function normalizeTag(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function normalizeGalleryPayload(payload, tag) {
  const resources = Array.isArray(payload && payload.resources)
    ? payload.resources
    : [];
  return {
    tag,
    title: String((payload && payload.title) || ""),
    resources: resources
      .map((item) => {
        const url = String(
          (item && (item.secure_url || item.url)) || ""
        ).trim();
        if (!/^https?:\/\//i.test(url)) return null;
        const resourceType =
          item && (item.resource_type === "video" || item.type === "video")
            ? "video"
            : "image";
        return {
          capture_id: String((item && item.capture_id) || ""),
          secure_url: url,
          url,
          created_at: String((item && item.created_at) || ""),
          resource_type: resourceType,
          type: resourceType,
          mode: String((item && item.mode) || ""),
        };
      })
      .filter(Boolean),
  };
}

async function readGallery(env, tag) {
  const raw = await env.THEMES_KV.get(`gallery:${tag}`);
  if (!raw) return { tag, title: "", resources: [] };
  try {
    return normalizeGalleryPayload(JSON.parse(raw), tag);
  } catch (_err) {
    return { tag, title: "", resources: [] };
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

  const url = new URL(request.url);
  const tag = normalizeTag(url.searchParams.get("tag"));
  if (!tag) {
    return buildJsonResponse({ ok: false, error: "Missing gallery tag." }, 400);
  }

  if (request.method === "GET") {
    return buildJsonResponse(await readGallery(env, tag));
  }

  if (request.method === "POST") {
    try {
      const body = await request.json();
      const existing = await readGallery(env, tag);
      const incomingUrl = String(body.secure_url || body.url || "").trim();
      if (!/^https?:\/\//i.test(incomingUrl)) {
        return buildJsonResponse(
          { ok: false, error: "Invalid gallery photo URL." },
          400
        );
      }
      const nextResource = {
        capture_id: String(body.capture_id || ""),
        secure_url: incomingUrl,
        url: incomingUrl,
        created_at: String(body.created_at || new Date().toISOString()),
        resource_type:
          body.resource_type === "video" || body.type === "video"
            ? "video"
            : "image",
        type:
          body.resource_type === "video" || body.type === "video"
            ? "video"
            : "image",
        mode: String(body.mode || ""),
      };
      const resources = [
        nextResource,
        ...existing.resources.filter(
          (item) =>
            item &&
            item.secure_url !== incomingUrl &&
            item.url !== incomingUrl &&
            (!nextResource.capture_id ||
              item.capture_id !== nextResource.capture_id)
        ),
      ].slice(0, 500);
      const next = {
        tag,
        title: String(body.title || existing.title || ""),
        resources,
      };
      await env.THEMES_KV.put(`gallery:${tag}`, JSON.stringify(next));
      if (nextResource.capture_id) {
        await env.THEMES_KV.put(
          `share:${nextResource.capture_id}`,
          JSON.stringify({
            capture_id: nextResource.capture_id,
            secure_url: nextResource.secure_url,
            resource_type: nextResource.resource_type,
            title: next.title,
            created_at: nextResource.created_at,
          })
        );
      }
      return buildJsonResponse({ ok: true, count: resources.length });
    } catch (err) {
      return buildJsonResponse(
        {
          ok: false,
          error: err && err.message ? err.message : "Invalid gallery payload.",
        },
        400
      );
    }
  }

  return buildJsonResponse({ ok: false, error: "Method not allowed." }, 405);
}
