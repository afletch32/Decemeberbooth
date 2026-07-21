import { normalizeUploadedAssetCategory } from "./asset-library-utils.mjs";

export function themeKeyToCategory(themeKey) {
  const raw = String(themeKey || "").trim();
  if (!raw) return "general";
  const [root] = raw.split(":");
  if (["background", "overlay", "template"].includes(root)) return root;
  if (root === "school") return "school";
  if (root === "wedding") return "wedding";
  if (root === "holidays") return "holidays";
  if (["fall", "winter", "spring", "summer"].includes(root)) return "holidays";
  if (root === "general") {
    const leaf = raw.split(":")[1] || "";
    if (leaf === "birthday" || raw.includes("birthday")) return "birthday";
    return "general";
  }
  if (raw.includes("birthday")) return "birthday";
  return "general";
}

export function addAssetCategoryHint(categories, value) {
  const raw = String(value || "").toLowerCase().trim();
  if (!raw || !(categories instanceof Set)) return;
  if (/(^|[\/:_-])school($|[\/:_-])/.test(raw)) categories.add("school");
  if (/(^|[\/:_-])wedding($|[\/:_-])/.test(raw)) categories.add("wedding");
  if (/(^|[\/:_-])birthday($|[\/:_-])/.test(raw)) categories.add("birthday");
  if (/(^|[\/:_-])(holidays?|fall|winter|spring|summer)($|[\/:_-])/.test(raw)) {
    categories.add("holidays");
  }
  if (/(^|[\/:_-])general($|[\/:_-])/.test(raw)) categories.add("general");
}

export function normalizeAssetLibraryCategoryFilter(value = "") {
  const raw = String(value || "").trim().toLowerCase();
  return normalizeUploadedAssetCategory(raw) || raw;
}

export function getAssetLibraryFilterCategories(asset) {
  const categories = new Set();
  const addCategory = (value) => {
    const normalized = normalizeAssetLibraryCategoryFilter(value);
    if (normalized) categories.add(normalized);
  };
  (Array.isArray(asset?.categories) ? asset.categories : []).forEach(addCategory);
  (Array.isArray(asset?.themeKeys) ? asset.themeKeys : []).forEach((themeKey) =>
    addCategory(themeKeyToCategory(themeKey))
  );
  (Array.isArray(asset?.tags) ? asset.tags : []).forEach((tag) =>
    addAssetCategoryHint(categories, tag)
  );
  [asset?.folder, asset?.url, asset?.secure_url, asset?.name].forEach((value) =>
    addAssetCategoryHint(categories, value)
  );
  return Array.from(categories);
}

export function assetMatchesLibraryCategoryFilter(asset, value = "") {
  const filter = normalizeAssetLibraryCategoryFilter(value);
  if (!filter || filter === "all") return true;
  const assetCategory = normalizeUploadedAssetCategory(asset?.category);
  if (["background", "overlay", "template", "idle-screen"].includes(filter)) {
    return assetCategory === filter;
  }
  return getAssetLibraryFilterCategories(asset).includes(filter);
}

export function getAssetLibrarySearchText(asset) {
  return [
    asset?.name,
    asset?.category,
    asset?.url,
    ...(Array.isArray(asset?.tags) ? asset.tags : []),
    ...getAssetLibraryFilterCategories(asset),
    ...(Array.isArray(asset?.themeKeys) ? asset.themeKeys : []),
  ]
    .join(" ")
    .toLowerCase();
}

export function sortAssetLibraryRows(rows, sortMode, options = {}) {
  const assets = Array.isArray(rows) ? rows.slice() : [];
  const favoriteKeys = new Set(options.favoriteKeys || []);
  const recentKeys = Array.from(options.recentKeys || []);
  const recentRank = new Map(recentKeys.map((key, index) => [key, index]));
  const getDisplayName =
    typeof options.getDisplayName === "function"
      ? options.getDisplayName
      : (asset) => String(asset?.name || "");
  const getTrackingKey =
    typeof options.getTrackingKey === "function"
      ? options.getTrackingKey
      : (asset) => String(asset?.id || "");
  const byName = (a, b) =>
    getDisplayName(a).localeCompare(getDisplayName(b));
  const byNewest = (a, b) => {
    const aTime = Date.parse(a.createdAt || "") || 0;
    const bTime = Date.parse(b.createdAt || "") || 0;
    return bTime - aTime || byName(a, b);
  };
  const categoryOrder = {
    background: 0,
    overlay: 1,
    template: 2,
    "idle-screen": 3,
  };
  const byCategory = (a, b) => {
    const ac = categoryOrder[normalizeUploadedAssetCategory(a.category)] ?? 99;
    const bc = categoryOrder[normalizeUploadedAssetCategory(b.category)] ?? 99;
    return ac - bc || byName(a, b);
  };
  assets.sort((a, b) => {
    if (sortMode === "name") return byName(a, b);
    if (sortMode === "category") return byCategory(a, b);
    if (sortMode === "favorites") {
      const aFav = favoriteKeys.has(getTrackingKey(a)) ? 1 : 0;
      const bFav = favoriteKeys.has(getTrackingKey(b)) ? 1 : 0;
      return bFav - aFav || byNewest(a, b);
    }
    if (sortMode === "recent") {
      const aRank = recentRank.has(getTrackingKey(a))
        ? recentRank.get(getTrackingKey(a))
        : Number.MAX_SAFE_INTEGER;
      const bRank = recentRank.has(getTrackingKey(b))
        ? recentRank.get(getTrackingKey(b))
        : Number.MAX_SAFE_INTEGER;
      return aRank - bRank || byNewest(a, b);
    }
    const aTime = Date.parse(a.createdAt || "") || 0;
    const bTime = Date.parse(b.createdAt || "") || 0;
    return sortMode === "oldest"
      ? aTime - bTime || byName(a, b)
      : byNewest(a, b);
  });
  return assets;
}

export function filterAssetLibraryRows(rows, filters = {}, options = {}) {
  const query = String(filters.query || "").trim().toLowerCase();
  const filtered = (Array.isArray(rows) ? rows : []).filter((asset) => {
    if (!asset) return false;
    if (!assetMatchesLibraryCategoryFilter(asset, filters.pillCategory)) return false;
    if (!assetMatchesLibraryCategoryFilter(asset, filters.category)) return false;
    return !query || getAssetLibrarySearchText(asset).includes(query);
  });
  return sortAssetLibraryRows(filtered, filters.sortMode || "newest", options);
}
