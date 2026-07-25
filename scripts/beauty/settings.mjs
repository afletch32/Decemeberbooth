export const DEFAULT_BEAUTY_VALUES = {
  skinSmooth: 0,
  blemish: 0,
  teeth: 0,
  underEye: 0,
  shine: 0,
  tone: 0,
};

export const DEFAULT_LIGHTING_VALUES = {
  exposure: 0,
  contrast: 0,
  warmth: 0,
  vibrance: 0,
  highlights: 0,
  shadows: 0,
  sharpness: 0,
};

export function normalizeBeautyPreset(preset = {}) {
  const source = preset && typeof preset === "object" ? preset : {};
  return {
    id: String(source.id || ""),
    name: String(source.name || ""),
    guestVisible: source.guestVisible !== false,
    default: source.default === true,
    beauty: {
      enabled: hasEnabledBeauty(source.beauty),
      ...normalizeNumberMap(DEFAULT_BEAUTY_VALUES, source.beauty),
    },
    lighting: normalizeNumberMap(DEFAULT_LIGHTING_VALUES, source.lighting),
    cartoon: {
      enabled: source.cartoon?.enabled === true,
      deliveryOnly: source.cartoon?.deliveryOnly === true,
      levels: Number(source.cartoon?.levels) || 6,
      edgeThreshold: Number(source.cartoon?.edgeThreshold) || 42,
    },
  };
}

function hasEnabledBeauty(beauty) {
  if (!beauty || typeof beauty !== "object") return false;
  return Object.keys(DEFAULT_BEAUTY_VALUES).some(
    (key) => clampPercent(beauty[key]) > 0
  );
}

function normalizeNumberMap(defaults, source = {}) {
  return Object.fromEntries(
    Object.keys(defaults).map((key) => [key, clampPercent(source[key] ?? defaults[key])])
  );
}

function clampPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(100, Math.max(-100, number));
}
