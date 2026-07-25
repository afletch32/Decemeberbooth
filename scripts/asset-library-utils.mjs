const DEFAULT_IDLE_START_ZONE = { x: 50, y: 73, width: 28, height: 20 };
const DEFAULT_PHOTO_CHOICE_ZONES = {
  singlePhoto: { x: 34, y: 59, width: 27, height: 50 },
  photoStrip: { x: 66, y: 59, width: 27, height: 50 },
};

const EDITABLE_FIELD_LABELS = {
  eventName: "Event Name",
  date: "Date",
  schoolName: "School Name",
  title: "Title",
  subtitle: "Subtitle",
  buttonText: "Button Text",
  bannerText: "Banner Text",
};

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

export function normalizeUploadedAssetCategory(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "backgrounds" || raw === "greenbackgrounds") return "background";
  if (raw === "overlays") return "overlay";
  if (raw === "templates") return "template";
  if (
    raw === "idle-screens" ||
    raw === "idlescreens" ||
    raw === "photo-choice-screens" ||
    raw === "photochoicescreens"
  ) {
    return "idle-screen";
  }
  if (raw === "thank-you-screens" || raw === "thankyouscreens") {
    return "thank-you-screen";
  }
  return ["background", "overlay", "template", "idle-screen", "thank-you-screen"].includes(raw)
    ? raw
    : "";
}

export function normalizeIdleScreenOrientation(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "portrait" || normalized === "landscape") return normalized;
  return "general";
}

export function normalizeIdleButtonZone(zone) {
  const source = zone && typeof zone === "object" ? zone : {};
  const clamp = (value, fallback, min, max) =>
    Math.min(
      max,
      Math.max(min, Number.isFinite(Number(value)) ? Number(value) : fallback)
    );
  const width = clamp(source.width, DEFAULT_IDLE_START_ZONE.width, 8, 100);
  const height = clamp(source.height, DEFAULT_IDLE_START_ZONE.height, 8, 100);
  return {
    x: clamp(source.x, DEFAULT_IDLE_START_ZONE.x, width / 2, 100 - width / 2),
    y: clamp(source.y, DEFAULT_IDLE_START_ZONE.y, height / 2, 100 - height / 2),
    width,
    height,
  };
}

