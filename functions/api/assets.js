function buildJsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

const VALID_CATEGORIES = new Set(["background", "overlay", "template"]);

function normalizeCategory(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "backgrounds" || raw === "greenbackgrounds") return "background";
  if (raw === "overlays") return "overlay";
  if (raw === "templates") return "template";
  return VALID_CATEGORIES.has(raw) ? raw : "";
}

function normalizeTags(value) {
  const source = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((tag) => tag.trim());
  const seen = new Set();
  const out = [];
  source.forEach((tag) => {
    const clean = String(tag || "").trim().toLowerCase();
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    out.push(clean);
  });
  return out;
}

const VALID_EDITABLE_FIELDS = new Set([
  "eventName",
  "date",
  "schoolName",
  "title",
  "subtitle",
  "buttonText",
  "bannerText",
]);

const EDITABLE_FIELD_ALIASES = {
  event: "eventName",
  eventname: "eventName",
  name: "eventName",
  date: "date",
  school: "schoolName",
  schoolname: "schoolName",
  title: "title",
  subtitle: "subtitle",
  button: "buttonText",
  buttonlabel: "buttonText",
  buttontext: "buttonText",
  banner: "bannerText",
  bannertext: "bannerText",
};

function normalizeEditableFields(value) {
  const source = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((field) => field.trim());
  const seen = new Set();
  const out = [];
  source.forEach((field) => {
    const raw = String(field || "").trim();
    const compact = raw.replace(/[\s_-]+/g, "").toLowerCase();
    const clean = VALID_EDITABLE_FIELDS.has(raw)
      ? raw
      : EDITABLE_FIELD_ALIASES[compact] || "";
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    out.push(clean);
  });
  return out;
}

function normalizeAsset(item) {
  if (!item || typeof item !== "object") return null;
  const url = String(item.url || item.secure_url || item.src || "").trim();
  if (!/^https?:\/\//i.test(url)) return null;
  const category = normalizeCategory(item.category || item.kind);
  if (!category) return null;
  const id = String(item.id || `${category}:${url}`).trim();
  const editableFields = normalizeEditableFields(item.editableFields);
  return {
    id,
    category,
    url,
    secure_url: url,
    name: String(item.name || item.originalName || url.split("/").pop() || category).trim(),
    tags: normalizeTags(item.tags),
    folder: String(item.folder || "").trim(),
    hash: String(item.hash || "").trim(),
    contentType: String(item.contentType || item.type || "").trim(),
    createdAt: String(item.createdAt || item.created_at || new Date().toISOString()),
    updatedAt: String(item.updatedAt || item.updated_at || new Date().toISOString()),
    customizable:
      item.customizable === true ||
      (item.customizable !== false && editableFields.length > 0),
    editableFields,
    archived: item.archived === true,
    hidden: item.hidden === true || item.archived === true,
  };
}

function normalizeLibraryPayload(payload) {
  const assets = Array.isArray(payload && payload.assets)
    ? payload.assets
    : Array.isArray(payload)
    ? payload
    : [];
  const byId = new Map();
  assets.map(normalizeAsset).filter(Boolean).forEach((asset) => {
    byId.set(asset.id, asset);
  });
  return {
    assets: Array.from(byId.values()).sort((a, b) =>
      String(b.createdAt).localeCompare(String(a.createdAt))
    ),
  };
}

async function readLibrary(env) {
  const raw = await env.THEMES_KV.get("assetLibrary");
  if (!raw) return { assets: [] };
  try {
    return normalizeLibraryPayload(JSON.parse(raw));
  } catch (_err) {
    return { assets: [] };
  }
}

async function writeLibrary(env, library) {
  const normalized = normalizeLibraryPayload(library);
  await env.THEMES_KV.put("assetLibrary", JSON.stringify(normalized));
  return normalized;
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
    return buildJsonResponse(await readLibrary(env));
  }

  if (request.method === "POST") {
    try {
      const incoming = normalizeAsset(await request.json());
      if (!incoming) {
        return buildJsonResponse({ ok: false, error: "Invalid asset payload." }, 400);
      }
      const library = await readLibrary(env);
      const existingIndex = library.assets.findIndex(
        (asset) => asset.id === incoming.id || asset.url === incoming.url
      );
      if (existingIndex >= 0) {
        const existing = library.assets[existingIndex];
        library.assets[existingIndex] = {
          ...existing,
          ...incoming,
          tags: normalizeTags([...(existing.tags || []), ...(incoming.tags || [])]),
          archived: incoming.archived === true ? true : existing.archived === true,
          hidden:
            incoming.hidden === true ||
            incoming.archived === true ||
            existing.hidden === true ||
            existing.archived === true,
          createdAt: existing.createdAt || incoming.createdAt,
          updatedAt: new Date().toISOString(),
        };
      } else {
        library.assets.unshift(incoming);
      }
      const next = await writeLibrary(env, library);
      return buildJsonResponse({ ok: true, asset: incoming, count: next.assets.length });
    } catch (err) {
      return buildJsonResponse(
        { ok: false, error: err && err.message ? err.message : "Invalid asset payload." },
        400
      );
    }
  }

  if (request.method === "PATCH" || request.method === "DELETE") {
    try {
      const body = await request.json().catch(() => ({}));
      const id = String(body.id || "").trim();
      const url = String(body.url || "").trim();
      if (!id && !url) {
        return buildJsonResponse({ ok: false, error: "Missing asset id." }, 400);
      }
      const library = await readLibrary(env);
      const index = library.assets.findIndex(
        (asset) => asset.id === id || asset.url === url
      );
      if (index < 0) {
        return buildJsonResponse({ ok: false, error: "Asset not found." }, 404);
      }
      if (request.method === "DELETE") {
        library.assets.splice(index, 1);
      } else {
        library.assets[index] = normalizeAsset({
          ...library.assets[index],
          ...body,
          updatedAt: new Date().toISOString(),
        });
      }
      const next = await writeLibrary(env, library);
      return buildJsonResponse({ ok: true, count: next.assets.length });
    } catch (err) {
      return buildJsonResponse(
        { ok: false, error: err && err.message ? err.message : "Invalid asset update." },
        400
      );
    }
  }

  return buildJsonResponse({ ok: false, error: "Method not allowed." }, 405);
}
