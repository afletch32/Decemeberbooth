// Idle screen utilities: shared logic for idle screens and photo-choice screens.

const DEFAULT_IDLE_START_ZONE = { x: 50, y: 73, width: 28, height: 20 };
const PHOTO_CHOICE_DEFAULT_ZONES = {
  singlePhoto: { x: 34, y: 59, width: 27, height: 50 },
  photoStrip: { x: 66, y: 59, width: 27, height: 50 },
};

export function normalizeIdleScreenOrientation(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["landscape", "landscape-left", "landscape-right", "l"].includes(normalized)) return "landscape";
  if (["portrait", "portrait-up", "portrait-down", "p"].includes(normalized)) return "portrait";
  return "landscape";
}

export function buildIdleScreenEntryFromUrl(url, file = null) {
  const name = (file && file.name) || "Idle Screen";
  const isPhotoChoice = /photo[\s_-]*choice/i.test(name);
  return {
    src: url,
    name,
    orientation: "landscape",
    role: isPhotoChoice ? "photo-choice" : "idle",
    buttonZones: isPhotoChoice
      ? {
          singlePhoto: { ...PHOTO_CHOICE_DEFAULT_ZONES.singlePhoto },
          photoStrip: { ...PHOTO_CHOICE_DEFAULT_ZONES.photoStrip },
        }
      : { start: { ...DEFAULT_IDLE_START_ZONE } },
  };
}

export function selectIdleScreenEntry() {
  const orientation = getIdleScreenViewportOrientation();
  const theme = getSelectedTheme();
  if (!theme) return null;

  const activeEvent = getActiveEvent();
  const sessionEntries = Array.isArray(activeEvent && activeEvent.sessionAssets && activeEvent.sessionAssets.idleScreens)
    ? activeEvent.sessionAssets.idleScreens
    : [];
  const themeEntries = Array.isArray(theme.idleScreens) ? theme.idleScreens : [];
  const overrides = getActiveEventOverrides();

  const candidates = sessionEntries.length
    ? sessionEntries
    : overrides.idleScreens && overrides.idleScreens.length
      ? overrides.idleScreens
      : themeEntries;

  if (!candidates.length) return null;

  const portraitEntry = candidates.find((entry) => normalizeIdleScreenOrientation(entry.orientation) === "portrait");
  const landscapeEntry = candidates.find((entry) => normalizeIdleScreenOrientation(entry.orientation) === "landscape");

  if (orientation === "portrait") return portraitEntry || landscapeEntry || candidates[0];
  return landscapeEntry || portraitEntry || candidates[0];
}

export function clearCustomIdleScreen() {
  if (DOM.welcomeScreen) DOM.welcomeScreen.classList.remove("custom-idle-screen", "custom-photo-choice-screen");
  if (DOM.welcomeImg) DOM.welcomeImg.classList.add("hidden");
}

export function getPhotoChoiceScreenEntries() {
  const theme = getSelectedTheme();
  const activeEvent = getActiveEvent();
  const overrides = activeEvent ? getActiveEventOverrides() : {};

  const fromTheme = Array.isArray(theme && theme.idleScreens)
    ? theme.idleScreens.filter((entry) => entry.role === "photo-choice")
    : [];

  const fromSession = Array.isArray(activeEvent && activeEvent.sessionAssets && activeEvent.sessionAssets.idleScreens)
    ? activeEvent.sessionAssets.idleScreens.filter((entry) => entry.role === "photo-choice")
    : [];

  const fromOverrides = Array.isArray(overrides.idleScreens)
    ? overrides.idleScreens.filter((entry) => entry.role === "photo-choice")
    : [];

  return fromSession.length ? fromSession : fromOverrides.length ? fromOverrides : fromTheme;
}

function getSelectedTheme() {
  const key = (window.DOM && DOM.eventSelect && DOM.eventSelect.value) || "";
  return resolveThemeByKey(key);
}

function resolveThemeByKey(themeKey) {
  themeKey = String(themeKey || "").trim();
  if (!themeKey) return null;
  if (themeKey.includes(":")) {
    const [rootKey, leafKey] = themeKey.split(":");
    const root = window.themes && window.themes[rootKey];
    if (!root) return null;
    if (root.themes && root.themes[leafKey]) return root.themes[leafKey];
    if (root.holidays && root.holidays[leafKey]) return root.holidays[leafKey];
    return null;
  }
  return (window.themes && window.themes[themeKey]) || null;
}

function getActiveEvent() {
  try {
    const id = localStorage.getItem("photoboothActiveEventId") || "";
    if (!id) return null;
    return (getStoredEvents() || []).find((event) => event && event.id === id) || null;
  } catch (_) {
    return null;
  }
}

function getActiveEventOverrides() {
  const active = getActiveEvent();
  if (!active) return {};
  if (!active.overrides || typeof active.overrides !== "object") {
    active.overrides = {
      backgrounds: [],
      overlays: [],
      templates: [],
      backgroundIndex: 0,
      greenBackgrounds: [],
      greenBackgroundIndex: 0,
      idleScreens: [],
    };
  }
  if (!Array.isArray(active.overrides.idleScreens)) active.overrides.idleScreens = [];
  return active.overrides;
}

function getStoredEvents() {
  try {
    const raw = localStorage.getItem("photoboothEvents");
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

export function clearCustomIdleScreen() {
  if (DOM.welcomeScreen) DOM.welcomeScreen.classList.remove("custom-idle-screen", "custom-photo-choice-screen");
  if (DOM.welcomeImg) DOM.welcomeImg.classList.add("hidden");
}

export function getActiveIdleScreenSrc() {
  const entry = selectIdleScreenEntry();
  return entry && entry.src ? entry.src : "";
}