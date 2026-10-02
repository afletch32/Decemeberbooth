import {
  getAssetLibraryId,
  getAssetLibraryUrlKey,
  normalizeAssetLibraryPayload,
  normalizeAssetTags,
  normalizePagesAssetCategory,
} from "../../scripts/asset-library-utils.mjs";

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

function normalizeAsset(item) {
  if (!item || typeof item !== "object") return null;
  if (!normalizePagesAssetCategory(item.category || item.kind)) return null;
  return normalizeAssetLibraryPayload([item], {
    normalizeCategory: normalizePagesAssetCategory,
    includeExtendedMetadata: false,
  }).assets[0] || null;
}

function normalizeLibraryPayload(payload) {
  return normalizeAssetLibraryPayload(payload, {
    normalizeCategory: normalizePagesAssetCategory,
    includeExtendedMetadata: false,
  });
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
          tags: normalizeAssetTags([...(existing.tags || []), ...(incoming.tags || [])]),
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
