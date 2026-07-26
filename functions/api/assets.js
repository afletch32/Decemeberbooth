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

const VALID_CATEGORIES = new Set([
  "background",
  "overlay",
  "template",
  "idle-screen",
]);

function normalizeCategory(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "backgrounds" || raw === "greenbackgrounds") return "background";
  if (raw === "overlays") return "overlay";
  if (raw === "templates") return "template";
  return VALID_CATEGORIES.has(raw) ? raw : "";
}

const THEME_CATEGORIES = new Set([
  "general",
  "birthday",
  "school",
  "wedding",
  "holidays",
]);

function normalizeThemeCategory(value) {
  const raw = String(value || "").trim().toLowerCase();
  return THEME_CATEGORIES.has(raw) ? raw : "";
}

function assetMatchesThemeCategory(asset, themeCategory) {
  if (!themeCategory) return true;
  const hints = [
    ...(Array.isArray(asset.tags) ? asset.tags : []),
    asset.folder,
    asset.name,
    asset.url,
  ]
    .join(" ")
    .toLowerCase();
  if (themeCategory === "holidays") {
    return /(^|[\s/_:-])(holiday|holidays|fall|winter|spring|summer)(?=$|[\s/_:-])/.test(hints);
  }
  return new RegExp(`(^|[\\s/_:-])${themeCategory}(?=$|[\\s/_:-])`).test(hints);
}

function getAssetLibraryUrlKey(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(data:|blob:)/i.test(raw)) return raw;
  const withoutCache = raw.split("#")[0].split("?")[0].trim();
  if (!withoutCache) return "";
  if (/^https?:\/\//i.test(withoutCache)) {
    try {
      const parsed = new URL(withoutCache);
      parsed.hash = "";
      parsed.search = "";
      return parsed.toString().replace(/\/+$/g, "").toLowerCase();
    } catch (_) {
      return withoutCache.replace(/\/+$/g, "").toLowerCase();
    }
  }
  return withoutCache.replace(/^\/+/, "").replace(/\/+$/g, "").toLowerCase();
}

function getAssetLibraryId(category, url) {
  const normalizedCategory = normalizeCategory(category);
  const key = getAssetLibraryUrlKey(url);
  return normalizedCategory && key ? `${normalizedCategory}:${key}` : "";
}

function normalizeAssetLibraryRecordId(category, url, id = "") {
  const canonicalId = getAssetLibraryId(category, url);
  const rawId = String(id || "").trim();
  if (!rawId) return canonicalId;
  const normalizedCategory = normalizeCategory(category);
  const prefix = normalizedCategory ? `${normalizedCategory}:` : "";
  const suffix = prefix && rawId.startsWith(prefix) ? rawId.slice(prefix.length) : rawId;
  const suffixKey = getAssetLibraryUrlKey(suffix);
  const urlKey = getAssetLibraryUrlKey(url);
  if (
    canonicalId &&
    suffixKey &&
    urlKey &&
    (suffixKey === urlKey || /[/?#]/.test(suffix) || /^https?:\/\//i.test(suffix))
  ) {
    return canonicalId;
  }
  return rawId;
}

function assetMatchesLookup(asset, id = "", url = "") {
  if (!asset) return false;
  const rawId = String(id || "").trim();
  const rawUrl = String(url || "").trim();
  const assetCanonicalId = getAssetLibraryId(asset.category, asset.url);
  if (rawId && (asset.id === rawId || assetCanonicalId === rawId)) return true;
  if (!rawUrl) return false;
  return (
    asset.url === rawUrl ||
    getAssetLibraryUrlKey(asset.url) === getAssetLibraryUrlKey(rawUrl)
  );
}

function isManageableAssetUrl(value) {
  const url = String(value || "").trim();
  if (!url) return false;
  if (/^(javascript|vbscript):/i.test(url)) return false;
  return true;
}

function normalizeLegacyAssetUrl(value) {
  const url = String(value || "").trim();
  if (!url || /^https?:\/\//i.test(url) || /^(data:|blob:)/i.test(url)) {
    return url;
  }
  return url.replace(/^\/?assets\/hawks\//i, "assets/school/hawks/");
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
  const url = normalizeLegacyAssetUrl(
    item.url || item.secure_url || item.src || ""
  );
  if (!isManageableAssetUrl(url)) return null;
  const category = normalizeCategory(item.category || item.kind);
  if (!category) return null;
  const id = normalizeAssetLibraryRecordId(category, url, item.id);
  if (!id) return null;
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
    const mergeKey = getAssetLibraryId(asset.category, asset.url) || asset.id;
    const existing = byId.get(mergeKey);
    if (existing) {
      byId.set(mergeKey, {
        ...existing,
        ...asset,
        tags: normalizeTags([...(existing.tags || []), ...(asset.tags || [])]),
        editableFields: normalizeEditableFields([
          ...(existing.editableFields || []),
          ...(asset.editableFields || []),
        ]),
        createdAt: existing.createdAt || asset.createdAt,
        customizable: existing.customizable === true || asset.customizable === true,
        archived: existing.archived === true || asset.archived === true,
        hidden:
          existing.hidden === true ||
          existing.archived === true ||
          asset.hidden === true ||
          asset.archived === true,
      });
    } else {
      byId.set(mergeKey, asset);
    }
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
    const themeCategory = normalizeThemeCategory(
      new URL(request.url).searchParams.get("themeCategory")
    );
    const library = await readLibrary(env);
    return buildJsonResponse({
      assets: library.assets.filter((asset) =>
        assetMatchesThemeCategory(asset, themeCategory)
      ),
    });
  }

  if (request.method === "POST") {
    try {
      const incoming = normalizeAsset(await request.json());
      if (!incoming) {
        return buildJsonResponse({ ok: false, error: "Invalid asset payload." }, 400);
      }
      const library = await readLibrary(env);
      const existingIndex = library.assets.findIndex(
        (asset) =>
          assetMatchesLookup(asset, incoming.id, incoming.url) ||
          getAssetLibraryId(asset.category, asset.url) ===
            getAssetLibraryId(incoming.category, incoming.url)
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
        (asset) => assetMatchesLookup(asset, id, url)
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