export function getAssetLibraryUrlKey(url) {
  const raw = String(url || "").trim();
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

export function getAssetLibraryId(category, url) {
  const normalizedCategory = normalizeUploadedAssetCategory(category);
  const value = getAssetLibraryUrlKey(url);
  return normalizedCategory && value ? `${normalizedCategory}:${value}` : "";
}

export function normalizeAssetLibraryRecordId(category, url, id = "") {
  const canonicalId = getAssetLibraryId(category, url);
  const rawId = String(id || "").trim();
  if (!rawId) return canonicalId;
  const normalizedCategory = normalizeUploadedAssetCategory(category);
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

export function normalizeLegacyAssetUrl(value) {
  const url = String(value || "").trim();
  if (!url || /^https?:\/\//i.test(url) || /^(data:|blob:)/i.test(url)) {
    return url;
  }
  return url.replace(/^\/?assets\/hawks\//i, "assets/school/hawks/");
}

export function normalizeAssetTags(value) {
  const seen = new Set();
  const source = Array.isArray(value) ? value : String(value || "").split(",");
  return source
    .map((tag) => String(tag || "").trim().toLowerCase())
    .filter((tag) => {
      if (!tag || seen.has(tag)) return false;
      seen.add(tag);
      return true;
    });
}

export function normalizeEditableFields(value) {
  const source = Array.isArray(value) ? value : String(value || "").split(",");
  const seen = new Set();
  return source
    .map((field) => {
      const raw = String(field || "").trim();
      const compact = raw.replace(/[\s_-]+/g, "").toLowerCase();
      return EDITABLE_FIELD_LABELS[raw]
        ? raw
        : EDITABLE_FIELD_ALIASES[compact] || "";
    })
    .filter((field) => {
      if (!field || seen.has(field)) return false;
      seen.add(field);
      return true;
    });
}

export function getAssetEditableFieldLabel(field) {
  return EDITABLE_FIELD_LABELS[field] || field;
}

export function detectEditableFieldsFromText(...values) {
  const text = values
    .flat()
    .filter(Boolean)
    .join(" ")
    .replace(/[-_]+/g, " ")
    .toLowerCase();
  const fields = [];
  const add = (field, patterns) => {
    if (patterns.some((pattern) => pattern.test(text))) fields.push(field);
  };
  add("eventName", [/\bevent\s*name\b/, /\bevent\b/]);
  add("date", [/\bdate\b/, /\byyyy\b/, /\bmm(?:\/|-)dd\b/]);
  add("schoolName", [/\bschool\s*name\b/, /\bschool\b/]);
  add("title", [/\btitle\b/, /\bheadline\b/]);
  add("subtitle", [/\bsubtitle\b/, /\bsub\s*title\b/]);
  add("buttonText", [/\bbutton\s*text\b/, /\bbutton\b/, /\bcta\b/]);
  add("bannerText", [/\bbanner\s*text\b/, /\bbanner\b/]);
  return normalizeEditableFields(fields);
}

function getAssetUrlValue(item) {
  return normalizeLegacyAssetUrl(
    (item && (item.url || item.secure_url || item.src || item.renderSrc)) || ""
  );
}

function isManageableAssetUrl(url) {
  const value = String(url || "").trim();
  return Boolean(value) && !/^(javascript|vbscript):/i.test(value);
}

export function normalizeAssetLibraryPayload(payload, options = {}) {
  const photoChoiceZones =
    options.photoChoiceZones && typeof options.photoChoiceZones === "object"
      ? options.photoChoiceZones
      : DEFAULT_PHOTO_CHOICE_ZONES;
  const assets = Array.isArray(payload && payload.assets)
    ? payload.assets
    : Array.isArray(payload)
    ? payload
    : [];
  const byId = new Map();
  assets.forEach((item) => {
    if (!item || typeof item !== "object") return;
    const url = getAssetUrlValue(item);
    if (!isManageableAssetUrl(url)) return;
    const category = normalizeUploadedAssetCategory(item.category || item.kind);
    if (!category) return;
    const id = normalizeAssetLibraryRecordId(category, url, item.id);
    if (!id) return;
    const tags = normalizeAssetTags(item.tags);
    const editableFields = normalizeEditableFields(item.editableFields);
    const mergedFields = normalizeEditableFields([
      ...editableFields,
      ...detectEditableFieldsFromText(item.name, item.originalName, item.url, tags),
    ]);
    const isPhotoChoice =
      item.role === "photo-choice" || /photo[\s_-]*choice/i.test(item.name || "");
    const normalized = {
      id,
      category,
      url,
      secure_url: url,
      name: String(
        item.name || item.originalName || url.split("/").pop() || category
      ).trim(),
      tags,
      folder: String(item.folder || "").trim(),
      hash: String(item.hash || "").trim(),
      contentType: String(item.contentType || item.type || "").trim(),
      originalSrc: String(item.originalSrc || "").trim(),
      createdAt: String(item.createdAt || item.created_at || new Date().toISOString()),
      updatedAt: String(item.updatedAt || item.updated_at || new Date().toISOString()),
      customizable:
        item.customizable === true ||
        (item.customizable !== false && mergedFields.length > 0),
      editableFields: mergedFields,
      archived: item.archived === true,
      hidden: item.hidden === true || item.archived === true,
      orientation:
        category === "idle-screen" || category === "thank-you-screen"
          ? normalizeIdleScreenOrientation(item.orientation)
          : undefined,
      role: category === "idle-screen" ? (isPhotoChoice ? "photo-choice" : "idle") : undefined,
      buttonZones:
        category !== "idle-screen"
          ? undefined
          : isPhotoChoice
          ? {
              singlePhoto: normalizeIdleButtonZone(
                item.buttonZones?.singlePhoto || photoChoiceZones.singlePhoto
              ),
              photoStrip: normalizeIdleButtonZone(
                item.buttonZones?.photoStrip || photoChoiceZones.photoStrip
              ),
            }
          : { start: normalizeIdleButtonZone(item.buttonZones?.start) },
    };
    const mergeKey = getAssetLibraryId(category, url) || id;
    const existing = byId.get(mergeKey);
    if (!existing) {
      byId.set(mergeKey, normalized);
      return;
    }
    byId.set(mergeKey, {
      ...existing,
      ...normalized,
      tags: normalizeAssetTags([...(existing.tags || []), ...(normalized.tags || [])]),
      editableFields: normalizeEditableFields([
        ...(existing.editableFields || []),
        ...(normalized.editableFields || []),
      ]),
      createdAt: existing.createdAt || normalized.createdAt,
      customizable: existing.customizable === true || normalized.customizable === true,
      archived: existing.archived === true || normalized.archived === true,
      hidden:
        existing.hidden === true ||
        existing.archived === true ||
        normalized.hidden === true ||
        normalized.archived === true,
    });
  });
  return {
    assets: Array.from(byId.values()).sort((a, b) =>
      String(b.createdAt).localeCompare(String(a.createdAt))
    ),
  };
}
