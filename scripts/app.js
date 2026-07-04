import { CanvasBuffer, offscreenToDataURL } from "./canvas-utils.mjs";
import {
  buildAssetIndexKey,
  buildDateSessionFolderPath,
  buildEventAssetFolderPath,
  buildEventFolderPath,
  getCloudinaryDerivedUrl,
} from "./cloudinary-utils.mjs";
import { getBuiltinAssetManifest } from "./builtin-asset-manifests.mjs";
import { clampZoom } from "./camera-utils.mjs";
import {
  applyThemeText,
  buildEventFromThemeDefaults,
  getEventTextOverrides,
  hasEventTextOverrides,
  inferThemeEventStyle,
  mergeUniqueUrls,
  normalizeEventStyle,
  pairingSupportsEventStyle,
} from "./event-utils.mjs";
import {
  normalizeTemplateTextFields,
  resolveTemplateTextRect,
  resolveTemplateTextValue,
  validateCreatePathEventDetails,
} from "./template-text-utils.mjs";
import { formatRecordingTime } from "./recording-utils.mjs";
import { shouldEnableRemoteSync } from "./remote-sync-utils.mjs";

function isLocalDevHost() {
  const hostname = window.location.hostname || "";
  return hostname === "localhost" || hostname === "127.0.0.1";
}

const APP_CONFIG = {
  TIMERS: {
    IDLE_TIMEOUT: 30000,
    LIVE_PHOTO_DURATION: 2000,
    MESSAGE_MAX_DURATION: 60000,
    TOAST_DURATION: 2000,
    SPIN_DURATION: 10000,
  },
  STORAGE_KEYS: {
    THEMES: "photoboothThemes",
    EVENTS: "photoboothEvents",
    ACTIVE_EVENT: "photoboothActiveEventId",
    GLOBAL_LOGO: "photoboothGlobalLogo",
    ASSET_LIBRARY: "photoboothAssetLibrary",
  },
};

// --- USB Relay Automation (Web Serial) ---
let relayPort = null;
let spinAbortController = null;
const RELAY_COMMANDS = {
  ON: new Uint8Array([0xa0, 0x01, 0x01, 0xa2]),
  OFF: new Uint8Array([0xa0, 0x01, 0x00, 0xa1]),
};

async function connectMotorRelay() {
  if (!("serial" in navigator)) {
    showToast("Web Serial not supported in this browser.");
    return;
  }
  try {
    relayPort = await navigator.serial.requestPort();
    await relayPort.open({ baudRate: 9600 });
    showToast("360 Motor Relay Connected");
  } catch (err) {
    console.error("Relay connection failed", err);
    showToast("Relay connection failed.");
  }
}

async function setMotorPower(isOn) {
  if (!relayPort || !relayPort.writable) return;
  const writer = relayPort.writable.getWriter();
  try {
    await writer.write(isOn ? RELAY_COMMANDS.ON : RELAY_COMMANDS.OFF);
  } catch (err) {
    console.error("Failed to send relay command", err);
  } finally {
    writer.releaseLock();
  }
}

async function clearPhotoboothServiceWorkerState() {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map((registration) => registration.unregister())
    );
  } catch (error) {
    console.warn("Service worker unregister failed:", error);
  }

  if (!("caches" in window)) return;

  try {
    const cacheKeys = await caches.keys();
    const photoboothCaches = cacheKeys.filter((key) => key.startsWith("pb-"));
    await Promise.all(photoboothCaches.map((key) => caches.delete(key)));
  } catch (error) {
    console.warn("Service worker cache cleanup failed:", error);
  }
}

// --- Safety: Stop Motor on Close ---
window.addEventListener("beforeunload", () => {
  if (relayPort && relayPort.writable) {
    setMotorPower(false);
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    if (isLocalDevHost()) {
      await clearPhotoboothServiceWorkerState();
      console.log("Service worker disabled for local development.");
      return;
    }

    try {
      const swUrl = new URL("sw.js", window.location.href);
      const reg = await navigator.serviceWorker.register(swUrl.href);
      // Nudge the SW to check for updates on load
      try {
        await reg.update();
      } catch (_) {}
      console.log("SW registered:", reg && reg.scope);
    } catch (registrationError) {
      console.warn("SW registration failed:", registrationError);
    }
  });
}

let themes = {
  general: {
    name: "General",
    themes: {
      basic: {
        name: "Basic",
        eventTypes: ["general", "wedding", "expo", "community"],
        fontPairingStyle: "general",
        accent: "#3f51b5",
        accent2: "#ffffff",
        font: "'Comic Neue', cursive",
        background: "assets/general/basic/backgrounds/",
        backgroundFolder: "assets/general/basic/backgrounds/",
        logo: "",
        overlaysFolder: "assets/general/basic/overlays/",
        templatesFolder: "assets/general/basic/templates/",
        welcome: {
          title: "Welcome!",
          portrait: "",
          landscape: "",
          prompt: "Touch to start",
        },
      },
      birthday: {
        name: "Birthday",
        eventTypes: ["party", "general"],
        fontPairingStyle: "party",
        accent: "pink",
        accent2: "white",
        font: "'Comic Neue', cursive",
        background: "assets/general/birthday/backgrounds/",
        backgroundFolder: "assets/general/birthday/backgrounds/",
        logo: "",
        overlaysFolder: "assets/general/birthday/overlays/",
        templatesFolder: "assets/general/birthday/templates/",
        welcome: {
          title: "Happy Birthday!",
          portrait: "",
          landscape: "",
          prompt: "Touch to start",
        },
      },
      summer: {
        name: "Summer",
        eventTypes: ["party", "community", "general"],
        fontPairingStyle: "party",
        accent: "#00a6c8",
        accent2: "#fff8dc",
        font: "'Comic Neue', cursive",
        background: "",
        backgroundFolder: "",
        logo: "",
        overlaysFolder: "assets/general/summer/overlays/",
        templatesFolder: "",
        welcome: {
          title: "Hello Summer!",
          portrait: "",
          landscape: "",
          prompt: "Touch to start",
        },
      },
    },
  },
  wedding: {
    name: "Wedding",
    themes: {
      timeless: {
        name: "Timeless Romance",
        eventTypes: ["wedding"],
        fontPairingStyle: "wedding",
        accent: "#d7b48a",
        accent2: "#fffaf4",
        fontHeading: "'Playfair Display', serif",
        fontBody: "'Source Sans 3', sans-serif",
        background: "assets/wedding/timeless-romance/backgrounds/",
        backgroundFolder: "assets/wedding/timeless-romance/backgrounds/",
        logo: "",
        overlaysFolder: "assets/wedding/timeless-romance/overlays/",
        templatesFolder: "assets/wedding/timeless-romance/templates/",
        welcome: {
          title: "Celebrate the Moment",
          portrait: "",
          landscape: "",
          prompt: "Touch to begin",
        },
        vibeSummary: "Classic, polished, formal",
      },
      romantic: {
        name: "Garden Vows",
        eventTypes: ["wedding"],
        fontPairingStyle: "wedding",
        accent: "#93b29b",
        accent2: "#fffdf8",
        fontHeading: "'Great Vibes', cursive",
        fontBody: "'Lora', serif",
        background: "assets/wedding/garden-vows/backgrounds/",
        backgroundFolder: "assets/wedding/garden-vows/backgrounds/",
        logo: "",
        overlaysFolder: "assets/wedding/garden-vows/overlays/",
        templatesFolder: "assets/wedding/garden-vows/templates/",
        welcome: {
          title: "Love Looks Good Here",
          portrait: "",
          landscape: "",
          prompt: "Touch to start",
        },
        vibeSummary: "Soft, romantic, photo-forward",
      },
    },
  },
  expo: {
    name: "Expo",
    themes: {
      brandStudio: {
        name: "Brand Studio",
        eventTypes: ["expo"],
        fontPairingStyle: "expo",
        accent: "#1f5eff",
        accent2: "#f4f7ff",
        fontHeading: "'Montserrat', sans-serif",
        fontBody: "'Inter', sans-serif",
        background: "assets/general/basic/backgrounds/",
        backgroundFolder: "assets/general/basic/backgrounds/",
        logo: "",
        overlaysFolder: "assets/general/basic/overlays/",
        templatesFolder: "assets/general/basic/templates/",
        welcome: {
          title: "Step In + Share",
          portrait: "",
          landscape: "",
          prompt: "Tap to begin",
        },
        vibeSummary: "Clean, branded, high traffic",
      },
      leadCapture: {
        name: "Lead Capture",
        eventTypes: ["expo"],
        fontPairingStyle: "expo",
        accent: "#0f766e",
        accent2: "#f5fffd",
        fontHeading: "'Raleway', sans-serif",
        fontBody: "'Open Sans', sans-serif",
        background: "assets/general/basic/backgrounds/",
        backgroundFolder: "assets/general/basic/backgrounds/",
        logo: "",
        overlaysFolder: "assets/general/basic/overlays/",
        templatesFolder: "assets/general/basic/templates/",
        welcome: {
          title: "Fast Photos, Fast Follow-Up",
          portrait: "",
          landscape: "",
          prompt: "Touch to start",
        },
        vibeSummary: "Readable, efficient, promo-ready",
      },
    },
  },
  school: {
    name: "School",
    themes: {
      hawks: {
        name: "Hawks",
        eventTypes: ["community"],
        fontPairingStyle: "community",
        accent: "#041E42",
        accent2: "white",
        font: "'Comic Neue', cursive",
        background: "",
        logo: "",
        overlaysFolder: "assets/school/hawks/overlays/",
        templatesFolder: "assets/school/hawks/templates/",
        welcome: {
          title: "Go Hawks!",
          portrait: "",
          landscape: "",
          prompt: "Touch to start",
        },
      },
      ane: {
        name: "ANE",
        eventTypes: ["community"],
        fontPairingStyle: "community",
        accent: "#041E42",
        accent2: "#FFB81C",
        font: "'Comic Neue', cursive",
        backgroundFolder: "",
        logo: "",
        overlaysFolder: "assets/school/ane/overlays/",
        templatesFolder: "",
        welcome: {
          title: "ANE",
          portrait: "",
          landscape: "",
          prompt: "Touch to start",
        },
      },
    },
  },
  fall: {
    name: "Fall",
    holidays: {
      halloween: {
        name: "Halloween",
        accent: "orange",
        accent2: "white",
        font: "'Creepster', cursive",
        // Use folder-based background auto-detect (any background.* in this folder)
        backgroundFolder: "assets/holidays/fall/halloween/backgrounds/",
        overlaysFolder: "assets/holidays/fall/halloween/overlays/",
        logo: "",
        templatesFolder: "assets/holidays/fall/halloween/templates/",
        welcome: {
          title: "Happy Halloween!",
          portrait: "",
          landscape: "",
          prompt: "Touch to start",
        },
      },
    },
  },
  winter: {
    name: "Winter",
    holidays: {
      christmas: {
        name: "Christmas",
        accent: "#c41e3a",
        accent2: "white",
        font: "'Comic Neue', cursive",
        background: "assets/holidays/winter/christmas/backgrounds/",
        logo: "",
        overlaysFolder: "assets/holidays/winter/christmas/overlays/",
        templatesFolder: "assets/holidays/winter/christmas/templates/",
        welcome: {
          title: "Merry Christmas!",
          portrait: "",
          landscape: "",
          prompt: "Touch to start the fun!",
        },
      },
      winterWonderland: {
        name: "Winter Wonderland",
        accent: "#b7e3ff",
        accent2: "#ffffff",
        fontHeading: "'Playfair Display', serif",
        fontBody: "'Montserrat', sans-serif",
        background: "assets/holidays/winter/christmas/backgrounds/",
        logo: "",
        overlaysFolder: "assets/holidays/winter/christmas/overlays/",
        templatesFolder: "assets/holidays/winter/christmas/templates/",
        welcome: {
          title: "Winter Wonderland",
          portrait: "",
          landscape: "",
          prompt: "Touch to start",
        },
        vibeParentKey: "winter:christmas",
        vibeSummary: "Timeless, snowy, magical",
      },
      santasWorkshop: {
        name: "Santa's Workshop",
        accent: "#d62828",
        accent2: "#ffffff",
        fontHeading: "'Mountains of Christmas', cursive",
        fontBody: "'Poppins', sans-serif",
        background: "assets/holidays/winter/christmas/backgrounds/",
        logo: "",
        overlaysFolder: "assets/holidays/winter/christmas/overlays/",
        templatesFolder: "assets/holidays/winter/christmas/templates/",
        welcome: {
          title: "Santa's Workshop",
          portrait: "",
          landscape: "",
          prompt: "Touch to start",
        },
        vibeParentKey: "winter:christmas",
        vibeSummary: "Playful, festive, nostalgic",
      },
      newyear: {
        name: "New Year",
        accent: "#FFD700",
        accent2: "white",
        font: "'Comic Neue', cursive",
        background: "assets/holidays/winter/christmas/backgrounds/",
        logo: "",
        overlaysFolder: "assets/holidays/winter/christmas/overlays/",
        templatesFolder: "assets/holidays/winter/christmas/templates/",
        welcome: {
          title: "Happy New Year!",
          portrait: "",
          landscape: "",
          prompt: "Start the countdown!",
        },
      },
      valentines: {
        name: "Valentine's Day",
        accent: "#ff5e91",
        accent2: "white",
        font: "'Comic Neue', cursive",
        backgroundFolder: "assets/holidays/winter/valentines/backgrounds/",
        templatesFolder: "assets/holidays/winter/valentines/templates/",
        welcome: {
          title: "Happy Valentine's Day!",
          portrait: "",
          landscape: "",
          prompt: "Touch to start",
        },
      },
    },
  },
};

themes.spring = {
  name: "Spring",
  holidays: {
    stpatricksday: {
      name: "St. Patrick's Day",
      accent: "#0f6d2f",
      accent2: "white",
      font: "'Comic Neue', cursive",
      backgroundFolder: "assets/holidays/spring/st-patricks-day/backgrounds/",
      overlaysFolder: "",
      templatesFolder: "assets/holidays/spring/st-patricks-day/templates/",
      welcome: {
        title: "Happy St. Patrick's Day!",
        portrait: "",
        landscape: "",
        prompt: "Touch to start",
      },
    },
  },
};

const BUILTIN_THEMES = JSON.parse(JSON.stringify(themes));
const DEFAULT_THEME_KEY = "general:basic";
const BUILTIN_THEME_LOCATIONS = (() => {
  const map = {};
  for (const rootKey of Object.keys(BUILTIN_THEMES)) {
    const group = BUILTIN_THEMES[rootKey];
    if (!group || typeof group !== "object") continue;
    for (const bucket of ["themes", "holidays"]) {
      const sub = group[bucket];
      if (!sub || typeof sub !== "object") continue;
      for (const subKey of Object.keys(sub)) {
        map[subKey] = { root: rootKey, bucket };
      }
    }
  }
  return map;
})();

// --- DOM Element Cache ---
const DOM = {
  adminScreen: document.getElementById("adminScreen"),
  setupStatus: document.getElementById("setupStatus"),
  statusCamera: document.getElementById("statusCamera"),
  statusUpload: document.getElementById("statusUpload"),
  statusSync: document.getElementById("statusSync"),
  statusQueue: document.getElementById("statusQueue"),
  setupTabEvent: document.getElementById("setupTabEvent"),
  setupTabCapture: document.getElementById("setupTabCapture"),
  setupTabShare: document.getElementById("setupTabShare"),
  boothScreen: document.getElementById("boothScreen"),
  boothHeader: document.getElementById("boothHeader"),
  boothControls: document.getElementById("controls"),
  mobileSettingsToggle: document.getElementById("mobileSettingsToggle"),
  mobileSettingsClose: document.getElementById("mobileSettingsClose"),
  mobileSettingsBackdrop: document.getElementById("mobileSettingsBackdrop"),
  mobileSettingsSheet: document.getElementById("mobileSettingsSheet"),
  eventSelect: document.getElementById("eventSelect"),
  allowRetakes: document.getElementById("allowRetakes"),
  analyticsData: document.getElementById("analyticsData"),
  logo: document.getElementById("logo"),
  eventTitle: document.getElementById("eventTitle"),
  eventProfileSelect: document.getElementById("eventProfileSelect"),
  createPathEventName: document.getElementById("createPathEventName"),
  createPathEventType: document.getElementById("createPathEventType"),
  createPathEventTypeCards: document.getElementById(
    "createPathEventTypeCards"
  ),
  createPathThemeType: document.getElementById("createPathThemeType"),
  createPathThemeSelect: document.getElementById("createPathThemeSelect"),
  sessionThemeToggle: document.getElementById("sessionThemeToggle"),
  sessionThemeValue: document.getElementById("sessionThemeValue"),
  sessionThemeMenu: document.getElementById("sessionThemeMenu"),
  sessionThemeSearch: document.getElementById("sessionThemeSearch"),
  sessionThemeOptions: document.getElementById("sessionThemeOptions"),
  sessionFontToggle: document.getElementById("sessionFontToggle"),
  sessionFontValue: document.getElementById("sessionFontValue"),
  sessionFontMenu: document.getElementById("sessionFontMenu"),
  sessionFontSearch: document.getElementById("sessionFontSearch"),
  sessionFontOptions: document.getElementById("sessionFontOptions"),
  createPathFontPairingSelect: document.getElementById(
    "createPathFontPairingSelect"
  ),
  createPathFontNote: document.getElementById("createPathFontNote"),
  createPathFontPreviewCards: document.getElementById(
    "createPathFontPreviewCards"
  ),
  createPathValidationMessage: document.getElementById(
    "createPathValidationMessage"
  ),
  createPathAssetSummary: document.getElementById("createPathAssetSummary"),
  createPathBackgrounds: document.getElementById("createPathBackgrounds"),
  createPathGreenBackgrounds: document.getElementById(
    "createPathGreenBackgrounds"
  ),
  createPathOverlays: document.getElementById("createPathOverlays"),
  createPathTemplates: document.getElementById("createPathTemplates"),
  createPathLogo: document.getElementById("createPathLogo"),
  createPathWeddingFields: document.getElementById("createPathWeddingFields"),
  createPathPartner1: document.getElementById("createPathPartner1"),
  createPathPartner2: document.getElementById("createPathPartner2"),
  createPathDateFields: document.getElementById("createPathDateFields"),
  createPathEventDate: document.getElementById("createPathEventDate"),
  createPathBirthdayFields: document.getElementById("createPathBirthdayFields"),
  createPathBirthdayName: document.getElementById("createPathBirthdayName"),
  createPathExpoFields: document.getElementById("createPathExpoFields"),
  createPathExpoCompany: document.getElementById("createPathExpoCompany"),
  toggleThemeFavoriteBtn: document.getElementById("toggleThemeFavoriteBtn"),
  eventPathCreateBtn: document.getElementById("eventPathCreateBtn"),
  eventPathSelectBtn: document.getElementById("eventPathSelectBtn"),
  eventPathCreatePanel: document.getElementById("eventPathCreatePanel"),
  eventPathSelectPanel: document.getElementById("eventPathSelectPanel"),
  chooseEventBtn: document.getElementById("chooseEventBtn"),
  createEventBtn: document.getElementById("createEventBtn"),
  quickStartBtn: document.getElementById("quickStartBtn"),
  modeToggle: document.getElementById("modeToggle"),
  quickStartModal: document.getElementById("quickStartModal"),
  quickStartThemeSelect: document.getElementById("quickStartThemeSelect"),
  quickStartCancel: document.getElementById("quickStartCancel"),
  quickStartConfirm: document.getElementById("quickStartConfirm"),
  demoThemeBar: document.getElementById("demoThemeBar"),
  boothBackBtn: document.getElementById("boothBackBtn"),
  launchEventName: document.getElementById("launchEventName"),
  launchLayoutMode: document.getElementById("launchLayoutMode"),
  launchOverlayName: document.getElementById("launchOverlayName"),
  launchFontStatus: document.getElementById("launchFontStatus"),
  launchCameraStatus: document.getElementById("launchCameraStatus"),
  launchOutputStatus: document.getElementById("launchOutputStatus"),
  launchOverlayCount: document.getElementById("launchOverlayCount"),
  launchStripStatus: document.getElementById("launchStripStatus"),
  launchWarning: document.getElementById("launchWarning"),
  launchModeSingleBtn: document.getElementById("launchModeSingleBtn"),
  launchModeStripBtn: document.getElementById("launchModeStripBtn"),
  launchConfirmModal: document.getElementById("launchConfirmModal"),
  launchConfirmEventName: document.getElementById("launchConfirmEventName"),
  launchConfirmLayoutMode: document.getElementById("launchConfirmLayoutMode"),
  launchConfirmOverlayName: document.getElementById("launchConfirmOverlayName"),
  launchConfirmFontStatus: document.getElementById("launchConfirmFontStatus"),
  launchConfirmCameraStatus: document.getElementById("launchConfirmCameraStatus"),
  launchConfirmOutputStatus: document.getElementById("launchConfirmOutputStatus"),
  launchConfirmOverlayCount: document.getElementById(
    "launchConfirmOverlayCount"
  ),
  launchConfirmStripStatus: document.getElementById("launchConfirmStripStatus"),
  launchConfirmWarning: document.getElementById("launchConfirmWarning"),
  launchConfirmCancel: document.getElementById("launchConfirmCancel"),
  launchConfirmStart: document.getElementById("launchConfirmStart"),
  livePhotoToggle: document.getElementById("livePhotoToggle"),
  recordingModeToggle: document.getElementById("recordingModeToggle"),
  instantCaptureToggle: document.getElementById("instantCaptureToggle"),
  boothInstantCaptureToggle: document.getElementById(
    "boothInstantCaptureToggle"
  ),
  lowLightToggle: document.getElementById("lowLightToggle"),
  greenScreenToggle: document.getElementById("greenScreenToggle"),
  aiBackgroundToggle: document.getElementById("aiBackgroundToggle"),
  enhancementModeSelect: document.getElementById("enhancementModeSelect"),
  cameraZoomInput: document.getElementById("cameraZoomInput"),
  cameraZoomValue: document.getElementById("cameraZoomValue"),
  editLayoutBtn: document.getElementById("editLayoutBtn"),
  editControls: document.getElementById("editControls"),
  editControlsTitle: document.getElementById("editControlsTitle"),
  editControlsClose: document.getElementById("editControlsClose"),
  editScaleInput: document.getElementById("editScaleInput"),
  editScaleValue: document.getElementById("editScaleValue"),
  editPositionInput: document.getElementById("editPositionInput"),
  editPositionValue: document.getElementById("editPositionValue"),
  editPositionRow: document.getElementById("editPositionRow"),
  editPositionLabel: document.getElementById("editPositionLabel"),
  editModeExitBtn: document.getElementById("editModeExitBtn"),
  adminModalBackdrop: document.getElementById("adminModalBackdrop"),
  adminModalClose: document.getElementById("adminModalClose"),
  eventDateInput: document.getElementById("eventDateInput"),
  options: document.getElementById("options"),
  videoWrap: document.getElementById("videoWrap"),
  videoContainer: document.getElementById("videoContainer"),
  overlayBackground: document.getElementById("overlayBackground"),
  photoSlotLayer: document.getElementById("photoSlotLayer"),
  video: document.getElementById("video"),
  liveOverlay: document.getElementById("liveOverlay"),
  silhouette: document.getElementById("silhouette"),
  recordingOverlay: document.getElementById("recordingOverlay"),
  recordingTimer: document.getElementById("recordingTimer"),
  captureStatusBar: document.getElementById("captureStatusBar"),
  livePhotoStatus: document.getElementById("livePhotoStatus"),
  instantCaptureStatus: document.getElementById("instantCaptureStatus"),
  captureBtn: document.getElementById("captureBtn"),
  countdownOverlay: document.getElementById("countdownOverlay"),
  boothHostPrompt: document.getElementById("boothHostPrompt"),
  flashOverlay: document.getElementById("flashOverlay"),
  goodbyeOverlay: document.getElementById("goodbyeOverlay"),
  finalPreview: document.getElementById("finalPreview"),
  finalPreviewContent: document.getElementById("finalPreviewContent"),
  finalPreviewActions: document.getElementById("finalPreviewActions"),
  finalStrip: document.getElementById("finalStrip"),
  finalLive: document.getElementById("finalLive"),
  qrCodeContainer: document.getElementById("qrCodeContainer"),
  qrCode: document.getElementById("qrCode"),
  qrSaveCopy: document.getElementById("qrSaveCopy"),
  reviewPanel: document.getElementById("reviewPanel"),
  lovePhotoBtn: document.getElementById("lovePhotoBtn"),
  reviewRetakeBtn: document.getElementById("reviewRetakeBtn"),
  paidPrintPanel: document.getElementById("paidPrintPanel"),
  paidPrintTitle: document.getElementById("paidPrintTitle"),
  paidPrintBody: document.getElementById("paidPrintBody"),
  paidPrintInstructions: document.getElementById("paidPrintInstructions"),
  paidPrintPaymentQr: document.getElementById("paidPrintPaymentQr"),
  lastShot: document.getElementById("lastShot"),
  qrHint: document.getElementById("qrHint"),
  shareStatus: document.getElementById("shareStatus"),
  shareLinkRow: document.getElementById("shareLinkRow"),
  shareLink: document.getElementById("shareLink"),
  emailInput: document.getElementById("emailInput"),
  sendBtn: document.getElementById("sendBtn"),
  retakeBtn: document.getElementById("retakeBtn"),
  closePreviewBtn: document.getElementById("closePreviewBtn"),
  confirmModal: document.getElementById("confirmModal"),
  confirmPreview: document.getElementById("confirmPreview"),
  gallery: document.getElementById("gallery"),
  toast: document.getElementById("toast"),
  welcomeScreen: document.getElementById("welcomeScreen"),
  welcomeOverlay: document.getElementById("welcomeOverlay"),
  welcomeEyebrow: document.getElementById("welcomeEyebrow"),
  welcomeDemoStep: document.getElementById("welcomeDemoStep"),
  welcomeIdleStep: document.getElementById("welcomeIdleStep"),
  welcomeModeStep: document.getElementById("welcomeModeStep"),
  welcomeImg: document.getElementById("welcomeImg"),
  welcomeEventLogo: document.getElementById("welcomeEventLogo"),
  welcomeHostLine: document.getElementById("welcomeHostLine"),
  welcomeTitle: document.getElementById("welcomeTitle"),
  startButton: document.getElementById("startButton"),
  videoInput: document.getElementById("videoInput"),
  airdropZone: document.getElementById("airdropZone"),
  videoImportPanel: document.getElementById("videoImportPanel"),
  videoImportStatus: document.getElementById("videoImportStatus"),
  booth360Panel: document.getElementById("booth360Panel"),
  booth360Status: document.getElementById("booth360Status"),
  booth360StatusText: document.getElementById("booth360StatusText"),
  booth360StatusNote: document.getElementById("booth360StatusNote"),
  start360Btn: document.getElementById("start360Btn"),
  recordingModeBtn: document.getElementById("recordingModeBtn"),
  triggerZone: document.getElementById("triggerZone"),
  analytics: document.getElementById("analytics"),
  themeEditor: document.getElementById("themeEditor"),
  themeEditorActive: document.getElementById("themeEditorActive"),
  themeEditorEditing: document.getElementById("themeEditorEditing"),
  stylePreview: document.getElementById("stylePreview"),
  stylePreviewWrap: document.getElementById("stylePreviewWrap"),
  stylePreviewHeading: document.getElementById("stylePreviewHeading"),
  stylePreviewSubheading: document.getElementById("stylePreviewSubheading"),
  stylePreviewBody: document.getElementById("stylePreviewBody"),
  stylePreviewButton: document.getElementById("stylePreviewButton"),
  quickPicksGrouped: document.getElementById("quickPicksGrouped"),
  eventGalleryActions: document.getElementById("eventGalleryActions"),
  eventGalleryLink: document.getElementById("eventGalleryLink"),
  themeVibesSection: document.getElementById("themeVibesSection"),
  themeSeasonalSection: document.getElementById("themeSeasonalSection"),
  themeSeasonalContent: document.getElementById("themeSeasonalContent"),
  eventOnlyBackgrounds: document.getElementById("eventOnlyBackgrounds"),
  eventPartner1Input: document.getElementById("eventPartner1Input"),
  eventPartner2Input: document.getElementById("eventPartner2Input"),
  eventBirthdayNameInput: document.getElementById("eventBirthdayNameInput"),
  eventExpoCompanyInput: document.getElementById("eventExpoCompanyInput"),
  eventOnlyOverlays: document.getElementById("eventOnlyOverlays"),
  eventOnlyTemplates: document.getElementById("eventOnlyTemplates"),
  eventOverridesSummary: document.getElementById("eventOverridesSummary"),
  clearEventOverridesBtn: document.getElementById("clearEventOverridesBtn"),
  eventBannerTextInput: document.getElementById("eventBannerTextInput"),
  eventWelcomeTitleInput: document.getElementById("eventWelcomeTitleInput"),
  eventStartButtonTextInput: document.getElementById(
    "eventStartButtonTextInput"
  ),
  eventCaptureLabelInput: document.getElementById("eventCaptureLabelInput"),
  eventBannerSizeInput: document.getElementById("eventBannerSizeInput"),
  eventBannerSizeValue: document.getElementById("eventBannerSizeValue"),
  eventWelcomeTitleSizeInput: document.getElementById(
    "eventWelcomeTitleSizeInput"
  ),
  eventWelcomeTitleSizeValue: document.getElementById(
    "eventWelcomeTitleSizeValue"
  ),
  eventBaseThemeName: document.getElementById("eventBaseThemeName"),
  eventBaseThemeAssetsSummary: document.getElementById(
    "eventBaseThemeAssetsSummary"
  ),
  eventThemeReferenceText: document.getElementById("eventThemeReferenceText"),
  resetEventTextToThemeBtn: document.getElementById("resetEventTextToThemeBtn"),
  resetEventSizesToThemeBtn: document.getElementById(
    "resetEventSizesToThemeBtn"
  ),
  resetEventLogoToThemeBtn: document.getElementById("resetEventLogoToThemeBtn"),
  bannerSizeInput: document.getElementById("bannerSizeInput"),
  bannerSizeValue: document.getElementById("bannerSizeValue"),
  welcomeTitleSizeInput: document.getElementById("welcomeTitleSizeInput"),
  welcomeTitleSizeValue: document.getElementById("welcomeTitleSizeValue"),
  fontPickerModal: document.getElementById("fontPickerModal"),
  fontEventStyleSelect: document.getElementById("fontEventStyleSelect"),
  editorFontPairingSelect: document.getElementById("editorFontPairingSelect"),
  editorHeadingFontSelect: document.getElementById("editorHeadingFontSelect"),
  editorBodyFontSelect: document.getElementById("editorBodyFontSelect"),
  editorHeadingFontPreview: document.getElementById("editorHeadingFontPreview"),
  editorBodyFontPreview: document.getElementById("editorBodyFontPreview"),
  fontPairingContextLabel: document.getElementById("fontPairingContextLabel"),
  fontPairingContextNote: document.getElementById("fontPairingContextNote"),
  eventStylePairings: document.getElementById("eventStylePairings"),
  themeStepLabel: document.getElementById("themeStepLabel"),
  themeStepNote: document.getElementById("themeStepNote"),
  openFontLibraryBtn: document.getElementById("openFontLibraryBtn"),
  createEventModal: document.getElementById("createEventModal"),
  createEventName: document.getElementById("createEventName"),
  createEventDate: document.getElementById("createEventDate"),
  createEventUseThemeDefaults: document.getElementById(
    "createEventUseThemeDefaults"
  ),
  createEventBannerText: document.getElementById("createEventBannerText"),
  createEventWelcomeText: document.getElementById("createEventWelcomeText"),
  createEventWelcomeSize: document.getElementById("createEventWelcomeSize"),
  createEventWelcomeSizeValue: document.getElementById(
    "createEventWelcomeSizeValue"
  ),
  createEventStartText: document.getElementById("createEventStartText"),
  createEventCaptureText: document.getElementById("createEventCaptureText"),
  createEventBackgrounds: document.getElementById("createEventBackgrounds"),
  createEventGreenBackgrounds: document.getElementById(
    "createEventGreenBackgrounds"
  ),
  createEventOverlays: document.getElementById("createEventOverlays"),
  createEventTemplates: document.getElementById("createEventTemplates"),
  createEventSummary: document.getElementById("createEventSummary"),
  createEventCancel: document.getElementById("createEventCancel"),
  createEventConfirm: document.getElementById("createEventConfirm"),
  closeFontPicker: document.getElementById("closeFontPicker"),
  themeName: document.getElementById("themeName"),
  eventNameInput: document.getElementById("eventNameInput"),
  cloudNameInput: document.getElementById("cloudNameInput"),
  cloudPresetInput: document.getElementById("cloudPresetInput"),
  cloudFolderInput: document.getElementById("cloudFolderInput"),
  cloudUseToggle: document.getElementById("cloudUseToggle"),
  printModeInput: document.getElementById("printModeInput"),
  printNoPaymentRequiredInput: document.getElementById("printNoPaymentRequiredInput"),
  printPriceLabelInput: document.getElementById("printPriceLabelInput"),
  printPanelTitleInput: document.getElementById("printPanelTitleInput"),
  printPanelBodyInput: document.getElementById("printPanelBodyInput"),
  printInstructionsInput: document.getElementById("printInstructionsInput"),
  printPaymentQrInput: document.getElementById("printPaymentQrInput"),
  printEventIdInput: document.getElementById("printEventIdInput"),
  staffPrintQueueUrl: document.getElementById("staffPrintQueueUrl"),
  migrateAssetsBtn: document.getElementById("migrateAssetsBtn"),
  emailJsPublic: document.getElementById("emailJsPublic"),
  emailJsService: document.getElementById("emailJsService"),
  emailJsTemplate: document.getElementById("emailJsTemplate"),
  syncNowBtn: document.getElementById("syncNowBtn"),
  syncStatus: document.getElementById("syncStatus"),
  offlineModeToggle: document.getElementById("offlineModeToggle"),
  sendPendingBtn: document.getElementById("sendPendingBtn"),
  cacheAssetsBtn: document.getElementById("cacheAssetsBtn"),
  forceCameraFileToggle: document.getElementById("forceCameraFileToggle"),
  headingFontSelect: document.getElementById("headingFontSelect"),
  bodyFontSelect: document.getElementById("bodyFontSelect"),
  fontPairingSelect: document.getElementById("fontPairingSelect"),
  headingFontPreview: document.getElementById("headingFontPreview"),
  bodyFontPreview: document.getElementById("bodyFontPreview"),
  quickPicks: document.getElementById("quickPicks"),
  quickPicksToggle: document.getElementById("qpToggle"),
  addPairingHeading: document.getElementById("addPairingHeading"),
  addPairingBody: document.getElementById("addPairingBody"),
  addPairingNotes: document.getElementById("addPairingNotes"),
  addPairingPreview: document.getElementById("addPairingPreview"),
  addPairingBtn: document.getElementById("addPairingBtn"),
  quickPickForm: document.getElementById("quickPickForm"),
  customPairingsList: document.getElementById("customPairingsList"),
  themeQuickSelect: document.getElementById("themeQuickSelect"),
  themeCharacter: document.getElementById("themeCharacter"),
  addAssetsBtn: document.getElementById("addAssetsBtn"),
  bulkAssetsInput: document.getElementById("bulkAssetsInput"),
  bulkAssetModal: document.getElementById("bulkAssetModal"),
  bulkAssetSummary: document.getElementById("bulkAssetSummary"),
  bulkToBackgrounds: document.getElementById("bulkToBackgrounds"),
  bulkToGreenBackgrounds: document.getElementById("bulkToGreenBackgrounds"),
  bulkToOverlays: document.getElementById("bulkToOverlays"),
  bulkToTemplates: document.getElementById("bulkToTemplates"),
  bulkAssetCancel: document.getElementById("bulkAssetCancel"),
  bulkAssetApply: document.getElementById("bulkAssetApply"),
  assetLibrarySearch: document.getElementById("assetLibrarySearch"),
  assetLibraryCategory: document.getElementById("assetLibraryCategory"),
  assetLibrarySort: document.getElementById("assetLibrarySort"),
  assetLibraryPills: document.getElementById("assetLibraryPills"),
  assetLibraryClearFilters: document.getElementById("assetLibraryClearFilters"),
  refreshAssetLibraryBtn: document.getElementById("refreshAssetLibraryBtn"),
  assetLibraryGrid: document.getElementById("assetLibraryGrid"),
  assetLibraryStatus: document.getElementById("assetLibraryStatus"),
  assetThemeDefaultsModal: document.getElementById("assetThemeDefaultsModal"),
  assetThemeDefaultsTitle: document.getElementById("assetThemeDefaultsTitle"),
  assetThemeDefaultsSummary: document.getElementById("assetThemeDefaultsSummary"),
  assetThemeDefaultsSelectionCount: document.getElementById(
    "assetThemeDefaultsSelectionCount"
  ),
  assetThemeDefaultsList: document.getElementById("assetThemeDefaultsList"),
  assetThemeDefaultsCancel: document.getElementById("assetThemeDefaultsCancel"),
  assetThemeDefaultsSave: document.getElementById("assetThemeDefaultsSave"),
  assetThemeDefaultsSelectCurrent: document.getElementById(
    "assetThemeDefaultsSelectCurrent"
  ),
  assetThemeDefaultsClearAll: document.getElementById(
    "assetThemeDefaultsClearAll"
  ),
  setupThemeDefaultsBtn: document.getElementById("setupThemeDefaultsBtn"),
  themeDefaultsSetupModal: document.getElementById("themeDefaultsSetupModal"),
  themeDefaultsSetupTitle: document.getElementById("themeDefaultsSetupTitle"),
  themeDefaultsSetupSummary: document.getElementById("themeDefaultsSetupSummary"),
  themeDefaultsSetupList: document.getElementById("themeDefaultsSetupList"),
  themeDefaultsSetupCancel: document.getElementById("themeDefaultsSetupCancel"),
  themeDefaultsSetupSave: document.getElementById("themeDefaultsSetupSave"),
  themeGreenBackgrounds: document.getElementById("themeGreenBackgrounds"),
  addGreenBackgroundsBtn: document.getElementById("addGreenBackgroundsBtn"),
  currentGreenBackgrounds: document.getElementById("currentGreenBackgrounds"),
  themeFontSelect: document.getElementById("themeFontSelect"),
  themeEditorModeSelect: document.getElementById("themeEditorModeSelect"),
  themeCloneSection: document.getElementById("themeCloneSection"),
  themeCloneName: document.getElementById("themeCloneName"),
  cloneThemeBtn: document.getElementById("cloneThemeBtn"),
  addLogoBtn: document.getElementById("addLogoBtn"),
  addBackgroundsBtn: document.getElementById("addBackgroundsBtn"),
  addOverlaysBtn: document.getElementById("addOverlaysBtn"),
  addTemplatesBtn: document.getElementById("addTemplatesBtn"),
  eventToSubThemeBtn: document.getElementById("eventToSubThemeBtn"),
  addFontFamily: document.getElementById("addFontFamily"),
  addFontUrl: document.getElementById("addFontUrl"),
  currentFonts: document.getElementById("currentFonts"),
  themeAccent: document.getElementById("themeAccent"),
  themeAccent2: document.getElementById("themeAccent2"),
  themeBackground: document.getElementById("themeBackground"),
  themeLogo: document.getElementById("themeLogo"),
  themeOverlays: document.getElementById("themeOverlays"),
  themeOverlaysFolder: document.getElementById("themeOverlaysFolder"),
  themeTemplates: document.getElementById("themeTemplates"),
  themeTemplatesFolder: document.getElementById("themeTemplatesFolder"),
  themeWelcomeTitle: document.getElementById("themeWelcomeTitle"),
  themeWelcomePrompt: document.getElementById("themeWelcomePrompt"),
  summaryBackground: document.getElementById("summaryBackground"),
  summaryLogo: document.getElementById("summaryLogo"),
  summaryOverlays: document.getElementById("summaryOverlays"),
  summaryTemplates: document.getElementById("summaryTemplates"),
  currentBackgrounds: document.getElementById("currentBackgrounds"),
  currentLogo: document.getElementById("currentLogo"),
  currentFont: document.getElementById("currentFont"),
  currentAccents: document.getElementById("currentAccents"),
  backgroundThumbnailsPanel: document.getElementById("backgroundThumbnailsPanel"),
  backgroundThumbnailsHeader: document.getElementById(
    "backgroundThumbnailsHeader"
  ),
  backgroundThumbnailsSelected: document.getElementById(
    "launchBackgroundCount"
  ),
  backgroundThumbnailsCount: document.getElementById("launchBackgroundCount"),
  backgroundThumbnailsAction: null,
  backgroundThumbnailsBody: document.getElementById("backgroundThumbnailsBody"),
  backgroundThumbnailsLoading: document.getElementById(
    "backgroundThumbnailsLoading"
  ),
  backgroundThumbnailsError: document.getElementById(
    "backgroundThumbnailsError"
  ),
  sessionBackgrounds: document.getElementById("sessionBackgrounds"),
  currentOverlays: document.getElementById("currentOverlays"),
  currentTemplates: document.getElementById("currentTemplates"),
  overlayThumbnailsPanel: document.getElementById("overlayThumbnailsPanel"),
  overlayThumbnailsHeader: document.getElementById("overlayThumbnailsHeader"),
  overlayThumbnailsSelected: document.getElementById("launchOverlayCount"),
  overlayThumbnailsCount: document.getElementById("launchOverlayCount"),
  overlayThumbnailsAction: null,
  overlayThumbnailsBody: document.getElementById("overlayThumbnailsBody"),
  overlayThumbnailsLoading: document.getElementById(
    "overlayThumbnailsLoading"
  ),
  overlayThumbnailsError: document.getElementById("overlayThumbnailsError"),
  templateThumbnailsPanel: document.getElementById("templateThumbnailsPanel"),
  templateThumbnailsHeader: document.getElementById(
    "templateThumbnailsHeader"
  ),
  templateThumbnailsSelected: document.getElementById("launchStripStatus"),
  templateThumbnailsCount: document.getElementById("launchStripStatus"),
  templateThumbnailsAction: null,
  templateThumbnailsBody: document.getElementById("templateThumbnailsBody"),
  templateThumbnailsLoading: document.getElementById(
    "templateThumbnailsLoading"
  ),
  templateThumbnailsError: document.getElementById("templateThumbnailsError"),
  currentEventName: document.getElementById("currentEventName"),
  currentEventDate: document.getElementById("currentEventDate"),
  currentEventTheme: document.getElementById("currentEventTheme"),
  currentAssetsSection: document.getElementById("currentAssetsSection"),
  currentAssetsContent: document.getElementById("currentAssetsContent"),
  currentEventAssetsSummary: document.getElementById(
    "currentEventAssetsSummary"
  ),
  currentThemeAssetsSummary: document.getElementById(
    "currentThemeAssetsSummary"
  ),
  createThemeModal: document.getElementById("createThemeModal"),
  createThemeDropZone: document.getElementById("createThemeDropZone"),
  createThemeName: document.getElementById("createThemeName"),
  createThemeSummary: document.getElementById("createThemeSummary"),
  createThemeBrowseBtn: document.getElementById("createThemeBrowseBtn"),
  createThemeCancel: document.getElementById("createThemeCancel"),
  createThemeConfirm: document.getElementById("createThemeConfirm"),
  createThemeFolderInput: document.getElementById("createThemeFolderInput"),
  btnUpdateTheme: document.getElementById("btnUpdateTheme"),
  btnSaveTheme: document.getElementById("btnSaveTheme"),
  installBtn: document.getElementById("installBtn"),
  themeEditorCloseBtn: document.getElementById("themeEditorCloseBtn"),
};

let createPathEventTypeFilter = "all";

function setBoothControlsVisible(show) {
  const hidden = !show;
  if (DOM.options) DOM.options.classList.toggle("hidden", hidden);
  if (DOM.boothHeader) DOM.boothHeader.classList.toggle("hidden", hidden);
  if (DOM.boothControls) DOM.boothControls.classList.toggle("hidden", hidden);
  if (DOM.boothBackBtn) DOM.boothBackBtn.classList.toggle("hidden", hidden);
  if (DOM.captureBtn) DOM.captureBtn.classList.toggle("hidden", hidden);
  if (DOM.boothScreen && show) {
    DOM.boothScreen.classList.add("booth-ready");
  }
  if (!show) {
    setMobileSettingsOpen(false);
  }
  syncMobileSettingsUi();
  requestAnimationFrame(() => logBoothViewportOverflow());
}

function logBoothViewportOverflow() {
  try {
    console.log({
      viewportHeight: window.innerHeight,
      documentHeight: document.documentElement.scrollHeight,
    });
  } catch (_) {}
}

function normalizeBoothModeValue(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (!normalized || normalized === "photo") {
    return getLivePhotoEnabled() ? "live-photo" : "still-photo";
  }
  if (normalized === "live-photo") {
    return getLivePhotoEnabled() ? "live-photo" : "still-photo";
  }
  if (normalized === "still-photo") return "still-photo";
  if (normalized === "strip" || normalized === "photo-strip") return "strip";
  if (normalized === "layout" || normalized === "collage") return "layout";
  if (normalized === "message" || normalized === "recording") return "message";
  return getLivePhotoEnabled() ? "live-photo" : "still-photo";
}

function getSelectedCaptureMode(value = mode) {
  const normalized = normalizeBoothModeValue(value);
  if (normalized === "live-photo" || normalized === "still-photo") {
    return "photo";
  }
  if (normalized === "strip" || normalized === "layout") return normalized;
  if (normalized === "message") return "message";
  return "photo";
}

const PRINT_SIZES = {
  landscape: { width: 1800, height: 1200, aspect: 3 / 2, cssAspect: "3 / 2" },
  portrait: { width: 1200, height: 1800, aspect: 2 / 3, cssAspect: "2 / 3" },
};

function getPrintSizeForOrientation(orientation = "landscape") {
  return PRINT_SIZES[orientation] || PRINT_SIZES.landscape;
}

function createPrintCanvas(orientation = "landscape") {
  const size = getPrintSizeForOrientation(orientation);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
  }
  return { canvas, ctx, size };
}

function normalizePhotoOverlayOrientation(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
  if (normalized === "portrait" || normalized === "vertical") {
    return "portrait";
  }
  if (normalized === "landscape" || normalized === "horizontal") {
    return "landscape";
  }
  return "";
}

function getPhotoOverlayAspectForOrientation(orientation = photoOverlayOrientation) {
  const normalized = normalizePhotoOverlayOrientation(orientation) || "landscape";
  return getPrintSizeForOrientation(normalized).aspect;
}

function getLiveCameraAspectStyle() {
  if (getSelectedCaptureMode() !== "photo") return PRINT_SIZES.landscape.cssAspect;
  const normalized = normalizePhotoOverlayOrientation(photoOverlayOrientation) || "landscape";
  return getPrintSizeForOrientation(normalized).cssAspect;
}

function applyBoothModeClass(nextMode = mode) {
  const normalizedMode = normalizeBoothModeValue(nextMode);
  const captureMode = getSelectedCaptureMode(normalizedMode);
  const classes = [
    "mode-live-photo",
    "mode-still-photo",
    "mode-strip",
    "mode-message",
    "mode-layout",
  ];
  if (DOM.boothScreen) {
    DOM.boothScreen.classList.remove(...classes);
    DOM.boothScreen.classList.add(`mode-${normalizedMode}`);
    DOM.boothScreen.dataset.mode = normalizedMode;
    DOM.boothScreen.dataset.captureMode = captureMode;
  }
  requestAnimationFrame(() => logBoothViewportOverflow());
  return { normalizedMode, captureMode };
}

function getLiveCameraAspectValue() {
  return getSelectedCaptureMode() === "photo"
    ? getPhotoOverlayAspectForOrientation()
    : PRINT_SIZES.landscape.aspect;
}

function getLiveCameraWidthValue() {
  if (getSelectedCaptureMode() === "photo" && photoOverlayOrientation === "portrait") {
    return isMobileBoothViewport() ? "76vw" : "540px";
  }
  return isMobileBoothViewport() ? "86vw" : "860px";
}

function applyLiveCameraSizing() {
  if (DOM.boothScreen) {
    DOM.boothScreen.style.setProperty(
      "--live-camera-width",
      getLiveCameraWidthValue()
    );
    DOM.boothScreen.style.setProperty(
      "--live-camera-aspect",
      getLiveCameraAspectStyle()
    );
  }
  if (DOM.videoContainer) {
    DOM.videoContainer.style.width = "";
    DOM.videoContainer.style.aspectRatio = "";
  }
}

function getSelectionDebugSummary(targetMode = mode) {
  const captureMode = getSelectedCaptureMode(targetMode);
  const activeOverlay = getActivePhotoOverlay();
  const template =
    captureMode === "strip" || captureMode === "layout"
      ? pendingTemplate ||
        getTemplateList(activeTheme).find(
          (item) => getAssetCaptureType(item) === captureMode
        ) ||
        null
      : null;
  return {
    mode: normalizeBoothModeValue(targetMode),
    captureMode,
    selectedOverlay: activeOverlay
      ? {
          id: activeOverlay.id || null,
          name: activeOverlay.name || activeOverlay.id || activeOverlay.src || "",
          type: activeOverlay.type || "photo",
        }
      : null,
    selectedTemplate: template
      ? {
          id: template.id || null,
          name: template.name || template.id || template.src || "",
          type: template.type || getAssetCaptureType(template) || "strip",
          layout: template.layout || null,
        }
      : null,
    photoOverlayOrientation,
    liveCameraAspect: getLiveCameraAspectValue(),
    finalExportAspect:
      typeof captureAspectRatio === "number" && captureAspectRatio > 0
        ? captureAspectRatio
        : null,
  };
}

function logBoothFrameState(reason, targetMode = mode) {
  try {
    console.log("[booth-frame]", reason, getSelectionDebugSummary(targetMode));
  } catch (_) {}
}

function isStripLikeSlotGrid(slots) {
  if (!Array.isArray(slots) || slots.length < 2) return false;
  const first = slots[0];
  if (!first) return false;
  const sameX = slots.every(
    (slot) => Math.abs((slot.x || 0) - (first.x || 0)) <= 0.08
  );
  const sameWidth = slots.every(
    (slot) => Math.abs((slot.width || 0) - (first.width || 0)) <= 0.08
  );
  const verticalOrder = slots.every((slot, index) => {
    if (index === 0) return true;
    return (slot.y || 0) >= (slots[index - 1].y || 0);
  });
  return sameX && sameWidth && verticalOrder;
}

function getAssetCaptureType(asset) {
  if (!asset) return "photo";
  const rawType = String(
    asset.captureType || asset.layoutType || asset.type || ""
  )
    .trim()
    .toLowerCase();
  const explicitLayout = asset && (asset.layout || asset.layoutType);
  const rawLayout = explicitLayout ? normalizeTemplateLayout(explicitLayout) : "";
  const rawName = [
    asset.id,
    asset.name,
    asset.src,
    asset.renderSrc,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (rawType.includes("message")) return "message";
  if (rawType.includes("layout") || rawType.includes("collage")) return "layout";
  if (rawType.includes("strip")) return "strip";
  if (
    rawLayout === "double_column" ||
    rawLayout === "vertical" ||
    rawLayout === "photo_strip_2" ||
    rawLayout === "photo_strip_3" ||
    rawLayout === "photo_strip_4"
  ) {
    return "strip";
  }
  if (Array.isArray(asset.photoSlots) && asset.photoSlots.length > 1) {
    return isStripLikeSlotGrid(asset.photoSlots) ? "strip" : "layout";
  }
  if (rawName.includes("strip")) return "strip";
  if (rawName.includes("layout") || rawName.includes("collage")) {
    return "layout";
  }
  return "photo";
}

function inferPhotoOverlayOrientationFromText(asset) {
  const raw = [
    asset && asset.id,
    asset && asset.name,
    asset && asset.src,
    asset && asset.renderSrc,
    asset && asset.layout,
    asset && asset.layoutClass,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/\b(landscape|horizontal|wide)\b/.test(raw)) return "landscape";
  if (/\b(portrait|vertical|tall)\b/.test(raw)) return "portrait";
  return "";
}

function getPhotoOverlayOrientation(asset) {
  if (!asset) return "";
  const explicit =
    normalizePhotoOverlayOrientation(asset.orientation) ||
    normalizePhotoOverlayOrientation(asset.overlayOrientation) ||
    normalizePhotoOverlayOrientation(asset.layoutClass) ||
    normalizePhotoOverlayOrientation(asset.layout);
  if (explicit) return explicit;
  const aspect =
    parseAspectRatioValue(asset.aspectRatio) ||
    parseAspectRatioValue(asset.layoutAspectRatio);
  if (aspect) return aspect >= 1 ? "landscape" : "portrait";
  const textOrientation = inferPhotoOverlayOrientationFromText(asset);
  if (textOrientation) return textOrientation;
  const src = String(asset.renderSrc || asset.src || "");
  return photoOverlayOrientationCache[src] || "";
}

function queuePhotoOverlayOrientationProbe(asset) {
  const src = String((asset && (asset.renderSrc || asset.src)) || "");
  if (!src || photoOverlayOrientationCache[src] || photoOverlayOrientationPending[src]) {
    return;
  }
  photoOverlayOrientationPending[src] = true;
  loadImage(resolveOverlayRenderSrc(activeTheme, src))
    .then((img) => {
      const width = img.naturalWidth || img.width || 0;
      const height = img.naturalHeight || img.height || 0;
      if (width && height) {
        photoOverlayOrientationCache[src] =
          width >= height ? "landscape" : "portrait";
        if (getSelectedCaptureMode() === "photo") renderOptions();
      }
    })
    .catch(() => {})
    .finally(() => {
      delete photoOverlayOrientationPending[src];
    });
}

function filterPhotoOverlaysByOrientation(overlays, orientation = photoOverlayOrientation) {
  const target = normalizePhotoOverlayOrientation(orientation) || "portrait";
  return filterAssetsForMode(overlays, "photo").filter((overlay) => {
    const overlayOrientation = getPhotoOverlayOrientation(overlay);
    if (!overlayOrientation) {
      queuePhotoOverlayOrientationProbe(overlay);
      return true;
    }
    return overlayOrientation === target;
  });
}

function filterAssetsForMode(assets, modeValue) {
  const captureMode = getSelectedCaptureMode(modeValue);
  return Array.isArray(assets)
    ? assets.filter((asset) => {
        const assetType = getAssetCaptureType(asset);
        if (captureMode === "photo") return assetType === "photo";
        if (captureMode === "strip") return assetType === "strip";
        if (captureMode === "layout") return assetType === "layout";
        return false;
      })
    : [];
}

function isMobileBoothViewport() {
  return (
    window.matchMedia("(max-width: 760px)").matches ||
    document.body.classList.contains("viewport-phone")
  );
}

function canShowFrameSettings() {
  return !!(
    DOM.boothScreen &&
    !DOM.boothScreen.classList.contains("hidden") &&
    DOM.boothScreen.classList.contains("booth-ready") &&
    !DOM.boothScreen.classList.contains("welcome-active") &&
    !DOM.boothScreen.classList.contains("share-mode") &&
    !DOM.boothScreen.classList.contains("countdown-mode") &&
    !DOM.boothScreen.classList.contains("finalizing-mode")
  );
}

function setMobileSettingsOpen(open) {
  const shouldOpen = !!open && canShowFrameSettings();
  if (DOM.boothScreen) {
    DOM.boothScreen.classList.toggle("mobile-settings-open", shouldOpen);
  }
  if (DOM.mobileSettingsSheet) {
    DOM.mobileSettingsSheet.setAttribute(
      "aria-hidden",
      shouldOpen ? "false" : "true"
    );
  }
  if (DOM.mobileSettingsToggle) {
    DOM.mobileSettingsToggle.setAttribute(
      "aria-expanded",
      shouldOpen ? "true" : "false"
    );
  }
}

function syncMobileSettingsUi() {
  const available = !!(
    DOM.mobileSettingsToggle &&
    canShowFrameSettings() &&
    isMobileBoothViewport()
  );
  if (DOM.mobileSettingsToggle) {
    DOM.mobileSettingsToggle.classList.toggle("hidden", !available);
  }
  if (!available) {
    setMobileSettingsOpen(false);
  }
}

function syncBoothModeButtons() {
  document.querySelectorAll("#controls .mode-btn").forEach((button) => {
    const buttonMode = button.dataset.mode || "";
    const hidden = buttonMode === "live-photo" && !getLivePhotoEnabled();
    button.classList.toggle("hidden", hidden);
    if (hidden && mode === "live-photo") mode = "still-photo";
    const isActive = buttonMode === mode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function syncCaptureStatusIndicators() {
  const showPhotoIndicators = getSelectedCaptureMode() === "photo";
  const showLivePhotoIndicator = showPhotoIndicators && mode === "live-photo";
  if (DOM.livePhotoStatus) {
    DOM.livePhotoStatus.classList.toggle(
      "hidden",
      !showLivePhotoIndicator || !getLivePhotoEnabled()
    );
  }
  if (DOM.instantCaptureStatus) {
    DOM.instantCaptureStatus.classList.toggle(
      "hidden",
      !showPhotoIndicators || !getInstantCaptureEnabled()
    );
  }
  if (DOM.captureStatusBar) {
    const hasVisibleStatus = !!DOM.captureStatusBar.querySelector(
      ".capture-status-pill:not(.hidden)"
    );
    DOM.captureStatusBar.classList.toggle("hidden", !hasVisibleStatus);
  }
}

const RECORDING_MODE_STORAGE_KEY = "photoboothRecordingMode";

function getRecordingModeEnabled() {
  try {
    const stored = localStorage.getItem(RECORDING_MODE_STORAGE_KEY);
    if (stored === "true") return true;
    if (stored === "false") return false;
  } catch (_) {}
  return true;
}

function setRecordingModeEnabled(enabled) {
  try {
    localStorage.setItem(
      RECORDING_MODE_STORAGE_KEY,
      enabled ? "true" : "false"
    );
  } catch (_) {}
}

function syncRecordingModeAvailability() {
  const enabled = getRecordingModeEnabled();
  if (DOM.recordingModeBtn) {
    DOM.recordingModeBtn.classList.toggle("hidden", !enabled);
  }
  if (!enabled && mode === "message") {
    setMode("live-photo");
    return;
  }
  syncBoothModeButtons();
}
// --- State ---
let activeTheme = null; // Default theme
let mode = "live-photo";
let currentMode = "photo";
let stream;
let torchEnabled = false;
let selectedOverlay = null;
let lastPhotoOverlay = null;
let selectedFilter = "natural";
let photoOverlayOrientation = "portrait";
let lastPhotoOverlayByOrientation = { portrait: null, landscape: null };
let photoOverlayOrientationCache = {};
let photoOverlayOrientationPending = {};
let pendingTemplate = null;
let hidePreviewTimer = null;
let allowRetake = true;
let isStartingCamera = false;
let capturePreviewFrozen = false;
let lastCaptureFlow = null; // To store the function for retake
let removedStack = []; // For undo of removed assets in session
let toastTimer = null;
let lastShareUrl = null; // Public Cloudinary share URL; service-worker share cache is offline fallback only.
let demoMode = false; // Allows running from file:// without camera
let showcaseDemoActive = false;
let showcaseDemoCurrentKey = "";
let welcomeFlowStep = "demo";
let captureAspectRatio = null; // Override capture aspect (width/height) when set
const SETUP_LAUNCH_MODE_STORAGE_KEY = "photoboothSetupLaunchMode";
let setupLaunchMode = "single_photo";
let launchSummaryRevision = 0;
const ASSET_PICKER_INITIAL_LIMIT = 24;
const ASSET_PICKER_PAGE_SIZE = 24;
let assetPickerVisibleLimits = {
  photo: ASSET_PICKER_INITIAL_LIMIT,
  strip: ASSET_PICKER_INITIAL_LIMIT,
  layout: ASSET_PICKER_INITIAL_LIMIT,
};

const BOOTH_TEST_SHARE_URL = "https://example.com/photobooth-test-final.png";

function getUrlParam(name) {
  try {
    return new URLSearchParams(window.location.search).get(name) || "";
  } catch (_) {
    return "";
  }
}

function isBoothTestMode() {
  return getUrlParam("testMode") === "booth";
}

function getBoothQaState() {
  return getUrlParam("qaState");
}
const AUTO_ENHANCE_ENABLED = true;
const AUTO_ENHANCE_FILTER = "brightness(1.05) contrast(1.08) saturate(1.08)";
const ENHANCEMENT_MODE_DEFAULT = "bridal-glow";
const ENHANCEMENT_MODE_CONFIG = {
  natural: {
    baseFilter: "brightness(1.03) contrast(1.05) saturate(1.04)",
    shadowLift: 10,
    highlightRollOff: 8,
    warmthRedBoost: 2,
    warmthBlueCut: 1,
    smoothingBlend: 0.12,
  },
  "bridal-glow": {
    baseFilter: "brightness(1.06) contrast(1.08) saturate(1.07)",
    shadowLift: 20,
    highlightRollOff: 14,
    warmthRedBoost: 4,
    warmthBlueCut: 3,
    smoothingBlend: 0.22,
  },
  "harsh-light-fix": {
    baseFilter: "brightness(1.04) contrast(1.02) saturate(1.03)",
    shadowLift: 28,
    highlightRollOff: 24,
    warmthRedBoost: 2,
    warmthBlueCut: 2,
    smoothingBlend: 0.18,
  },
};

const FILTER_EFFECTS = [
  { id: "natural", name: "Natural", icon: "✨", css: "brightness(1.03)" },
  { id: "soft", name: "Soft", icon: "🌸", css: "brightness(1.04) contrast(0.96) saturate(1.02)" },
  { id: "bright", name: "Bright", icon: "☀️", css: "brightness(1.2) contrast(1.04) saturate(1.06)" },
  { id: "clean", name: "Clean", icon: "🔳", css: "brightness(0.96) contrast(1.08) saturate(1.08)" },
  { id: "bw", name: "B&W", icon: "🖤", css: "grayscale(1) contrast(1.06)" },
];

function getAssetPickerFilename(src = "") {
  const value = String(src || "").split("?")[0].split("#")[0];
  try {
    return decodeURIComponent(value.split("/").pop() || value || "");
  } catch (_) {
    return value.split("/").pop() || value || "";
  }
}

function getAssetPickerVisibleLimit(modeKey, selectedSrc = "", entries = []) {
  const base =
    assetPickerVisibleLimits[modeKey] || ASSET_PICKER_INITIAL_LIMIT;
  const cleanSelected = getAssetEntrySrc(selectedSrc);
  if (!cleanSelected) return base;
  const selectedIndex = entries.findIndex(
    (entry) => getAssetEntrySrc(entry) === cleanSelected
  );
  return selectedIndex >= 0 ? Math.max(base, selectedIndex + 1) : base;
}
const LIVE_PHOTO_DEFAULT = true;
const LIVE_PHOTO_DURATION_MS = 2000;
const MESSAGE_DURATION_MS = 60000;
const CAMERA_ZOOM_DEFAULT = 1;
const GREEN_SCREEN_DEFAULT = true;
const AI_BACKGROUND_DEFAULT = false;
let lastLiveClipUrl = null;
let lastLiveClipBlob = null;
let lastShareType = "image";
let isImporting360Video = false;
let isRunning360Sequence = false;
let isMessageRecording = false;
let messageRecorder = null;
let messageStopTimer = null;
let messageStopper = null;
let aiSegmentation = null;
let aiSegmentationResolver = null;
let aiSegmentationPromise = null;
let pendingBulkAssetFiles = [];
let assetLibrary = { assets: [] };
function createEmptySessionAssets() {
  return {
    backgrounds: [],
    greenBackgrounds: [],
    overlays: [],
    templates: [],
    backgroundIndex: 0,
    greenBackgroundIndex: 0,
    logo: "",
  };
}
let activeSessionAssets = createEmptySessionAssets();
let activeSessionThemeKey = "";
let sessionRemovedBackgrounds = [];
let sessionRemovedOverlays = [];
let sessionRemovedTemplates = [];
let activeThemeDefaultsAsset = null;
let activeThemeDefaultsSetupKey = "";
let activeSessionTextDetails = {};
let boothAudioContext = null;
let boothAudioEnabled = false;
const ACCENT_PRESET_COLORS = [
  "#ffffff",
  "#0f1222",
  "#111827",
  "#1f2937",
  "#ef4444",
  "#f97316",
  "#facc15",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#f43f5e",
];
let createThemeAssets = null; // Temporary storage for create-from-folder workflow
let createEventAssets = null;
let createEventMode = "create";
let createEventTextOverrides = null;
// Cache-busting stamp for this session to avoid stale images during editing
const SESSION_BUST = Date.now();
function withBust(src) {
  try {
    if (!src) return src;
    const lower = String(src).toLowerCase();
    if (lower.startsWith("data:") || lower.startsWith("blob:")) return src;
    return src + (src.includes("?") ? "&" : "?") + "v=" + SESSION_BUST;
  } catch (_) {
    return src;
  }
}

const GLOBAL_LOGO_STORAGE_KEY = "photoboothGlobalLogo";
const THEME_FAVORITES_STORAGE_KEY = "photoboothThemeFavorites";
const ASSET_LIBRARY_FAVORITES_STORAGE_KEY = "photoboothAssetLibraryFavorites";
const ASSET_LIBRARY_RECENTS_STORAGE_KEY = "photoboothAssetLibraryRecents";
const ASSET_LIBRARY_RECENT_LIMIT = 80;
const LAST_THEME_KEY_STORAGE = "photoboothLastThemeKey";
const QUICK_START_SESSION_DATE_KEY = "photoboothQuickStartDate";
const SHOWCASE_DEMO_THEME_CANDIDATES = {
  wedding: ["wedding:timeless", "wedding:romantic"],
  birthday: ["general:birthday"],
  general: ["general:basic", DEFAULT_THEME_KEY],
};

function getLocalIsoDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getLastThemeKey() {
  try {
    return localStorage.getItem(LAST_THEME_KEY_STORAGE) || "";
  } catch (_) {
    return "";
  }
}

function setLastThemeKey(themeKey) {
  if (!themeKey) return;
  try {
    localStorage.setItem(LAST_THEME_KEY_STORAGE, themeKey);
  } catch (_) {}
}

function getQuickStartSessionDate() {
  try {
    return localStorage.getItem(QUICK_START_SESSION_DATE_KEY) || "";
  } catch (_) {
    return "";
  }
}

function setQuickStartSessionDate(dateValue) {
  const safe = typeof dateValue === "string" ? dateValue.trim() : "";
  if (!safe) return;
  try {
    localStorage.setItem(QUICK_START_SESSION_DATE_KEY, safe);
  } catch (_) {}
}

function clearQuickStartSessionDate() {
  try {
    localStorage.removeItem(QUICK_START_SESSION_DATE_KEY);
  } catch (_) {}
}

function getDateSessionSlug() {
  const raw = getQuickStartSessionDate() || getLocalIsoDate();
  const safe = (raw || "").toString().trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(safe) ? safe : getLocalIsoDate();
}

function getShowcaseDemoThemeKey(kind) {
  const normalized = (kind || "").toString().trim().toLowerCase();
  const options = Array.from(
    (DOM.eventSelect && DOM.eventSelect.options) || []
  ).filter((opt) => opt && opt.value);
  const candidates = SHOWCASE_DEMO_THEME_CANDIDATES[normalized] || [];
  const direct = candidates.find((key) =>
    options.some((opt) => opt.value === key)
  );
  if (direct) return direct;
  const inferred = options.find(
    (opt) =>
      inferThemeEventStyle(opt.value, resolveThemeByKey(opt.value)) ===
      normalized
  );
  return inferred ? inferred.value : "";
}

function updateShowcaseDemoUi() {
  const buttons = Array.from(document.querySelectorAll("[data-demo-theme]"));
  const hasChoices = buttons.some((button) =>
    !!getShowcaseDemoThemeKey(button.dataset.demoTheme)
  );
  if (DOM.demoThemeBar) DOM.demoThemeBar.classList.toggle("show", hasChoices);
  buttons.forEach((button) => {
    const key = getShowcaseDemoThemeKey(button.dataset.demoTheme);
    const isActive = !!key && key === showcaseDemoCurrentKey;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
    button.disabled = !key;
  });
}

function hasShowcaseDemoChoices() {
  return ["wedding", "birthday", "general"].some((kind) =>
    !!getShowcaseDemoThemeKey(kind)
  );
}

function resolveInitialWelcomeStep() {
  return showcaseDemoActive && hasShowcaseDemoChoices() ? "demo" : "idle";
}

function updateWelcomeFlowUi() {
  const step = welcomeFlowStep || resolveInitialWelcomeStep();
  if (DOM.welcomeOverlay) DOM.welcomeOverlay.dataset.step = step;
  if (DOM.welcomeDemoStep)
    DOM.welcomeDemoStep.classList.toggle("hidden", step !== "demo");
  if (DOM.welcomeIdleStep)
    DOM.welcomeIdleStep.classList.toggle("hidden", step !== "idle");
  if (DOM.welcomeModeStep)
    DOM.welcomeModeStep.classList.toggle("hidden", step !== "mode");
  if (DOM.welcomeEyebrow) {
    DOM.welcomeEyebrow.textContent =
      step === "demo"
        ? "Choose your demo"
        : step === "mode"
        ? "Choose your photo style"
        : "Tap anywhere to start";
  }
}

function setWelcomeFlowStep(step) {
  welcomeFlowStep = step || resolveInitialWelcomeStep();
  updateWelcomeFlowUi();
}

function disableShowcaseDemo() {
  showcaseDemoActive = false;
  showcaseDemoCurrentKey = "";
  updateShowcaseDemoUi();
}

function applyShowcaseDemoTheme(kind) {
  const themeKey = getShowcaseDemoThemeKey(kind);
  if (!themeKey) return false;
  showcaseDemoActive = true;
  showcaseDemoCurrentKey = themeKey;
  setActiveEventId("");
  if (DOM.eventProfileSelect) DOM.eventProfileSelect.value = "";
  setQuickStartSessionDate(getLocalIsoDate());
  setEventSelection(themeKey);
  loadTheme(themeKey);
  syncEventInputsFromActive();
  updateEventOverridesSummary();
  updateStylePreview();
  updateShowcaseDemoUi();
  return true;
}

function startShowcaseDemo() {
  const order = ["wedding", "birthday", "general"];
  const kind = order.find((entry) => !!getShowcaseDemoThemeKey(entry));
  if (!kind) return;
  if (!applyShowcaseDemoTheme(kind)) return;
  showToast("Demo showcase ready.");
  startBooth({ preserveSession: true });
}

function cycleShowcaseDemoTheme() {
  if (!showcaseDemoActive) return false;
  const order = ["wedding", "birthday", "general"];
  const currentKind = inferThemeEventStyle(
    showcaseDemoCurrentKey,
    resolveThemeByKey(showcaseDemoCurrentKey)
  );
  const currentIndex = Math.max(0, order.indexOf(currentKind));
  for (let offset = 1; offset <= order.length; offset += 1) {
    const nextKind = order[(currentIndex + offset) % order.length];
    if (applyShowcaseDemoTheme(nextKind)) return true;
  }
  return false;
}

function getThemeFavorites() {
  try {
    const raw = JSON.parse(
      localStorage.getItem(THEME_FAVORITES_STORAGE_KEY) || "[]"
    );
    if (!Array.isArray(raw)) return new Set();
    return new Set(raw.filter((value) => typeof value === "string" && value));
  } catch (_) {
    return new Set();
  }
}

function setThemeFavorites(favorites) {
  const list = Array.from(favorites || []).filter(
    (value) => typeof value === "string" && value
  );
  localStorage.setItem(THEME_FAVORITES_STORAGE_KEY, JSON.stringify(list));
}

function isBuiltinThemeKey(themeKey) {
  if (!themeKey || typeof themeKey !== "string") return false;
  if (!themeKey.includes(":")) return !!BUILTIN_THEMES[themeKey];
  const [rootKey, leafKey] = themeKey.split(":");
  const group = BUILTIN_THEMES[rootKey];
  if (!group || typeof group !== "object") return false;
  if (group.themes && group.themes[leafKey]) return true;
  if (group.holidays && group.holidays[leafKey]) return true;
  return false;
}

function getThemeTypeForKey(themeKey, favorites = getThemeFavorites()) {
  if (!themeKey) return "standard";
  if (favorites.has(themeKey)) return "favorite";
  return isBuiltinThemeKey(themeKey) ? "standard" : "custom";
}

function renderMissingThumbnail(container, src) {
  if (!container) return;
  const panel = container.closest("[data-asset-panel]");
  if (panel && panel.dataset.assetPanel) {
    const kind = panel.dataset.assetPanel === "template" ? "template" : "overlay";
    setAssetPanelMessage(
      kind,
      "error",
      kind === "template"
        ? "Couldn’t load template thumbnails."
        : "Couldn’t load overlay thumbnails."
    );
  }
  container.remove();
}

function createAssetTile(src, options = {}) {
  const item = document.createElement("div");
  item.className = "asset-item";
  const img = document.createElement("img");
  img.src = withBust(src);
  img.onerror = () => renderMissingThumbnail(item, src);
  item.appendChild(img);
  if (options.badge) {
    const badgeEl = document.createElement("div");
    badgeEl.className = "asset-badge";
    badgeEl.textContent = options.badge;
    item.appendChild(badgeEl);
  }
  return item;
}

const ASSET_PANEL_STATE_KEY = "photoboothAssetPanels";

function getAssetPanelKind(kind) {
  if (kind === "template") return "template";
  if (kind === "background") return "background";
  return "overlay";
}

function readAssetPanelState() {
  try {
    const raw = localStorage.getItem(ASSET_PANEL_STATE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
}

function writeAssetPanelState(state) {
  try {
    localStorage.setItem(ASSET_PANEL_STATE_KEY, JSON.stringify(state || {}));
  } catch (_) {}
}

function getAssetPanelControls(kind) {
  const resolved = getAssetPanelKind(kind);
  if (resolved === "background") {
    return {
      panel: DOM.backgroundThumbnailsPanel,
      header: DOM.backgroundThumbnailsHeader,
      selected: DOM.backgroundThumbnailsSelected,
      count: DOM.backgroundThumbnailsCount,
      action: DOM.backgroundThumbnailsAction,
      body: DOM.backgroundThumbnailsBody,
      loading: DOM.backgroundThumbnailsLoading,
      error: DOM.backgroundThumbnailsError,
    };
  }
  if (resolved === "template") {
    return {
      panel: DOM.templateThumbnailsPanel,
      header: DOM.templateThumbnailsHeader,
      selected: DOM.templateThumbnailsSelected,
      count: DOM.templateThumbnailsCount,
      action: DOM.templateThumbnailsAction,
      body: DOM.templateThumbnailsBody,
      loading: DOM.templateThumbnailsLoading,
      error: DOM.templateThumbnailsError,
    };
  }
  return {
    panel: DOM.overlayThumbnailsPanel,
    header: DOM.overlayThumbnailsHeader,
    selected: DOM.overlayThumbnailsSelected,
    count: DOM.overlayThumbnailsCount,
    action: DOM.overlayThumbnailsAction,
    body: DOM.overlayThumbnailsBody,
    loading: DOM.overlayThumbnailsLoading,
    error: DOM.overlayThumbnailsError,
  };
}

function normalizeAssetDisplayName(value, fallback = "None") {
  const raw =
    typeof value === "string"
      ? value
      : value && typeof value === "object"
      ? value.name || value.id || value.src || ""
      : "";
  const trimmed = raw.toString().trim();
  if (!trimmed) return fallback;
  const cleaned = trimmed.split("?")[0].split("#")[0];
  const fileName = cleaned.split("/").pop() || cleaned;
  return fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || fallback;
}

function getAssetEntrySrc(entry) {
  const value = String(
    typeof entry === "string"
      ? entry
      : entry && (entry.src || entry.url || entry.secure_url || "")
  ).trim();
  return value === "[object Object]" ? "" : value;
}

function createAssetSelectionSet(value) {
  if (value instanceof Set) return value;
  const source = Array.isArray(value) ? value : value ? [value] : [];
  return new Set(source.map(getAssetEntrySrc).filter(Boolean));
}

function getSessionAssignedAssetEntries(category = "") {
  const normalized = normalizeUploadedAssetCategory(category);
  if (normalized === "background") {
    return Array.isArray(activeSessionAssets.backgrounds)
      ? activeSessionAssets.backgrounds.map(getAssetEntrySrc).filter(Boolean)
      : [];
  }
  if (normalized === "overlay") {
    return Array.isArray(activeSessionAssets.overlays)
      ? activeSessionAssets.overlays
          .map((entry) => {
            const src = getAssetEntrySrc(entry);
            if (!src) return null;
            return typeof entry === "object" ? entry : { src, __session: true };
          })
          .filter(Boolean)
      : [];
  }
  if (normalized === "template") {
    return Array.isArray(activeSessionAssets.templates)
      ? activeSessionAssets.templates
          .map((entry) => {
            const src = getAssetEntrySrc(entry);
            if (!src) return null;
            return typeof entry === "object"
              ? entry
              : { src, layout: "double_column", __session: true };
          })
          .filter(Boolean)
      : [];
  }
  return [];
}

function getSessionAssignedAssetSourceSet(category = "") {
  return createAssetSelectionSet(getSessionAssignedAssetEntries(category));
}

function discardStaleSessionLibraryAssets() {
  const canonicalSources = {
    background: new Set(getCanonicalAssetCollection("background").map((asset) => asset.url)),
    overlay: new Set(getCanonicalAssetCollection("overlay").map((asset) => asset.url)),
    template: new Set(getCanonicalAssetCollection("template").map((asset) => asset.url)),
  };
  activeSessionAssets.backgrounds = (Array.isArray(activeSessionAssets.backgrounds)
    ? activeSessionAssets.backgrounds
    : [])
    .filter((entry) => canonicalSources.background.has(getAssetEntrySrc(entry)))
    .slice(0, 1);
  activeSessionAssets.backgroundIndex = 0;
  activeSessionAssets.overlays = (Array.isArray(activeSessionAssets.overlays)
    ? activeSessionAssets.overlays
    : []).filter((entry) => canonicalSources.overlay.has(getAssetEntrySrc(entry)));
  activeSessionAssets.templates = (Array.isArray(activeSessionAssets.templates)
    ? activeSessionAssets.templates
    : []).filter((entry) => canonicalSources.template.has(getAssetEntrySrc(entry)));
  sessionRemovedBackgrounds = sessionRemovedBackgrounds.filter((src) =>
    canonicalSources.background.has(getAssetEntrySrc(src))
  );
  sessionRemovedOverlays = sessionRemovedOverlays.filter((src) =>
    canonicalSources.overlay.has(getAssetEntrySrc(src))
  );
  sessionRemovedTemplates = sessionRemovedTemplates.filter((src) =>
    canonicalSources.template.has(getAssetEntrySrc(src))
  );
}

/**
 * Returns a Set of asset source URLs representing all assets effectively
 * assigned to the session across all sources.
 */
function getSessionEffectiveAssetSourceSet(category = "") {
  const normalized = normalizeUploadedAssetCategory(category);
  discardStaleSessionLibraryAssets();
  const theme = activeTheme || getSelectedThemeTarget();
  if (normalized === "background") {
    return new Set(getEffectiveSelectedBackgroundList(theme));
  }
  if (normalized === "overlay") {
    return new Set(
      getEffectiveOverlayList(theme)
        .map((o) => (o && o.src ? o.src : null))
        .filter(Boolean)
    );
  }
  if (normalized === "template") {
    return new Set(
      getEffectiveTemplateList(theme)
        .map((t) => (t && t.src ? t.src : null))
        .filter(Boolean)
    );
  }
  return new Set();
}

function syncAssetPanelHeader(kind, list = [], selectedValue = "") {
  const controls = getAssetPanelControls(kind);
  const resolved = getAssetPanelKind(kind);
  const count = Array.isArray(list) ? list.length : 0;
  const noun =
    resolved === "template"
      ? "template"
      : resolved === "background"
      ? "background"
      : "overlay";
  const selectedText = !count
    ? `No ${noun}s assigned yet`
    : `${count} ${noun}${count === 1 ? "" : "s"} assigned`;
  if (controls.selected) {
    controls.selected.textContent = selectedText;
  }
  if (controls.count && controls.count !== controls.selected) {
    controls.count.textContent = `${count} ${noun}${count === 1 ? "" : "s"}`;
  }
  if (controls.action) {
    const isOpen = !!(controls.panel && controls.panel.classList.contains("open"));
    controls.action.textContent = isOpen ? "Hide" : "View all";
  }
}

function setAssetPanelMessage(kind, state, message) {
  const controls = getAssetPanelControls(kind);
  if (controls.loading) controls.loading.classList.add("hidden");
  if (controls.error) controls.error.classList.add("hidden");
  if (!state) return;
  const target = state === "loading" ? controls.loading : controls.error;
  if (!target) return;
  target.textContent = message || target.textContent;
  target.classList.remove("hidden");
}

function setAssetPanelOpen(kind, open, options = {}) {
  const controls = getAssetPanelControls(kind);
  if (!controls.panel || !controls.header) return;
  const resolved = getAssetPanelKind(kind);
  controls.panel.classList.toggle("open", !!open);
  controls.header.setAttribute("aria-expanded", !!open ? "true" : "false");
  if (controls.action) controls.action.textContent = open ? "Hide" : "View all";
  if (options.persist !== false) {
    const state = readAssetPanelState();
    state[resolved] = !!open;
    writeAssetPanelState(state);
  }
}

function restoreAssetPanelState() {
  const state = readAssetPanelState();
  ["background", "overlay", "template"].forEach((kind) => {
    setAssetPanelOpen(kind, !!state[getAssetPanelKind(kind)], {
      persist: false,
    });
  });
}

function setupAssetPanelControls() {
  const bind = (kind) => {
    const controls = getAssetPanelControls(kind);
    if (!controls.header) return;
    controls.header.addEventListener("click", () => {
      const next = !controls.panel.classList.contains("open");
      setAssetPanelOpen(kind, next);
    });
  };
  bind("overlay");
  bind("template");
  restoreAssetPanelState();
}

// --- Idle Timeout ---
let idleTimer;
const IDLE_TIMEOUT_MS = 30000; // 30 seconds

function resetIdleTimer() {
  if (isBoothTestMode()) return;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    hideFinal();
    cycleShowcaseDemoTheme();
    showWelcome();
  }, IDLE_TIMEOUT_MS);
}

function setupEventSelector() {
  if (!DOM.eventSelect) {
    console.warn("Event select dropdown not found; themes will not switch.");
    return;
  }
  DOM.eventSelect.addEventListener("change", handleEventSelectChange);
}

function updateCreatePathFavoriteButton() {
  if (!DOM.toggleThemeFavoriteBtn || !DOM.createPathThemeSelect) return;
  const key = DOM.createPathThemeSelect.value || "";
  if (!key) {
    DOM.toggleThemeFavoriteBtn.textContent = "Add to Favorites";
    DOM.toggleThemeFavoriteBtn.disabled = true;
    return;
  }
  const favorites = getThemeFavorites();
  const isFavorite = favorites.has(key);
  DOM.toggleThemeFavoriteBtn.textContent = isFavorite
    ? "Remove from Favorites"
    : "Add to Favorites";
  DOM.toggleThemeFavoriteBtn.disabled = false;
}

function getSuggestedPairingsForEventType(selectedType, limit = 0) {
  const pairings = Array.isArray(fontCatalog.pairings)
    ? fontCatalog.pairings.slice()
    : [];
  const filtered = pairings.filter((pairing) =>
    pairingSupportsEventStyle(pairing, selectedType)
  );
  return limit > 0 ? filtered.slice(0, limit) : filtered;
}

function getThemeFontPairingLabel(themeKey = "") {
  const theme =
    resolveThemeByKey(themeKey) ||
    activeTheme ||
    getSelectedThemeTarget() ||
    {};
  const heading =
    primaryFontFamily(theme.fontHeading || theme.font || "") || "Theme heading";
  const body = primaryFontFamily(theme.fontBody || theme.font || "") || heading;
  return `${heading} + ${body}`;
}

function renderCreatePathFontPreviewCards(pairings, themeKey = "") {
  if (!DOM.createPathFontPreviewCards) return;
  DOM.createPathFontPreviewCards.innerHTML = "";
  const selectedValue = DOM.createPathFontPairingSelect
    ? DOM.createPathFontPairingSelect.value
    : "";

  const theme =
    resolveThemeByKey(themeKey) ||
    activeTheme ||
    getSelectedThemeTarget() ||
    {};
  const themeHeading =
    primaryFontFamily(theme.fontHeading || theme.font || "") || "Theme heading";
  const themeBody =
    primaryFontFamily(theme.fontBody || theme.font || "") || themeHeading;
  const makeCard = ({
    label,
    title,
    notes = "",
    preview,
    heading,
    value = "",
  }) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "quick-pick-card event-style-card";
    const isSelected = value === selectedValue;
    card.classList.toggle("active", isSelected);
    card.setAttribute("aria-pressed", isSelected ? "true" : "false");
    card.innerHTML = `
      <div class="quick-pick-label">${label}</div>
      <div class="quick-pick-title">${title}</div>
      ${notes ? `<div class="quick-pick-notes">${notes}</div>` : ""}
      <div class="quick-pick-preview" style="font-family: ${composeFontString(
        heading
      )};">${preview}</div>
    `;
    card.addEventListener("click", () => {
      if (DOM.createPathFontPairingSelect) {
        DOM.createPathFontPairingSelect.value = value;
      }
      renderCreatePathFontPreviewCards(pairings, themeKey);
    });
    return card;
  };

  DOM.createPathFontPreviewCards.appendChild(
    makeCard({
      label: "Theme Default",
      title: `${themeHeading} + ${themeBody}`,
      notes: "Use the selected theme's built-in fonts.",
      preview: resolveThemeBannerText(),
      heading: themeHeading,
      value: "",
    })
  );

  pairings.forEach((pairing) => {
    DOM.createPathFontPreviewCards.appendChild(
      makeCard({
        label: "Suggested",
        title: `${pairing.heading} + ${pairing.body}`,
        notes: pairing.notes || "",
        preview: findPairingPreview(pairing),
        heading: pairing.heading,
        value: `${pairing.heading}|${pairing.body}`,
      })
    );
  });
}

function populateCreatePathFontPairingSelect(preferredValue = "") {
  if (!DOM.createPathFontPairingSelect) return;
  const themeKey = DOM.createPathThemeSelect
    ? DOM.createPathThemeSelect.value
    : "";
  const theme = resolveThemeByKey(themeKey);
  const selectedType = inferThemeEventStyle(themeKey, theme);
  const pairings = getSuggestedPairingsForEventType(selectedType, 5);
  const select = DOM.createPathFontPairingSelect;
  select.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = `Use theme fonts (${getThemeFontPairingLabel(
    DOM.createPathThemeSelect ? DOM.createPathThemeSelect.value : ""
  )})`;
  select.appendChild(placeholder);

  pairings.forEach((pairing) => {
    const option = document.createElement("option");
    option.value = `${pairing.heading}|${pairing.body}`;
    option.textContent = pairing.notes
      ? `${pairing.heading} + ${pairing.body} - ${pairing.notes}`
      : `${pairing.heading} + ${pairing.body}`;
    select.appendChild(option);
  });

  if (
    preferredValue &&
    Array.from(select.options).some((option) => option.value === preferredValue)
  ) {
    select.value = preferredValue;
  } else {
    select.value = "";
  }

  if (DOM.createPathFontNote) {
    const typeLabel = getEventTypeCopy(selectedType).label;
    DOM.createPathFontNote.textContent = pairings.length
      ? `${
          pairings.length
        } suggested pairings ready for this ${typeLabel.toLowerCase()} theme.`
      : `No suggested pairings are set up for this theme yet.`;
  }
  renderCreatePathFontPreviewCards(pairings, themeKey);
}

function updateCreatePathAssetSummary() {
  if (!DOM.createPathAssetSummary) return;
  DOM.createPathAssetSummary.textContent = getSessionAssetSummaryText();
}

function populateCreatePathThemeSelect(preferredThemeKey) {
  if (!DOM.createPathThemeSelect) return;
  const filter = DOM.createPathThemeType
    ? DOM.createPathThemeType.value
    : "";
  const options = Array.from(
    (DOM.eventSelect && DOM.eventSelect.options) || []
  ).filter((opt) => opt && opt.value);
  const favorites = getThemeFavorites();
  const selectedTypeRaw =
    (DOM.createPathEventType && DOM.createPathEventType.value) ||
    createPathEventTypeFilter ||
    "all";
  const selectedType = normalizeEventStyle(selectedTypeRaw);
  const selectedBefore =
    preferredThemeKey || DOM.createPathThemeSelect.value || "";
  const filtered = options.filter((opt) => {
    const key = opt.value;
    const item = {
      value: key,
      theme: resolveThemeByKey(key),
    };
    if (filter && getThemeTypeForKey(key, favorites) !== filter) return false;
    if (selectedTypeRaw === "all") return true;
    return shouldIncludeCreatePathTheme(key, item.theme, selectedType);
  });
  DOM.createPathThemeSelect.innerHTML = "";
  if (!filtered.length) {
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent =
      filter === "favorite"
        ? "No favorite themes yet"
        : `No ${filter} themes found`;
    DOM.createPathThemeSelect.appendChild(empty);
    DOM.createPathThemeSelect.value = "";
    updateCreatePathFavoriteButton();
    populateCreatePathFontPairingSelect();
    updateCreatePathDetailFields("");
    return;
  }
  filtered.forEach((opt) => {
    const next = document.createElement("option");
    next.value = opt.value;
    next.textContent = opt.textContent || opt.value;
    DOM.createPathThemeSelect.appendChild(next);
  });
  const hasPreferred = filtered.some((opt) => opt.value === selectedBefore);
  DOM.createPathThemeSelect.value = hasPreferred
    ? selectedBefore
    : filtered[0].value;
  updateCreatePathFavoriteButton();
  populateCreatePathFontPairingSelect();
  const selectedTheme = resolveThemeByKey(DOM.createPathThemeSelect.value || "");
  updateCreatePathDetailFields(
    inferThemeEventStyle(DOM.createPathThemeSelect.value || "", selectedTheme)
  );
  const selectedKey = DOM.createPathThemeSelect.value || "";
  if (selectedKey && DOM.eventSelect && DOM.eventSelect.value !== selectedKey) {
    setActiveEventId("");
    setQuickStartSessionDate(getLocalIsoDate());
    setEventSelection(selectedKey);
    loadTheme(selectedKey);
    highlightThemeQuickSelect(selectedKey);
  }
  syncSessionThemeSearch();
}

function getThemeOptionLabel(key = "") {
  const options = Array.from((DOM.eventSelect && DOM.eventSelect.options) || []);
  const match = options.find((option) => option.value === key);
  if (match) return match.textContent || key;
  return getThemeSetupDisplayLabel(key, resolveThemeByKey(key));
}

const THEME_SETUP_GROUP_ORDER = [
  "General",
  "Seasonal",
  "Holidays",
  "Wedding",
  "Youth",
];

const THEME_SETUP_GROUP_ITEM_ORDER = {
  General: [
    "Basic",
    "Birthday",
    "Expo",
    "Brand Studio",
    "Lead Capture",
  ],
  Seasonal: [
    "Summer",
    "Fall",
    "Winter",
    "Winter Wonderland",
    "Santa's Workshop",
    "New Year",
    "Spring",
  ],
  Holidays: [
    "Halloween",
    "Christmas",
    "Valentine's Day",
    "St. Patrick's Day",
  ],
  Wedding: ["Garden Vows", "Timeless Romance"],
  Youth: ["Hawks", "Amanda North"],
};

const THEME_SETUP_LABEL_OVERRIDES = {
  basic: "Basic",
  birthday: "Birthday",
  summer: "Summer",
  fall: "Fall",
  winter: "Winter",
  spring: "Spring",
  expo: "Expo",
  "brand studio": "Brand Studio",
  "lead capture": "Lead Capture",
  halloween: "Halloween",
  christmas: "Christmas",
  valentines: "Valentine's Day",
  "valentine's day": "Valentine's Day",
  "st patricks day": "St. Patrick's Day",
  "st patrick s day": "St. Patrick's Day",
  "st patrick's day": "St. Patrick's Day",
  "st patricks": "St. Patrick's Day",
  "st patrick's": "St. Patrick's Day",
  "garden vows": "Garden Vows",
  "timeless romance": "Timeless Romance",
  hawks: "Hawks",
  ane: "Amanda North",
  "winter wonderland": "Winter Wonderland",
  "santa s workshop": "Santa's Workshop",
  "santa's workshop": "Santa's Workshop",
  "valentine s day": "Valentine's Day",
  "new year": "New Year",
};

function normalizeThemeSetupText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function titleCaseThemeSetupText(value = "") {
  const clean = normalizeThemeSetupText(value);
  if (!clean) return "";
  const override = THEME_SETUP_LABEL_OVERRIDES[clean];
  if (override) return override;
  return clean
    .split(" ")
    .filter(Boolean)
    .map((part) => {
      if (part === "st") return "St.";
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function getThemeSetupDisplayLabel(themeKey, theme) {
  const normalizedKey = normalizeThemeSetupText(themeKey);
  const normalizedName = normalizeThemeSetupText(theme && theme.name);
  const normalizedText = [normalizedKey, normalizedName].filter(Boolean).join(" ");
  const directOverride =
    THEME_SETUP_LABEL_OVERRIDES[normalizedKey] ||
    THEME_SETUP_LABEL_OVERRIDES[normalizedName] ||
    THEME_SETUP_LABEL_OVERRIDES[normalizedText];
  if (directOverride) return directOverride;
  return titleCaseThemeSetupText((theme && theme.name) || themeKey || "");
}

function getThemeSetupDisplayGroup(themeKey, theme) {
  const normalized = [
    normalizeThemeSetupText(themeKey),
    normalizeThemeSetupText(getThemeSetupDisplayLabel(themeKey, theme)),
    normalizeThemeSetupText(theme && theme.category),
  ]
    .filter(Boolean)
    .join(" ");
  if (/(hawks|amanda north|ane)/.test(normalized)) return "Youth";
  if (/(garden vows|timeless romance|wedding)/.test(normalized)) return "Wedding";
  if (/(halloween|christmas|valentine|st patrick)/.test(normalized)) return "Holidays";
  if (
    /(summer|fall|winter|spring|winter wonderland|santa s workshop|new year)/.test(
      normalized
    )
  ) {
    return "Seasonal";
  }
  return "General";
}

function getThemeSetupGroupIndex(group) {
  const index = THEME_SETUP_GROUP_ORDER.indexOf(group);
  return index === -1 ? THEME_SETUP_GROUP_ORDER.length : index;
}

function getThemeSetupItemIndex(group, label) {
  const items = THEME_SETUP_GROUP_ITEM_ORDER[group] || [];
  const index = items.indexOf(label);
  return index === -1 ? items.length : index;
}

function getSetupThemeEntries(filter = "") {
  const needle = normalizeThemeSetupText(filter);
  return getSelectableThemeEntries()
    .map((entry) => {
      const label = getThemeSetupDisplayLabel(entry.key, entry.theme);
      const group = getThemeSetupDisplayGroup(entry.key, entry.theme);
      return { ...entry, label, group };
    })
    .filter((entry) => {
      if (!needle) return true;
      return normalizeThemeSetupText([entry.group, entry.label, entry.key].join(" "))
        .includes(needle);
    })
    .sort((a, b) => {
      const groupDiff =
        getThemeSetupGroupIndex(a.group) - getThemeSetupGroupIndex(b.group);
      if (groupDiff !== 0) return groupDiff;
      const itemDiff =
        getThemeSetupItemIndex(a.group, a.label) -
        getThemeSetupItemIndex(b.group, b.label);
      if (itemDiff !== 0) return itemDiff;
      return a.label.localeCompare(b.label);
    });
}

function getSessionThemeOptions(filter = "") {
  const needle = String(filter || "").trim().toLowerCase();
  return Array.from((DOM.eventSelect && DOM.eventSelect.options) || []).filter(
    (option) => {
      if (!option || !option.value) return false;
      if (!needle) return true;
      return (
        String(option.textContent || "").toLowerCase().includes(needle) ||
        String(option.value || "").toLowerCase().includes(needle)
      );
    }
  );
}

function renderSessionThemeOptions(filter = "") {
  if (DOM.sessionThemeOptions && DOM.eventSelect) {
    DOM.sessionThemeOptions.innerHTML = "";
    const selectedKey =
      (DOM.createPathThemeSelect && DOM.createPathThemeSelect.value) ||
      (DOM.eventSelect && DOM.eventSelect.value) ||
      "";
    const entries = getSetupThemeEntries(filter);
    const groupedEntries = new Map();
    entries.forEach((entry) => {
      if (!groupedEntries.has(entry.group)) groupedEntries.set(entry.group, []);
      groupedEntries.get(entry.group).push(entry);
    });
    const orderedGroups = THEME_SETUP_GROUP_ORDER.filter((group) =>
      groupedEntries.has(group)
    ).concat(
      Array.from(groupedEntries.keys()).filter(
        (group) => !THEME_SETUP_GROUP_ORDER.includes(group)
      )
    );
    orderedGroups.forEach((groupName) => {
      const groupEntries = groupedEntries.get(groupName);
      if (!groupEntries || !groupEntries.length) return;
      const group = document.createElement("div");
      group.className = "setup-combobox-group";
      const title = document.createElement("div");
      title.className = "setup-combobox-group-title";
      title.textContent = groupName;
      title.setAttribute("role", "presentation");
      title.setAttribute("aria-hidden", "true");
      const list = document.createElement("div");
      list.className = "setup-combobox-group-options";
      groupEntries.forEach((entry) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "setup-combobox-option";
        item.textContent = entry.label;
        item.dataset.themeKey = entry.key;
        item.dataset.themeGroup = entry.group;
        item.setAttribute("role", "option");
        item.setAttribute(
          "aria-selected",
          entry.key === selectedKey ? "true" : "false"
        );
        item.addEventListener("click", () =>
          activateThemeFromSetupKey(entry.key)
        );
        list.appendChild(item);
      });
      group.appendChild(title);
      group.appendChild(list);
      DOM.sessionThemeOptions.appendChild(group);
    });
    if (!entries.length) {
      const empty = document.createElement("div");
      empty.className = "setup-combobox-empty";
      empty.textContent = "No themes found";
      DOM.sessionThemeOptions.appendChild(empty);
    }
  }
}

function syncSessionThemeSearch() {
  renderSessionThemeOptions();
  const key =
    (DOM.createPathThemeSelect && DOM.createPathThemeSelect.value) ||
    (DOM.eventSelect && DOM.eventSelect.value) ||
    "";
  if (DOM.sessionThemeValue)
    DOM.sessionThemeValue.textContent = getThemeOptionLabel(key) || "Choose theme";
  if (DOM.sessionThemeSearch) DOM.sessionThemeSearch.value = "";
}

function resolveThemeKeyFromSearchValue(value = "") {
  const needle = String(value || "").trim().toLowerCase();
  if (!needle || !DOM.eventSelect) return "";
  const options = Array.from(DOM.eventSelect.options || []);
  const byLabel = options.find(
    (option) => String(option.textContent || "").trim().toLowerCase() === needle
  );
  if (byLabel) return byLabel.value;
  const byValue = options.find(
    (option) => String(option.value || "").trim().toLowerCase() === needle
  );
  return byValue ? byValue.value : "";
}

function activateThemeFromSetupSearch() {
  const key = resolveThemeKeyFromSearchValue(
    DOM.sessionThemeSearch ? DOM.sessionThemeSearch.value : ""
  );
  activateThemeFromSetupKey(key);
}

function activateThemeFromSetupKey(key) {
  if (!key) return;
  disableShowcaseDemo();
  setActiveEventId("");
  setQuickStartSessionDate(getLocalIsoDate());
  setEventSelection(key);
  if (DOM.createPathThemeSelect) DOM.createPathThemeSelect.value = key;
  loadTheme(key);
  populateCreatePathFontPairingSelect();
  updateLaunchSummary();
  closeSetupCombobox("theme");
}

function getSetupComboboxParts(kind) {
  if (kind === "theme") {
    return {
      toggle: DOM.sessionThemeToggle,
      menu: DOM.sessionThemeMenu,
      search: DOM.sessionThemeSearch,
      render: renderSessionThemeOptions,
    };
  }
  if (kind === "font") {
    return {
      toggle: DOM.sessionFontToggle,
      menu: DOM.sessionFontMenu,
      search: DOM.sessionFontSearch,
      render: renderSessionFontOptions,
    };
  }
  return {};
}

function closeSetupCombobox(kind) {
  const parts = getSetupComboboxParts(kind);
  if (!parts.menu) return;
  parts.menu.classList.add("hidden");
  if (parts.toggle) parts.toggle.setAttribute("aria-expanded", "false");
  if (parts.search) parts.search.value = "";
}

function openSetupCombobox(kind) {
  ["theme", "font"].forEach((name) => {
    if (name !== kind) closeSetupCombobox(name);
  });
  const parts = getSetupComboboxParts(kind);
  if (!parts.menu) return;
  if (typeof parts.render === "function") parts.render("");
  parts.menu.classList.remove("hidden");
  if (parts.toggle) parts.toggle.setAttribute("aria-expanded", "true");
  if (parts.search) {
    parts.search.value = "";
    requestAnimationFrame(() => parts.search.focus());
  }
}

function toggleSetupCombobox(kind) {
  const parts = getSetupComboboxParts(kind);
  if (!parts.menu) return;
  if (parts.menu.classList.contains("hidden")) openSetupCombobox(kind);
  else closeSetupCombobox(kind);
}

function selectFirstVisibleComboboxOption(kind) {
  const parts = getSetupComboboxParts(kind);
  if (!parts.menu) return;
  const option = parts.menu.querySelector(".setup-combobox-option");
  if (option) option.click();
}

function syncCreatePathFilterCards() {
  const selected =
    (DOM.createPathEventType && DOM.createPathEventType.value) ||
    createPathEventTypeFilter ||
    "all";
  document.querySelectorAll("[data-theme-filter-card]").forEach((button) => {
    const active = button.dataset.themeFilterCard === selected;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function setCreatePathThemeFilter(value = "all") {
  const next = value || "all";
  createPathEventTypeFilter = next;
  if (DOM.createPathEventType) DOM.createPathEventType.value = next;
  syncCreatePathFilterCards();
  populateCreatePathThemeSelect();
  populateCreatePathFontPairingSelect();
}

function getCreatePathAssetInputs() {
  return [
    DOM.createPathBackgrounds,
    DOM.createPathGreenBackgrounds,
    DOM.createPathOverlays,
    DOM.createPathTemplates,
    DOM.createPathLogo,
  ].filter(Boolean);
}

function resetCreatePathAssetInputs() {
  getCreatePathAssetInputs().forEach((input) => {
    input.value = "";
  });
  updateCreatePathAssetSummary();
}

function resetActiveSessionAssets() {
  activeSessionAssets = createEmptySessionAssets();
  activeSessionThemeKey = "";
  sessionRemovedBackgrounds = [];
  sessionRemovedOverlays = [];
  sessionRemovedTemplates = [];
}

function getSessionAssetUploadOptions(kind = "") {
  const base = getEventFolderBase();
  const date = getDateSessionSlug();
  const cleanKind = (kind || "misc").toString().replace(/^\/+|\/+$/g, "");
  return { folder: `${buildDateSessionFolderPath({ base, date })}/${cleanKind}` };
}

function addSessionAssetUrl(kind, url) {
  if (!url) return false;
  if (kind === "templates") {
    clearSessionRemovedAsset("template", url);
    const exists = activeSessionAssets.templates.some(
      (item) => getAssetEntrySrc(item) === url
    );
    if (!exists) activeSessionAssets.templates.push({ src: url, layout: "double_column" });
    return true;
  }
  if (kind === "overlays") {
    clearSessionRemovedAsset("overlay", url);
    const exists = activeSessionAssets.overlays.some(
      (item) => getAssetEntrySrc(item) === url
    );
    if (!exists) activeSessionAssets.overlays.push(url);
    return true;
  }
  if (kind === "backgrounds") {
    clearSessionRemovedAsset("background", url);
    activeSessionAssets.backgrounds = [url];
    activeSessionAssets.backgroundIndex = 0;
    return true;
  }
  if (kind === "greenBackgrounds") {
    activeSessionAssets.greenBackgrounds.push(url);
    return true;
  }
  if (kind === "logo") {
    activeSessionAssets.logo = url;
    return true;
  }
  return false;
}

function selectSessionBackground(src) {
  if (!src) return;
  clearSessionRemovedAsset("background", src);
  activeSessionAssets.backgrounds = [src];
  activeSessionAssets.backgroundIndex = 0;
  applyThemeBackground(activeTheme);
  renderCurrentAssets(activeTheme);
  updateCreatePathAssetSummary();
  updateLaunchSummary();
  showToast("Session background selected");
}

function selectSessionOverlay(entry) {
  const normalized = normalizeOverlayDefinition(entry);
  const src = normalized && normalized.src ? normalized.src : "";
  if (!src) return;
  clearSessionRemovedAsset("overlay", src);
  if (!Array.isArray(activeSessionAssets.overlays)) {
    activeSessionAssets.overlays = [];
  }
  const exists = activeSessionAssets.overlays.some(
    (item) => (typeof item === "string" ? item : item && item.src) === src
  );
  if (!exists) activeSessionAssets.overlays.unshift(normalized);
  selectedOverlay = src;
  lastPhotoOverlay = src;
  lastPhotoOverlayByOrientation[photoOverlayOrientation] = src;
  renderOptions();
  syncOverlayPreviewSurface({ mode: "live" });
  renderCurrentAssets(activeTheme);
  updateCreatePathAssetSummary();
  updateLaunchSummary();
  showToast("Session overlay selected");
}

function getSessionAssetSummaryText() {
  const summary = describeAssetSummaryCounts({
    backgrounds: activeSessionAssets.backgrounds.length,
    greenBackgrounds: activeSessionAssets.greenBackgrounds.length,
    overlays: activeSessionAssets.overlays.length,
    templates: activeSessionAssets.templates.length,
    hasLogo: !!activeSessionAssets.logo,
  });
  return summary === "none" ? "No session assets selected yet." : `Session assets: ${summary}`;
}

async function uploadCreatePathSessionAssets(kind, fileList) {
  const files = Array.from(fileList || []).filter(Boolean);
  if (!files.length) {
    updateCreatePathAssetSummary();
    return;
  }
  const tasks = files.map(async (file) => {
    const url = await uploadAsset(file, kind, getSessionAssetUploadOptions(kind));
    return addSessionAssetUrl(kind, url);
  });
  const results = await Promise.all(tasks);
  const uploaded = results.filter(Boolean).length;
  if (uploaded) {
    renderCurrentAssets(activeTheme || getSelectedThemeTarget());
    renderOptions();
    updateCurrentEventAssetsPanel(activeTheme || getSelectedThemeTarget());
    updateLaunchSummary();
    showToast(`Added ${uploaded} session asset${uploaded === 1 ? "" : "s"}.`);
  }
  updateCreatePathAssetSummary();
}

function prepareThemeSessionFromSetup() {
  disableShowcaseDemo();
  setActiveEventId("");
  setQuickStartSessionDate(getLocalIsoDate());
  const key =
    (DOM.createPathThemeSelect && DOM.createPathThemeSelect.value) ||
    (DOM.eventSelect && DOM.eventSelect.value) ||
    DEFAULT_THEME_KEY;
  const resolved = resolvePreferredThemeKey(key);
  if (!resolved) return false;
  if (DOM.eventProfileSelect) DOM.eventProfileSelect.value = "";
  setEventSelection(resolved);
  loadTheme(resolved);
  syncEventInputsFromActive();
  updateEventOverridesSummary();
  updateStylePreview();
  updateLaunchSummary();
  return true;
}

const CREATE_PATH_VALIDATION_FIELDS = {
  name: () => DOM.createPathEventName,
  themeKey: () => DOM.createPathThemeSelect,
  partner1: () => DOM.createPathPartner1,
  partner2: () => DOM.createPathPartner2,
  birthdayName: () => DOM.createPathBirthdayName,
  date: () => DOM.createPathEventDate,
  expoCompany: () => DOM.createPathExpoCompany,
};

function setCreatePathFieldInvalid(field, invalid) {
  if (!field) return;
  if (invalid) {
    field.setAttribute("aria-invalid", "true");
    field.style.borderColor = "#d74b6a";
    field.style.boxShadow = "0 0 0 3px rgba(215, 75, 106, 0.15)";
    return;
  }
  field.removeAttribute("aria-invalid");
  field.style.borderColor = "";
  field.style.boxShadow = "";
}

function clearCreatePathValidation() {
  Object.values(CREATE_PATH_VALIDATION_FIELDS).forEach((getField) => {
    setCreatePathFieldInvalid(getField(), false);
  });
  if (DOM.createPathValidationMessage) {
    DOM.createPathValidationMessage.textContent = "";
    DOM.createPathValidationMessage.classList.add("hidden");
  }
}

function showCreatePathValidation(message, fieldKeys = []) {
  clearCreatePathValidation();
  if (DOM.createPathValidationMessage) {
    DOM.createPathValidationMessage.textContent = message;
    DOM.createPathValidationMessage.classList.remove("hidden");
  }
  const invalidFields = fieldKeys
    .map((key) =>
      Object.prototype.hasOwnProperty.call(CREATE_PATH_VALIDATION_FIELDS, key)
        ? CREATE_PATH_VALIDATION_FIELDS[key]()
        : null
    )
    .filter(Boolean);
  invalidFields.forEach((field) => {
    setCreatePathFieldInvalid(field, true);
  });
  if (invalidFields[0]) invalidFields[0].focus();
}

function readCreatePathEventDetails() {
  return {
    name: valueFromInput(DOM.createPathEventName),
    themeKey: DOM.createPathThemeSelect ? DOM.createPathThemeSelect.value : "",
    date: valueFromInput(DOM.createPathEventDate),
    partner1: valueFromInput(DOM.createPathPartner1),
    partner2: valueFromInput(DOM.createPathPartner2),
    birthdayName: valueFromInput(DOM.createPathBirthdayName),
    expoCompany: valueFromInput(DOM.createPathExpoCompany),
    pairingValue: DOM.createPathFontPairingSelect
      ? DOM.createPathFontPairingSelect.value
      : "",
  };
}

function resetCreatePathForm() {
  clearCreatePathValidation();
  [
    DOM.createPathEventName,
    DOM.createPathPartner1,
    DOM.createPathPartner2,
    DOM.createPathBirthdayName,
    DOM.createPathEventDate,
    DOM.createPathExpoCompany,
    DOM.createPathFontPairingSelect,
  ]
    .filter(Boolean)
    .forEach((input) => {
      input.value = "";
    });
  resetCreatePathAssetInputs();
}

function updateCreatePathDetailFields(style = "") {
  const selectedFilter = normalizeEventStyle(
    (DOM.createPathEventType && DOM.createPathEventType.value) ||
      createPathEventTypeFilter ||
      ""
  );
  const inferredStyle = normalizeEventStyle(style);
  const normalized =
    [inferredStyle, selectedFilter].find(
      (value) => value && value !== "general"
    ) || inferredStyle || selectedFilter || "general";
  if (DOM.createPathWeddingFields) {
    DOM.createPathWeddingFields.classList.add("hidden");
    DOM.createPathWeddingFields.setAttribute("aria-hidden", "true");
  }
  if (DOM.createPathBirthdayFields) {
    DOM.createPathBirthdayFields.classList.add("hidden");
    DOM.createPathBirthdayFields.setAttribute("aria-hidden", "true");
  }
  if (DOM.createPathExpoFields) {
    DOM.createPathExpoFields.classList.add("hidden");
    DOM.createPathExpoFields.setAttribute("aria-hidden", "true");
  }
  if (DOM.createPathDateFields) {
    DOM.createPathDateFields.classList.add("hidden");
    DOM.createPathDateFields.setAttribute("aria-hidden", "true");
  }
}

async function addCreatePathAssetsToEvent(event) {
  if (!event) return;
  const overrides = ensureEventOverrides(event);
  const tasks = [];
  const queueUploads = (files, kind, onComplete) => {
    Array.from(files || [])
      .filter(Boolean)
      .forEach((file) => {
        tasks.push(
          uploadAsset(file, kind, getEventAssetUploadOptions(event, kind)).then(
            (url) => {
              if (!url) return;
              onComplete(url);
            }
          )
        );
      });
  };

  queueUploads(
    DOM.createPathBackgrounds && DOM.createPathBackgrounds.files,
    "backgrounds",
    (url) => {
      overrides.backgrounds.push(url);
    }
  );
  queueUploads(
    DOM.createPathGreenBackgrounds && DOM.createPathGreenBackgrounds.files,
    "greenBackgrounds",
    (url) => {
      overrides.greenBackgrounds.push(url);
    }
  );
  queueUploads(
    DOM.createPathOverlays && DOM.createPathOverlays.files,
    "overlays",
    (url) => {
      overrides.overlays.push(url);
    }
  );
  queueUploads(
    DOM.createPathTemplates && DOM.createPathTemplates.files,
    "templates",
    (url) => {
      overrides.templates.push({ src: url, layout: "double_column" });
    }
  );
  queueUploads(
    DOM.createPathLogo && DOM.createPathLogo.files,
    "logo",
    (url) => {
      event.logo = url;
    }
  );

  if (tasks.length) await Promise.all(tasks);
}

function buildCreatePathEvent(theme, details, eventType) {
  const [fontHeading = "", fontBody = ""] = details.pairingValue
    ? details.pairingValue.split("|")
    : ["", ""];
  const slug = slugifyEventText(details.name);
  const id = `${slug || "event"}-${Date.now().toString(36)}`;

  return buildEventFromThemeDefaults(theme, {
    id,
    name: details.name,
    date: details.date,
    eventType,
    themeKey: details.themeKey,
    fontHeading,
    fontBody,
    partner1: details.partner1,
    partner2: details.partner2,
    birthdayName: details.birthdayName,
    expoCompany: details.expoCompany,
    createdAt: new Date().toISOString(),
  });
}

async function createEventFromPathInputs() {
  clearCreatePathValidation();
  const details = readCreatePathEventDetails();
  if (!details.name) {
    showCreatePathValidation("Enter an event name.", ["name"]);
    return false;
  }
  if (!details.themeKey) {
    showCreatePathValidation("Choose a theme.", ["themeKey"]);
    return false;
  }
  const theme = resolveThemeByKey(details.themeKey);
  if (!theme) {
    showCreatePathValidation("Theme not found.", ["themeKey"]);
    return false;
  }
  const eventType = inferThemeEventStyle(details.themeKey, theme);
  const detailValidation = validateCreatePathEventDetails(eventType, details);
  if (!detailValidation.ok) {
    showCreatePathValidation(detailValidation.message, detailValidation.fields);
    return false;
  }
  const newEvent = buildCreatePathEvent(theme, details, eventType);
  await addCreatePathAssetsToEvent(newEvent);
  const events = getStoredEvents();
  events.push(newEvent);
  setStoredEvents(events);
  setActiveEventId(newEvent.id);
  populateEventProfileSelect(newEvent.id);
  if (DOM.eventProfileSelect) DOM.eventProfileSelect.value = newEvent.id;
  setEventSelection(details.themeKey);
  loadTheme(details.themeKey);
  syncEventInputsFromActive();
  updateStylePreview();
  resetCreatePathForm();
  showToast(`Event "${details.name}" created`);
  return true;
}

function quickStartThemeOnly(preferredThemeKey = "") {
  disableShowcaseDemo();
  const preferred =
    preferredThemeKey ||
    getLastThemeKey() ||
    (DOM.eventSelect && DOM.eventSelect.value) ||
    DEFAULT_THEME_KEY;
  const themeKey = resolvePreferredThemeKey(preferred);
  if (!themeKey) return;
  setActiveEventId("");
  if (DOM.eventProfileSelect) DOM.eventProfileSelect.value = "";
  setEventSelection(themeKey);
  setQuickStartSessionDate(getLocalIsoDate());
  loadTheme(themeKey);
  syncEventInputsFromActive();
  updateEventOverridesSummary();
  updateStylePreview();
  showToast("Quick start ready.");
  startBooth({ preserveSession: true });
}

function populateQuickStartThemeSelect() {
  if (!DOM.quickStartThemeSelect) return;
  const options = Array.from(
    (DOM.eventSelect && DOM.eventSelect.options) || []
  ).filter((opt) => opt && opt.value);
  DOM.quickStartThemeSelect.innerHTML = "";
  options.forEach((opt) => {
    const next = document.createElement("option");
    next.value = opt.value;
    next.textContent = opt.textContent || opt.value;
    DOM.quickStartThemeSelect.appendChild(next);
  });
  const preferred =
    getLastThemeKey() ||
    (DOM.eventSelect && DOM.eventSelect.value) ||
    DEFAULT_THEME_KEY;
  const resolved = resolvePreferredThemeKey(preferred);
  if (resolved) DOM.quickStartThemeSelect.value = resolved;
}

function showQuickStartModal() {
  populateQuickStartThemeSelect();
  if (DOM.quickStartModal) DOM.quickStartModal.classList.add("show");
  if (DOM.quickStartThemeSelect) DOM.quickStartThemeSelect.focus();
}

function hideQuickStartModal() {
  if (DOM.quickStartModal) DOM.quickStartModal.classList.remove("show");
}

function confirmQuickStartFromModal() {
  const selected = DOM.quickStartThemeSelect
    ? DOM.quickStartThemeSelect.value
    : "";
  hideQuickStartModal();
  quickStartThemeOnly(selected);
}

function setupEventProfileControls() {
  const focusCurrentEventSetup = () => {
    if (DOM.currentAssetsSection) DOM.currentAssetsSection.open = true;
    if (
      DOM.currentAssetsSection &&
      typeof DOM.currentAssetsSection.scrollIntoView === "function"
    ) {
      DOM.currentAssetsSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };
  const setEventSetupPath = (path) => {
    const showCreate = path === "create";
    const showSelect = path === "select";
    if (DOM.eventPathCreatePanel)
      DOM.eventPathCreatePanel.classList.toggle("hidden", !showCreate);
    if (DOM.eventPathSelectPanel)
      DOM.eventPathSelectPanel.classList.toggle("hidden", !showSelect);
    if (DOM.eventPathCreateBtn) {
      DOM.eventPathCreateBtn.classList.toggle("primary", showCreate);
      DOM.eventPathCreateBtn.setAttribute(
        "aria-pressed",
        showCreate ? "true" : "false"
      );
    }
    if (DOM.eventPathSelectBtn) {
      DOM.eventPathSelectBtn.classList.toggle("primary", showSelect);
      DOM.eventPathSelectBtn.setAttribute(
        "aria-pressed",
        showSelect ? "true" : "false"
      );
    }
  };
  setEventSetupPath("create");
  if (DOM.eventPathCreateBtn) {
    DOM.eventPathCreateBtn.addEventListener("click", () => {
      disableShowcaseDemo();
      setEventSetupPath("create");
      populateCreatePathThemeSelect(
        (DOM.eventSelect && DOM.eventSelect.value) || ""
      );
    });
  }
  if (DOM.eventPathSelectBtn) {
    DOM.eventPathSelectBtn.addEventListener("click", () => {
      disableShowcaseDemo();
      setEventSetupPath("select");
    });
  }
  if (DOM.chooseEventBtn) {
    DOM.chooseEventBtn.addEventListener("click", () => {
      const active = getActiveEvent();
      if (!active) {
        alert("Choose an event first.");
        return;
      }
      focusCurrentEventSetup();
    });
  }
  if (DOM.createEventBtn) {
    DOM.createEventBtn.addEventListener("click", () => {
      setEventSetupPath("create");
      if (prepareThemeSessionFromSetup()) {
        showToast("Theme session ready.");
      }
    });
  }
  [
    DOM.createPathEventName,
    DOM.createPathThemeSelect,
    DOM.createPathPartner1,
    DOM.createPathPartner2,
    DOM.createPathBirthdayName,
    DOM.createPathEventDate,
    DOM.createPathExpoCompany,
  ]
    .filter(Boolean)
    .forEach((input) => {
      input.addEventListener("input", clearCreatePathValidation);
      input.addEventListener("change", clearCreatePathValidation);
    });
  if (DOM.quickStartBtn) {
    DOM.quickStartBtn.addEventListener("click", () => {
      startShowcaseDemo();
    });
  }
  if (DOM.quickStartCancel)
    DOM.quickStartCancel.addEventListener("click", hideQuickStartModal);
  if (DOM.quickStartConfirm) {
    DOM.quickStartConfirm.addEventListener("click", confirmQuickStartFromModal);
  }
  if (DOM.quickStartModal) {
    DOM.quickStartModal.addEventListener("click", (event) => {
      if (event.target === DOM.quickStartModal) hideQuickStartModal();
    });
    DOM.quickStartModal.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      confirmQuickStartFromModal();
    });
  }
  if (DOM.createPathThemeType) {
    const initialType = DOM.createPathThemeType.value || "favorite";
    DOM.createPathThemeType.value = initialType;
    DOM.createPathThemeType.addEventListener("change", () => {
      populateCreatePathThemeSelect();
    });
  }
  if (DOM.createPathEventType) {
    DOM.createPathEventType.value = "all";
    DOM.createPathEventType.addEventListener("change", () => {
      setCreatePathThemeFilter(
        DOM.createPathEventType.value || createPathEventTypeFilter || "all"
      );
    });
  }
  document.querySelectorAll("[data-theme-filter-card]").forEach((button) => {
    button.addEventListener("click", () => {
      setCreatePathThemeFilter(button.dataset.themeFilterCard || "all");
    });
  });
  syncCreatePathFilterCards();
  if (DOM.createPathThemeSelect) {
    DOM.createPathThemeSelect.addEventListener("change", () => {
      disableShowcaseDemo();
      updateCreatePathFavoriteButton();
      const key = DOM.createPathThemeSelect.value || "";
      const theme = resolveThemeByKey(key);
      const style = inferThemeEventStyle(key, theme);
      updateCreatePathDetailFields(style);
      populateCreatePathFontPairingSelect();
      if (!key) return;
      setActiveEventId("");
      setQuickStartSessionDate(getLocalIsoDate());
      if (DOM.eventSelect) DOM.eventSelect.value = key;
      loadTheme(key);
      highlightThemeQuickSelect(key);
    });
  }
  if (DOM.sessionThemeToggle) {
    DOM.sessionThemeToggle.addEventListener("click", () =>
      toggleSetupCombobox("theme")
    );
  }
  if (DOM.sessionThemeSearch) {
    DOM.sessionThemeSearch.addEventListener("input", () =>
      renderSessionThemeOptions(DOM.sessionThemeSearch.value)
    );
    DOM.sessionThemeSearch.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        disableShowcaseDemo();
        selectFirstVisibleComboboxOption("theme");
      } else if (event.key === "Escape") {
        closeSetupCombobox("theme");
      }
    });
  }
  if (DOM.sessionFontToggle) {
    DOM.sessionFontToggle.addEventListener("click", () =>
      toggleSetupCombobox("font")
    );
  }
  if (DOM.sessionFontSearch) {
    DOM.sessionFontSearch.addEventListener("input", () =>
      renderSessionFontOptions(DOM.sessionFontSearch.value)
    );
    DOM.sessionFontSearch.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        selectFirstVisibleComboboxOption("font");
      } else if (event.key === "Escape") {
        closeSetupCombobox("font");
      }
    });
  }
  document.addEventListener("click", (event) => {
    if (
      !event.target.closest("[data-setup-combobox=\"theme\"]") &&
      !event.target.closest("[data-setup-combobox=\"font\"]")
    ) {
      closeSetupCombobox("theme");
      closeSetupCombobox("font");
    }
  });
  const sessionAssetInputs = [
    [DOM.createPathBackgrounds, "backgrounds"],
    [DOM.createPathGreenBackgrounds, "greenBackgrounds"],
    [DOM.createPathOverlays, "overlays"],
    [DOM.createPathTemplates, "templates"],
    [DOM.createPathLogo, "logo"],
  ];
  sessionAssetInputs.forEach(([input, kind]) => {
    if (!input) return;
    input.addEventListener("change", () => {
      uploadCreatePathSessionAssets(kind, input.files).catch((err) => {
        console.error("Session asset upload failed", err);
        updateCreatePathAssetSummary();
      });
    });
  });
  document.querySelectorAll("[data-demo-theme]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (applyShowcaseDemoTheme(button.dataset.demoTheme)) {
        showToast(`${button.textContent} ready.`);
        showWelcome("idle");
      }
    });
  });
  document.querySelectorAll("[data-welcome-mode]").forEach((button) => {
    button.addEventListener("click", (event) => {
      beginModeSelection(button.dataset.welcomeMode, event);
    });
  });
  if (DOM.createPathFontPairingSelect) {
    DOM.createPathFontPairingSelect.addEventListener("change", () => {
      renderCreatePathFontPreviewCards(
        getSuggestedPairingsForEventType(
          inferThemeEventStyle(
            DOM.createPathThemeSelect ? DOM.createPathThemeSelect.value : "",
            resolveThemeByKey(
              DOM.createPathThemeSelect ? DOM.createPathThemeSelect.value : ""
            )
          ),
          5
        ),
        DOM.createPathThemeSelect ? DOM.createPathThemeSelect.value : ""
      );
    });
  }
  if (DOM.toggleThemeFavoriteBtn) {
    DOM.toggleThemeFavoriteBtn.addEventListener("click", () => {
      if (!DOM.createPathThemeSelect) return;
      const key = DOM.createPathThemeSelect.value || "";
      if (!key) return;
      const favorites = getThemeFavorites();
      if (favorites.has(key)) favorites.delete(key);
      else favorites.add(key);
      setThemeFavorites(favorites);
      const currentFilter = DOM.createPathThemeType
        ? DOM.createPathThemeType.value
        : "favorite";
      const preferred = currentFilter === "favorite" ? "" : key;
      populateCreatePathThemeSelect(preferred);
      updateCreatePathFavoriteButton();
    });
  }
  populateCreatePathThemeSelect(
    (DOM.eventSelect && DOM.eventSelect.value) || ""
  );
  populateCreatePathFontPairingSelect();
  syncSessionThemeSearch();
  syncSessionFontSearch();
  updateCreatePathAssetSummary();
  if (DOM.eventProfileSelect) {
    DOM.eventProfileSelect.addEventListener("change", (event) => {
      disableShowcaseDemo();
      setEventSetupPath("select");
      const id = event.target.value || "";
      setActiveEventId(id);
      syncEventInputsFromActive();
      const active = getActiveEvent();
      if (active && active.themeKey) {
        setEventSelection(active.themeKey);
        loadTheme(active.themeKey);
      }
      updateStylePreview();
    });
  }
}

function handleEventSelectChange(event) {
  disableShowcaseDemo();
  const key = event.target.value;
  loadTheme(key);
  highlightThemeQuickSelect(key);
  syncThemeEditorWithActiveTheme();
  if (getActiveEvent()) {
    updateActiveEventDetails({ themeKey: key });
  }
  if (DOM.eventNameInput) {
    const active = getActiveEvent();
    DOM.eventNameInput.value =
      (active && active.name) || getStoredEventName(key) || "";
  }
  updateThemeEditorSummary();
  updateLaunchSummary();
}

function openBoothLaunchConfirm() {
  const modal = document.getElementById("launchConfirmModal");
  if (modal) modal.style.display = "flex";
  updateLaunchSummary();
}

function closeBoothLaunchConfirm() {
  const modal = document.getElementById("launchConfirmModal");
  if (modal) modal.style.display = "none";
}

function confirmBoothLaunch() {
  closeBoothLaunchConfirm();
  startBooth();
}

function setupBoothButtons() {
  const startCameraBtn = document.getElementById("startCameraButton");
  if (startCameraBtn) startCameraBtn.addEventListener("click", startCamera);
  else console.warn("Start Camera button not found in DOM.");

  const startBoothBtn = document.getElementById("startBoothButton");
  if (startBoothBtn) {
    startBoothBtn.addEventListener("click", startBooth);
  }
  else console.warn("Start Booth button not found in DOM.");

  if (DOM.launchConfirmCancel) {
    DOM.launchConfirmCancel.addEventListener("click", closeBoothLaunchConfirm);
  }
  if (DOM.launchConfirmStart) {
    DOM.launchConfirmStart.addEventListener("click", confirmBoothLaunch);
  }
  if (DOM.launchConfirmModal) {
    DOM.launchConfirmModal.addEventListener("click", (event) => {
      if (event.target === DOM.launchConfirmModal) {
        closeBoothLaunchConfirm();
      }
    });
  }
  if (DOM.launchModeSingleBtn) {
    DOM.launchModeSingleBtn.addEventListener("click", () =>
      setSetupLaunchMode("single_photo")
    );
  }
  if (DOM.launchModeStripBtn) {
    DOM.launchModeStripBtn.addEventListener("click", () =>
      setSetupLaunchMode("strip")
    );
  }
}

function setupMobileSettingsControls() {
  if (DOM.mobileSettingsToggle) {
    DOM.mobileSettingsToggle.addEventListener("click", () => {
      const isOpen = !!(
        DOM.boothScreen &&
        DOM.boothScreen.classList.contains("mobile-settings-open")
      );
      setMobileSettingsOpen(!isOpen);
    });
  }
  if (DOM.mobileSettingsClose) {
    DOM.mobileSettingsClose.addEventListener("click", () =>
      setMobileSettingsOpen(false)
    );
  }
  if (DOM.mobileSettingsBackdrop) {
    DOM.mobileSettingsBackdrop.addEventListener("click", () =>
      setMobileSettingsOpen(false)
    );
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setMobileSettingsOpen(false);
    }
  });
}

function setupVideoListeners() {
  if (DOM.video) {
    DOM.video.addEventListener("loadedmetadata", () => {
      updateCaptureAspect();
      applyPreviewOrientation();
    });
  }
}

function setupFinalPreviewListeners() {
  if (!DOM.finalPreview || !DOM.finalPreviewContent) return;
  DOM.finalPreview.addEventListener("click", () => exitFinalPreview());
}

function setupThemeEditorControls() {
  if (DOM.themeEditorCloseBtn)
    DOM.themeEditorCloseBtn.addEventListener("click", closeAdminModal);
  if (DOM.themeEditorModeSelect)
    DOM.themeEditorModeSelect.addEventListener("change", (e) =>
      setThemeEditorMode(e.target.value)
    );
  document.querySelectorAll("[data-event-type-tile]").forEach((button) => {
    button.addEventListener("click", () => {
      setSelectedEventType(button.dataset.eventTypeTile || "general");
    });
  });
  if (DOM.fontEventStyleSelect) {
    DOM.fontEventStyleSelect.addEventListener("change", () => {
      syncEventTypeTiles();
      populateThemeSelector((DOM.eventSelect && DOM.eventSelect.value) || "");
      updateEventTypeSetupUI();
    });
  }
  if (DOM.openFontLibraryBtn)
    DOM.openFontLibraryBtn.addEventListener("click", showFontPickerModal);
  if (DOM.editorHeadingFontSelect) {
    DOM.editorHeadingFontSelect.addEventListener("change", () => {
      if (ignoreFontPickerEvents) return;
      const heading = DOM.editorHeadingFontSelect.value;
      const body =
        DOM.editorBodyFontSelect && DOM.editorBodyFontSelect.value
          ? DOM.editorBodyFontSelect.value
          : heading;
      applyFontSelection(heading, body, { keepPairing: false });
    });
  }
  if (DOM.editorBodyFontSelect) {
    DOM.editorBodyFontSelect.addEventListener("change", () => {
      if (ignoreFontPickerEvents) return;
      const body = DOM.editorBodyFontSelect.value;
      const heading =
        DOM.editorHeadingFontSelect && DOM.editorHeadingFontSelect.value
          ? DOM.editorHeadingFontSelect.value
          : body;
      applyFontSelection(heading, body, { keepPairing: false });
    });
  }
  if (DOM.editorFontPairingSelect) {
    DOM.editorFontPairingSelect.addEventListener("change", () => {
      if (ignoreFontPickerEvents) return;
      const value = DOM.editorFontPairingSelect.value;
      if (!value) return;
      const [heading, body] = value.split("|");
      const pairing = (fontCatalog.pairings || []).find(
        (pair) => pair.heading === heading && pair.body === body
      );
      applyFontSelection(heading, body, {
        keepPairing: true,
        headingPreviewText: findPairingPreview(pairing),
        bodyPreviewText: getFontPreviewText(body),
      });
    });
  }
  if (DOM.themeName)
    DOM.themeName.addEventListener("input", updateThemeEditorSummary);
  if (DOM.themeCloneName)
    DOM.themeCloneName.addEventListener("input", updateThemeEditorSummary);
  if (DOM.createThemeName)
    DOM.createThemeName.addEventListener("input", updateThemeEditorSummary);
  if (DOM.bannerSizeInput) {
    DOM.bannerSizeInput.addEventListener("input", () => {
      if (getActiveEvent()) {
        syncBannerSizeUI(activeTheme || getSelectedThemeTarget());
        return;
      }
      const target = activeTheme || getSelectedThemeTarget();
      if (!target) return;
      const size = parseInt(DOM.bannerSizeInput.value, 10);
      if (!Number.isFinite(size)) return;
      target.bannerSize = size;
      applyBannerSize(target);
      syncBannerSizeUI(target);
      saveThemesToStorage();
    });
  }
  if (DOM.welcomeTitleSizeInput) {
    DOM.welcomeTitleSizeInput.addEventListener("input", () => {
      if (getActiveEvent()) {
        syncWelcomeTitleSizeUI(activeTheme || getSelectedThemeTarget());
        return;
      }
      const target = activeTheme || getSelectedThemeTarget();
      if (!target) return;
      const size = parseInt(DOM.welcomeTitleSizeInput.value, 10);
      if (!Number.isFinite(size)) return;
      target.welcomeTitleSize = size;
      applyWelcomeTitleSize(target);
      syncWelcomeTitleSizeUI(target);
      saveThemesToStorage();
    });
  }
  if (DOM.cloneThemeBtn)
    DOM.cloneThemeBtn.addEventListener("click", handleCloneTheme);
  if (DOM.addLogoBtn && DOM.themeLogo)
    DOM.addLogoBtn.addEventListener("click", () => DOM.themeLogo.click());
  if (DOM.addAssetsBtn && DOM.bulkAssetsInput)
    DOM.addAssetsBtn.addEventListener("click", () =>
      DOM.bulkAssetsInput.click()
    );
  if (DOM.addBackgroundsBtn && DOM.themeBackground)
    DOM.addBackgroundsBtn.addEventListener("click", () =>
      DOM.themeBackground.click()
    );
  if (DOM.addGreenBackgroundsBtn && DOM.themeGreenBackgrounds) {
    DOM.addGreenBackgroundsBtn.addEventListener("click", () =>
      DOM.themeGreenBackgrounds.click()
    );
  }
  if (DOM.addOverlaysBtn && DOM.themeOverlays)
    DOM.addOverlaysBtn.addEventListener("click", () =>
      DOM.themeOverlays.click()
    );
  if (DOM.addTemplatesBtn && DOM.themeTemplates)
    DOM.addTemplatesBtn.addEventListener("click", () =>
      DOM.themeTemplates.click()
    );
  if (DOM.bulkAssetsInput)
    DOM.bulkAssetsInput.addEventListener("change", () =>
      openBulkAssetModal(DOM.bulkAssetsInput.files)
    );
  if (DOM.bulkAssetCancel)
    DOM.bulkAssetCancel.addEventListener("click", closeBulkAssetModal);
  if (DOM.bulkAssetApply)
    DOM.bulkAssetApply.addEventListener("click", () => {
      applyBulkAssetUpload().catch((err) => {
        console.error("Bulk asset upload failed", err);
        showToast("Bulk upload failed.");
      });
    });
  if (DOM.bulkAssetModal) {
    DOM.bulkAssetModal.addEventListener("click", (event) => {
      if (event.target === DOM.bulkAssetModal) closeBulkAssetModal();
    });
  }
  if (DOM.assetThemeDefaultsCancel)
    DOM.assetThemeDefaultsCancel.addEventListener("click", closeAssetThemeDefaultsModal);
  if (DOM.assetThemeDefaultsSave)
    DOM.assetThemeDefaultsSave.addEventListener("click", saveAssetThemeDefaults);
  if (DOM.assetThemeDefaultsSelectCurrent)
    DOM.assetThemeDefaultsSelectCurrent.addEventListener(
      "click",
      selectCurrentThemeForAssetDefaults
    );
  if (DOM.assetThemeDefaultsClearAll)
    DOM.assetThemeDefaultsClearAll.addEventListener(
      "click",
      clearAssetThemeDefaults
    );
  if (DOM.assetThemeDefaultsModal) {
    DOM.assetThemeDefaultsModal.addEventListener("click", (event) => {
      if (event.target === DOM.assetThemeDefaultsModal)
        closeAssetThemeDefaultsModal();
    });
  }
  if (DOM.setupThemeDefaultsBtn)
    DOM.setupThemeDefaultsBtn.addEventListener("click", openThemeDefaultsSetupModal);
  if (DOM.themeDefaultsSetupCancel)
    DOM.themeDefaultsSetupCancel.addEventListener("click", closeThemeDefaultsSetupModal);
  if (DOM.themeDefaultsSetupSave)
    DOM.themeDefaultsSetupSave.addEventListener("click", saveThemeDefaultsSetup);
  if (DOM.themeDefaultsSetupModal) {
    DOM.themeDefaultsSetupModal.addEventListener("click", (event) => {
      if (event.target === DOM.themeDefaultsSetupModal)
        closeThemeDefaultsSetupModal();
    });
  }
  if (DOM.assetLibrarySearch)
    DOM.assetLibrarySearch.addEventListener("input", renderAssetLibrary);
  if (DOM.assetLibraryCategory)
    DOM.assetLibraryCategory.addEventListener("change", renderAssetLibrary);
  if (DOM.assetLibrarySort)
    DOM.assetLibrarySort.addEventListener("change", renderAssetLibrary);
  if (DOM.assetLibraryClearFilters)
    DOM.assetLibraryClearFilters.addEventListener(
      "click",
      clearAssetLibraryFilters
    );
  if (DOM.refreshAssetLibraryBtn)
    DOM.refreshAssetLibraryBtn.addEventListener("click", () => {
      loadAssetLibraryRemote().catch((err) => {
        console.warn("Asset library refresh failed", err);
        showToast("Asset library refresh failed.");
      });
    });
  if (DOM.eventToSubThemeBtn)
    DOM.eventToSubThemeBtn.addEventListener("click", createSubThemeFromEvent);
  if (DOM.themeBackground)
    DOM.themeBackground.addEventListener("change", () =>
      handleThemeAssetInputChange("background")
    );
  if (DOM.themeLogo)
    DOM.themeLogo.addEventListener("change", () =>
      handleThemeAssetInputChange("logo")
    );
  if (DOM.themeGreenBackgrounds)
    DOM.themeGreenBackgrounds.addEventListener("change", () =>
      handleThemeAssetInputChange("greenBackgrounds")
    );
  if (DOM.themeOverlays)
    DOM.themeOverlays.addEventListener("change", () =>
      handleThemeAssetInputChange("overlay")
    );
  if (DOM.themeTemplates)
    DOM.themeTemplates.addEventListener("change", () =>
      handleThemeAssetInputChange("template")
    );
  if (DOM.themeCharacter)
    DOM.themeCharacter.addEventListener("change", () =>
      handleThemeAssetInputChange("character")
    );
  if (DOM.themeWelcomeTitle)
    DOM.themeWelcomeTitle.addEventListener("input", updateStylePreview);
  if (DOM.themeWelcomePrompt)
    DOM.themeWelcomePrompt.addEventListener("input", updateStylePreview);
  if (DOM.stylePreview) {
    DOM.stylePreview.addEventListener("click", (event) => {
      if (
        event.target === DOM.stylePreviewHeading ||
        event.target === DOM.stylePreviewSubheading ||
        event.target === DOM.stylePreviewBody ||
        event.target === DOM.stylePreviewButton
      )
        return;
      showFontPickerModal();
    });
  }
  if (DOM.closeFontPicker)
    DOM.closeFontPicker.addEventListener("click", hideFontPickerModal);
  if (DOM.fontPickerModal) {
    DOM.fontPickerModal.addEventListener("click", (e) => {
      if (e.target === DOM.fontPickerModal) hideFontPickerModal();
    });
  }
}

function handleThemeAssetInputChange(kind) {
  let input = null;
  if (kind === "background") input = DOM.themeBackground;
  else if (kind === "logo") input = DOM.themeLogo;
  else if (kind === "overlay") input = DOM.themeOverlays;
  else if (kind === "template") input = DOM.themeTemplates;
  else if (kind === "greenBackgrounds") input = DOM.themeGreenBackgrounds;
  if (!input || !input.files || input.files.length === 0) return;
  const active = getActiveEvent();
  if (active) {
    if (kind === "logo") {
      handleEventSingleAssetInput(kind, input.files)
        .catch((err) => {
          console.error("Failed to update event assets:", err);
        })
        .finally(() => {
          input.value = "";
        });
      return;
    }
    const kindMap = {
      background: "backgrounds",
      overlay: "overlays",
      template: "templates",
      greenBackgrounds: "greenBackgrounds",
    };
    const eventKind = kindMap[kind];
    if (eventKind) {
      handleEventOnlyAssetInput(eventKind, input.files)
        .catch((err) => {
          console.error("Failed to update event assets:", err);
        })
        .finally(() => {
          input.value = "";
        });
      return;
    }
  }
  if (!getActiveEvent()) {
    const kindMap = {
      background: "backgrounds",
      overlay: "overlays",
      template: "templates",
      greenBackgrounds: "greenBackgrounds",
      logo: "logo",
    };
    const sessionKind = kindMap[kind];
    if (sessionKind) {
      uploadCreatePathSessionAssets(sessionKind, input.files)
        .catch((err) => {
          console.error("Failed to update session assets:", err);
        })
        .finally(() => {
          input.value = "";
        });
      return;
    }
  }
  updateCurrentThemeAssets(kind).catch((err) =>
    console.error("Failed to update theme assets:", err)
  );
}

function openBulkAssetModal(fileList) {
  pendingBulkAssetFiles = Array.from(fileList || []).filter(Boolean);
  if (!pendingBulkAssetFiles.length) return;
  if (DOM.bulkAssetSummary) {
    const count = pendingBulkAssetFiles.length;
    DOM.bulkAssetSummary.textContent = `${count} file${
      count === 1 ? "" : "s"
    } selected`;
  }
  if (DOM.bulkAssetModal) DOM.bulkAssetModal.classList.remove("hidden");
}

function closeBulkAssetModal() {
  pendingBulkAssetFiles = [];
  if (DOM.bulkAssetsInput) DOM.bulkAssetsInput.value = "";
  if (DOM.bulkAssetModal) DOM.bulkAssetModal.classList.add("hidden");
}

function getBulkAssetKinds() {
  const kinds = [];
  if (DOM.bulkToBackgrounds && DOM.bulkToBackgrounds.checked)
    kinds.push("backgrounds");
  if (DOM.bulkToGreenBackgrounds && DOM.bulkToGreenBackgrounds.checked)
    kinds.push("greenBackgrounds");
  if (DOM.bulkToOverlays && DOM.bulkToOverlays.checked) kinds.push("overlays");
  if (DOM.bulkToTemplates && DOM.bulkToTemplates.checked)
    kinds.push("templates");
  return kinds;
}

function addAssetUrlToTheme(target, kind, url) {
  if (!target || !url) return;
  if (kind === "templates") {
    if (!Array.isArray(target.templates)) target.templates = [];
    target.templates.push({ src: url, layout: "double_column" });
    return;
  }
  if (kind === "overlays") {
    if (!Array.isArray(target.overlays)) target.overlays = [];
    target.overlays.push(url);
    return;
  }
  if (kind === "greenBackgrounds") {
    if (!Array.isArray(target.greenBackgrounds)) target.greenBackgrounds = [];
    target.greenBackgrounds.push(url);
    return;
  }
  if (kind === "backgrounds") {
    if (Array.isArray(target.backgrounds)) {
      target.backgrounds.push(url);
    } else if (target.background) {
      target.backgrounds = [target.background, url];
      delete target.backgroundIndex;
    } else {
      target.background = url;
    }
  }
}

async function applyBulkAssetUpload() {
  const files = pendingBulkAssetFiles.slice();
  if (!files.length) {
    showToast("Choose files first.");
    return;
  }
  const kinds = getBulkAssetKinds();
  if (!kinds.length) {
    showToast("Choose at least one destination.");
    return;
  }

  const active = getActiveEvent();
  if (active) {
    const overrides = ensureEventOverrides(active);
    let uploadedCount = 0;
    const tasks = [];
    files.forEach((file) => {
      kinds.forEach((kind) => {
        tasks.push(
          uploadAsset(
            file,
            kind,
            getEventAssetUploadOptions(active, kind)
          ).then((url) => {
            if (!url) return;
            if (kind === "backgrounds") overrides.backgrounds.push(url);
            if (kind === "greenBackgrounds")
              overrides.greenBackgrounds.push(url);
            if (kind === "overlays") overrides.overlays.push(url);
            if (kind === "templates")
              overrides.templates.push({ src: url, layout: "double_column" });
            uploadedCount += 1;
          })
        );
      });
    });
    await Promise.all(tasks);
    if (!uploadedCount) {
      showToast("No assets were uploaded.");
      return;
    }
    updateActiveEventDetails({ overrides });
    closeBulkAssetModal();
    showToast(
      `Added ${uploadedCount} event asset item${
        uploadedCount === 1 ? "" : "s"
      }.`
    );
    return;
  }

  if (!getSelectedThemeTarget()) {
    alert("Select a theme first.");
    closeBulkAssetModal();
    return;
  }
  let uploaded = 0;
  const tasks = [];
  files.forEach((file) => {
    kinds.forEach((kind) => {
      tasks.push(
        uploadAsset(file, kind, getSessionAssetUploadOptions(kind)).then((url) => {
          if (!url) return;
          addSessionAssetUrl(kind, url);
          uploaded += 1;
        })
      );
    });
  });
  await Promise.all(tasks);
  if (!uploaded) {
    showToast("No assets were uploaded.");
    return;
  }
  const key = DOM.eventSelect && DOM.eventSelect.value;
  if (key) loadTheme(key);
  updateCreatePathAssetSummary();
  closeBulkAssetModal();
  showToast(`Added ${uploaded} session asset item${uploaded === 1 ? "" : "s"}.`);
}

function setupCreateThemeModalControls() {
  if (DOM.createThemeDropZone) {
    DOM.createThemeDropZone.addEventListener(
      "dragover",
      handleCreateThemeDragOver
    );
    DOM.createThemeDropZone.addEventListener(
      "dragleave",
      handleCreateThemeDragLeave
    );
    DOM.createThemeDropZone.addEventListener("drop", handleCreateThemeDrop);
    DOM.createThemeDropZone.addEventListener("click", () =>
      DOM.createThemeFolderInput?.click()
    );
  }
  if (DOM.createThemeBrowseBtn)
    DOM.createThemeBrowseBtn.addEventListener("click", () =>
      DOM.createThemeFolderInput?.click()
    );
  if (DOM.createThemeFolderInput)
    DOM.createThemeFolderInput.addEventListener("change", (e) => {
      handleCreateThemeFiles(e.target.files);
      e.target.value = "";
    });
  if (DOM.createThemeCancel)
    DOM.createThemeCancel.addEventListener("click", () => {
      hideCreateThemeModal();
      resetCreateThemeModal();
      if (DOM.themeEditorModeSelect) {
        DOM.themeEditorModeSelect.value = "edit";
        setThemeEditorMode("edit");
      }
    });
  if (DOM.createThemeConfirm)
    DOM.createThemeConfirm.addEventListener("click", confirmCreateTheme);
}

function setupCreateEventModalControls() {
  if (DOM.createEventModal) {
    DOM.createEventModal.addEventListener("click", (event) => {
      if (event.target === DOM.createEventModal) hideCreateEventModal();
    });
  }
  if (DOM.createEventUseThemeDefaults) {
    DOM.createEventUseThemeDefaults.addEventListener("change", () => {
      if (!DOM.createEventUseThemeDefaults) return;
      if (!DOM.createEventUseThemeDefaults.checked) {
        createEventTextOverrides = readCreateEventTextInputs();
      }
      applyCreateEventTextState(DOM.createEventUseThemeDefaults.checked);
    });
  }
  if (DOM.createEventWelcomeSize) {
    DOM.createEventWelcomeSize.addEventListener("input", () => {
      if (!DOM.createEventWelcomeSizeValue) return;
      DOM.createEventWelcomeSizeValue.textContent = `${DOM.createEventWelcomeSize.value}px`;
    });
  }
  if (DOM.createEventBackgrounds) {
    DOM.createEventBackgrounds.addEventListener("change", (event) => {
      handleCreateEventFiles("backgrounds", event.target.files);
      event.target.value = "";
    });
  }
  if (DOM.createEventGreenBackgrounds) {
    DOM.createEventGreenBackgrounds.addEventListener("change", (event) => {
      handleCreateEventFiles("greenBackgrounds", event.target.files);
      event.target.value = "";
    });
  }
  if (DOM.createEventOverlays) {
    DOM.createEventOverlays.addEventListener("change", (event) => {
      handleCreateEventFiles("overlays", event.target.files);
      event.target.value = "";
    });
  }
  if (DOM.createEventTemplates) {
    DOM.createEventTemplates.addEventListener("change", (event) => {
      handleCreateEventFiles("templates", event.target.files);
      event.target.value = "";
    });
  }
  if (DOM.createEventCancel)
    DOM.createEventCancel.addEventListener("click", () => {
      hideCreateEventModal();
      resetCreateEventAssets();
    });
  if (DOM.createEventConfirm)
    DOM.createEventConfirm.addEventListener("click", () => {
      confirmCreateEventModal().catch((err) => {
        console.error("Failed to save event", err);
        alert("Failed to save event. See console for details.");
      });
    });
}

function ensureCreateEventAssets() {
  if (!createEventAssets) {
    createEventAssets = {
      backgrounds: [],
      greenBackgrounds: [],
      overlays: [],
      templates: [],
    };
  }
  return createEventAssets;
}

function resetCreateEventAssets() {
  createEventAssets = {
    backgrounds: [],
    greenBackgrounds: [],
    overlays: [],
    templates: [],
  };
}

function updateCreateEventSummary() {
  if (!DOM.createEventSummary) return;
  const assets = ensureCreateEventAssets();
  const parts = [];
  if (assets.backgrounds.length)
    parts.push(
      `${assets.backgrounds.length} background${
        assets.backgrounds.length === 1 ? "" : "s"
      }`
    );
  if (assets.greenBackgrounds.length)
    parts.push(
      `${assets.greenBackgrounds.length} green BG${
        assets.greenBackgrounds.length === 1 ? "" : "s"
      }`
    );
  if (assets.overlays.length)
    parts.push(
      `${assets.overlays.length} overlay${
        assets.overlays.length === 1 ? "" : "s"
      }`
    );
  if (assets.templates.length)
    parts.push(
      `${assets.templates.length} template${
        assets.templates.length === 1 ? "" : "s"
      }`
    );
  const existing = getActiveEventOverrides();
  const existingParts = [];
  if (existing.backgrounds.length)
    existingParts.push(
      `${existing.backgrounds.length} background${
        existing.backgrounds.length === 1 ? "" : "s"
      }`
    );
  if (existing.greenBackgrounds.length)
    existingParts.push(
      `${existing.greenBackgrounds.length} green BG${
        existing.greenBackgrounds.length === 1 ? "" : "s"
      }`
    );
  if (existing.overlays.length)
    existingParts.push(
      `${existing.overlays.length} overlay${
        existing.overlays.length === 1 ? "" : "s"
      }`
    );
  if (existing.templates.length)
    existingParts.push(
      `${existing.templates.length} template${
        existing.templates.length === 1 ? "" : "s"
      }`
    );
  const selectedText = parts.length
    ? `Selected for upload: ${parts.join(", ")}`
    : "No assets selected yet.";
  const existingText = existingParts.length
    ? `Existing event assets: ${existingParts.join(", ")}`
    : "";
  DOM.createEventSummary.textContent = existingText
    ? `${selectedText} ${existingText}`
    : selectedText;
}

function getThemeTextDefaults() {
  return {
    bannerText: resolveThemeBannerText(),
    welcomeTitle: resolveThemeWelcomeTitle(),
    welcomeTitleSize: resolveThemeWelcomeTitleSizeValue(),
    startButtonText: resolveThemeStartButtonText(),
    captureLabel: resolveThemeCaptureLabel(),
  };
}

function readCreateEventTextInputs() {
  const size = DOM.createEventWelcomeSize
    ? parseInt(DOM.createEventWelcomeSize.value, 10)
    : NaN;
  return {
    bannerText: valueFromInput(DOM.createEventBannerText),
    welcomeTitle: valueFromInput(DOM.createEventWelcomeText),
    welcomeTitleSize: Number.isFinite(size) && size > 0 ? size : null,
    startButtonText: valueFromInput(DOM.createEventStartText),
    captureLabel: valueFromInput(DOM.createEventCaptureText),
  };
}

function writeCreateEventTextInputs(values) {
  const next = values || {};
  if (DOM.createEventBannerText)
    DOM.createEventBannerText.value = next.bannerText || "";
  if (DOM.createEventWelcomeText)
    DOM.createEventWelcomeText.value = next.welcomeTitle || "";
  if (DOM.createEventWelcomeSize) {
    const size =
      typeof next.welcomeTitleSize === "number" && next.welcomeTitleSize > 0
        ? next.welcomeTitleSize
        : resolveThemeWelcomeTitleSizeValue();
    DOM.createEventWelcomeSize.value = String(size);
    if (DOM.createEventWelcomeSizeValue)
      DOM.createEventWelcomeSizeValue.textContent = `${size}px`;
  }
  if (DOM.createEventStartText)
    DOM.createEventStartText.value = next.startButtonText || "";
  if (DOM.createEventCaptureText)
    DOM.createEventCaptureText.value = next.captureLabel || "";
}

function setCreateEventTextInputsDisabled(isDisabled) {
  const inputs = [
    DOM.createEventBannerText,
    DOM.createEventWelcomeText,
    DOM.createEventWelcomeSize,
    DOM.createEventStartText,
    DOM.createEventCaptureText,
  ];
  inputs.forEach((input) => {
    if (!input) return;
    input.disabled = isDisabled;
  });
}

function applyCreateEventTextState(useDefaults) {
  if (useDefaults) {
    if (!createEventTextOverrides) {
      createEventTextOverrides = readCreateEventTextInputs();
    }
    writeCreateEventTextInputs(getThemeTextDefaults());
  } else {
    writeCreateEventTextInputs(
      createEventTextOverrides || getThemeTextDefaults()
    );
  }
  setCreateEventTextInputsDisabled(useDefaults);
}

function showCreateEventModal(mode = "create") {
  createEventMode = mode === "edit" ? "edit" : "create";
  if (!DOM.createEventModal) return;
  const themeDefaults = getThemeTextDefaults();
  if (createEventMode === "edit") {
    const active = getActiveEvent();
    if (!active) {
      alert("Choose an event first.");
      return;
    }
    if (DOM.createEventName) DOM.createEventName.value = active.name || "";
    if (DOM.createEventDate) DOM.createEventDate.value = active.date || "";
    const eventOverrides = getEventTextOverrides(active);
    const hasOverrides = hasEventTextOverrides(active);
    createEventTextOverrides = hasOverrides ? eventOverrides : themeDefaults;
    if (DOM.createEventUseThemeDefaults) {
      DOM.createEventUseThemeDefaults.checked = !hasOverrides;
    }
  } else {
    if (DOM.createEventName) DOM.createEventName.value = "";
    if (DOM.createEventDate) DOM.createEventDate.value = "";
    createEventTextOverrides = themeDefaults;
    if (DOM.createEventUseThemeDefaults) {
      DOM.createEventUseThemeDefaults.checked = false;
    }
  }
  applyCreateEventTextState(
    !!(
      DOM.createEventUseThemeDefaults && DOM.createEventUseThemeDefaults.checked
    )
  );
  resetCreateEventAssets();
  updateCreateEventSummary();
  DOM.createEventModal.classList.add("show");
}

function hideCreateEventModal() {
  if (DOM.createEventModal) DOM.createEventModal.classList.remove("show");
}

function handleCreateEventFiles(kind, fileList) {
  if (!fileList || fileList.length === 0) return;
  const assets = ensureCreateEventAssets();
  const files = Array.from(fileList);
  if (kind === "backgrounds") assets.backgrounds.push(...files);
  if (kind === "greenBackgrounds") assets.greenBackgrounds.push(...files);
  if (kind === "overlays") assets.overlays.push(...files);
  if (kind === "templates") assets.templates.push(...files);
  updateCreateEventSummary();
}

async function confirmCreateEventModal() {
  const themeKey = DOM.eventSelect && DOM.eventSelect.value;
  if (!themeKey) {
    alert("Select a theme before saving.");
    return;
  }
  const name = valueFromInput(DOM.createEventName);
  if (!name) {
    alert("Enter an event name.");
    return;
  }
  const dateValue = DOM.createEventDate ? DOM.createEventDate.value.trim() : "";
  const useDefaults = !!(
    DOM.createEventUseThemeDefaults && DOM.createEventUseThemeDefaults.checked
  );
  const {
    bannerText,
    welcomeTitle,
    welcomeTitleSize,
    startButtonText,
    captureLabel,
  } = useDefaults
    ? {
        bannerText: "",
        welcomeTitle: "",
        welcomeTitleSize: null,
        startButtonText: "",
        captureLabel: "",
      }
    : readCreateEventTextInputs();
  const assets = ensureCreateEventAssets();
  let targetEvent = null;
  if (createEventMode === "edit") {
    targetEvent = getActiveEvent();
    if (!targetEvent) {
      alert("Choose an event first.");
      return;
    }
    updateActiveEventDetails({
      name,
      date: dateValue,
      themeKey,
      bannerText,
      welcomeTitle,
      welcomeTitleSize,
      startButtonText,
      captureLabel,
    });
  } else {
    const slug = slugifyEventText(name);
    const idBase = [slug, slugifyEventText(dateValue)]
      .filter(Boolean)
      .join("-");
    const id = `${idBase || "event"}-${Date.now().toString(36)}`;
    const newEvent = {
      id,
      name,
      date: dateValue,
      themeKey,
      bannerText,
      welcomeTitle,
      startButtonText,
      captureLabel,
      createdAt: new Date().toISOString(),
      overrides: {
        backgrounds: [],
        overlays: [],
        templates: [],
        backgroundIndex: 0,
      },
    };
    if (typeof welcomeTitleSize === "number" && welcomeTitleSize > 0) {
      newEvent.welcomeTitleSize = welcomeTitleSize;
    }
    const events = getStoredEvents();
    events.push(newEvent);
    setStoredEvents(events);
    setActiveEventId(id);
    populateEventProfileSelect(id);
    targetEvent = newEvent;
  }
  if (targetEvent) {
    const overrides = ensureEventOverrides(targetEvent);
    const tasks = [];
    assets.backgrounds.forEach((file) => {
      tasks.push(
        uploadAsset(
          file,
          "backgrounds",
          getEventAssetUploadOptions(targetEvent, "backgrounds")
        ).then((url) => {
          if (url) overrides.backgrounds.push(url);
        })
      );
    });
    assets.greenBackgrounds.forEach((file) => {
      tasks.push(
        uploadAsset(
          file,
          "greenBackgrounds",
          getEventAssetUploadOptions(targetEvent, "greenBackgrounds")
        ).then((url) => {
          if (url) overrides.greenBackgrounds.push(url);
        })
      );
    });
    assets.overlays.forEach((file) => {
      tasks.push(
        uploadAsset(
          file,
          "overlays",
          getEventAssetUploadOptions(targetEvent, "overlays")
        ).then((url) => {
          if (url) overrides.overlays.push(url);
        })
      );
    });
    assets.templates.forEach((file) => {
      tasks.push(
        uploadAsset(
          file,
          "templates",
          getEventAssetUploadOptions(targetEvent, "templates")
        ).then((url) => {
          if (url)
            overrides.templates.push({ src: url, layout: "double_column" });
        })
      );
    });
    if (tasks.length) await Promise.all(tasks);
    updateActiveEventDetails({ overrides });
  }
  syncEventInputsFromActive();
  updateStylePreview();
  hideCreateEventModal();
  resetCreateEventAssets();
}

function setupOfflineControls() {
  if (DOM.offlineModeToggle) {
    DOM.offlineModeToggle.checked = getOfflinePref();
    DOM.offlineModeToggle.addEventListener("change", () => {
      setOfflinePref(DOM.offlineModeToggle.checked);
      updatePendingUI();
      showToast(
        DOM.offlineModeToggle.checked ? "Offline mode ON" : "Offline mode OFF"
      );
    });
  }
  if (DOM.forceCameraFileToggle) {
    DOM.forceCameraFileToggle.checked =
      localStorage.getItem("forceCameraOnFile") === "true";
    DOM.forceCameraFileToggle.addEventListener("change", () => {
      localStorage.setItem(
        "forceCameraOnFile",
        DOM.forceCameraFileToggle.checked ? "true" : "false"
      );
    });
  }
  window.addEventListener("online", () => {
    updatePendingUI();
    flushPendingUploads();
    flushPendingGalleryRecords();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    updatePendingUI();
    flushPendingUploads();
    flushPendingGalleryRecords();
  });
  window.addEventListener("offline", () => updatePendingUI());
}

function getLivePhotoEnabled() {
  try {
    const stored = localStorage.getItem("photoboothLivePhoto");
    if (stored === "true") return true;
    if (stored === "false") return false;
  } catch (_) {}
  return LIVE_PHOTO_DEFAULT;
}

function setLivePhotoEnabled(enabled) {
  try {
    localStorage.setItem("photoboothLivePhoto", enabled ? "true" : "false");
  } catch (_) {}
}

function setupLivePhotoToggle() {
  if (!DOM.livePhotoToggle) return;
  DOM.livePhotoToggle.checked = getLivePhotoEnabled();
  syncCaptureStatusIndicators();
  DOM.livePhotoToggle.addEventListener("change", () => {
    setLivePhotoEnabled(DOM.livePhotoToggle.checked);
    if (!DOM.livePhotoToggle.checked && mode === "live-photo") {
      setMode("still-photo");
      return;
    }
    syncBoothModeButtons();
    syncCaptureStatusIndicators();
  });
}

function setupRecordingModeToggle() {
  if (!DOM.recordingModeToggle) return;
  DOM.recordingModeToggle.checked = getRecordingModeEnabled();
  syncRecordingModeAvailability();
  DOM.recordingModeToggle.addEventListener("change", () => {
    setRecordingModeEnabled(DOM.recordingModeToggle.checked);
    syncRecordingModeAvailability();
  });
}

function getInstantCaptureEnabled() {
  try {
    return localStorage.getItem("photoboothInstantCapture") === "true";
  } catch (_) {
    return false;
  }
}

function setInstantCaptureEnabled(enabled) {
  try {
    localStorage.setItem(
      "photoboothInstantCapture",
      enabled ? "true" : "false"
    );
  } catch (_) {}
}

function setupInstantCaptureToggle() {
  const toggles = [
    DOM.instantCaptureToggle,
    DOM.boothInstantCaptureToggle,
  ].filter(Boolean);
  if (!toggles.length) return;
  const syncInstantCaptureToggles = (enabled) => {
    toggles.forEach((toggle) => {
      toggle.checked = enabled;
    });
  };
  syncInstantCaptureToggles(getInstantCaptureEnabled());
  syncCaptureStatusIndicators();
  toggles.forEach((toggle) => {
    toggle.addEventListener("change", () => {
      const enabled = !!toggle.checked;
      setInstantCaptureEnabled(enabled);
      syncInstantCaptureToggles(enabled);
      syncCaptureStatusIndicators();
    });
  });
}

function getLowLightEnabled() {
  try {
    return localStorage.getItem("photoboothLowLight") === "true";
  } catch (_) {
    return false;
  }
}

function setLowLightEnabled(enabled) {
  try {
    localStorage.setItem("photoboothLowLight", enabled ? "true" : "false");
  } catch (_) {}
}

function setupLowLightToggle() {
  if (!DOM.lowLightToggle) return;
  DOM.lowLightToggle.checked = getLowLightEnabled();
  DOM.lowLightToggle.addEventListener("change", () => {
    setLowLightEnabled(DOM.lowLightToggle.checked);
  });
}

function getGreenScreenEnabled() {
  try {
    const stored = localStorage.getItem("photoboothGreenScreen");
    if (stored === "true") return true;
    if (stored === "false") return false;
  } catch (_) {}
  return GREEN_SCREEN_DEFAULT;
}

function setGreenScreenEnabled(enabled) {
  try {
    localStorage.setItem("photoboothGreenScreen", enabled ? "true" : "false");
  } catch (_) {}
}

function setupGreenScreenToggle() {
  if (!DOM.greenScreenToggle) return;
  DOM.greenScreenToggle.checked = getGreenScreenEnabled();
  DOM.greenScreenToggle.addEventListener("change", () => {
    setGreenScreenEnabled(DOM.greenScreenToggle.checked);
  });
}

function getAiBackgroundEnabled() {
  try {
    const stored = localStorage.getItem("photoboothAiBackground");
    if (stored === "true") return true;
    if (stored === "false") return false;
  } catch (_) {}
  return AI_BACKGROUND_DEFAULT;
}

function setAiBackgroundEnabled(enabled) {
  try {
    localStorage.setItem("photoboothAiBackground", enabled ? "true" : "false");
  } catch (_) {}
}

function setupAiBackgroundToggle() {
  if (!DOM.aiBackgroundToggle) return;
  DOM.aiBackgroundToggle.checked = getAiBackgroundEnabled();
  if (DOM.aiBackgroundToggle.checked && DOM.greenScreenToggle) {
    DOM.greenScreenToggle.checked = false;
    setGreenScreenEnabled(false);
  }
  DOM.aiBackgroundToggle.addEventListener("change", () => {
    const enabled = DOM.aiBackgroundToggle.checked;
    if (
      enabled &&
      (typeof window === "undefined" ||
        typeof window.SelfieSegmentation === "undefined")
    ) {
      DOM.aiBackgroundToggle.checked = false;
      setAiBackgroundEnabled(false);
      showToast("AI background not available yet. Refresh to load.");
      return;
    }
    setAiBackgroundEnabled(enabled);
    if (enabled && DOM.greenScreenToggle) {
      DOM.greenScreenToggle.checked = false;
      setGreenScreenEnabled(false);
    }
  });
}

function getEnhancementMode() {
  try {
    const stored = localStorage.getItem("photoboothEnhancementMode");
    if (stored && ENHANCEMENT_MODE_CONFIG[stored]) {
      return stored;
    }
  } catch (_) {}
  return ENHANCEMENT_MODE_DEFAULT;
}

function setEnhancementMode(mode) {
  const nextMode = ENHANCEMENT_MODE_CONFIG[mode]
    ? mode
    : ENHANCEMENT_MODE_DEFAULT;
  try {
    localStorage.setItem("photoboothEnhancementMode", nextMode);
  } catch (_) {}
}

function setupEnhancementModeSelect() {
  if (!DOM.enhancementModeSelect) return;
  DOM.enhancementModeSelect.value = getEnhancementMode();
  DOM.enhancementModeSelect.addEventListener("change", () => {
    setEnhancementMode(DOM.enhancementModeSelect.value);
    showToast(
      `Enhancement: ${
        DOM.enhancementModeSelect.options[
          DOM.enhancementModeSelect.selectedIndex
        ].text
      }`
    );
  });
}

function getCameraZoom() {
  try {
    const stored = localStorage.getItem("photoboothCameraZoom");
    if (stored !== null) return clampZoom(parseFloat(stored), 1, 2.5);
  } catch (_) {}
  return CAMERA_ZOOM_DEFAULT;
}

function setCameraZoom(value) {
  const normalized = clampZoom(value, 1, 2.5);
  try {
    localStorage.setItem("photoboothCameraZoom", String(normalized));
  } catch (_) {}
  applyCameraZoom(normalized);
}

function applyCameraZoom(value) {
  const zoom = clampZoom(value, 1, 2.5);
  document.documentElement.style.setProperty("--camera-zoom", String(zoom));
  if (DOM.cameraZoomInput) DOM.cameraZoomInput.value = String(zoom);
  if (DOM.cameraZoomValue)
    DOM.cameraZoomValue.textContent = `${zoom.toFixed(2)}x`;
}

function setupCameraZoomControls() {
  if (!DOM.cameraZoomInput) return;
  const initial = getCameraZoom();
  applyCameraZoom(initial);
  DOM.cameraZoomInput.addEventListener("input", () => {
    setCameraZoom(DOM.cameraZoomInput.value);
  });
}

let activeAdminModal = null;

function openAdminModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  if (activeAdminModal) activeAdminModal.classList.remove("admin-modal-target");
  activeAdminModal = el;
  activeAdminModal.classList.add("admin-modal-target");
  if (activeAdminModal.tagName === "DETAILS") activeAdminModal.open = true;
  if (DOM.adminModalBackdrop) DOM.adminModalBackdrop.classList.add("show");
  if (DOM.adminModalClose) DOM.adminModalClose.classList.remove("hidden");
}

function closeAdminModal() {
  if (activeAdminModal) activeAdminModal.classList.remove("admin-modal-target");
  activeAdminModal = null;
  if (DOM.adminModalBackdrop) DOM.adminModalBackdrop.classList.remove("show");
  if (DOM.adminModalClose) DOM.adminModalClose.classList.add("hidden");
}

function setupAdminModalNavigation() {
  const buttons = document.querySelectorAll("[data-admin-modal]");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => openAdminModal(btn.dataset.adminModal));
  });
  document
    .querySelectorAll("#adminScreen details.panel-section")
    .forEach((panel) => {
      panel.addEventListener("toggle", () => {
        if (!panel.open && panel.classList.contains("admin-modal-target"))
          closeAdminModal();
      });
    });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (DOM.fontPickerModal && DOM.fontPickerModal.classList.contains("show")) {
      hideFontPickerModal();
      return;
    }
    if (activeAdminModal) closeAdminModal();
  });
  if (DOM.adminModalBackdrop)
    DOM.adminModalBackdrop.addEventListener("click", closeAdminModal);
  if (DOM.adminModalClose)
    DOM.adminModalClose.addEventListener("click", closeAdminModal);
}

let activeSetupSection = "event";

function setSetupSection(section = "event") {
  activeSetupSection = section;
  document.querySelectorAll("[data-setup-tab]").forEach((btn) => {
    const isActive = btn.dataset.setupTab === section;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
  document.querySelectorAll("[data-setup-section]").forEach((panel) => {
    const show = panel.dataset.setupSection === section;
    panel.classList.toggle("hidden", !show);
    if (show && panel.tagName === "DETAILS" && !panel.open) panel.open = true;
  });
  closeAdminModal();
}

function focusSetupElement(selector) {
  const el = document.querySelector(selector);
  if (!el) return;
  if (typeof el.scrollIntoView === "function") {
    el.scrollIntoView({ block: "center", behavior: "smooth" });
  }
  if (typeof el.focus === "function") {
    try {
      el.focus({ preventScroll: true });
    } catch (_) {
      el.focus();
    }
  }
}

function setupSetupTabs() {
  [DOM.setupTabEvent, DOM.setupTabCapture, DOM.setupTabShare].forEach((btn) => {
    if (!btn) return;
    btn.addEventListener("click", () =>
      setSetupSection(btn.dataset.setupTab || "event")
    );
  });
  document.querySelectorAll("[data-session-action]").forEach((card) => {
    const activate = () => routeSetupSessionCard(card.dataset.sessionAction);
    card.addEventListener("click", activate);
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      activate();
    });
  });
  setSetupSection(activeSetupSection);
}

function applyViewportProfile() {
  const width = window.innerWidth || document.documentElement.clientWidth || 0;
  const height =
    window.innerHeight || document.documentElement.clientHeight || 0;
  let next = width < 768 ? "phone" : width < 1180 ? "tablet" : "desktop";
  if (height > 0) {
    if (height < 760) {
      next = "phone";
    } else if (height < 900 && next === "desktop") {
      next = "tablet";
    }
  }
  document.body.classList.remove(
    "viewport-phone",
    "viewport-tablet",
    "viewport-desktop",
    "viewport-short"
  );
  document.body.classList.add(`viewport-${next}`);
  if (height > 0 && height < 980) {
    document.body.classList.add("viewport-short");
  }
}

function hasLiveVideoStream() {
  if (!stream) return false;
  try {
    return stream.getVideoTracks().some((track) => track.readyState === "live");
  } catch (_) {
    return false;
  }
}

function updateSystemStatusStrip() {
  if (DOM.statusCamera) {
    DOM.statusCamera.textContent = demoMode
      ? "Demo Mode"
      : hasLiveVideoStream()
      ? "Ready"
      : "Not Started";
  }
  if (DOM.statusUpload) {
    const cfg = getCloudinaryConfig();
    const uploadReady = cfg && cfg.use && cfg.cloud && cfg.preset;
    DOM.statusUpload.textContent = uploadReady
      ? "Cloudinary Connected"
      : "Local Server Upload";
  }
  if (DOM.statusSync) {
    const raw =
      DOM.syncStatus && DOM.syncStatus.textContent
        ? DOM.syncStatus.textContent.trim()
        : "";
    DOM.statusSync.textContent = raw || "Idle";
  }
  if (DOM.statusQueue) {
    let count = 0;
    try {
      count = getPendingUploads().length;
    } catch (_) {
      count = 0;
    }
    DOM.statusQueue.textContent = `${count} Pending`;
  }
  updateLaunchSummary();
}

function loadSetupLaunchMode() {
  try {
    const stored = localStorage.getItem(SETUP_LAUNCH_MODE_STORAGE_KEY);
    if (stored === "strip" || stored === "single_photo") {
      return stored;
    }
  } catch (_) {}
  return "single_photo";
}

function setSetupLaunchMode(modeValue) {
  setupLaunchMode = modeValue === "strip" ? "strip" : "single_photo";
  try {
    localStorage.setItem(SETUP_LAUNCH_MODE_STORAGE_KEY, setupLaunchMode);
  } catch (_) {}
  syncSetupLaunchModeUi();
  updateLaunchSummary();
}

function routeSetupSessionCard(action) {
  const key = String(action || "").trim();
  if (!key) return;
  if (key === "event") {
    setSetupSection("event");
    requestAnimationFrame(() => focusSetupElement("#eventPathCreateBtn"));
    return;
  }
  if (key === "capture") {
    setSetupSection("capture");
    requestAnimationFrame(() => focusSetupElement("#startCameraButton"));
    return;
  }
  if (key === "theme") {
    setSetupSection("event");
    requestAnimationFrame(() => focusSetupElement("#sessionThemeToggle"));
    return;
  }
  if (key === "camera") {
    setSetupSection("capture");
    requestAnimationFrame(() => focusSetupElement("#startCameraButton"));
    return;
  }
  if (key === "save") {
    setSetupSection("share");
    return;
  }
  if (key === "overlays") {
    setSetupSection("event");
    const panel = document.getElementById("currentAssetsSection");
    if (panel && panel.tagName === "DETAILS") {
      panel.open = true;
    }
    requestAnimationFrame(() => focusSetupElement("#addOverlaysBtn"));
    return;
  }
  if (key === "templates") {
    setSetupSection("event");
    const panel = document.getElementById("currentAssetsSection");
    if (panel && panel.tagName === "DETAILS") {
      panel.open = true;
    }
    requestAnimationFrame(() => focusSetupElement("#addTemplatesBtn"));
    return;
  }
}

function syncSetupLaunchModeUi() {
  const isStrip = setupLaunchMode === "strip";
  if (DOM.launchModeSingleBtn) {
    DOM.launchModeSingleBtn.classList.toggle("active", !isStrip);
    DOM.launchModeSingleBtn.setAttribute(
      "aria-pressed",
      (!isStrip).toString()
    );
  }
  if (DOM.launchModeStripBtn) {
    DOM.launchModeStripBtn.classList.toggle("active", isStrip);
    DOM.launchModeStripBtn.setAttribute("aria-pressed", isStrip.toString());
  }
}

function getLaunchThemeName() {
  const active = getActiveEvent();
  if (active && active.name) return active.name;
  if (DOM.eventSelect && DOM.eventSelect.selectedOptions.length) {
    return DOM.eventSelect.selectedOptions[0].textContent || "No theme selected";
  }
  return "No theme selected";
}

function getLaunchThemeLabel() {
  return getThemeSetupDisplayLabel(
    DOM.eventSelect ? DOM.eventSelect.value : "",
    activeTheme || resolveThemeByKey(DOM.eventSelect ? DOM.eventSelect.value : "")
  );
}

function getLaunchFontLabel() {
  const theme = activeTheme || getSelectedThemeTarget() || {};
  const heading =
    primaryFontFamily(theme.fontHeading || theme.font || "") || "";
  const body =
    primaryFontFamily(theme.fontBody || theme.font || "") || heading;
  if (!heading && !body) return "Use theme fonts";
  if (heading && body && heading !== body) {
    return `${heading} + ${body}`;
  }
  return heading || body || "Use theme fonts";
}

function getLaunchBackgroundCountLabel() {
  const backgroundCount = getSessionEffectiveAssetSourceSet("background").size;
  if (!backgroundCount) return "No backgrounds selected";
  return `${backgroundCount} background${backgroundCount === 1 ? "" : "s"} selected`;
}

function getLaunchOverlayCountLabel() {
  const overlayCount = getSessionEffectiveAssetSourceSet("overlay").size;
  if (!overlayCount) return "No overlays selected";
  return `${overlayCount} overlay${overlayCount === 1 ? "" : "s"} selected`;
}

function getLaunchTemplateCountLabel() {
  const templateCount = getSessionEffectiveAssetSourceSet("template").size;
  if (!templateCount) return "No templates selected";
  return `${templateCount} template${templateCount === 1 ? "" : "s"} selected`;
}

function getLaunchStripTemplate() {
  const templates = getTemplateList(activeTheme).filter((template) =>
    isStripTemplateLayout(template && template.layout)
  );
  return templates.length ? templates[0] : null;
}

function getLaunchCameraLabel() {
  if (demoMode) return "Demo mode";
  if (hasLiveVideoStream()) return "Ready";
  if (!navigator.permissions || typeof navigator.permissions.query !== "function") {
    return "Not started yet";
  }
  return "Checking camera permission...";
}

function getLaunchOutputLabel() {
  const uploadReady = cloudinaryConfigured();
  const pending = (() => {
    try {
      return getPendingUploads().length;
    } catch (_) {
      return 0;
    }
  })();
  if (uploadReady) {
    return pending ? `Cloudinary ready · ${pending} pending` : "Cloudinary ready";
  }
  return pending ? `Local uploads · ${pending} pending` : "Local uploads";
}

function getLaunchWarning() {
  const warnings = [];
  if (!getLaunchStripTemplate()) {
    warnings.push(
      "No strip preset is available yet. Guests can still choose photo mode in the booth, but strip selection will be empty until templates are added."
    );
  }
  if (!selectedOverlay) {
    const overlayCount = getOverlayList(activeTheme).length;
    warnings.push(
      overlayCount
        ? `Guests can choose from ${overlayCount} overlays on the booth screen, and the booth will still open with a plain camera layout.`
        : "No booth overlays are available yet. The booth will open with a plain camera layout until overlays are added."
    );
  }
  return warnings.join(" ");
}

function setLaunchSummaryText(targetIds, value) {
  targetIds.forEach((id) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  });
}

async function refreshLaunchCameraStatus() {
  if (demoMode) return "Demo mode";
  if (hasLiveVideoStream()) return "Ready";
  if (!navigator.permissions || typeof navigator.permissions.query !== "function") {
    return "Not started yet";
  }
  try {
    const status = await navigator.permissions.query({ name: "camera" });
    if (status && status.state === "granted") {
      return "Permission granted, camera not started yet";
    }
    if (status && status.state === "denied") {
      return "Camera permission blocked in the browser";
    }
    return "Camera permission needed";
  } catch (_) {
    return "Not started yet";
  }
}

async function updateLaunchSummary() {
  const revision = ++launchSummaryRevision;
  const eventName = getLaunchThemeName();
  const layoutMode = currentMode === "360" ? "360 Mode" : "Normal Mode";
  const themeLabel = getLaunchThemeLabel();
  const fontLabel = getLaunchFontLabel();
  const backgroundCountLabel = getLaunchBackgroundCountLabel();
  const overlayCountLabel = getLaunchOverlayCountLabel();
  const templateCountLabel = getLaunchTemplateCountLabel();
  const outputLabel = getLaunchOutputLabel();
  const warning = getLaunchWarning();

  setLaunchSummaryText(
    ["launchEventName", "launchConfirmEventName"],
    eventName
  );
  setLaunchSummaryText(
    ["launchLayoutMode", "launchConfirmLayoutMode"],
    layoutMode
  );
  setLaunchSummaryText(
    ["launchOverlayName", "launchConfirmOverlayName"],
    themeLabel
  );
  setLaunchSummaryText(
    ["launchFontStatus", "launchConfirmFontStatus"],
    fontLabel
  );
  setLaunchSummaryText(["launchBackgroundCount"], backgroundCountLabel);
  setLaunchSummaryText(
    ["launchOverlayCount", "launchConfirmOverlayCount"],
    overlayCountLabel
  );
  setLaunchSummaryText(
    ["launchStripStatus", "launchConfirmStripStatus"],
    templateCountLabel
  );
  setLaunchSummaryText(
    ["launchOutputStatus", "launchConfirmOutputStatus"],
    outputLabel
  );

  if (DOM.launchWarning) {
    DOM.launchWarning.textContent = warning;
    DOM.launchWarning.classList.toggle("hidden", !warning);
  }
  if (DOM.launchConfirmWarning) {
    DOM.launchConfirmWarning.textContent = warning;
    DOM.launchConfirmWarning.classList.toggle("hidden", !warning);
  }

  const cameraLabel = await refreshLaunchCameraStatus();
  if (revision !== launchSummaryRevision) return;
  setLaunchSummaryText(
    ["launchCameraStatus", "launchConfirmCameraStatus"],
    cameraLabel
  );
}

const EDIT_SCALE_CONFIG = [
  {
    id: "header",
    label: "Header",
    cssVar: "--edit-header-scale",
    storageKey: "editScaleHeader",
    min: 0.6,
    max: 1.4,
    posVar: "--edit-header-y",
    posKey: "editPosHeader",
    posMin: -200,
    posMax: 200,
  },
  {
    id: "camera",
    label: "Camera Preview",
    cssVar: "--edit-camera-scale",
    storageKey: "editScaleCamera",
    min: 0.6,
    max: 1.4,
    posVar: "--edit-camera-y",
    posKey: "editPosCamera",
    posMin: -200,
    posMax: 200,
    defaultValue: 0.9,
  },
  {
    id: "welcomeTitle",
    label: "Welcome Title",
    cssVar: "--edit-welcome-title-scale",
    storageKey: "editScaleWelcomeTitle",
    min: 0.6,
    max: 1.6,
    posVar: "--edit-welcome-title-y",
    posKey: "editPosWelcomeTitle",
    posMin: -200,
    posMax: 200,
  },
  {
    id: "startButton",
    label: "Start Button",
    cssVar: "--edit-start-button-scale",
    storageKey: "editScaleStartButton",
    min: 0.6,
    max: 1.6,
    posVar: "--edit-start-button-y",
    posKey: "editPosStartButton",
    posMin: -200,
    posMax: 200,
  },
  {
    id: "eventTitle",
    label: "Event Title",
    cssVar: "--edit-event-title-scale",
    storageKey: "editScaleEventTitle",
    min: 0.6,
    max: 1.6,
    posVar: "--edit-event-title-y",
    posKey: "editPosEventTitle",
    posMin: -200,
    posMax: 200,
  },
  {
    id: "captureButton",
    label: "Capture Button",
    cssVar: "--edit-capture-button-scale",
    storageKey: "editScaleCaptureButton",
    min: 0.6,
    max: 1.6,
    posVar: "--edit-capture-button-y",
    posKey: "editPosCaptureButton",
    posMin: -200,
    posMax: 200,
  },
  {
    id: "modeButtons",
    label: "Mode Buttons",
    cssVar: "--edit-mode-button-scale",
    storageKey: "editScaleModeButtons",
    min: 0.6,
    max: 1.6,
    posVar: "--edit-mode-buttons-y",
    posKey: "editPosModeButtons",
    posMin: -200,
    posMax: 200,
  },
  {
    id: "options",
    label: "Overlay/Template Thumbnails",
    cssVar: "--edit-options-scale",
    storageKey: "editScaleOptions",
    min: 0.6,
    max: 1.6,
    posVar: "--edit-options-y",
    posKey: "editPosOptions",
    posMin: -200,
    posMax: 200,
  },
];

const EDIT_TARGET_MAP = {
  header: () => [DOM.boothHeader].filter(Boolean),
  camera: () => [DOM.videoContainer].filter(Boolean),
  welcomeTitle: () => [DOM.welcomeTitle].filter(Boolean),
  startButton: () => [DOM.startButton].filter(Boolean),
  eventTitle: () => [DOM.eventTitle].filter(Boolean),
  captureButton: () => [DOM.captureBtn].filter(Boolean),
  modeButtons: () =>
    Array.from(document.querySelectorAll("#controls .mode-btn")),
  options: () => [DOM.options].filter(Boolean),
};

let editModeActive = false;
let activeEditTarget = null;

function getEditScale(storageKey, fallback) {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) return clampZoom(parseFloat(stored), 0.6, 1.6);
  } catch (_) {}
  return fallback;
}

function getEditPosition(storageKey, fallback) {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) return clampZoom(parseFloat(stored), -200, 200);
  } catch (_) {}
  return fallback;
}

function applyEditScale(target) {
  const value = clampZoom(target.value, 0.6, 1.6);
  if (!target.cssVar) return;
  document.documentElement.style.setProperty(target.cssVar, String(value));
}

function applyEditPosition(target) {
  if (!target.posVar) return;
  const value = clampZoom(
    target.posValue || 0,
    target.posMin || -200,
    target.posMax || 200
  );
  document.documentElement.style.setProperty(target.posVar, `${value}px`);
}

function loadEditScales() {
  EDIT_SCALE_CONFIG.forEach((cfg) => {
    const fallback =
      typeof cfg.defaultValue === "number" ? cfg.defaultValue : 1;
    cfg.value = getEditScale(cfg.storageKey, fallback);
    if (cfg.posVar) cfg.posValue = getEditPosition(cfg.posKey, 0);
    applyEditScale(cfg);
    applyEditPosition(cfg);
  });
}

function setEditScale(target, value) {
  const normalized = clampZoom(value, target.min, target.max);
  target.value = normalized;
  try {
    localStorage.setItem(target.storageKey, String(normalized));
  } catch (_) {}
  applyEditScale(target);
  if (DOM.editScaleValue)
    DOM.editScaleValue.textContent = `${Math.round(normalized * 100)}%`;
}

function setEditPosition(target, value) {
  if (!target.posVar) return;
  const normalized = clampZoom(
    value,
    target.posMin || -200,
    target.posMax || 200
  );
  target.posValue = normalized;
  try {
    localStorage.setItem(target.posKey, String(normalized));
  } catch (_) {}
  applyEditPosition(target);
  if (DOM.editPositionValue)
    DOM.editPositionValue.textContent = `${Math.round(normalized)}px`;
}

function clearEditSelection() {
  if (activeEditTarget && Array.isArray(activeEditTarget.els)) {
    activeEditTarget.els.forEach((el) =>
      el.classList.remove("edit-target-active")
    );
  }
  activeEditTarget = null;
  if (DOM.editControls) DOM.editControls.classList.remove("show");
}

function selectEditTarget(targetId) {
  const config = EDIT_SCALE_CONFIG.find((cfg) => cfg.id === targetId);
  if (!config) return;
  const els = (EDIT_TARGET_MAP[targetId] && EDIT_TARGET_MAP[targetId]()) || [];
  clearEditSelection();
  activeEditTarget = { config, els };
  els.forEach((el) => el.classList.add("edit-target-active"));
  if (DOM.editControlsTitle) DOM.editControlsTitle.textContent = config.label;
  if (DOM.editScaleInput) {
    DOM.editScaleInput.min = String(config.min);
    DOM.editScaleInput.max = String(config.max);
    DOM.editScaleInput.value = String(config.value || 1);
  }
  if (DOM.editScaleValue)
    DOM.editScaleValue.textContent = `${Math.round(
      (config.value || 1) * 100
    )}%`;
  if (
    DOM.editPositionRow &&
    DOM.editPositionInput &&
    DOM.editPositionValue &&
    DOM.editPositionLabel
  ) {
    if (config.posVar) {
      DOM.editPositionRow.style.display = "flex";
      DOM.editPositionLabel.style.display = "block";
      DOM.editPositionInput.min = String(config.posMin || -200);
      DOM.editPositionInput.max = String(config.posMax || 200);
      DOM.editPositionInput.value = String(config.posValue || 0);
      DOM.editPositionValue.textContent = `${Math.round(
        config.posValue || 0
      )}px`;
    } else {
      DOM.editPositionRow.style.display = "none";
      DOM.editPositionLabel.style.display = "none";
    }
  }
  if (DOM.editControls) DOM.editControls.classList.add("show");
}

function handleEditableClick(targetId, event) {
  if (!editModeActive) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  selectEditTarget(targetId);
}

function applyEditModeState(active) {
  editModeActive = active;
  document.body.classList.toggle("edit-mode", editModeActive);
  if (!editModeActive) clearEditSelection();
}

function enterEditMode() {
  applyEditModeState(true);
  closeAdminModal();
  if (DOM.adminScreen) DOM.adminScreen.classList.add("hidden");
  if (DOM.boothScreen) DOM.boothScreen.classList.remove("hidden");
  document.body.classList.remove("admin-open");
  document.documentElement.classList.remove("admin-open");
  startCamera(true);
  setEditView("booth");
  setTimeout(() => {
    if (editModeActive) hideWelcome();
  }, 600);
}

function exitEditMode() {
  applyEditModeState(false);
  goAdmin();
}

function setEditView(view) {
  const mode = view || "booth";
  if (DOM.boothScreen) DOM.boothScreen.classList.remove("countdown-mode");
  if (DOM.boothScreen) DOM.boothScreen.classList.remove("share-mode");
  if (DOM.welcomeScreen) DOM.welcomeScreen.classList.add("faded");
  if (DOM.finalPreview) DOM.finalPreview.classList.remove("show");
  if (DOM.countdownOverlay) DOM.countdownOverlay.classList.remove("show");
  if (mode === "welcome") {
    if (DOM.welcomeScreen) DOM.welcomeScreen.classList.remove("faded");
  } else if (mode === "countdown") {
    if (DOM.boothScreen) DOM.boothScreen.classList.add("countdown-mode");
    if (DOM.countdownOverlay) DOM.countdownOverlay.classList.add("show");
  } else if (mode === "share") {
    if (DOM.boothScreen) DOM.boothScreen.classList.add("share-mode");
    if (DOM.finalPreview) DOM.finalPreview.classList.add("show");
    if (editModeActive && DOM.qrCodeContainer)
      DOM.qrCodeContainer.classList.remove("hidden");
    if (editModeActive && DOM.finalStrip) {
      if (!DOM.finalStrip.dataset.prevSrc) {
        DOM.finalStrip.dataset.prevSrc =
          DOM.finalStrip.getAttribute("src") || "";
      }
      if (!DOM.finalStrip.getAttribute("src")) {
        DOM.finalStrip.src =
          "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
      }
      DOM.finalStrip.dataset.editPlaceholder = "true";
    }
  } else if (editModeActive && DOM.qrCodeContainer) {
    DOM.qrCodeContainer.classList.add("hidden");
  }
  if (
    editModeActive &&
    mode !== "share" &&
    DOM.finalStrip &&
    DOM.finalStrip.dataset.editPlaceholder === "true"
  ) {
    const prev = DOM.finalStrip.dataset.prevSrc || "";
    DOM.finalStrip.src = prev;
    delete DOM.finalStrip.dataset.editPlaceholder;
    delete DOM.finalStrip.dataset.prevSrc;
  }
}

function setupEditModeControls() {
  const markEditable = (els) => {
    els.forEach((el) => {
      if (el) el.setAttribute("data-editable", "true");
    });
  };
  if (DOM.editLayoutBtn)
    DOM.editLayoutBtn.addEventListener("click", enterEditMode);
  if (DOM.editModeExitBtn)
    DOM.editModeExitBtn.addEventListener("click", exitEditMode);
  if (DOM.editControlsClose)
    DOM.editControlsClose.addEventListener("click", clearEditSelection);
  if (DOM.editScaleInput) {
    DOM.editScaleInput.addEventListener("input", () => {
      if (!activeEditTarget) return;
      setEditScale(
        activeEditTarget.config,
        parseFloat(DOM.editScaleInput.value)
      );
    });
  }
  if (DOM.editPositionInput) {
    DOM.editPositionInput.addEventListener("input", () => {
      if (!activeEditTarget) return;
      setEditPosition(
        activeEditTarget.config,
        parseFloat(DOM.editPositionInput.value)
      );
    });
  }
  if (DOM.videoContainer) {
    markEditable([DOM.videoContainer]);
    DOM.videoContainer.addEventListener(
      "click",
      (e) => handleEditableClick("camera", e),
      true
    );
  }
  if (DOM.options) {
    markEditable([DOM.options]);
    DOM.options.addEventListener(
      "click",
      (e) => handleEditableClick("options", e),
      true
    );
  }
  if (DOM.boothHeader) {
    markEditable([DOM.boothHeader]);
    DOM.boothHeader.addEventListener(
      "click",
      (e) => handleEditableClick("header", e),
      true
    );
  }
  if (DOM.welcomeTitle) {
    markEditable([DOM.welcomeTitle]);
    DOM.welcomeTitle.addEventListener(
      "click",
      (e) => handleEditableClick("welcomeTitle", e),
      true
    );
  }
  if (DOM.startButton) {
    markEditable([DOM.startButton]);
    DOM.startButton.addEventListener(
      "click",
      (e) => handleEditableClick("startButton", e),
      true
    );
  }
  if (DOM.eventTitle) {
    markEditable([DOM.eventTitle]);
    DOM.eventTitle.addEventListener(
      "click",
      (e) => handleEditableClick("eventTitle", e),
      true
    );
  }
  if (DOM.captureBtn) {
    markEditable([DOM.captureBtn]);
    DOM.captureBtn.addEventListener(
      "click",
      (e) => handleEditableClick("captureButton", e),
      true
    );
  }
  document.querySelectorAll("#controls .mode-btn").forEach((btn) => {
    markEditable([btn]);
    btn.addEventListener(
      "click",
      (e) => handleEditableClick("modeButtons", e),
      true
    );
  });
  document.querySelectorAll("[data-edit-view]").forEach((btn) => {
    btn.addEventListener("click", () => setEditView(btn.dataset.editView));
  });
  if (DOM.boothScreen) {
    DOM.boothScreen.addEventListener("click", (e) => {
      if (!editModeActive) return;
      if (e.target.closest("#editControls")) return;
      if (e.target.closest("[data-editable]")) return;
      clearEditSelection();
    });
  }
  loadEditScales();
}

function setupEventNameInput() {
  if (!DOM.eventNameInput) return;
  DOM.eventNameInput.addEventListener("input", () => {
    const name = DOM.eventNameInput.value.trim();
    const active = getActiveEvent();
    if (active) {
      updateActiveEventDetails({ name });
    } else {
      const key = DOM.eventSelect && DOM.eventSelect.value;
      updateActiveSessionTextDetails({ name });
      if (key) saveStoredEventName(key, name);
    }
    updateStylePreview();
  });
}

function setupEventVisualEditorControls() {
  const bindTextInput = (node, key) => {
    if (!node) return;
    node.addEventListener("input", () => {
      const active = getActiveEvent();
      const nextValue = node.value.trim();
      if (active) {
        updateActiveEventDetails({ [key]: nextValue });
      } else {
        updateActiveSessionTextDetails({ [key]: nextValue });
      }
    });
  };

  bindTextInput(DOM.eventBannerTextInput, "bannerText");
  bindTextInput(DOM.eventWelcomeTitleInput, "welcomeTitle");
  bindTextInput(DOM.eventStartButtonTextInput, "startButtonText");
  bindTextInput(DOM.eventCaptureLabelInput, "captureLabel");
  bindTextInput(DOM.eventPartner1Input, "partner1");
  bindTextInput(DOM.eventPartner2Input, "partner2");
  bindTextInput(DOM.eventBirthdayNameInput, "birthdayName");
  bindTextInput(DOM.eventExpoCompanyInput, "expoCompany");

  if (DOM.eventBannerSizeInput) {
    DOM.eventBannerSizeInput.addEventListener("input", () => {
      const active = getActiveEvent();
      const size = parseInt(DOM.eventBannerSizeInput.value, 10);
      if (!Number.isFinite(size)) return;
      if (DOM.eventBannerSizeValue)
        DOM.eventBannerSizeValue.textContent = `${size}px`;
      if (active) {
        updateActiveEventDetails({ bannerSize: size });
      } else {
        updateActiveThemeTextDetails({ bannerSize: size });
      }
    });
  }

  if (DOM.eventWelcomeTitleSizeInput) {
    DOM.eventWelcomeTitleSizeInput.addEventListener("input", () => {
      const active = getActiveEvent();
      const size = parseInt(DOM.eventWelcomeTitleSizeInput.value, 10);
      if (!Number.isFinite(size)) return;
      if (DOM.eventWelcomeTitleSizeValue)
        DOM.eventWelcomeTitleSizeValue.textContent = `${size}px`;
      if (active) {
        updateActiveEventDetails({ welcomeTitleSize: size });
      } else {
        updateActiveThemeTextDetails({ welcomeTitleSize: size });
      }
    });
  }
}

function setupWelcomeInteractions() {
  const bindWelcomeTarget = (node) => {
    if (!node || node.dataset.welcomeBound === "true") return;
    node.dataset.welcomeBound = "true";
    node.addEventListener("click", beginWelcome);
    node.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") beginWelcome(event);
    });
  };
  bindWelcomeTarget(DOM.startButton);
  if (
    document.body &&
    document.body.dataset.welcomeDelegationBound !== "true"
  ) {
    document.body.dataset.welcomeDelegationBound = "true";
    const delegatedWelcomeStart = (event) => {
      if (welcomeFlowStep !== "idle") return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (
        !target.closest("#welcomeScreen, #welcomeOverlay") ||
        target.closest(
          "button, a, input, select, textarea, label, [role=button], [data-demo-theme], .welcome-mode-btn, .welcome-back-button"
        )
      ) {
        return;
      }
      if (!DOM.welcomeScreen || DOM.welcomeScreen.classList.contains("faded")) {
        return;
      }
      beginWelcome(event);
    };
    document.addEventListener("click", delegatedWelcomeStart, true);
  }
}

function setupEventDateInput() {
  if (!DOM.eventDateInput) return;
  DOM.eventDateInput.addEventListener("input", () => {
    const dateValue = DOM.eventDateInput.value.trim();
    const active = getActiveEvent();
    if (active) {
      updateActiveEventDetails({ date: dateValue });
    } else {
      const key = DOM.eventSelect && DOM.eventSelect.value;
      updateActiveSessionTextDetails({ date: dateValue });
      if (key) saveStoredEventDate(key, dateValue);
    }
    updateStylePreview();
  });
}

function init() {
  setupLaunchMode = loadSetupLaunchMode();
  syncSetupLaunchModeUi();
  setupEventSelector();
  setupBoothButtons();
  setupMobileSettingsControls();
  setupVideoListeners();
  setupFinalPreviewListeners();
  setupThemeEditorControls();
  setupCreateThemeModalControls();
  setupCreateEventModalControls();
  setupVideoImportControls();
  setup360ModeControls();
  setupOfflineControls();
  setupLivePhotoToggle();
  setupRecordingModeToggle();
  setupInstantCaptureToggle();
  setupLowLightToggle();
  setupGreenScreenToggle();
  setupAiBackgroundToggle();
  setupEnhancementModeSelect();
  setupCameraZoomControls();
  setupEditModeControls();
  setupCustomPairingControls();
  setupEventNameInput();
  setupEventVisualEditorControls();
  setupEventDateInput();
  setupEventProfileControls();
  setupAssetPanelControls();
  setupAdminModalNavigation();
  setupSetupTabs();
  setupWelcomeInteractions();
  loadCloudinarySettings();
  loadPrintSettings();
  setThemeEditorMode(
    DOM.themeEditorModeSelect ? DOM.themeEditorModeSelect.value : "edit"
  );
  loadEmailJsSettings();
  updatePendingUI();
  flushPendingUploads();
  flushPendingGalleryRecords();
  applyPreviewOrientation();
  applyViewportProfile();
  syncMobileSettingsUi();
  updateSystemStatusStrip();
  updateLaunchSummary();
  setInterval(updateSystemStatusStrip, 3000);
}

document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOMContentLoaded event fired.");
  loadThemesFromStorage();
  loadEventsFromStorage();
  loadFontsFromStorage();
  loadAssetLibraryLocal();
  populateAllThemeAssetTmp();
  if (repairCorruptedBackgroundDefaults()) saveThemesToStorage();
  loadAssetLibraryRemote().catch(() => renderAssetLibrary());
  try {
    await setupFontPicker();
  } catch (e) {
    console.warn("Font picker setup failed", e);
  }
  const initialKey = populateThemeSelector(DEFAULT_THEME_KEY);
  populateEventProfileSelect(getActiveEventId());
  const activeEvent = getActiveEvent();
  if (activeEvent && activeEvent.themeKey) {
    setEventSelection(activeEvent.themeKey);
    loadTheme(activeEvent.themeKey);
  } else if (initialKey) {
    loadTheme(initialKey);
  }
  syncEventInputsFromActive();
  goAdmin(); // Start on admin screen
  ["click", "mousemove", "keydown", "touchstart"].forEach((evt) =>
    document.addEventListener(evt, resetIdleTimer)
  );
  resetIdleTimer();
  init();
  applyBoothTestModeFromUrl();
  if (DOM.headingFontSelect && DOM.bodyFontSelect) {
    setupDualFontPicker({
      headingSelect: DOM.headingFontSelect,
      bodySelect: DOM.bodyFontSelect,
      pairingSelect: DOM.fontPairingSelect,
      headingPreview: DOM.headingFontPreview,
      bodyPreview: DOM.bodyFontPreview,
      fontsEndpoint: canSyncRemote() ? "/api/fonts" : "",
    }).catch((err) =>
      console.warn("Dual font picker failed to initialize", err)
    );
  }
  setupInstallPrompt();
  ensureRemoteSeed();
  updateThemeEditorSummary();
  updateCountdownFontSize();
  applyViewportProfile();
  requestAnimationFrame(syncFrameSizeVars);
  window.addEventListener("resize", () => {
    updateCountdownFontSize();
    applyViewportProfile();
    syncMobileSettingsUi();
    fitBannerTextToViewport();
    fitWelcomeTitleToViewport();
    requestAnimationFrame(syncFrameSizeVars);
    requestAnimationFrame(() => logBoothViewportOverflow());
  });
  window.addEventListener("orientationchange", () => {
    requestAnimationFrame(() => {
      updateCountdownFontSize();
      applyViewportProfile();
      syncMobileSettingsUi();
      fitBannerTextToViewport();
      fitWelcomeTitleToViewport();
      syncFrameSizeVars();
      logBoothViewportOverflow();
    });
  });
});

// --- Remote sync ---
const REMOTE_SYNC_DEBOUNCE_MS = 2000;
let pendingThemesSyncTimer = null;
let pendingEventsSyncTimer = null;
let pendingFontsSyncTimer = null;
let pendingFontsSyncPayload = null;
let fontsRemoteRequested = false;

function resolveRemoteSyncOverride() {
  try {
    if (typeof window !== "undefined") {
      if (typeof window.PHOTOBOOTH_REMOTE_SYNC === "boolean")
        return window.PHOTOBOOTH_REMOTE_SYNC;
      const stored = localStorage.getItem("photoboothRemoteSync");
      if (stored === "true") return true;
      if (stored === "false") return false;
    }
  } catch (_) {}
  return null;
}

function canSyncRemote() {
  if (typeof location === "undefined") return false;
  const protocol = (location && location.protocol) || "";
  const host =
    (location && location.hostname && location.hostname.toLowerCase()) || "";
  if (!protocol.startsWith("http")) return false;
  const override = resolveRemoteSyncOverride();
  return shouldEnableRemoteSync({ protocol, host, override });
}
async function loadThemesRemote() {
  if (!canSyncRemote()) return;
  try {
    const resp = await fetch("/api/themes", { cache: "no-store" });
    if (!resp.ok) return;
    const remote = await resp.json();
    const hasKeys =
      remote && typeof remote === "object" && Object.keys(remote).length > 0;
    if (!hasKeys) {
      // Do not clobber built-in themes with an empty server payload
      updateSyncStatus("Using built-in themes");
      return;
    }
    // Merge server themes over built-ins/local
    mergeStoredThemes(themes, remote);
    fixBuiltinThemePlacements(themes);
    ensureBuiltinThemes();
    if (!hasCoreBuiltins(themes)) {
      resetThemesToBuiltins("remote themes missing core entries");
    }
    try {
      normalizeAllThemes();
    } catch (_e) {}
    const removedLegacyThemes = removeLegacyFlatBuiltinThemes();
    populateAllThemeAssetTmp();
    const repairedBackgroundDefaults = repairCorruptedBackgroundDefaults();
    const globalLogo = getGlobalLogo();
    if (globalLogo !== null) applyGlobalLogoToAllThemes(globalLogo);
    localStorage.setItem("photoboothThemes", JSON.stringify(themes));
    if (repairedBackgroundDefaults || removedLegacyThemes)
      scheduleThemesRemoteSync();
    // Refresh UI if already initialized
    const selected = populateThemeSelector(DEFAULT_THEME_KEY);
    if (selected) {
      loadTheme(selected);
    }
    updateSyncStatus("Synced from server");
  } catch (_) {}
}
function hasStoredEventsPayload(payload) {
  return !!(
    payload &&
    typeof payload === "object" &&
    Array.isArray(payload.events)
  );
}
function getStoredEventsPayload() {
  return {
    events: getStoredEvents(),
    activeEventId: getActiveEventId(),
  };
}
function normalizeEventsRemotePayload(payload) {
  if (Array.isArray(payload)) {
    return { events: payload, activeEventId: "" };
  }
  if (!payload || typeof payload !== "object") {
    return { events: [], activeEventId: "" };
  }
  return {
    events: Array.isArray(payload.events) ? payload.events : [],
    activeEventId:
      typeof payload.activeEventId === "string" ? payload.activeEventId : "",
  };
}
async function loadEventsRemote() {
  if (!canSyncRemote()) return;
  try {
    const resp = await fetch("/api/events", { cache: "no-store" });
    if (!resp.ok) return;
    const remote = normalizeEventsRemotePayload(await resp.json());
    const local = getStoredEventsPayload();
    const remoteEmpty = !remote.events.length && !remote.activeEventId;
    if (remoteEmpty && (local.events.length || local.activeEventId)) {
      updateSyncStatus("Using local events");
      return;
    }
    setStoredEvents(remote.events, { skipRemoteSync: true });
    const resolvedActiveId =
      remote.activeEventId &&
      remote.events.some((event) => event && event.id === remote.activeEventId)
        ? remote.activeEventId
        : "";
    setActiveEventId(resolvedActiveId, { skipRemoteSync: true });
    populateEventProfileSelect(resolvedActiveId);
    const activeEvent = getActiveEvent();
    if (activeEvent && activeEvent.themeKey) {
      setEventSelection(activeEvent.themeKey);
      loadTheme(activeEvent.themeKey);
    } else {
      syncEventInputsFromActive();
      updateStylePreview();
    }
    updateSyncStatus("Events synced from server");
  } catch (_) {}
}
async function syncThemesRemote() {
  if (!canSyncRemote()) return;
  try {
    await fetch("/api/themes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(themes),
    });
  } catch (_) {}
}
function scheduleThemesRemoteSync() {
  if (!canSyncRemote()) return;
  if (pendingThemesSyncTimer) clearTimeout(pendingThemesSyncTimer);
  pendingThemesSyncTimer = setTimeout(() => {
    pendingThemesSyncTimer = null;
    syncThemesRemote().catch(() => {});
  }, REMOTE_SYNC_DEBOUNCE_MS);
}
async function syncEventsRemote() {
  if (!canSyncRemote()) return;
  try {
    await fetch("/api/events", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getStoredEventsPayload()),
    });
  } catch (_) {}
}
function scheduleEventsRemoteSync() {
  if (!canSyncRemote()) return;
  if (pendingEventsSyncTimer) clearTimeout(pendingEventsSyncTimer);
  pendingEventsSyncTimer = setTimeout(() => {
    pendingEventsSyncTimer = null;
    syncEventsRemote().catch(() => {});
  }, REMOTE_SYNC_DEBOUNCE_MS);
}
function mergeFonts(a, b) {
  const out = [];
  const seen = new Set();
  [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])].forEach(
    (f) => {
      try {
        const k = JSON.stringify(f);
        if (!seen.has(k)) {
          seen.add(k);
          out.push(f);
        }
      } catch (_) {}
    }
  );
  return out;
}
async function loadFontsRemote() {
  if (!canSyncRemote()) return [];
  try {
    const r = await fetch("/api/fonts", { cache: "no-store" });
    if (!r.ok) return [];
    const data = await r.json();
    if (Array.isArray(data)) return data;
    const normalized = normalizeFontsPayload(data);
    if (normalized && Array.isArray(normalized.available)) {
      return normalized.available.map((font) => ({
        type: "family",
        value: font.name,
        weights: font.weights,
      }));
    }
    return [];
  } catch (_) {
    return [];
  }
}
async function syncFontsRemote(fonts) {
  if (!canSyncRemote()) return;
  try {
    await fetch("/api/fonts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fonts || []),
    });
  } catch (_) {}
}
function scheduleFontsRemoteSync(fonts) {
  if (!canSyncRemote()) return;
  pendingFontsSyncPayload = Array.isArray(fonts) ? fonts.slice() : [];
  if (pendingFontsSyncTimer) clearTimeout(pendingFontsSyncTimer);
  pendingFontsSyncTimer = setTimeout(() => {
    pendingFontsSyncTimer = null;
    const payload = pendingFontsSyncPayload;
    pendingFontsSyncPayload = null;
    syncFontsRemote(payload).catch(() => {});
  }, REMOTE_SYNC_DEBOUNCE_MS);
}

async function syncAssetLibraryRemote() {
  if (!canSyncRemote()) return;
  for (const asset of assetLibrary.assets || []) {
    await syncAssetLibraryRemoteAsset(asset);
  }
}

// --- Manual sync UI ---
function updateSyncStatus(text) {
  if (DOM.syncStatus) DOM.syncStatus.textContent = text || "";
}
async function syncNow() {
  if (!canSyncRemote()) {
    alert("Remote sync is unavailable on this host.");
    return;
  }
  try {
    updateSyncStatus("Syncing…");
    // Push current local themes, events, and fonts
    await syncThemesRemote();
    await syncEventsRemote();
    await syncFontsRemote(getStoredFonts());
    await syncAssetLibraryRemote();
    // Reload from server to confirm and merge
    await loadThemesRemote();
    await loadEventsRemote();
    await loadAssetLibraryRemote();
    const remoteFonts = await loadFontsRemote();
    if (Array.isArray(remoteFonts) && remoteFonts.length) {
      const merged = mergeFonts(getStoredFonts(), remoteFonts);
      localStorage.setItem("photoboothFonts", JSON.stringify(merged));
    }
    updateSyncStatus("Synced ✓");
    showToast("Sync complete");
  } catch (e) {
    console.error("Sync failed", e);
    updateSyncStatus("Sync failed");
    alert("Sync failed. Check network and Cloudflare bindings.");
  }
}

// --- One-time remote seeding ---
async function ensureRemoteSeed() {
  if (!canSyncRemote()) return;
  try {
    if (localStorage.getItem("kvSeeded") === "true") return;
    const [tRes, eRes, fRes, aRes] = await Promise.all([
      fetch("/api/themes", { cache: "no-store" }),
      fetch("/api/events", { cache: "no-store" }),
      fetch("/api/fonts", { cache: "no-store" }),
      fetch("/api/assets", { cache: "no-store" }),
    ]);
    let needSeed = false;
    if (tRes.ok) {
      const t = await tRes.text();
      if (!t || t.trim() === "" || t.trim() === "{}") needSeed = true;
    }
    if (eRes.ok) {
      const e = await eRes.text();
      if (
        !e ||
        e.trim() === "" ||
        e.trim() === "{}" ||
        e.trim() === '{"events":[],"activeEventId":""}'
      )
        needSeed = true;
    }
    if (fRes.ok) {
      const f = await fRes.text();
      if (!f || f.trim() === "" || f.trim() === "[]") needSeed = true;
    }
    if (aRes.ok) {
      const a = await aRes.text();
      if (!a || a.trim() === "" || a.trim() === '{"assets":[]}') needSeed = true;
    }
    if (needSeed) {
      await syncThemesRemote();
      await syncEventsRemote();
      await syncFontsRemote(getStoredFonts());
      await syncAssetLibraryRemote();
      localStorage.setItem("kvSeeded", "true");
      updateSyncStatus("Seeded to server");
    }
  } catch (_) {}
}

// --- EmailJS Configuration ---
// Defaults (can be overridden via Admin > Email (EmailJS))
const EMAILJS_SERVICE_ID_DEFAULT = "service_wf13ozc";
const EMAILJS_TEMPLATE_ID_DEFAULT = "template_yankxhd";
const EMAILJS_PUBLIC_KEY_DEFAULT = "pzgt5QUA4x12IOITx";

function getEmailJsConfig() {
  const service =
    localStorage.getItem("emailJsService") || EMAILJS_SERVICE_ID_DEFAULT;
  const template =
    localStorage.getItem("emailJsTemplate") || EMAILJS_TEMPLATE_ID_DEFAULT;
  const pub =
    localStorage.getItem("emailJsPublic") || EMAILJS_PUBLIC_KEY_DEFAULT;
  return { service, template, pub };
}
function loadEmailJsSettings() {
  const cfg = getEmailJsConfig();
  if (DOM.emailJsPublic)
    DOM.emailJsPublic.value = localStorage.getItem("emailJsPublic") || "";
  if (DOM.emailJsService)
    DOM.emailJsService.value = localStorage.getItem("emailJsService") || "";
  if (DOM.emailJsTemplate)
    DOM.emailJsTemplate.value = localStorage.getItem("emailJsTemplate") || "";
  try {
    emailjs.init({ publicKey: cfg.pub });
  } catch (_e) {
    try {
      emailjs.init(cfg.pub);
    } catch (__e) {}
  }
}
function saveEmailJsSettings() {
  if (DOM.emailJsPublic)
    localStorage.setItem(
      "emailJsPublic",
      (DOM.emailJsPublic.value || "").trim()
    );
  if (DOM.emailJsService)
    localStorage.setItem(
      "emailJsService",
      (DOM.emailJsService.value || "").trim()
    );
  if (DOM.emailJsTemplate)
    localStorage.setItem(
      "emailJsTemplate",
      (DOM.emailJsTemplate.value || "").trim()
    );
  loadEmailJsSettings();
  showToast("Email settings saved");
}
async function sendTestEmail() {
  const cfg = getEmailJsConfig();
  const to = prompt("Send test to (email):");
  if (!to) return;
  const tiny =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAtEB6m3W1NoAAAAASUVORK5CYII=";
  const params = {
    to_email: to,
    photo_url: tiny,
    link_url: "",
    image_data_url: tiny,
  };
  try {
    await emailjs.send(cfg.service, cfg.template, params);
    alert("Test email sent");
  } catch (e) {
    const details = e && (e.text || e.message || e.status || JSON.stringify(e));
    console.error("EmailJS test failed", e);
    alert("Test failed: " + (details || "unknown error"));
  }
}

// --- Cloudinary Settings (UI + storage) ---
// Defaults (optional):
const CLOUDINARY_CLOUD_NAME = "afletch32";
const CLOUDINARY_UPLOAD_PRESET = "photobooth_unsigned";
const CLOUDINARY_FOLDER_BASE_DEFAULT = "photobooth/events";

function loadCloudinarySettings() {
  const cloud =
    localStorage.getItem("cloudinaryCloudName") || CLOUDINARY_CLOUD_NAME;
  const preset =
    localStorage.getItem("cloudinaryUploadPreset") || CLOUDINARY_UPLOAD_PRESET;
  const folderBase =
    localStorage.getItem("cloudinaryFolderBase") ||
    CLOUDINARY_FOLDER_BASE_DEFAULT;
  const use =
    (localStorage.getItem("cloudinaryUse") || "").toString() !== "false" &&
    Boolean(cloud && preset);
  if (DOM.cloudNameInput) DOM.cloudNameInput.value = cloud || "";
  if (DOM.cloudPresetInput) DOM.cloudPresetInput.value = preset || "";
  if (DOM.cloudFolderInput) DOM.cloudFolderInput.value = folderBase || "";
  if (DOM.cloudUseToggle) DOM.cloudUseToggle.checked = use;
}
function saveCloudinarySettings() {
  const cloud = (DOM.cloudNameInput && DOM.cloudNameInput.value.trim()) || "";
  const preset =
    (DOM.cloudPresetInput && DOM.cloudPresetInput.value.trim()) || "";
  const folderBase =
    (DOM.cloudFolderInput && DOM.cloudFolderInput.value.trim()) || "";
  const use = DOM.cloudUseToggle && DOM.cloudUseToggle.checked;
  if (cloud) localStorage.setItem("cloudinaryCloudName", cloud);
  else localStorage.removeItem("cloudinaryCloudName");
  if (preset) localStorage.setItem("cloudinaryUploadPreset", preset);
  else localStorage.removeItem("cloudinaryUploadPreset");
  if (folderBase) localStorage.setItem("cloudinaryFolderBase", folderBase);
  else localStorage.removeItem("cloudinaryFolderBase");
  localStorage.setItem("cloudinaryUse", use ? "true" : "false");
  showToast("Cloudinary settings saved");
}
function getCloudinaryConfig() {
  const cloud =
    localStorage.getItem("cloudinaryCloudName") || CLOUDINARY_CLOUD_NAME;
  const preset =
    localStorage.getItem("cloudinaryUploadPreset") || CLOUDINARY_UPLOAD_PRESET;
  const folderBase =
    localStorage.getItem("cloudinaryFolderBase") ||
    CLOUDINARY_FOLDER_BASE_DEFAULT;
  const use =
    (localStorage.getItem("cloudinaryUse") || "").toString() !== "false" &&
    Boolean(cloud && preset);
  return { cloud, preset, folderBase, use };
}
function cloudinaryEnabled() {
  const cfg = getCloudinaryConfig();
  return cfg.use;
}
function cloudinaryConfigured() {
  const cfg = getCloudinaryConfig();
  return Boolean(cfg.cloud && cfg.preset);
}

const PRINT_SETTINGS_STORAGE_KEY = "photoboothPrintSettings";
const DEFAULT_PRINT_SETTINGS = {
  mode: "off",
  priceLabel: "$3",
  panelTitle: "Printed Photo Upgrade",
  panelBody: "Take home a 4x6 keepsake print for $3.",
  instructions: "Scan the payment code below to complete your purchase. Your print will be prepared after payment is confirmed.",
  paymentQr: "",
  eventId: "",
  noPaymentRequired: false,
};

function getPrintSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(PRINT_SETTINGS_STORAGE_KEY) || "{}");
    return { ...DEFAULT_PRINT_SETTINGS, ...(stored && typeof stored === "object" ? stored : {}) };
  } catch (_) {
    return { ...DEFAULT_PRINT_SETTINGS };
  }
}

function getPrintQueueEventId() {
  const settings = getPrintSettings();
  const activeEvent = getActiveEvent();
  return String(settings.eventId || (activeEvent && (activeEvent.id || activeEvent.name)) || "default")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "default";
}

function getStaffPrintQueueUrl() {
  const url = new URL("staff-print", window.location.href);
  url.searchParams.set("eventId", getPrintQueueEventId());
  return url.toString();
}

function updateStaffPrintQueueUrl() {
  if (DOM.staffPrintQueueUrl) DOM.staffPrintQueueUrl.textContent = getStaffPrintQueueUrl();
}

function loadPrintSettings() {
  const settings = getPrintSettings();
  if (DOM.printModeInput) DOM.printModeInput.value = settings.mode === "paid-queue" ? "paid-queue" : "off";
  if (DOM.printNoPaymentRequiredInput) DOM.printNoPaymentRequiredInput.checked = settings.noPaymentRequired === true;
  if (DOM.printPriceLabelInput) DOM.printPriceLabelInput.value = settings.priceLabel;
  if (DOM.printPanelTitleInput) DOM.printPanelTitleInput.value = settings.panelTitle;
  if (DOM.printPanelBodyInput) DOM.printPanelBodyInput.value = settings.panelBody;
  if (DOM.printInstructionsInput) DOM.printInstructionsInput.value = settings.instructions;
  if (DOM.printPaymentQrInput) DOM.printPaymentQrInput.value = settings.paymentQr;
  if (DOM.printEventIdInput) DOM.printEventIdInput.value = settings.eventId;
  updateStaffPrintQueueUrl();
}

function savePrintSettings() {
  const settings = {
    mode: DOM.printModeInput && DOM.printModeInput.value === "paid-queue" ? "paid-queue" : "off",
    noPaymentRequired: !!(DOM.printNoPaymentRequiredInput && DOM.printNoPaymentRequiredInput.checked),
    priceLabel: (DOM.printPriceLabelInput && DOM.printPriceLabelInput.value.trim()) || DEFAULT_PRINT_SETTINGS.priceLabel,
    panelTitle: (DOM.printPanelTitleInput && DOM.printPanelTitleInput.value.trim()) || DEFAULT_PRINT_SETTINGS.panelTitle,
    panelBody: (DOM.printPanelBodyInput && DOM.printPanelBodyInput.value.trim()) || DEFAULT_PRINT_SETTINGS.panelBody,
    instructions: (DOM.printInstructionsInput && DOM.printInstructionsInput.value.trim()) || DEFAULT_PRINT_SETTINGS.instructions,
    paymentQr: (DOM.printPaymentQrInput && DOM.printPaymentQrInput.value.trim()) || "",
    eventId: (DOM.printEventIdInput && DOM.printEventIdInput.value.trim()) || "",
  };
  localStorage.setItem(PRINT_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  updateStaffPrintQueueUrl();
  showToast("Print settings saved");
}

async function copyStaffPrintQueueUrl() {
  const url = getStaffPrintQueueUrl();
  try {
    await navigator.clipboard.writeText(url);
    showToast("Staff queue URL copied");
  } catch (_) {
    showToast("Copy failed");
  }
}

function renderPaidPrintPanel(printEligible = true) {
  const settings = getPrintSettings();
  const enabled = settings.mode === "paid-queue" && printEligible;
  if (DOM.paidPrintPanel) {
    DOM.paidPrintPanel.dataset.ready = enabled ? "true" : "false";
    DOM.paidPrintPanel.classList.toggle("show", enabled);
  }
  if (!enabled) return;
  const noPaymentRequired = settings.noPaymentRequired === true;
  const usesDefaultTitle =
    !settings.panelTitle ||
    settings.panelTitle === DEFAULT_PRINT_SETTINGS.panelTitle;
  const usesDefaultBody =
    !settings.panelBody ||
    settings.panelBody === DEFAULT_PRINT_SETTINGS.panelBody;
  if (DOM.paidPrintTitle)
    DOM.paidPrintTitle.textContent = noPaymentRequired
      ? "Printed Photo Included"
      : usesDefaultTitle
        ? "Love your photos?"
        : settings.panelTitle;
  if (DOM.paidPrintBody)
    DOM.paidPrintBody.textContent = noPaymentRequired
      ? "Your event includes a 4x6 keepsake print."
      : usesDefaultBody
        ? getBoothPersonality().print
        : settings.panelBody.replace("$3", settings.priceLabel);
  if (DOM.paidPrintInstructions) DOM.paidPrintInstructions.textContent = noPaymentRequired ? "Your print will be prepared shortly." : settings.instructions;
  if (!DOM.paidPrintPaymentQr) return;
  if (noPaymentRequired) {
    DOM.paidPrintPaymentQr.removeAttribute("src");
    DOM.paidPrintPaymentQr.classList.remove("show");
    return;
  }
  const paymentValue = String(settings.paymentQr || "").trim();
  if (!paymentValue) {
    DOM.paidPrintPaymentQr.removeAttribute("src");
    DOM.paidPrintPaymentQr.classList.remove("show");
    return;
  }
  let parsedPaymentUrl = null;
  try {
    parsedPaymentUrl = new URL(paymentValue, window.location.href);
  } catch (_error) {
    parsedPaymentUrl = null;
  }
  if (!parsedPaymentUrl) {
    DOM.paidPrintPaymentQr.removeAttribute("src");
    DOM.paidPrintPaymentQr.classList.remove("show");
    return;
  }
  const isHttpPaymentUrl =
    parsedPaymentUrl.protocol === "http:" ||
    parsedPaymentUrl.protocol === "https:";
  if (!isHttpPaymentUrl) {
    DOM.paidPrintPaymentQr.removeAttribute("src");
    DOM.paidPrintPaymentQr.classList.remove("show");
    return;
  }
  const hasImageExtension =
    /\.png(\?.*)?$/i.test(paymentValue) ||
    /\.jpe?g(\?.*)?$/i.test(paymentValue) ||
    /\.webp(\?.*)?$/i.test(paymentValue) ||
    /\.gif(\?.*)?$/i.test(paymentValue) ||
    /\.svg(\?.*)?$/i.test(paymentValue);
  if (hasImageExtension) {
    DOM.paidPrintPaymentQr.src = paymentValue;
    DOM.paidPrintPaymentQr.classList.add("show");
    return;
  }
  if (window.QRCode) {
    const canvas = document.createElement("canvas");
    QRCode.toCanvas(canvas, paymentValue, { width: 176, margin: 1 }, (error) => {
      if (!error) {
        DOM.paidPrintPaymentQr.src = canvas.toDataURL("image/png");
        DOM.paidPrintPaymentQr.classList.add("show");
      }
    });
    return;
  }
  DOM.paidPrintPaymentQr.removeAttribute("src");
  DOM.paidPrintPaymentQr.classList.remove("show");
}

async function enqueueFinalPrintIfNeeded(imageUrl, printEligible = true) {
  const settings = getPrintSettings();
  if (settings.mode !== "paid-queue" || !printEligible) return;
  if (!/^https?:\/\//i.test(String(imageUrl || ""))) {
    if (DOM.shareStatus) {
      DOM.shareStatus.textContent = "Print queue waiting for shared upload";
      DOM.shareStatus.style.display = "inline-flex";
    }
    showToast("Print queue needs an uploaded image before staff can print.");
    return;
  }
  try {
    const response = await fetch("/api/print-queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: getPrintQueueEventId(),
        imageUrl,
        thumbnailUrl: imageUrl,
        quantity: 1,
        paymentRequired: settings.noPaymentRequired !== true,
      }),
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Print queue request failed.");
    }
    if (DOM.shareStatus && DOM.shareStatus.textContent === "Print queue waiting for shared upload") {
      DOM.shareStatus.style.display = "none";
    }
  } catch (error) {
    console.warn("Print queue enqueue failed", error);
    if (DOM.shareStatus) {
      DOM.shareStatus.textContent = "Print queue failed";
      DOM.shareStatus.style.display = "inline-flex";
    }
    showToast("Print queue failed. Staff may need to refresh and retry.");
  }
}

// --- Overlay Spot-Color Mask (optional) ---
// If enabled, any pixel in an overlay matching `SPOT_MASK.color` within `tolerance`
// becomes transparent. Useful to design overlays with colored "holes" for photos.
const SPOT_MASK = {
  enabled: true,
  color: "#00ff00", // pure green by default
  tolerance: 12, // 0-255 per channel
};

function populateThemeSelector(preferredKey, attempt = 0) {
  console.log("Themes object:", themes);
  const select = DOM.eventSelect;
  if (!select) return null;
  select.innerHTML = "";
  const selectedType = getSelectedEventType();
  const entries = getSetupThemeEntries().filter((entry) =>
    shouldIncludeThemeForSelectedType(entry.key, entry.theme, selectedType)
  );
  const groupedEntries = new Map();
  entries.forEach((entry) => {
    if (!groupedEntries.has(entry.group)) groupedEntries.set(entry.group, []);
    groupedEntries.get(entry.group).push(entry);
  });
  let optionCount = 0;
  const orderedGroups = THEME_SETUP_GROUP_ORDER.filter((group) =>
    groupedEntries.has(group)
  ).concat(
    Array.from(groupedEntries.keys()).filter(
      (group) => !THEME_SETUP_GROUP_ORDER.includes(group)
    )
  );
  orderedGroups.forEach((groupName) => {
    const groupEntries = groupedEntries.get(groupName);
    if (!groupEntries || !groupEntries.length) return;
    const optgroup = document.createElement("optgroup");
    optgroup.label = groupName;
    groupEntries.forEach((entry) => {
      const option = document.createElement("option");
      option.value = entry.key;
      option.textContent = entry.label;
      optgroup.appendChild(option);
      optionCount += 1;
    });
    select.appendChild(optgroup);
  });
  if (optionCount === 0) {
    renderThemeQuickSelect(select);
    if (attempt === 0) {
      resetThemesToBuiltins("no selectable themes for dropdown");
      ensureBuiltinThemes();
      try {
        normalizeAllThemes();
      } catch (_e) {}
      if (removeLegacyFlatBuiltinThemes()) {
        localStorage.setItem("photoboothThemes", JSON.stringify(themes));
      }
      return populateThemeSelector(preferredKey, attempt + 1);
    }
    highlightThemeQuickSelect(null);
    updateThemeEditorSummary();
    return null;
  }
  renderThemeQuickSelect(select);
  const resolved = resolvePreferredThemeKey(preferredKey);
  if (resolved && !setEventSelection(resolved) && select.options.length > 0) {
    select.selectedIndex = 0;
  }
  const selectedKey = (DOM.eventSelect && DOM.eventSelect.value) || null;
  highlightThemeQuickSelect(selectedKey);
  populateCreatePathThemeSelect(selectedKey || "");
  updateThemeEditorSummary();
  return selectedKey;
}

function getSelectedEventType() {
  if (!DOM.fontEventStyleSelect) return "general";
  return normalizeEventStyle(DOM.fontEventStyleSelect.value) || "general";
}

function syncEventTypeTiles() {
  const selectedType = getSelectedEventType();
  document.querySelectorAll("[data-event-type-tile]").forEach((button) => {
    const isActive =
      normalizeEventStyle(button.dataset.eventTypeTile) === selectedType;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
  if (DOM.createPathEventType) {
    DOM.createPathEventType.value = selectedType;
    if (!createPathEventTypeFilter || createPathEventTypeFilter === "all") {
      createPathEventTypeFilter = selectedType;
    }
  }
}

function setSelectedEventType(nextType) {
  const normalized = normalizeEventStyle(nextType) || "general";
  if (DOM.fontEventStyleSelect) {
    DOM.fontEventStyleSelect.value = normalized;
  }
  syncEventTypeTiles();
  populateThemeSelector((DOM.eventSelect && DOM.eventSelect.value) || "");
  updateEventTypeSetupUI();
}

function getThemeEventTypePriority(item, selectedType) {
  if (!item) return 99;
  const inferredType = inferThemeEventStyle(item.value, item.theme);
  const normalizedSelected = normalizeEventStyle(selectedType);
  if (normalizedSelected === "general") {
    if (inferredType === "general") return 0;
    if (inferredType === "birthday") return 1;
    if (inferredType === "community") return 2;
    return 3;
  }
  if (inferredType === normalizedSelected) return 0;
  if (normalizedSelected === "party" && inferredType === "birthday") return 0;
  if (
    (normalizedSelected === "wedding" || normalizedSelected === "expo") &&
    inferredType === "general"
  )
    return 1;
  if (normalizedSelected === "community" && inferredType === "general")
    return 1;
  if (normalizedSelected === "party" && inferredType === "general") return 1;
  return 2;
}

function themeSupportsEventType(item, selectedType) {
  if (!item || !item.theme) return false;
  const normalizedSelected = normalizeEventStyle(selectedType);
  if (normalizedSelected === "general") return true;
  const explicitTypes = Array.isArray(item.theme.eventTypes)
    ? item.theme.eventTypes
        .map((entry) => normalizeEventStyle(entry))
        .filter(Boolean)
    : [];
  if (explicitTypes.length) {
    if (explicitTypes.includes(normalizedSelected)) return true;
    if (normalizedSelected === "party" && explicitTypes.includes("birthday"))
      return true;
    return false;
  }
  const inferredType = inferThemeEventStyle(item.value, item.theme);
  if (inferredType === normalizedSelected) return true;
  if (normalizedSelected === "party" && inferredType === "birthday")
    return true;
  return inferredType === "general";
}

function isHolidayThemeKey(themeKey) {
  if (!themeKey) return false;
  return resolveThemeStorage(themeKey).bucket === "holidays";
}

function shouldIncludeThemeForSelectedType(themeKey, theme, selectedType) {
  const normalizedSelected = normalizeEventStyle(selectedType);
  if (!theme) return false;
  if (normalizedSelected === "wedding" && isHolidayThemeKey(themeKey)) {
    return false;
  }
  return themeSupportsEventType({ value: themeKey, theme }, normalizedSelected);
}

function shouldIncludeCreatePathTheme(themeKey, theme, selectedType) {
  const normalizedSelected = normalizeEventStyle(selectedType);
  if (!theme) return false;
  if (normalizedSelected === "general") return true;
  const themeText = [
    themeKey,
    theme.name,
    theme.vibeSummary,
    theme.welcome && theme.welcome.title,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (
    normalizedSelected === "wedding" &&
    (isHolidayThemeKey(themeKey) ||
      /(halloween|christmas|valentine|santa|new year|spooky|boo|winter wonderland)/.test(
        themeText
      ))
  ) {
    return false;
  }
  const explicitTypes = Array.isArray(theme.eventTypes)
    ? theme.eventTypes
        .map((entry) => normalizeEventStyle(entry))
        .filter(Boolean)
    : [];
  const inferred = inferThemeEventStyle(themeKey, theme);
  if (inferred !== "general") return inferred === normalizedSelected;
  return explicitTypes.includes(normalizedSelected) && themeText.includes(normalizedSelected);
}

function getEventTypeCopy(selectedType) {
  const normalized = normalizeEventStyle(selectedType);
  const copy = {
    wedding: {
      label: "Wedding",
      note: "Romantic, polished setups with elegant typography and simple booth visuals.",
      themeNote: "Showing themes that fit wedding and formal booth setups.",
    },
    expo: {
      label: "Expo",
      note: "Fast-to-read, branded setups for vendor booths, conferences, and lead capture.",
      themeNote:
        "Showing themes that fit expo booths, branded activations, and lead capture.",
    },
    birthday: {
      label: "Party",
      note: "Energetic, celebratory setups that feel playful and guest-friendly.",
      themeNote:
        "Showing themes that fit parties, birthdays, and high-energy celebrations.",
    },
    community: {
      label: "Community",
      note: "Welcoming, flexible setups for schools, fundraisers, churches, and public events.",
      themeNote:
        "Showing themes that fit schools, fundraisers, churches, and community events.",
    },
    general: {
      label: "General",
      note: "Balanced default setups that can be adapted quickly for almost any booth.",
      themeNote:
        "Showing versatile themes that can be adapted quickly for most events.",
    },
  };
  return copy[normalized] || copy.general;
}

function updateEventTypeSetupUI() {
  const selectedType = getSelectedEventType();
  const pairings = Array.isArray(fontCatalog.pairings)
    ? fontCatalog.pairings.slice()
    : [];
  const filteredPairings = pairings.filter((pairing) =>
    pairingSupportsEventStyle(pairing, selectedType)
  );
  const themeCopy = getEventTypeCopy(selectedType);

  if (DOM.fontPairingContextLabel) {
    DOM.fontPairingContextLabel.textContent = `${themeCopy.label} Font Suggestions`;
  }
  if (DOM.fontPairingContextNote) {
    DOM.fontPairingContextNote.textContent = themeCopy.note;
  }
  if (DOM.themeStepLabel) {
    DOM.themeStepLabel.textContent = `${themeCopy.label} Theme`;
  }
  if (DOM.themeStepNote) {
    DOM.themeStepNote.textContent = themeCopy.themeNote;
  }

  if (DOM.editorFontPairingSelect) {
    const select = DOM.editorFontPairingSelect;
    const previous = select.value;
    select.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = filteredPairings.length
      ? "-- Choose suggested fonts --"
      : "-- No suggested fonts yet --";
    select.appendChild(placeholder);
    filteredPairings.forEach((pairing) => {
      const option = document.createElement("option");
      option.value = `${pairing.heading}|${pairing.body}`;
      option.textContent = pairing.notes
        ? `${pairing.heading} + ${pairing.body} - ${pairing.notes}`
        : `${pairing.heading} + ${pairing.body}`;
      select.appendChild(option);
    });
    if (
      previous &&
      Array.from(select.options).some((option) => option.value === previous)
    ) {
      select.value = previous;
    }
  }

  if (DOM.eventStylePairings) {
    DOM.eventStylePairings.innerHTML = "";
    if (!filteredPairings.length) {
      const empty = document.createElement("div");
      empty.className = "quick-pick-empty";
      empty.textContent =
        "No font suggestions are set up for this event type yet.";
      DOM.eventStylePairings.appendChild(empty);
    } else {
      filteredPairings.slice(0, 4).forEach((pairing) => {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "quick-pick-card event-style-card";
        const previewText = findPairingPreview(pairing);
        card.innerHTML = `
          <div class="quick-pick-label">Suggested</div>
          <div class="quick-pick-title">${pairing.heading} + ${
          pairing.body
        }</div>
          ${
            pairing.notes
              ? `<div class="quick-pick-notes">${pairing.notes}</div>`
              : ""
          }
          <div class="quick-pick-preview" style="font-family: ${composeFontString(
            pairing.heading
          )};">${previewText}</div>
        `;
        card.addEventListener("click", () => {
          applyFontSelection(pairing.heading, pairing.body, {
            keepPairing: true,
            headingPreviewText: previewText,
            bodyPreviewText: getFontPreviewText(pairing.body),
          });
          if (DOM.editorFontPairingSelect) {
            DOM.editorFontPairingSelect.value = `${pairing.heading}|${pairing.body}`;
          }
        });
        DOM.eventStylePairings.appendChild(card);
      });
    }
  }
}

function buildThemeCard(item, options = {}) {
  const {
    isHoliday = false,
    showSummary = false,
    selectEl = DOM.eventSelect,
  } = options;
  const card = document.createElement("button");
  card.type = "button";
  card.className = `theme-card${isHoliday ? " holiday" : ""}`;
  card.dataset.value = item.value;
  card.textContent = item.label;
  const accent = item.theme && item.theme.accent ? item.theme.accent : null;
  const accent2 = item.theme && item.theme.accent2 ? item.theme.accent2 : null;
  if (accent) card.style.setProperty("--card-accent", accent);
  if (accent2) card.style.setProperty("--card-accent2", accent2);
  if (showSummary && item.theme && item.theme.vibeSummary) {
    const summary = document.createElement("span");
    summary.className = "theme-card-summary";
    summary.textContent = item.theme.vibeSummary;
    card.appendChild(summary);
  }
  card.addEventListener("click", () => {
    if (selectEl && selectEl.value !== item.value) {
      selectEl.value = item.value;
      selectEl.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      highlightThemeQuickSelect(item.value);
    }
  });
  return card;
}

function renderThemeVibesSection(items, selectedKey) {
  const container = DOM.themeVibesSection;
  if (!container) return;
  const selected = items.find((item) => item.value === selectedKey);
  let parentKey = null;
  if (selected && selected.theme && selected.theme.vibeParentKey) {
    parentKey = selected.theme.vibeParentKey;
  } else if (selectedKey) {
    const hasVibes = items.some(
      (item) => item.theme && item.theme.vibeParentKey === selectedKey
    );
    parentKey = hasVibes ? selectedKey : null;
  }
  if (!parentKey) {
    container.classList.add("hidden");
    container.innerHTML = "";
    return;
  }
  const vibeItems = items.filter(
    (item) => item.theme && item.theme.vibeParentKey === parentKey
  );
  if (!vibeItems.length) {
    container.classList.add("hidden");
    container.innerHTML = "";
    return;
  }
  const parentTheme = resolveThemeByKey(parentKey);
  const parentLabel =
    parentTheme && parentTheme.name ? parentTheme.name : "Holiday";
  container.classList.remove("hidden");
  container.innerHTML = "";
  const section = document.createElement("div");
  section.className = "theme-card-section";
  const heading = document.createElement("h3");
  heading.textContent = `${parentLabel} Vibes`;
  const grid = document.createElement("div");
  grid.className = "theme-card-grid";
  vibeItems.forEach((item) => {
    grid.appendChild(
      buildThemeCard(item, { isHoliday: true, showSummary: true })
    );
  });
  section.appendChild(heading);
  section.appendChild(grid);
  container.appendChild(section);
}

function renderThemeQuickSelect(selectEl = DOM.eventSelect) {
  const container = DOM.themeQuickSelect;
  const seasonalSection = DOM.themeSeasonalSection;
  const seasonalContent = DOM.themeSeasonalContent;
  if (!container || !selectEl) return;
  container.innerHTML = "";
  if (seasonalContent) seasonalContent.innerHTML = "";
  if (seasonalSection) seasonalSection.classList.add("hidden");
  const options = Array.from(selectEl.options || []).filter(
    (opt) => opt && opt.value
  );
  if (!options.length) {
    container.classList.add("hidden");
    return;
  }
  container.classList.remove("hidden");
  const holidayOrder = [
    { key: "newyear", order: 1 },
    { key: "valentine", order: 2 },
    { key: "st-patrick", order: 3 },
    { key: "stpatrick", order: 3 },
    { key: "easter", order: 4 },
    { key: "halloween", order: 10 },
    { key: "thanksgiving", order: 11 },
    { key: "christmas", order: 12 },
  ];
  const getHolidayOrder = (value, label) => {
    const text = `${value} ${label}`.toLowerCase().replace(/\s+/g, "");
    const hit = holidayOrder.find((entry) => text.includes(entry.key));
    return hit ? hit.order : null;
  };
  const items = options.map((opt) => {
    const theme = resolveThemeByKey(opt.value);
    const label = opt.textContent || opt.value;
    const holidayOrderValue = getHolidayOrder(opt.value, label);
    return {
      value: opt.value,
      label,
      theme,
      holidayOrder: holidayOrderValue,
    };
  });
  const selectedType = getSelectedEventType();
  const mainItems = items
    .filter((item) => !(item.theme && item.theme.vibeParentKey))
    .filter((item) => item.holidayOrder === null)
    .filter((item) =>
      shouldIncludeThemeForSelectedType(item.value, item.theme, selectedType)
    )
    .sort((a, b) => {
      const aPriority = getThemeEventTypePriority(a, selectedType);
      const bPriority = getThemeEventTypePriority(b, selectedType);
      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.label.localeCompare(b.label);
    });
  const holidayItems = items
    .filter((item) => !(item.theme && item.theme.vibeParentKey))
    .filter((item) => item.holidayOrder !== null)
    .filter((item) =>
      shouldIncludeThemeForSelectedType(item.value, item.theme, selectedType)
    )
    .sort((a, b) => (a.holidayOrder || 99) - (b.holidayOrder || 99));

  if (!mainItems.length) {
    container.classList.add("hidden");
  } else {
    const grid = document.createElement("div");
    grid.className = "theme-card-grid";
    mainItems.forEach((item) => {
      grid.appendChild(buildThemeCard(item, { isHoliday: false, selectEl }));
    });
    container.appendChild(grid);
    container.classList.remove("hidden");
  }

  if (seasonalSection && seasonalContent && holidayItems.length) {
    seasonalSection.classList.remove("hidden");
    const grid = document.createElement("div");
    grid.className = "theme-card-grid";
    holidayItems.forEach((item) => {
      grid.appendChild(buildThemeCard(item, { isHoliday: true, selectEl }));
    });
    seasonalContent.appendChild(grid);
  }

  highlightThemeQuickSelect(selectEl.value);
  renderThemeVibesSection(items, selectEl.value);
}

function highlightThemeQuickSelect(value) {
  const container = DOM.themeQuickSelect;
  if (!container) return;
  Array.from(document.querySelectorAll(".theme-card")).forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.value === value);
  });
}

function showToast(message, duration = 2000) {
  const t = DOM.toast;
  if (!t) return;
  t.textContent = message;
  t.classList.add("show");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.remove("show");
  }, duration);
}

function setVideoImportStatus(message) {
  if (!DOM.videoImportStatus) return;
  DOM.videoImportStatus.textContent = message || "Ready for video import.";
  if (DOM.booth360Status && currentMode === "360") {
    DOM.booth360Status.textContent = message || "360 Mode Active";
  }
}

function showMessage(message, duration = 1800) {
  setVideoImportStatus(message);
  showToast(message, duration);
}

function set360Status(title, note = "", isWarning = false) {
  if (DOM.booth360StatusText)
    DOM.booth360StatusText.textContent = title || "360 Mode Active";
  if (DOM.booth360StatusNote) DOM.booth360StatusNote.textContent = note || "";
  if (DOM.booth360Status) {
    DOM.booth360Status.style.borderColor = isWarning ? "var(--danger)" : "";
    DOM.booth360Status.style.boxShadow = isWarning
      ? "0 0 0 4px rgba(220, 79, 113, 0.15)"
      : "";
  }
}

function updateCaptureModeUi() {
  const is360Mode = currentMode === "360";
  if (DOM.boothScreen) DOM.boothScreen.classList.toggle("mode-360", is360Mode);
  if (DOM.modeToggle) {
    DOM.modeToggle.textContent = is360Mode
      ? "Switch to Photo Mode"
      : "Switch to 360 Mode";
  }
  if (DOM.captureBtn) DOM.captureBtn.classList.toggle("hidden", is360Mode);
  if (DOM.boothControls)
    DOM.boothControls.classList.toggle("hidden", is360Mode);
  if (DOM.options) DOM.options.classList.toggle("hidden", is360Mode);
  if (DOM.videoImportPanel)
    DOM.videoImportPanel.classList.toggle("hidden", !is360Mode);
  if (DOM.booth360Panel)
    DOM.booth360Panel.classList.toggle("hidden", !is360Mode);
  if (
    DOM.booth360Status &&
    is360Mode &&
    !isImporting360Video &&
    !isRunning360Sequence
  ) {
    set360Status(
      "Ready for a remote-triggered 360 take",
      "Start recording on the iPhone first, then use the arm remote to run the spin while the booth handles countdown and upload."
    );
  }
  if (is360Mode) {
    setMobileSettingsOpen(false);
  }
  syncMobileSettingsUi();
}

function setCaptureMode(nextMode = "photo") {
  currentMode = nextMode === "360" ? "360" : "photo";
  updateCaptureModeUi();
}

/**
 * Plays a short, sharp audio cue to signal the end of the spin.
 */
function playStopAlert() {
  try {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      440,
      context.currentTime + 0.3
    );
    gain.gain.setValueAtTime(0.1, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.3);
  } catch (_) {}
}

async function run360Countdown(signal) {
  for (let n = 3; n > 0; n -= 1) {
    await showCountdown(String(n), signal);
  }
  await showCountdown("GO", signal);
}

async function start360Sequence() {
  if (currentMode !== "360") return;

  // If already spinning, the next remote press stops the arm immediately
  if (isRunning360Sequence) {
    if (spinAbortController) spinAbortController.abort();
    return;
  }

  if (DOM.start360Btn) DOM.start360Btn.disabled = true;
  if (DOM.triggerZone) DOM.triggerZone.disabled = true;

  isRunning360Sequence = true;
  spinAbortController = new AbortController();
  const { signal } = spinAbortController;

  try {
    set360Status(
      "Get ready",
      "iPhone should already be recording before the countdown begins."
    );
    showMessage("Get ready");
    await run360Countdown(signal);
    set360Status(
      "🎥 Spin in progress",
      "Keep the platform moving while the iPhone records the full take."
    );
    setVideoImportStatus("🎥 Recording...");
    await setMotorPower(true); // START THE MOTOR
    await delay(APP_CONFIG.TIMERS.SPIN_DURATION, signal);
    await setMotorPower(false); // STOP THE MOTOR
    playStopAlert();
    set360Status(
      "🛑 STOP ARM",
      "Spin complete. Stop the motor arm and finish the iPhone recording.",
      true
    );
    setVideoImportStatus("Stop recording on iPhone");
    await delay(1000);
    set360Status(
      "📲 Send the clip",
      "AirDrop the video or tap upload. Processing starts automatically."
    );
    setVideoImportStatus("📲 AirDrop your video or tap to upload.");
  } catch (err) {
    if (err.name === "AbortError") {
      set360Status("🛑 MANUAL STOP", "Operator stopped the spin early.");
      setVideoImportStatus("Spin stopped manually.");
    }
  } finally {
    await setMotorPower(false); // Safety: Always ensure motor is cut
    isRunning360Sequence = false;
    spinAbortController = null;
    if (DOM.start360Btn) DOM.start360Btn.disabled = false;
    if (DOM.triggerZone) DOM.triggerZone.disabled = false;
  }
}

function isImportableVideoFile(file) {
  if (!file) return false;
  if (file.type && file.type.startsWith("video/")) return true;
  return /\.(mp4|mov|m4v|webm|qt|hevc)$/i.test(file.name || "");
}

function onFileReceived() {
  set360Status(
    "📥 Video received",
    "The booth has the clip now. Processing starts automatically."
  );
  showMessage("📥 Video received");
  window.setTimeout(() => {
    if (!isImporting360Video) {
      setVideoImportStatus("🎬 Processing...");
    }
  }, 500);
}

async function process360Video(file) {
  if (!isImportableVideoFile(file)) {
    showMessage("Choose a video file.");
    return;
  }
  if (isImporting360Video) {
    showMessage("Already processing a video.");
    return;
  }
  isImporting360Video = true;
  const previewPlaceholder =
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
  try {
    set360Status(
      "🎬 Processing clip",
      "Trimming, building the replay, and preparing the share link."
    );
    setVideoImportStatus("🎬 Processing...");
    setLiveClip(file);
    showFinal(previewPlaceholder, {
      shareType: "video",
      shareBlob: file,
      skipShare: true,
    });
    set360Status(
      "☁️ Uploading",
      "Publishing the finished 360 clip so the QR code can open it."
    );
    setVideoImportStatus("☁️ Uploading...");
    if (DOM.shareStatus) {
      DOM.shareStatus.textContent = "Uploading video…";
      DOM.shareStatus.style.display = "inline-flex";
    }
    const uploadResult = await uploadCaptureOnce({
      previewUrl: previewPlaceholder,
      mediaBlob: file,
      resourceType: "video",
      modeName: "360",
    });
    const publicUrl = uploadResult.publicUrl;
    if (!publicUrl) {
      if (DOM.qrHint) {
        DOM.qrHint.textContent = cloudinaryEnabled()
          ? "Upload failed. Try sending the video again."
          : "Enable Cloudinary in Admin to generate a QR code for videos.";
        DOM.qrHint.style.display = "block";
      }
      if (DOM.shareStatus) DOM.shareStatus.textContent = "Upload failed";
      setVideoImportStatus("Upload failed");
      return;
    }

    lastShareUrl = publicUrl;
    const qrRendered = DOM.qrCode
      ? await renderQrCode(DOM.qrCode, publicUrl)
      : false;
    if (DOM.shareLink) {
      DOM.shareLink.href = publicUrl;
      DOM.shareLink.textContent = publicUrl;
    }
    if (DOM.shareLinkRow) DOM.shareLinkRow.style.display = "flex";
    if (DOM.qrCodeContainer) {
      DOM.qrCodeContainer.dataset.ready = qrRendered ? "true" : "false";
      DOM.qrCodeContainer.classList.remove("hidden");
    }
    if (DOM.qrHint) {
      DOM.qrHint.textContent = qrRendered
        ? ""
        : "Open the link button if the QR does not appear.";
      DOM.qrHint.style.display = qrRendered ? "none" : "block";
    }
    if (DOM.shareStatus) DOM.shareStatus.textContent = qrRendered ? "Link ready" : "QR failed";
    set360Status(
      qrRendered ? "Ready to share" : "Link ready",
      qrRendered
        ? "QR code is ready for guests to scan."
        : "The share link is ready, but the QR code did not render."
    );
    setVideoImportStatus(qrRendered ? "Ready" : "QR failed");
  } catch (error) {
    console.error("360 video processing failed", error);
    if (DOM.shareStatus) {
      DOM.shareStatus.textContent = "Processing failed";
      DOM.shareStatus.style.display = "inline-flex";
    }
    if (DOM.qrHint) {
      DOM.qrHint.textContent =
        "Processing failed. Try a shorter clip or re-send the video.";
      DOM.qrHint.style.display = "block";
    }
    set360Status(
      "Processing failed",
      "Try sending the clip again or use a shorter recording."
    );
    setVideoImportStatus("Processing failed");
  } finally {
    isImporting360Video = false;
    if (DOM.videoInput) DOM.videoInput.value = "";
  }
}

function handleImportedVideoFile(file) {
  if (!file) return;
  onFileReceived();
  window.setTimeout(() => {
    process360Video(file).catch((error) => {
      console.error("Imported video failed", error);
      setVideoImportStatus("Processing failed");
    });
  }, 500);
}

function setupVideoImportControls() {
  setVideoImportStatus("Ready for video import.");
  if (DOM.videoInput) {
    DOM.videoInput.addEventListener("change", (event) => {
      const input = event.target;
      const file = input && input.files ? input.files[0] : null;
      if (file) handleImportedVideoFile(file);
    });
  }

  if (DOM.airdropZone && DOM.videoInput) {
    DOM.airdropZone.addEventListener("click", () => DOM.videoInput.click());
    DOM.airdropZone.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        DOM.videoInput.click();
      }
    });
    ["dragenter", "dragover"].forEach((type) => {
      DOM.airdropZone.addEventListener(type, (event) => {
        event.preventDefault();
        DOM.airdropZone.classList.add("drag-active");
      });
    });
    ["dragleave", "drop"].forEach((type) => {
      DOM.airdropZone.addEventListener(type, () => {
        DOM.airdropZone.classList.remove("drag-active");
      });
    });
  }

  document.addEventListener("dragover", (event) => {
    event.preventDefault();
  });
  document.addEventListener("drop", (event) => {
    event.preventDefault();
    if (DOM.airdropZone) DOM.airdropZone.classList.remove("drag-active");
    const file =
      event.dataTransfer && event.dataTransfer.files
        ? event.dataTransfer.files[0]
        : null;
    if (file) handleImportedVideoFile(file);
  });
}

function setup360ModeControls() {
  if (DOM.modeToggle) {
    DOM.modeToggle.addEventListener("click", () => {
      setCaptureMode(currentMode === "360" ? "photo" : "360");
    });
  }
  if (DOM.start360Btn) {
    DOM.start360Btn.addEventListener("click", () => {
      start360Sequence();
    });
  }
  if (DOM.triggerZone) {
    DOM.triggerZone.addEventListener("click", () => {
      start360Sequence();
    });
    DOM.triggerZone.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        start360Sequence();
      }
    });
  }
  document.addEventListener("keydown", (event) => {
    if (currentMode !== "360") return;

    // Common keys emitted by generic/unbranded Bluetooth remotes
    const remoteTriggerKeys = [
      "Space",
      "Enter",
      "ArrowUp",
      "ArrowDown",
      "PageUp",
      "PageDown",
    ];

    if (
      !remoteTriggerKeys.includes(event.code) &&
      !remoteTriggerKeys.includes(event.key)
    )
      return;

    const target = event.target;
    const tag =
      target && target.tagName ? String(target.tagName).toLowerCase() : "";

    // Don't trigger if the user is actually typing in a field
    if (
      ["input", "textarea", "select"].includes(tag) ||
      target?.isContentEditable
    )
      return;

    event.preventDefault();
    start360Sequence();
  });
  updateCaptureModeUi();
}

function setEventSelection(key) {
  if (!DOM.eventSelect || !key) return false;
  key = normalizeThemeSelectionKey(key);
  const options = Array.from(DOM.eventSelect.options || []);
  const match = options.find((opt) => opt.value === key);
  if (!match) return false;
  DOM.eventSelect.value = key;
  highlightThemeQuickSelect(key);
  updateThemeEditorSummary();
  return true;
}

function resolvePreferredThemeKey(preferredKey) {
  preferredKey = normalizeThemeSelectionKey(preferredKey);
  if (!DOM.eventSelect) return preferredKey || DEFAULT_THEME_KEY || null;
  const options = Array.from(DOM.eventSelect.options || []);
  const hasKey = (key) => !!key && options.some((opt) => opt.value === key);
  if (hasKey(preferredKey)) return preferredKey;
  if (hasKey(DEFAULT_THEME_KEY)) return DEFAULT_THEME_KEY;
  const generalOption = options.find(
    (opt) => typeof opt.value === "string" && opt.value.startsWith("general:")
  );
  if (generalOption) return generalOption.value;
  const generalStandalone = options.find((opt) => opt.value === "general");
  if (generalStandalone) return generalStandalone.value;
  return options.length ? options[0].value : null;
}

function resolveThemeByKey(themeKey) {
  themeKey = normalizeThemeSelectionKey(themeKey);
  if (!themeKey) return null;
  if (themeKey.includes(":")) {
    const [rootKey, leafKey] = themeKey.split(":");
    const root = themes[rootKey];
    if (!root) return null;
    if (root.themes && root.themes[leafKey]) return root.themes[leafKey];
    if (root.holidays && root.holidays[leafKey]) return root.holidays[leafKey];
    return null;
  }
  return themes[themeKey] || null;
}

function normalizeThemeSelectionKey(themeKey) {
  const key = String(themeKey || "").trim();
  if (!key || key.includes(":")) return key;
  const builtinGroup = BUILTIN_THEMES[key];
  if (!builtinGroup || typeof builtinGroup !== "object") return key;
  for (const bucket of ["themes", "holidays"]) {
    const children = builtinGroup[bucket];
    if (!children || typeof children !== "object") continue;
    const firstChildKey = Object.keys(children)[0];
    if (firstChildKey) return `${key}:${firstChildKey}`;
  }
  return key;
}

function resolveThemeStorage(key) {
  if (!key) return { parent: themes, bucket: null, root: null };
  if (!key.includes(":")) {
    return { parent: themes, bucket: null, root: key };
  }
  const [rootKey, leafKey] = key.split(":");
  const parent = themes[rootKey];
  if (!parent || typeof parent !== "object") {
    return { parent: themes, bucket: null, root: rootKey };
  }
  if (parent.themes && parent.themes[leafKey]) {
    return { parent, bucket: "themes", root: rootKey };
  }
  if (parent.holidays && parent.holidays[leafKey]) {
    return { parent, bucket: "holidays", root: rootKey };
  }
  return { parent: themes, bucket: null, root: rootKey };
}

function applyThemeFontStyles(theme) {
  const headingCss =
    (theme && (theme.fontHeading || theme.font)) || "'Comic Neue', cursive";
  const bodyCss =
    (theme && (theme.fontBody || theme.font)) || "'Comic Neue', cursive";
  document.documentElement.style.setProperty("--font-heading", headingCss);
  document.documentElement.style.setProperty("--font-body", bodyCss);
  document.documentElement.style.setProperty("--font", bodyCss);
  document.body.style.fontFamily = bodyCss || "montserrat, sans-serif";
  if (DOM.eventTitle) DOM.eventTitle.style.fontFamily = headingCss || bodyCss;
  if (DOM.welcomeTitle)
    DOM.welcomeTitle.style.fontFamily = headingCss || bodyCss;
  ensureFontLoadedForFontString(headingCss);
  ensureFontLoadedForFontString(bodyCss);
}

function resolveHexColorValue(color, fallback = "#7abf92") {
  if (typeof color === "string" && /^#([0-9a-f]{6})$/i.test(color.trim()))
    return color.trim();
  const converted = colorToHex(color || "");
  if (converted && /^#([0-9a-f]{6})$/i.test(converted)) return converted;
  return fallback;
}

function mixRgbValue(a, b, ratio = 0.5) {
  const safeRatio = Math.max(0, Math.min(1, Number(ratio)));
  const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));
  return {
    r: clamp(a.r + (b.r - a.r) * safeRatio),
    g: clamp(a.g + (b.g - a.g) * safeRatio),
    b: clamp(a.b + (b.b - a.b) * safeRatio),
  };
}

function rgbToHexValue(rgb) {
  const toHex = (value) =>
    Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0");
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

function buildActionPalette(theme) {
  const accentHex = resolveHexColorValue(theme && theme.accent, "#6fb883");
  const accent2Hex = resolveHexColorValue(theme && theme.accent2, "#ffffff");
  const white = { r: 255, g: 255, b: 255 };
  const base = hexToRgb(accentHex);
  const secondary = hexToRgb(accent2Hex);
  const start = rgbToHexValue(mixRgbValue(base, white, 0.62));
  const mid = rgbToHexValue(mixRgbValue(base, secondary, 0.3));
  const end = rgbToHexValue(mixRgbValue(secondary, white, 0.2));
  const border = rgbToHexValue(mixRgbValue(base, white, 0.78));
  const outline = rgbToHexValue(
    mixRgbValue(base, { r: 20, g: 40, b: 30 }, 0.24)
  );
  const textLightness =
    (base.r * 0.299 + base.g * 0.587 + base.b * 0.114) / 255;
  const text = textLightness > 0.62 ? "#1f3a28" : "#f7fff9";
  return { start, mid, end, border, outline, text };
}

function applyThemeBasics(theme) {
  document.documentElement.style.setProperty(
    "--accent",
    theme.accent || "orange"
  );
  document.documentElement.style.setProperty(
    "--accent2",
    theme.accent2 || "white"
  );
  const palette = buildActionPalette(theme);
  document.documentElement.style.setProperty(
    "--action-grad-start",
    palette.start
  );
  document.documentElement.style.setProperty("--action-grad-mid", palette.mid);
  document.documentElement.style.setProperty("--action-grad-end", palette.end);
  document.documentElement.style.setProperty("--action-border", palette.border);
  document.documentElement.style.setProperty(
    "--action-outline",
    palette.outline
  );
  document.documentElement.style.setProperty("--action-text", palette.text);
  applyThemeFontStyles(theme);
  applyBannerSize(theme);
  applyWelcomeTitleSize(theme);
  applyThemeBackground(theme);
}

function refreshFontSelectForTheme(theme) {
  setupFontPicker()
    .then(() => {
      refreshFontPickerUI(theme || activeTheme || {});
    })
    .catch(() => {});
}

function refreshBackgroundFromFolder(theme) {
  resolveBackgroundFromFolder(theme)
    .then((autoBg) => {
      if (!autoBg) return;
      DOM.boothScreen.style.backgroundImage = `url(${autoBg})`;
      if (DOM.welcomeScreen)
        DOM.welcomeScreen.style.backgroundImage =
          DOM.boothScreen.style.backgroundImage;
    })
    .catch(() => {
      /* ignore */
    });
}

function refreshBackgroundList(theme) {
  resolveBackgroundListFromFolder(theme)
    .then((list) => {
      if (!Array.isArray(list) || !list.length) return;
      theme.backgroundsTmp = list;
      const combined = getBaseBackgroundList(theme);
      if (combined.length > 0) {
        if (
          typeof theme.backgroundIndex !== "number" ||
          theme.backgroundIndex >= combined.length
        ) {
          theme.backgroundIndex = 0;
        }
        const currentBg = getActiveBackground(theme);
        if (currentBg) {
          DOM.boothScreen.style.backgroundImage = `url(${currentBg})`;
          if (DOM.welcomeScreen)
            DOM.welcomeScreen.style.backgroundImage =
              DOM.boothScreen.style.backgroundImage;
        }
      }
      renderCurrentAssets(theme);
    })
    .catch(() => {
      /* ignore */
    });
}

function refreshOverlaysFromFolder(theme) {
  resolveOverlaysFromFolder(theme)
    .then((list) => {
      if (Array.isArray(list) && list.length) {
        theme.overlaysTmp = list;
        renderCurrentAssets(theme);
        renderOptions();
      } else {
        theme.overlaysTmp = undefined;
      }
    })
    .catch(() => {
      theme.overlaysTmp = undefined;
    });
}

function refreshTemplatesFromFolder(theme) {
  resolveTemplatesFromFolder(theme)
    .then((list) => {
      if (Array.isArray(list) && list.length) {
        theme.templatesTmp = list;
        renderCurrentAssets(theme);
        renderOptions();
      } else {
        theme.templatesTmp = undefined;
      }
    })
    .catch(() => {
      theme.templatesTmp = undefined;
    });
}

function syncAdminUiWithTheme(themeKey, theme) {
  const currentKey =
    themeKey || (DOM.eventSelect && DOM.eventSelect.value) || "";
  const active = getActiveEvent();
  const storedName = active ? active.name : getStoredEventName(currentKey);
  const storedDate = active ? active.date : getStoredEventDate(currentKey);
  syncBannerText();
  renderThemeQuickSelect(DOM.eventSelect);
  if (DOM.logo) {
    const logoSrc = resolveEventLogo(theme);
    if (logoSrc) {
      DOM.logo.src = logoSrc;
      DOM.logo.classList.remove("hidden");
    } else {
      DOM.logo.src = "";
      DOM.logo.classList.add("hidden");
    }
  }
  selectedOverlay = null;
  lastPhotoOverlay = null;
  if (DOM.liveOverlay) DOM.liveOverlay.src = "";
  refreshFontSelectForTheme(theme);
  if (DOM.options) renderOptions();
  syncThemeEditorWithActiveTheme();
  if (DOM.eventNameInput) DOM.eventNameInput.value = storedName || "";
  if (DOM.eventDateInput) DOM.eventDateInput.value = storedDate || "";
  updateStylePreview();
}

function loadTheme(themeKey) {
  themeKey = normalizeThemeSelectionKey(themeKey);
  console.log("Loading theme:", themeKey);
  if (!themeKey) {
    console.warn("No theme key provided to loadTheme");
    return;
  }
  const theme = resolveThemeByKey(themeKey);
  if (!theme) {
    console.warn("Theme not found for key:", themeKey);
    return;
  }
  setEventSelection(themeKey);
  highlightThemeQuickSelect(themeKey);
  if (activeSessionThemeKey && activeSessionThemeKey !== themeKey) {
    resetActiveSessionAssets();
  }
  activeSessionThemeKey = themeKey;
  activeTheme = theme;
  const globalLogo = getGlobalLogo();
  if (globalLogo !== null) applyGlobalLogoToTheme(activeTheme, globalLogo);

  applyThemeBasics(theme);
  refreshBackgroundFromFolder(theme);
  refreshBackgroundList(theme);
  refreshOverlaysFromFolder(theme);
  refreshTemplatesFromFolder(theme);
  logEffectiveAssetState(theme, "loadTheme");
  syncAdminUiWithTheme(themeKey, theme);
  renderAssetLibrary();
  updateCreatePathAssetSummary();
  updateLaunchSummary();
  syncSessionThemeSearch();
  syncSessionFontSearch();
}

// Convert any CSS color string to hex (#rrggbb); returns '' on failure
function colorToHex(colorStr) {
  try {
    const el = document.createElement("span");
    el.style.color = colorStr;
    document.body.appendChild(el);
    const rgb = getComputedStyle(el).color; // e.g., 'rgb(255, 165, 0)'
    document.body.removeChild(el);
    const m = rgb.match(/rgba?\((\d+), ?(\d+), ?(\d+)/);
    if (!m) return "";
    const r = parseInt(m[1]).toString(16).padStart(2, "0");
    const g = parseInt(m[2]).toString(16).padStart(2, "0");
    const b = parseInt(m[3]).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`;
  } catch (_e) {
    return "";
  }
}

function updateThemeEditorSummary() {
  const eventKey = DOM.eventSelect && DOM.eventSelect.value;
  const eventTheme = getThemeByKey(eventKey);
  if (DOM.themeEditorActive) {
    DOM.themeEditorActive.textContent = describeActiveTheme(
      eventTheme,
      eventKey
    );
  }
  if (DOM.themeEditorEditing) {
    DOM.themeEditorEditing.textContent = describeEditingState();
  }
  updateStylePreview();
}

function showFontPickerModal() {
  if (!DOM.fontPickerModal) return;
  DOM.fontPickerModal.classList.add("show");
}

function hideFontPickerModal() {
  if (!DOM.fontPickerModal) return;
  DOM.fontPickerModal.classList.remove("show");
}

function describeActiveTheme(theme, key) {
  if (theme || key) return getThemeSetupDisplayLabel(key, theme);
  return "None selected";
}

function describeEditingState() {
  const mode = DOM.themeEditorModeSelect
    ? DOM.themeEditorModeSelect.value
    : "edit";
  if (mode === "create") {
    const name =
      valueFromInput(DOM.createThemeName) || valueFromInput(DOM.themeName);
    return name
      ? `Creating Custom Theme: \"${name}\"`
      : "Creating Custom Theme";
  }
  const currentKey = DOM.eventSelect && DOM.eventSelect.value;
  const currentTheme = getThemeByKey(currentKey);
  const displayName =
    valueFromInput(DOM.themeName) ||
    (currentTheme && currentTheme.name) ||
    currentKey ||
    "Choose a theme";
  return `Using: ${displayName}`;
}

function syncThemeEditorWithActiveTheme() {
  if (!activeTheme) return;
  applyThemeEditorBasics(activeTheme);
  applyThemeEditorColors(activeTheme);
  updateThemeEditorSummaries(activeTheme);
  renderCurrentAssets(activeTheme);
  updateCurrentEventAssetsPanel(activeTheme);
  syncBannerSizeUI(activeTheme);
  syncWelcomeTitleSizeUI(activeTheme);
  updateThemeEditorSummary();
}

function updateStylePreview() {
  if (
    !DOM.stylePreviewHeading ||
    !DOM.stylePreviewSubheading ||
    !DOM.stylePreviewBody ||
    !DOM.stylePreviewButton
  )
    return;
  const bannerText = resolveBannerText();
  const welcomeTitle = resolveWelcomeTitle();
  const prompt = resolveStartButtonText();
  const captureLabel = resolveCaptureLabel();

  if (!isPreviewEditing(DOM.stylePreviewHeading)) {
    DOM.stylePreviewHeading.textContent = bannerText || welcomeTitle;
  }
  if (!isPreviewEditing(DOM.stylePreviewSubheading)) {
    DOM.stylePreviewSubheading.textContent = welcomeTitle;
  }
  if (!isPreviewEditing(DOM.stylePreviewBody)) {
    DOM.stylePreviewBody.textContent = captureLabel;
  }
  if (!isPreviewEditing(DOM.stylePreviewButton)) {
    DOM.stylePreviewButton.textContent = prompt;
  }
  syncBannerText();
  syncWelcomeText();
  syncCaptureButtonText();
  if (DOM.eventGalleryLink) {
    const active = getActiveEvent();
    if (!active) {
      DOM.eventGalleryLink.textContent =
        "Select an event to enable gallery link.";
    } else {
      const link = getEventGalleryUrl();
      DOM.eventGalleryLink.textContent = link
        ? link
        : "Set Cloudinary to enable gallery link.";
    }
  }
}

function applyThemeEditorBasics(theme) {
  if (DOM.themeName) DOM.themeName.value = theme.name || "";
  setupFontPicker()
    .then(() => {
      refreshFontPickerUI(theme || {});
    })
    .catch(() => {});
  if (DOM.themeWelcomeTitle)
    DOM.themeWelcomeTitle.value = (theme.welcome && theme.welcome.title) || "";
  if (DOM.themeWelcomePrompt)
    DOM.themeWelcomePrompt.value =
      (theme.welcome && theme.welcome.prompt) || "";
  if (DOM.themeOverlaysFolder)
    DOM.themeOverlaysFolder.value = theme.overlaysFolder || "";
  if (DOM.themeTemplatesFolder)
    DOM.themeTemplatesFolder.value = theme.templatesFolder || "";
}

function applyThemeEditorColors(theme) {
  const primary =
    theme.accent && theme.accent.startsWith("#")
      ? theme.accent
      : colorToHex(theme.accent || "");
  const secondary =
    theme.accent2 && theme.accent2.startsWith("#")
      ? theme.accent2
      : colorToHex(theme.accent2 || "");
  if (primary && DOM.themeAccent) DOM.themeAccent.value = primary;
  if (secondary && DOM.themeAccent2) DOM.themeAccent2.value = secondary;
}

function updateThemeEditorSummaries(theme) {
  const baseOverlays = getBaseOverlayList(theme);
  const baseTemplates = getBaseTemplateList(theme);
  if (DOM.summaryBackground) {
    const hasExplicit =
      Array.isArray(theme.backgrounds) && theme.backgrounds.length > 0;
    const hasTemp =
      Array.isArray(theme.backgroundsTmp) && theme.backgroundsTmp.length > 0;
    const hasAny = !!theme.background || hasExplicit || hasTemp;
    DOM.summaryBackground.textContent = hasAny
      ? "Current background: set"
      : "Current background: none";
  }
  if (DOM.summaryLogo)
    DOM.summaryLogo.textContent = theme.logo
      ? "Current logo: set"
      : "Current logo: none";
  if (DOM.summaryOverlays)
    DOM.summaryOverlays.textContent = `Existing overlays: ${baseOverlays.length}`;
  if (DOM.summaryTemplates)
    DOM.summaryTemplates.textContent = `Templates: ${baseTemplates.length}`;
}

function setThemeAccentValue(theme, key, color) {
  if (!theme || (key !== "accent" && key !== "accent2")) return;
  theme[key] = color;
  applyThemeBasics(theme);
  applyThemeEditorColors(theme);
  saveThemesToStorage();
  renderCurrentAssets(theme);
  updateStylePreview();
  if (DOM.options) renderOptions();
}

function removeGreen(ctx, width, height) {
  const frame = ctx.getImageData(0, 0, width, height);
  const d = frame.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    if (g > 110 && g > r * 1.3 && g > b * 1.3) {
      d[i + 3] = 0;
    }
  }
  ctx.putImageData(frame, 0, 0);
}

async function ensureAiSegmentation() {
  if (aiSegmentation) return aiSegmentation;
  if (aiSegmentationPromise) return aiSegmentationPromise;
  if (
    typeof window === "undefined" ||
    typeof window.SelfieSegmentation === "undefined"
  )
    return null;
  aiSegmentationPromise = new Promise((resolve) => {
    const segmenter = new window.SelfieSegmentation({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
    });
    segmenter.setOptions({ modelSelection: 1 });
    segmenter.onResults((results) => {
      if (typeof aiSegmentationResolver === "function") {
        aiSegmentationResolver(results);
      }
      aiSegmentationResolver = null;
    });
    aiSegmentation = segmenter;
    resolve(segmenter);
  });
  return aiSegmentationPromise;
}

async function getAiSegmentationMask(sourceCanvas) {
  const segmenter = await ensureAiSegmentation();
  if (!segmenter) return null;
  return new Promise((resolve) => {
    aiSegmentationResolver = (results) => {
      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = sourceCanvas.width;
      maskCanvas.height = sourceCanvas.height;
      const maskCtx = maskCanvas.getContext("2d");
      if (maskCtx && results && results.segmentationMask) {
        maskCtx.drawImage(
          results.segmentationMask,
          0,
          0,
          maskCanvas.width,
          maskCanvas.height
        );
        resolve(maskCanvas);
      } else {
        resolve(null);
      }
    };
    segmenter.send({ image: sourceCanvas }).catch(() => resolve(null));
  });
}

function applyAiMaskToCanvas(sourceCanvas, maskCanvas) {
  if (!maskCanvas) return sourceCanvas;
  const c = document.createElement("canvas");
  c.width = sourceCanvas.width;
  c.height = sourceCanvas.height;
  const ctx = c.getContext("2d");
  if (!ctx) return sourceCanvas;
  ctx.drawImage(sourceCanvas, 0, 0);
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(maskCanvas, 0, 0, c.width, c.height);
  ctx.globalCompositeOperation = "source-over";
  return c;
}

function renderCurrentAssets(theme) {
  // Helpers
  const active = getActiveEvent();
  const lockBaseThemeAssets = !!active;
  const removedBackgrounds = new Set(
    Array.isArray(theme && theme.backgroundsRemoved)
      ? theme.backgroundsRemoved
      : []
  );
  const baseFolderList = Array.isArray(theme && theme.backgroundsTmp)
    ? theme.backgroundsTmp.filter((src) => src && !removedBackgrounds.has(src))
    : [];
  const baseBgList = getBaseBackgroundList(theme);
  const bgList = getBackgroundList(theme);
  const baseGreenList = Array.isArray(theme && theme.greenBackgrounds)
    ? theme.greenBackgrounds.filter(Boolean)
    : [];
  const greenBgList = getGreenBackgroundList(theme);
  const eventOverrides = getActiveEventOverrides();
  const hasSessionBackgrounds =
    Array.isArray(activeSessionAssets.backgrounds) &&
    activeSessionAssets.backgrounds.length > 0;
  const hasSessionGreenBackgrounds =
    Array.isArray(activeSessionAssets.greenBackgrounds) &&
    activeSessionAssets.greenBackgrounds.length > 0;
  const baseFolderSet = new Set(baseFolderList);
  const hasEventBackgrounds =
    Array.isArray(eventOverrides.backgrounds) &&
    eventOverrides.backgrounds.length > 0;
  const hasEventGreenBackgrounds =
    Array.isArray(eventOverrides.greenBackgrounds) &&
    eventOverrides.greenBackgrounds.length > 0;
  const selectedBg = bgList.length
    ? bgList.indexOf(getActiveBackground(theme))
    : -1;
  const selectedGreenBg = greenBgList.length
    ? greenBgList.indexOf(getActiveGreenBackground(theme))
    : -1;
  const setSingle = (wrap, src, type, isEventOwned = false) => {
    if (!wrap) return;
    wrap.innerHTML = "";
    if (src) {
      const item = createAssetTile(src);
      wrap.appendChild(item);
    } else {
      const span = document.createElement("span");
      span.style.color = "#888";
      span.textContent = "None";
      wrap.appendChild(span);
    }
  };
  const getLocalIndex = (kind, src) => {
    if (!src) return -1;
    if (kind === "overlay") {
      if (!Array.isArray(theme.overlays)) return -1;
      return theme.overlays.findIndex(
        (item) => (typeof item === "string" ? item : item.src) === src
      );
    }
    if (kind === "template") {
      if (!Array.isArray(theme.templates)) return -1;
      return theme.templates.findIndex((item) => item && item.src === src);
    }
    return -1;
  };
  const setGrid = (
    wrap,
    list,
    withBadge = false,
    kind = "",
    allowReorder = true,
    selectedValue = "",
    options = {}
  ) => {
    if (!wrap) return;
    if (kind === "background" || kind === "overlay" || kind === "template") {
      setAssetPanelMessage(kind, null);
    }
    const selectedSources = options.showSelected
      ? createAssetSelectionSet(selectedValue)
      : new Set();
    const assignedTray = options.assignedTray === true;
    wrap.innerHTML = "";
    let shown = 0;
    let hasSelected = false;
    (list || []).forEach((entry, idx) => {
      const src = getAssetEntrySrc(entry);
      if (!src) return;
      const fromFolder = typeof entry === "object" && !!entry.__folder;
      const isEvent = typeof entry === "object" && !!entry.__event;
      const isSession =
        assignedTray ||
        (typeof entry === "object" && !!entry.__session) ||
        (kind === "background" &&
          Array.isArray(activeSessionAssets.backgrounds) &&
          activeSessionAssets.backgrounds.includes(src));
      const isLibrary = typeof entry === "object" && !!entry.__library;
      const localIndex = getLocalIndex(kind, src);
      const badge =
        withBadge && typeof entry === "object" && entry.layout
          ? entry.layout
          : null;
      const item = createAssetTile(src, { badge });
      if (selectedSources.has(src)) {
        item.classList.add("selected");
        item.setAttribute("aria-selected", "true");
        hasSelected = true;
      } else {
        item.setAttribute("aria-selected", "false");
      }
      if (!assignedTray && (kind === "background" || kind === "overlay")) {
        item.addEventListener("click", () => {
          if (kind === "background") {
            selectSessionBackground(src);
          } else if (kind === "overlay") {
            selectSessionOverlay(entry);
          }
        });
      }
      item.draggable =
        !assignedTray &&
        allowReorder &&
        !lockBaseThemeAssets &&
        !fromFolder &&
        !isEvent &&
        !isSession &&
        !isLibrary &&
        localIndex >= 0;
      item.dataset.index = localIndex;
      // Drag & drop reordering
      if (
        allowReorder &&
        !lockBaseThemeAssets &&
        !fromFolder &&
        !isEvent &&
        !isSession &&
        !isLibrary &&
        localIndex >= 0
      ) {
        item.addEventListener("dragstart", (ev) => {
          ev.dataTransfer.setData("text/plain", String(localIndex));
          ev.dataTransfer.effectAllowed = "move";
        });
        item.addEventListener("dragover", (ev) => {
          ev.preventDefault();
          ev.dataTransfer.dropEffect = "move";
        });
        item.addEventListener("drop", (ev) => {
          ev.preventDefault();
          const from = parseInt(ev.dataTransfer.getData("text/plain"), 10);
          const to = parseInt(item.dataset.index, 10);
          if (!Number.isNaN(from) && !Number.isNaN(to) && from !== to) {
            reorderAssets(kind, from, to);
          }
        });
      }
      wrap.appendChild(item);
      shown++;
    });
    wrap.classList.toggle("has-selection", hasSelected);
    if ((list || []).length === 0 || shown === 0) {
      const span = document.createElement("span");
      span.className = "asset-panel-state";
      span.textContent =
        wrap.dataset.emptyText || "No items available.";
      wrap.appendChild(span);
    }
  };
  // Green screen backgrounds grid
  if (DOM.currentGreenBackgrounds) {
    const wrap = DOM.currentGreenBackgrounds;
    wrap.innerHTML = "";
    if (greenBgList.length === 0) {
      const span = document.createElement("span");
      span.style.color = "#888";
      span.textContent = "None";
      wrap.appendChild(span);
    } else {
      greenBgList.forEach((src, idx) => {
        const item = document.createElement("div");
        item.className = "asset-item";
        const img = document.createElement("img");
        img.src = withBust(src);
        img.onerror = () => renderMissingThumbnail(item, src);
        item.appendChild(img);
        wrap.appendChild(item);
      });
    }
  }
  setSingle(DOM.currentLogo, resolveEventLogo(theme), "logo");
  // Font preview
  if (DOM.currentFont) {
    DOM.currentFont.innerHTML = "";
    const entries = [
      { label: "Heading", font: theme.fontHeading || theme.font },
      { label: "Body", font: theme.fontBody || theme.font },
    ];
    let rendered = 0;
    entries.forEach((entry) => {
      const fam = primaryFontFamily(entry.font || "");
      if (!entry.font && !fam) return;
      const box = document.createElement("div");
      box.className = "font-item";
      const sample = document.createElement("div");
      sample.textContent = "Aa Bb 123";
      sample.style.fontFamily = entry.font || "inherit";
      sample.style.fontSize = "1.2em";
      sample.style.padding = "2px 6px";
      const meta = document.createElement("div");
      meta.className = "font-meta";
      meta.textContent = `${entry.label}: ${fam || "System"}`;
      box.appendChild(sample);
      box.appendChild(meta);
      DOM.currentFont.appendChild(box);
      rendered++;
    });
    if (!rendered) {
      const span = document.createElement("span");
      span.style.color = "#888";
      span.textContent = "None";
      DOM.currentFont.appendChild(span);
    }
  }
  // Accent colors
  if (DOM.currentAccents) {
    DOM.currentAccents.innerHTML = "";
    const cssAccent = getComputedStyle(document.documentElement)
      .getPropertyValue("--accent")
      .trim();
    const cssAccent2 = getComputedStyle(document.documentElement)
      .getPropertyValue("--accent2")
      .trim();
    const addColor = (label, key, color) => {
      const item = document.createElement("div");
      item.className = "color-item";
      const sw = document.createElement("button");
      sw.type = "button";
      sw.className = "color-swatch";
      sw.style.background = color || "transparent";
      const hex =
        color && color.startsWith("#")
          ? color
          : colorToHex(color || "") || color || "none";
      const text = document.createElement("span");
      text.textContent = `${label}: ${hex}`;
      const picker = document.createElement("input");
      picker.type = "color";
      picker.className = "visually-hidden";
      picker.value = hex && hex.startsWith("#") ? hex : "#ffffff";
      sw.title = "Click to pick a color";
      sw.addEventListener("click", () => picker.click());
      picker.addEventListener("input", () =>
        setThemeAccentValue(theme, key, picker.value)
      );
      item.appendChild(sw);
      item.appendChild(text);
      item.appendChild(picker);

      const palette = document.createElement("div");
      palette.className = "color-palette";
      ACCENT_PRESET_COLORS.forEach((preset) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "color-swatch preset";
        btn.style.background = preset;
        btn.title = preset;
        btn.addEventListener("click", () =>
          setThemeAccentValue(theme, key, preset)
        );
        palette.appendChild(btn);
      });
      const wrapper = document.createElement("div");
      wrapper.appendChild(item);
      wrapper.appendChild(palette);
      DOM.currentAccents.appendChild(wrapper);
    };
    addColor("Accent", "accent", theme.accent || cssAccent || "#ff7a18");
    addColor("Accent 2", "accent2", theme.accent2 || cssAccent2 || "#ffffff");
  }
}

function goAdmin() {
  hideFinal();
  applyEditModeState(false);
  if (DOM.boothScreen)
    DOM.boothScreen.classList.remove("share-mode", "countdown-mode");
  if (DOM.welcomeScreen) DOM.welcomeScreen.classList.add("faded");
  DOM.boothScreen.classList.add("hidden");
  DOM.adminScreen.classList.remove("hidden");
  document.body.classList.add("admin-open");
  document.documentElement.classList.add("admin-open");
  setBoothControlsVisible(true);
}
function applyThemeBackground(theme) {
  if (!theme) return;
  let bg = getActiveBackground(theme) || "";
  if (!bg || bg.endsWith("/")) {
    const list = getBackgroundList(theme);
    if (list && list.length) bg = list[0];
  }
  if (bg && !bg.endsWith("/")) {
    DOM.boothScreen.style.backgroundImage = `url(${bg})`;
  } else {
    DOM.boothScreen.style.backgroundImage = "";
  }
  if (DOM.welcomeScreen)
    DOM.welcomeScreen.style.backgroundImage =
      DOM.boothScreen.style.backgroundImage;
}

function getActivePhotoOverlay() {
  if (!selectedOverlay && !lastPhotoOverlay) return null;
  const src = selectedOverlay || lastPhotoOverlay;
  const overlays = getOverlayList(activeTheme);
  return (
    overlays.find((item) => item && item.src === src) ||
    normalizeOverlayDefinition({ src })
  );
}

function clearPhotoSlotLayer() {
  if (DOM.photoSlotLayer) {
    DOM.photoSlotLayer.innerHTML = "";
    DOM.photoSlotLayer.dataset.overlaySrc = "";
    DOM.photoSlotLayer.dataset.mode = "";
  }
}

function resolveStillPhotoUrl(source) {
  if (!source) return "";
  if (typeof source === "string") return source;
  if (typeof source.toDataURL === "function") {
    try {
      return source.toDataURL("image/png");
    } catch (_) {
      return "";
    }
  }
  return "";
}

function applyOverlayBackgroundLayer(overlay) {
  if (!DOM.overlayBackground) return;
  const background = overlay && overlay.background;
  DOM.overlayBackground.style.backgroundImage = "";
  DOM.overlayBackground.style.backgroundColor = "";
  if (!background) return;
  if (background.type === "color") {
    DOM.overlayBackground.style.backgroundColor = background.value || "#ffffff";
  } else if (background.type === "image" && background.src) {
    DOM.overlayBackground.style.backgroundImage = `url(${withBust(
      background.src
    )})`;
  }
}

function applyOverlayForegroundLayer(overlay) {
  if (!DOM.liveOverlay) return;
  const src = overlay ? resolveOverlayRenderSrc(activeTheme, overlay.src) : "";
  if (!src) {
    if (DOM.liveOverlay.src) DOM.liveOverlay.src = "";
    DOM.liveOverlay.style.display = "none";
    return;
  }
  const busted = withBust(src);
  if (DOM.liveOverlay.src !== busted) {
    DOM.liveOverlay.src = busted;
  }
  DOM.liveOverlay.style.display = "block";
}

function renderOverlayPhotoSlots(overlay, options = {}) {
  const layer = DOM.photoSlotLayer;
  if (!layer) return;
  const slots = overlayUsesPhotoSlots(overlay) ? overlay.photoSlots : [];
  layer.innerHTML = "";
  layer.dataset.overlaySrc = overlay && overlay.src ? overlay.src : "";
  layer.dataset.mode = options.mode || "live";
  if (!slots.length) return;
  const isLive = options.mode === "live";
  const stillUrl = resolveStillPhotoUrl(options.source);
  slots.forEach((slot) => {
    const slotEl = document.createElement("div");
    slotEl.className = "photo-slot";
    slotEl.style.left = `${slot.x * 100}%`;
    slotEl.style.top = `${slot.y * 100}%`;
    slotEl.style.width = `${slot.width * 100}%`;
    slotEl.style.height = `${slot.height * 100}%`;
    if (slot.borderRadius > 0) {
      slotEl.style.borderRadius = `${slot.borderRadius * 100}%`;
    }
    if (Number.isFinite(slot.rotation) && slot.rotation !== 0) {
      slotEl.style.transform = `rotate(${slot.rotation}deg)`;
    }
    const media = document.createElement(isLive ? "video" : "img");
    media.className = "photo-slot-media";
    media.classList.toggle("is-live", isLive);
    media.style.objectFit = slot.objectFit || "cover";
    media.style.objectPosition = slot.objectPosition || "center";
    if (isLive) {
      media.style.setProperty("transform", "scaleX(-1)", "important");
      media.style.setProperty("-webkit-transform", "scaleX(-1)", "important");
    }
    if (isLive) {
      media.autoplay = true;
      media.playsInline = true;
      media.muted = true;
      if (stream) {
        try {
          media.srcObject = stream;
        } catch (_) {}
        if (typeof media.play === "function") {
          media.play().catch(() => {});
        }
      }
    } else if (stillUrl) {
      media.alt = "";
      media.src = stillUrl;
    } else {
      slotEl.classList.add("is-empty");
    }
    slotEl.appendChild(media);
    layer.appendChild(slotEl);
  });
}

function syncOverlayPreviewSurface(options = {}) {
  if (
    capturePreviewFrozen &&
    options.mode === "live" &&
    !options.allowLiveDuringFreeze
  ) {
    return;
  }
  const overlay = options.overlay || getActivePhotoOverlay();
  const slotsEnabled = overlayUsesPhotoSlots(overlay);
  if (DOM.video) {
    DOM.video.classList.toggle("hidden", slotsEnabled);
    DOM.video.style.display = slotsEnabled ? "none" : "";
  }
  if (DOM.lastShot && !options.keepLastShot) {
    DOM.lastShot.style.display = "none";
    DOM.lastShot.removeAttribute("src");
  }
  applyOverlayBackgroundLayer(overlay);
  applyOverlayForegroundLayer(overlay);
  if (slotsEnabled) {
    renderOverlayPhotoSlots(overlay, {
      mode: options.mode || "live",
      source: options.source || null,
    });
  } else {
    clearPhotoSlotLayer();
  }
}

function clearOverlayPreviewSurface() {
  clearPhotoSlotLayer();
  if (DOM.overlayBackground) {
    DOM.overlayBackground.style.backgroundImage = "";
    DOM.overlayBackground.style.backgroundColor = "";
  }
  if (DOM.liveOverlay) {
    DOM.liveOverlay.src = "";
    DOM.liveOverlay.style.display = "none";
  }
  if (DOM.video) {
    DOM.video.classList.remove("hidden");
    DOM.video.style.display = "";
  }
}

function setMode(m) {
  if (m === "message" && !getRecordingModeEnabled()) {
    m = "live-photo";
  }
  mode = normalizeBoothModeValue(m);
  const captureMode = getSelectedCaptureMode(mode);
  applyBoothModeClass(mode);
  if (DOM.captureBtn) {
    DOM.captureBtn.textContent = resolveBoothCaptureButtonLabel(mode);
    DOM.captureBtn.classList.toggle("message-mode", mode === "message");
    DOM.captureBtn.disabled = false;
  }
  // In strip/layout/message mode, ensure no photo overlay is shown over the template preview.
  if (captureMode === "strip" || captureMode === "layout" || mode === "message") {
    if (selectedOverlay) lastPhotoOverlay = selectedOverlay;
    selectedOverlay = null;
    clearOverlayPreviewSurface();
  }
  if (captureMode === "photo") {
    syncPhotoOverlayOrientationWithAssets();
    if (
      !selectedOverlay &&
      lastPhotoOverlay &&
      photoOverlayMatchesOrientation(lastPhotoOverlay, photoOverlayOrientation)
    ) {
      selectedOverlay = lastPhotoOverlay;
    }
    syncOverlayPreviewSurface({ mode: "live" });
  }
  applyPreviewOrientation();
  logBoothFrameState("mode-change", mode);
  renderOptionsForMode(mode);
  syncBoothModeButtons();
  syncCaptureStatusIndicators();
  setMobileSettingsOpen(false);
  requestAnimationFrame(syncFrameSizeVars);
}

function getPhotoOverlayBySrc(src) {
  if (!src) return null;
  return filterAssetsForMode(getOverlayList(activeTheme), "photo").find(
    (overlay) => overlay && overlay.src === src
  );
}

function photoOverlayMatchesOrientation(src, orientation = photoOverlayOrientation) {
  const overlay = getPhotoOverlayBySrc(src);
  if (!overlay) return false;
  const resolved = getPhotoOverlayOrientation(overlay);
  return !resolved || resolved === orientation;
}

function getFirstPhotoOverlayForOrientation(orientation = photoOverlayOrientation) {
  const overlays = filterPhotoOverlaysByOrientation(
    getOverlayList(activeTheme),
    orientation
  );
  return overlays[0] || null;
}

function syncPhotoOverlayOrientationWithAssets() {
  const current = normalizePhotoOverlayOrientation(photoOverlayOrientation) || "portrait";
  photoOverlayOrientation = current;
  const currentOverlays = filterPhotoOverlaysByOrientation(
    getOverlayList(activeTheme),
    current
  );
  const opposite = current === "portrait" ? "landscape" : "portrait";
  const oppositeOverlays = filterPhotoOverlaysByOrientation(
    getOverlayList(activeTheme),
    opposite
  );
  if (!currentOverlays.length && oppositeOverlays.length) {
    photoOverlayOrientation = opposite;
  }
  if (
    selectedOverlay &&
    !photoOverlayMatchesOrientation(selectedOverlay, photoOverlayOrientation)
  ) {
    lastPhotoOverlayByOrientation[current] = selectedOverlay;
    selectedOverlay = null;
    lastPhotoOverlay = null;
  }
  const remembered = lastPhotoOverlayByOrientation[photoOverlayOrientation];
  if (!selectedOverlay && photoOverlayMatchesOrientation(remembered, photoOverlayOrientation)) {
    selectedOverlay = remembered;
    lastPhotoOverlay = remembered;
  }
}

function setFilter(filterId) {
  selectedFilter = filterId;
  applyFilterToVideo();
  updateFilterCarouselUI();
}

function updateFilterCarouselUI() {
  const filterDef = FILTER_EFFECTS.find((f) => f.id === selectedFilter);
  const nameEl = document.getElementById("filterCarouselName");
  if (nameEl) {
    nameEl.textContent = (filterDef && filterDef.icon ? filterDef.icon + " " : "") + (filterDef ? filterDef.name : "Natural");
  }
  const prevBtn = document.getElementById("filterPrevBtn");
  const nextBtn = document.getElementById("filterNextBtn");
  if (prevBtn) prevBtn.style.opacity = "";
  if (nextBtn) nextBtn.style.opacity = "";
}

function updateFilterCarouselVisibility() {
  const carousel = document.getElementById("filterCarousel");
  if (!carousel) return;
  const captureMode = getSelectedCaptureMode();
  const isPhotoMode = captureMode === "photo";
  const isBoothReady = DOM.boothScreen && DOM.boothScreen.classList.contains("booth-ready");
  const isShareMode = DOM.boothScreen && DOM.boothScreen.classList.contains("share-mode");
  const isCountdownMode = DOM.boothScreen && DOM.boothScreen.classList.contains("countdown-mode");
  const shouldShow = isPhotoMode && isBoothReady && !isShareMode && !isCountdownMode;
  carousel.classList.toggle("hidden", !shouldShow);
}

function nextFilter() {
  const idx = FILTER_EFFECTS.findIndex((f) => f.id === selectedFilter);
  const nextIdx = (Math.max(idx, 0) + 1) % FILTER_EFFECTS.length;
  setFilter(FILTER_EFFECTS[nextIdx].id);
}

function prevFilter() {
  const idx = FILTER_EFFECTS.findIndex((f) => f.id === selectedFilter);
  const currentIdx = idx >= 0 ? idx : 0;
  const prevIdx = (currentIdx - 1 + FILTER_EFFECTS.length) % FILTER_EFFECTS.length;
  setFilter(FILTER_EFFECTS[prevIdx].id);
}

function setPhotoOverlayOrientation(nextOrientation) {
  const next = normalizePhotoOverlayOrientation(nextOrientation);
  if (!next || next === photoOverlayOrientation) return;
  if (selectedOverlay) {
    lastPhotoOverlayByOrientation[photoOverlayOrientation] = selectedOverlay;
  }
  photoOverlayOrientation = next;
  selectedOverlay = null;
  lastPhotoOverlay = null;
  const remembered = lastPhotoOverlayByOrientation[next];
  if (photoOverlayMatchesOrientation(remembered, next)) {
    selectedOverlay = remembered;
    lastPhotoOverlay = remembered;
  } else {
    const first = getFirstPhotoOverlayForOrientation(next);
    if (first && first.src) {
      selectedOverlay = first.src;
      lastPhotoOverlay = first.src;
      lastPhotoOverlayByOrientation[next] = first.src;
    }
  }
  renderOptionsForMode(mode);
  syncOverlayPreviewSurface({ mode: "live" });
  applyPreviewOrientation();
  logBoothFrameState("overlay-orientation-change", mode);
  setMobileSettingsOpen(false);
}

function applyFilterToVideo() {
  const filterDef = FILTER_EFFECTS.find((f) => f.id === selectedFilter);
  if (DOM.video) {
    DOM.video.style.filter = (filterDef && filterDef.css) || "";
  }
}

function applyFilterToCanvas(ctx, width, height) {
  const filterDef = FILTER_EFFECTS.find((f) => f.id === selectedFilter);
  if (!filterDef || !filterDef.css || !ctx) return;
  const imageData = ctx.getImageData(0, 0, width, height);
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext("2d");
  if (!tempCtx) return;
  tempCtx.putImageData(imageData, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.filter = filterDef.css;
  ctx.drawImage(tempCanvas, 0, 0);
  ctx.filter = "none";
}

function appendAssetPickerShowMore(grid, modeKey, total, visibleCount) {
  if (visibleCount >= total) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "asset-picker-show-more";
  button.textContent = `Show More (${total - visibleCount} more)`;
  button.addEventListener("click", () => {
    assetPickerVisibleLimits[modeKey] =
      (assetPickerVisibleLimits[modeKey] || ASSET_PICKER_INITIAL_LIMIT) +
      ASSET_PICKER_PAGE_SIZE;
    renderOptionsForMode(mode);
  });
  grid.appendChild(button);
}

function renderOptionsForMode(targetMode = mode, options = {}) {
  const captureMode = getSelectedCaptureMode(targetMode);
  const container = DOM.options;
  if (!container) return;
  const previousScrollTop =
    options.preserveScroll === false ? 0 : container.scrollTop || 0;
  container.innerHTML = "";
  if (captureMode === "message") {
    syncMobileSettingsUi();
    return;
  }
  const addSection = (title) => {
    const section = document.createElement("div");
    section.className = "options-section";
    if (title) {
      const heading = document.createElement("div");
      heading.className = "options-section-title";
      heading.textContent = title;
      section.appendChild(heading);
    }
    const grid = document.createElement("div");
    grid.className = "options-section-grid";
    section.appendChild(grid);
    container.appendChild(section);
    return grid;
  };
  const addPhotoOrientationSection = () => {
    const section = document.createElement("div");
    section.className = "options-section photo-orientation-section";
    const heading = document.createElement("div");
    heading.className = "options-section-title";
  };
  const greenGrid = addSection("Photo Backgrounds");
  const greenList = getGreenBackgroundList(activeTheme);
  if (!greenList.length) {
    const note = document.createElement("div");
    note.style.fontSize = "0.8em";
    note.style.color = "#888";
    note.textContent = "No backgrounds added";
    greenGrid.appendChild(note);
  } else {
    const activeGreen = getActiveGreenBackground(activeTheme);
    greenList.forEach((src, idx) => {
      const wrap = document.createElement("div");
      wrap.className = "thumb";
      const img = document.createElement("img");
      wrap.appendChild(img);
      img.src = withBust(src);
      if (activeGreen === src) wrap.classList.add("selected");
      wrap.onclick = () => {
        greenGrid
          .querySelectorAll(".thumb")
          .forEach((t) => t.classList.remove("selected"));
        wrap.classList.add("selected");
        setGreenBackgroundIndex(idx);
      };
      greenGrid.appendChild(wrap);
    });
  }

  if (captureMode === "photo") {
    syncPhotoOverlayOrientationWithAssets();
    const overlayGrid = addSection("Choose Your Frame");
    const noOverlay = document.createElement("div");
    noOverlay.className = "thumb";
    noOverlay.dataset.overlayNone = "true";
    const blank = document.createElement("canvas");
    blank.width = 120;
    blank.height = 80;
    const blankImg = document.createElement("img");
    blankImg.src = blank.toDataURL("image/png");
    noOverlay.appendChild(blankImg);
    noOverlay.title = "No Overlay";
    noOverlay.onclick = () => {
      container
        .querySelectorAll(".thumb")
        .forEach((t) => t.classList.remove("selected"));
      noOverlay.classList.add("selected");
      selectedOverlay = null;
      lastPhotoOverlay = null;
      lastPhotoOverlayByOrientation[photoOverlayOrientation] = null;
      clearOverlayPreviewSurface();
      applyPreviewOrientation();
      setMobileSettingsOpen(false);
    };
    if (!selectedOverlay) noOverlay.classList.add("selected");
    overlayGrid.appendChild(noOverlay);

    const photoOverlays = filterPhotoOverlaysByOrientation(
      getOverlayList(activeTheme),
      photoOverlayOrientation
    );
    if (!photoOverlays.length) {
      const note = document.createElement("div");
      note.style.fontSize = "0.8em";
      note.style.color = "#888";
      note.textContent = "No overlays added";
      overlayGrid.appendChild(note);
    } else {
      const visibleLimit = getAssetPickerVisibleLimit(
        captureMode,
        selectedOverlay,
        photoOverlays
      );
      const visibleOverlays = photoOverlays.slice(0, visibleLimit);
      visibleOverlays.forEach((overlay) => {
        const src = overlay && overlay.src ? overlay.src : "";
        const wrap = document.createElement("div");
        wrap.className = "thumb";
        if (src) wrap.dataset.overlaySrc = src;
        wrap.title = getAssetPickerFilename(src);
        const img = document.createElement("img");
        wrap.appendChild(img);
        img.src = withBust(
          overlay && overlay.renderSrc ? overlay.renderSrc : src
        );
        if (selectedOverlay === src) wrap.classList.add("selected");
        img.onerror = () => {
          console.error("Failed to load thumbnail:", src);
          wrap.style.display = "none";
        };
        wrap.onclick = () => {
          overlayGrid
            .querySelectorAll(".thumb")
            .forEach((t) => t.classList.remove("selected"));
          wrap.classList.add("selected");
          selectedOverlay = src;
          lastPhotoOverlay = src;
          lastPhotoOverlayByOrientation[photoOverlayOrientation] = src;
          syncOverlayPreviewSurface({ mode: "live" });
          applyPreviewOrientation();
          logBoothFrameState("overlay-selected", mode);
          setMobileSettingsOpen(false);
        };
        overlayGrid.appendChild(wrap);
      });
      appendAssetPickerShowMore(
        overlayGrid,
        captureMode,
        photoOverlays.length,
        visibleOverlays.length
      );
    }
    syncMobileSettingsUi();
    requestAnimationFrame(() => {
      container.scrollTop = previousScrollTop;
    });
    return;
  }

  const templateKind = captureMode === "layout" ? "layout" : "strip";
  const templates = filterAssetsForMode(
    getTemplateList(activeTheme),
    templateKind
  );
  const templateGrid = addSection(
    captureMode === "layout" ? "Choose Your Layout" : "Choose Your Strip"
  );
  if (!templates.length) {
    const note = document.createElement("div");
    note.style.fontSize = "0.8em";
    note.style.color = "#888";
    note.textContent = "No templates added";
    templateGrid.appendChild(note);
    syncMobileSettingsUi();
    return;
  }
  const pendingTemplateSrc = pendingTemplate && pendingTemplate.src;
  const visibleLimit = getAssetPickerVisibleLimit(
    captureMode,
    pendingTemplateSrc,
    templates
  );
  const visibleTemplates = templates.slice(0, visibleLimit);
  visibleTemplates.forEach((template) => {
    const src = template && template.src ? template.src : "";
    const wrap = document.createElement("div");
    wrap.className = "thumb";
    if (src) wrap.dataset.templateSrc = src;
    wrap.title = getAssetPickerFilename(src);
    const img = document.createElement("img");
    wrap.appendChild(img);
    img.src = withBust(
      template && template.renderSrc ? template.renderSrc : src
    );
    if (pendingTemplateSrc === src) wrap.classList.add("selected");
    img.onerror = () => {
      console.error("Failed to load thumbnail:", src);
      wrap.style.display = "none";
    };
    wrap.onclick = () => {
      templateGrid
        .querySelectorAll(".thumb")
        .forEach((t) => t.classList.remove("selected"));
      wrap.classList.add("selected");
      selectedOverlay = null;
      clearOverlayPreviewSurface();
      pendingTemplate = template || { src, layout: "double_column" };
      if (pendingTemplate && pendingTemplate.src) {
        openConfirm(pendingTemplate.src);
      }
      logBoothFrameState("template-selected", mode);
      setMobileSettingsOpen(false);
    };
    templateGrid.appendChild(wrap);
  });
  appendAssetPickerShowMore(
    templateGrid,
    captureMode,
    templates.length,
    visibleTemplates.length
  );
  syncMobileSettingsUi();
  requestAnimationFrame(() => {
    container.scrollTop = previousScrollTop;
  });
}

function renderOptions() {
  renderOptionsForMode(mode);
}

async function setViewOrientation(target) {
  const overlay =
    target && typeof target === "object" && !Array.isArray(target)
      ? target
      : null;
  const aspectRatio = getOverlayAspectRatio(overlay);
  if (aspectRatio) {
    DOM.videoWrap.className =
      aspectRatio >= 1 ? "view-landscape" : "view-portrait";
    setCaptureAspect(aspectRatio);
    return;
  }
  const imgSrc =
    typeof target === "string"
      ? target
      : overlay && overlay.foreground && overlay.foreground.type === "image"
      ? overlay.foreground.src
      : overlay && overlay.renderSrc
      ? overlay.renderSrc
      : "";
  if (!imgSrc) {
    DOM.videoWrap.className = "view-landscape";
    setCaptureAspect(null);
    updateCaptureAspect();
    return;
  }
  const orientation = await getOrientationFromImage(imgSrc);
  DOM.videoWrap.className = `view-${orientation}`;
  setCaptureAspect(null);
  updateCaptureAspect();
}

function orientationFromTemplate(template) {
  const layout = normalizeTemplateLayout(template && template.layout);
  if (
    layout === "double_column" ||
    layout === "vertical" ||
    layout === "photo_strip_3"
  )
    return "view-portrait";
  return "view-landscape";
}

function applyPreviewOrientation() {
  if (!DOM.videoWrap) return;
  const captureMode = getSelectedCaptureMode();
  if (captureMode === "strip" || captureMode === "layout") {
    const templates = getTemplateList(activeTheme);
    const template =
      pendingTemplate ||
      templates.find((item) => getAssetCaptureType(item) === captureMode) ||
      (Array.isArray(templates) ? templates[0] : null);
    DOM.videoWrap.className = orientationFromTemplate(template);
    applyLiveCameraSizing();
    if (!template || !template.src) {
      setCaptureAspect(null);
      updateCaptureAspect();
    }
    return;
  }
  DOM.videoWrap.className =
    photoOverlayOrientation === "portrait" ? "view-portrait" : "view-landscape";
  applyLiveCameraSizing();
  setCaptureAspect(getPhotoOverlayAspectForOrientation());
}

function capturePreviewState() {
  return {
    selectedOverlay,
    lastPhotoOverlay,
    videoClass: DOM.videoWrap ? DOM.videoWrap.className : "view-landscape",
  };
}

function restorePreviewState(state) {
  if (!state) return;
  selectedOverlay = state.selectedOverlay || null;
  lastPhotoOverlay = state.lastPhotoOverlay || null;
  if (DOM.videoWrap) {
    DOM.videoWrap.className = state.videoClass || "view-landscape";
  }
  const captureMode = getSelectedCaptureMode();
  if (captureMode === "photo" || captureMode === "message") {
    syncOverlayPreviewSurface({ mode: "live" });
  } else {
    clearOverlayPreviewSurface();
  }
}

async function getStripTemplateMetrics(template) {
  if (!template || !template.src) return null;
  if (template.__slotMetrics) return template.__slotMetrics;
  const metrics = {};
  const img = await loadImage(template.src);
  const columnCount = getTemplateColumnCount(template && template.layout);
  const rows = getTemplateRowCount(
    template && template.layout,
    template && template.slots
  );
  const slots =
    normalizeTemplateSlots(template && template.slots, columnCount) ||
    detectTransparentColumnSlots(img, rows, columnCount);
  if (slots) metrics.slots = slots;
  const headerPct = Math.max(
    0,
    Math.min(
      0.5,
      toNumber(template && (template.headerPct || template.header_percent), 0.2)
    )
  );
  const columnPadPct = Math.max(
    0,
    Math.min(0.2, toNumber(template && template.columnPadPct, 0.055))
  );
  const slotSpacingPct = Math.max(
    0,
    Math.min(0.2, toNumber(template && template.slotSpacingPct, 0.022))
  );
  const footerPct = Math.max(
    0,
    Math.min(0.3, toNumber(template && template.footerPct, 0.03))
  );
  metrics.headerPct = headerPct;
  metrics.columnPadPct = columnPadPct;
  metrics.slotSpacingPct = slotSpacingPct;
  metrics.footerPct = footerPct;
  if (slots && slots[0] && slots[0][0]) {
    metrics.aspect = Math.max(0.1, slots[0][0].w / slots[0][0].h);
  } else {
    const cols = columnCount;
    const columnW = 1 / cols;
    const slotWRel = columnW - columnPadPct * columnW * 2;
    const slotHRel = (1 - headerPct - footerPct - slotSpacingPct * (rows + 1)) / rows;
    metrics.aspect = Math.max(0.1, slotWRel / slotHRel);
  }
  metrics.rows = rows;
  template.__slotMetrics = metrics;
  return metrics;
}

async function prepareStripCapture(template) {
  const state = capturePreviewState();
  clearOverlayPreviewSurface();
  if (DOM.videoWrap)
    DOM.videoWrap.className = orientationFromTemplate(template);
  const prevAspect = captureAspectRatio;
  try {
    const metrics = await getStripTemplateMetrics(template);
    if (metrics && metrics.aspect) {
      setCaptureAspect(metrics.aspect);
    } else {
      setCaptureAspect(null);
    }
  } catch (_) {
    setCaptureAspect(null);
  }
  return { state, prevAspect };
}

function openConfirm(previewSrc) {
  DOM.confirmPreview.src = previewSrc;
  DOM.confirmModal.style.display = "flex";
}
function closeConfirm() {
  pendingTemplate = null;
  DOM.confirmModal.style.display = "none";
}
function confirmTemplate() {
  const t = pendingTemplate;
  pendingTemplate = null;
  DOM.confirmModal.style.display = "none";
  runStripSequence(t);
}

// Welcome control
function showWelcome(step = null) {
  if (!activeTheme) return;
  updateShowcaseDemoUi();
  syncBoothPersonality();
  syncWelcomeLogo();
  setBoothControlsVisible(false);
  if (DOM.boothScreen) DOM.boothScreen.classList.add("welcome-active");
  if (DOM.confirmModal) DOM.confirmModal.style.display = "none";
  // Title + prompt
  DOM.welcomeTitle.textContent = resolveWelcomeTitle();
  DOM.welcomeTitle.style.fontFamily =
    activeTheme.fontHeading || activeTheme.fontBody || activeTheme.font || "";
  fitWelcomeTitleToViewport();
  if (DOM.startButton)
    DOM.startButton.textContent = resolveStartButtonText();

  //  the booth background on the welcome screen and hide standalone images
  const boothBg = DOM.boothScreen ? DOM.boothScreen.style.backgroundImage : "";
  if (DOM.welcomeScreen) DOM.welcomeScreen.style.backgroundImage = boothBg;
  if (DOM.welcomeImg) {
    DOM.welcomeImg.src = "";
    DOM.welcomeImg.classList.add("hidden");
  }

  const ws = DOM.welcomeScreen;
  if (!ws) return;
  ws.classList.remove("faded");
  setWelcomeFlowStep(step || resolveInitialWelcomeStep());
  setupWelcomeInteractions();
}

function beginWelcome(event) {
  if (welcomeFlowStep !== "idle") return;
  unlockBoothAudio();
  playBoothSound("tap");
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  setWelcomeFlowStep("mode");
}

function beginModeSelection(nextMode, event) {
  unlockBoothAudio();
  playBoothSound("tap");
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  setMode(nextMode);
  hideWelcome();
}

function goBackFromWelcome(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  if (welcomeFlowStep === "mode") {
    setWelcomeFlowStep("idle");
    return;
  }
  if (
    welcomeFlowStep === "idle" &&
    showcaseDemoActive &&
    hasShowcaseDemoChoices()
  ) {
    setWelcomeFlowStep("demo");
    return;
  }
  goAdmin();
}

function goBackFromBooth(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  showWelcome("mode");
}

function selectFirstPhotoOverlayAfterWelcome() {
  if (getSelectedCaptureMode() !== "photo" || selectedOverlay) return;
  const firstOverlay = filterPhotoOverlaysByOrientation(
    getOverlayList(activeTheme || {}),
    photoOverlayOrientation
  )[0];
  if (!firstOverlay || !firstOverlay.src) return;
  const thumbs = DOM.options ? DOM.options.querySelectorAll(".thumb") : [];
  const firstOverlayThumb = thumbs[1];
  if (firstOverlayThumb && typeof firstOverlayThumb.click === "function") {
    firstOverlayThumb.click();
  }
}

function hideWelcome() {
  const ws = DOM.welcomeScreen;
  if (!ws) return;
  if (ws.classList.contains("faded")) return;
  playBoothSound("success");
  ws.classList.add("faded");
  if (DOM.boothScreen) DOM.boothScreen.classList.remove("welcome-active");
  if (currentMode !== "360") {
    setMode(resolveBoothLaunchMode());
    selectFirstPhotoOverlayAfterWelcome();
  }
  updateFilterCarouselVisibility();
  updateCaptureModeUi();
  setBoothControlsVisible(true);
  // show the video smoothly
  if (DOM.video) {
    DOM.video.classList.remove("hidden");
    DOM.video.classList.add("active");
    if (DOM.video.srcObject && typeof DOM.video.play === "function") {
      DOM.video.play().catch(() => {});
    }
  }
  if (!stream && !demoMode && currentMode !== "360") {
    startCamera(false);
  }
  resetIdleTimer(); // Start the idle timer now that the booth is active.
}

function resolveBoothLaunchMode() {
  if (mode === "message" || mode === "strip" || mode === "layout") {
    return mode;
  }
  if (mode === "still-photo") return "still-photo";
  if (mode === "live-photo" && getLivePhotoEnabled()) return "live-photo";
  if (mode === "still-photo") return "still-photo";
  return getLivePhotoEnabled() ? "live-photo" : "still-photo";
}

function createBoothTestStream() {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext("2d");
  if (!ctx || typeof canvas.captureStream !== "function") return null;
  let frame = 0;
  const draw = () => {
    const width = canvas.width;
    const height = canvas.height;
    const shift = Math.sin(frame / 24) * 18;
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, "#f7efe4");
    grad.addColorStop(0.5, "#d7eadf");
    grad.addColorStop(1, "#e7d5b7");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.fillRect(96 + shift, 74, 1088, 572);
    ctx.fillStyle = "#243b38";
    ctx.font = "700 56px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Booth Test Camera", width / 2, height / 2 - 22);
    ctx.font = "32px system-ui, sans-serif";
    ctx.fillText("Live preview mock", width / 2, height / 2 + 34);
    ctx.fillStyle = "#c79f5d";
    ctx.beginPath();
    ctx.arc(width / 2 + shift * 3, height / 2 + 110, 28, 0, Math.PI * 2);
    ctx.fill();
    frame += 1;
  };
  draw();
  const timer = setInterval(draw, 100);
  const testStream = canvas.captureStream(30);
  testStream.__boothTestTimer = timer;
  return testStream;
}

function setBoothTestCameraStream() {
  const testStream = createBoothTestStream();
  if (!testStream) {
    demoMode = true;
    return false;
  }
  stream = testStream;
  if (DOM.videoContainer) {
    DOM.videoContainer.dataset.boothTestCamera = "true";
  }
  if (DOM.video) {
    DOM.video.srcObject = testStream;
    DOM.video.style.transform = "";
    DOM.video.classList.remove("hidden");
    if (typeof DOM.video.play === "function") {
      DOM.video.play().catch(() => {});
    }
  }
  syncOverlayPreviewSurface({ mode: "live" });
  return true;
}

// Camera
async function startCamera(autoStartBooth = false) {
  if (isStartingCamera) return;
  isStartingCamera = true;

  try {
    // Load the theme first to ensure all assets and settings are ready.
    loadTheme(DOM.eventSelect.value);

    if (isBoothTestMode()) {
      setBoothTestCameraStream();
      showToast("Booth test camera enabled");
      if (autoStartBooth) startBoothFlow();
      isStartingCamera = false;
      return;
    }

    if (DOM.videoContainer) {
      delete DOM.videoContainer.dataset.boothTestCamera;
    }

    // If running from file://, most browsers block camera. Offer Demo Mode unless forced.
    if (
      String(location.protocol).startsWith("file") &&
      localStorage.getItem("forceCameraOnFile") !== "true"
    ) {
      isStartingCamera = false;
      const useDemo = confirm(
        "Camera access is not available when opened from a file.\n\nUse Demo Mode instead? (You can still test overlays, templates, and email.)"
      );
      if (useDemo) {
        demoMode = true;
        if (autoStartBooth) startBoothFlow();
        else showToast("Demo mode enabled");
      } else {
        alert(
          "To use the camera, open the app over HTTPS (e.g., Cloudflare Pages URL) or a local HTTPS server."
        );
      }
      return;
    }

    if (stream) {
      // Camera already available; only proceed to booth if requested
      if (autoStartBooth) startBoothFlow();
      showToast("Camera is ready");
      isStartingCamera = false;
      return;
    }

    if (
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      isStartingCamera = false;
      const httpsHint =
        location && !String(location.protocol).startsWith("https")
          ? "\n\nTip: Open the app over HTTPS (GitHub Pages or Cloudflare Pages) to enable the camera."
          : "";
      const useDemo = confirm(
        `Camera access is not supported in this browser or environment.${httpsHint}\n\nUse Demo Mode instead?`
      );
      if (useDemo) {
        demoMode = true;
        if (autoStartBooth) startBoothFlow();
        else showToast("Demo mode enabled");
      } else {
        alert(
          "To use the camera, switch to a supported browser over HTTPS or connect a camera device."
        );
      }
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((s) => {
        stream = s;
        if (DOM.video) {
          DOM.video.srcObject = s;
          DOM.video.style.transform = "";
        }
        syncOverlayPreviewSurface({ mode: "live" });
        showToast("Camera permission granted");
        if (autoStartBooth) startBoothFlow();
      })
      .catch((err) => {
        console.error("Camera Error:", err);
        alert(
          "Could not access the camera. Please ensure it is not in use by another application and that you have granted permission.\n\nError: " +
            err.message
        );
      })
      .finally(() => {
        isStartingCamera = false;
      });
  } catch (e) {
    isStartingCamera = false;
  }
}

async function startBooth(options = {}) {
  if (!options.preserveSession) {
    prepareThemeSessionFromSetup();
  }
  if (DOM.eventSelect && DOM.eventSelect.value) {
    loadTheme(DOM.eventSelect.value);
  }
  startBoothFlow();
  // Start camera after the booth view is already visible so setup cannot stall.
  startCamera(false);
}

function startBoothFlow() {
  // Theme is now pre-loaded by startCamera()
  allowRetake = DOM.allowRetakes.checked;
  if (DOM.boothScreen)
    DOM.boothScreen.classList.remove("share-mode", "countdown-mode");
  DOM.adminScreen.classList.add("hidden");
  DOM.boothScreen.classList.remove("hidden");
  document.body.classList.remove("admin-open");
  document.documentElement.classList.remove("admin-open");
  setBoothControlsVisible(true);
  setCaptureAspect(null);
  setMode(resolveBoothLaunchMode());
  showWelcome();
  syncCaptureStatusIndicators();
  updateCaptureModeUi();
  syncMobileSettingsUi();
  if (getInstantCaptureEnabled()) {
    showToast("Instant Capture is ON");
  }
}

const startCameraFlow = (...args) => startCamera(...args);
const startBoothFromAdmin = (...args) => startBooth(...args);

function buildBoothTestFinalImage() {
  const canvas = document.createElement("canvas");
  canvas.width = 1800;
  canvas.height = 1200;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, "#f8efe3");
  grad.addColorStop(0.5, "#d9efe7");
  grad.addColorStop(1, "#f3d7b6");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(120, 110, 1560, 980);
  ctx.fillStyle = "#263a37";
  ctx.font = "800 96px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Booth Test Photo", canvas.width / 2, 520);
  ctx.font = "44px system-ui, sans-serif";
  ctx.fillText("Final preview and QR QA", canvas.width / 2, 600);
  ctx.fillStyle = "#c79f5d";
  ctx.beginPath();
  ctx.arc(canvas.width / 2, 730, 70, 0, Math.PI * 2);
  ctx.fill();
  return canvas.toDataURL("image/png");
}

function enterBoothQaState(state = "capture") {
  if (!isBoothTestMode()) return;
  const target = state || "capture";
  startBooth({ preserveSession: true });
  requestAnimationFrame(() => {
    if (target === "welcome") return;
    beginModeSelection("still-photo");
    if (target === "final") {
      showFinal(buildBoothTestFinalImage(), {
        shareUrl: BOOTH_TEST_SHARE_URL,
        printEligible: false,
      });
    }
  });
}

function applyBoothTestModeFromUrl() {
  if (!isBoothTestMode()) return;
  document.documentElement.dataset.boothTestMode = "true";
  const state = getBoothQaState();
  if (state) {
    requestAnimationFrame(() => enterBoothQaState(state));
  }
}

function getVisibleElementBox(selector) {
  const element = document.querySelector(selector);
  if (!element) return null;
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  const visible =
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    rect.width > 0 &&
    rect.height > 0;
  return {
    selector,
    visible,
    left: Math.round(rect.left),
    top: Math.round(rect.top),
    right: Math.round(rect.right),
    bottom: Math.round(rect.bottom),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    text: (element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 160),
  };
}

function getOverlapArea(a, b) {
  const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return Math.round(width * height);
}

function auditBoothLayout() {
  const selectors = [
    "#boothHeader",
    "#boothBackBtn",
    "#adminBtn",
    "#mobileSettingsToggle",
    "#mobileSettingsSheet",
    "#videoContainer",
    "#filterCarousel",
    "#boothHostPrompt",
    "#captureBtn",
    "#reviewPanel",
    "#qrCodeContainer",
    "#paidPrintPanel",
  ];
  const boxes = selectors
    .map(getVisibleElementBox)
    .filter(Boolean);
  const visibleBoxes = boxes.filter((box) => box.visible);
  const overlaps = [];
  for (let index = 0; index < visibleBoxes.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < visibleBoxes.length; nextIndex += 1) {
      const area = getOverlapArea(visibleBoxes[index], visibleBoxes[nextIndex]);
      if (area > 20) {
        overlaps.push({
          a: visibleBoxes[index].selector,
          b: visibleBoxes[nextIndex].selector,
          area,
        });
      }
    }
  }
  const tapTargets = Array.from(document.querySelectorAll("button, [role='button'], a"))
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return {
        selector:
          element.id ? `#${element.id}` :
          element.className ? `.${String(element.className).trim().split(/\s+/)[0]}` :
          element.tagName.toLowerCase(),
        visible:
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          rect.width > 0 &&
          rect.height > 0,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        text: (element.textContent || element.getAttribute("aria-label") || "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 80),
      };
    })
    .filter((target) => target.visible);
  return {
    testMode: isBoothTestMode(),
    qaState: getBoothQaState(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      documentHeight: document.documentElement.scrollHeight,
      bodyHeight: document.body.scrollHeight,
    },
    boxes,
    overlaps,
    smallTapTargets: tapTargets.filter(
      (target) => target.width < 44 || target.height < 44
    ),
    stepText: Array.from(document.querySelectorAll("#mobileSettingsSheet, #welcomeOverlay"))
      .map((element) => (element.textContent || "").replace(/\s+/g, " ").trim())
      .filter((text) => /step\s+\d/i.test(text)),
  };
}

function clearPreviewFreezeFrame() {
  capturePreviewFrozen = false;
  if (!DOM.lastShot) return;
  DOM.lastShot.style.display = "none";
  DOM.lastShot.removeAttribute("src");
  if (overlayUsesPhotoSlots(getActivePhotoOverlay())) {
    syncOverlayPreviewSurface({ mode: "live" });
  }
}

function showPreviewFreezeFrame(canvasOrUrl) {
  const stillUrl = resolveStillPhotoUrl(canvasOrUrl);
  if (!stillUrl) return;
  capturePreviewFrozen = true;
  const overlay = getActivePhotoOverlay();
  if (overlayUsesPhotoSlots(overlay)) {
    syncOverlayPreviewSurface({
      overlay,
      mode: "still",
      source: stillUrl,
      keepLastShot: true,
    });
    return;
  }
  if (DOM.video) {
    DOM.video.classList.add("hidden");
    DOM.video.style.display = "none";
  }
  if (!DOM.lastShot || !stillUrl) return;
  try {
    DOM.lastShot.src = stillUrl;
    DOM.lastShot.style.display = "block";
  } catch (_) {}
}

function enterFinalizingState(finalUrl) {
  if (!finalUrl || !DOM.finalStrip) return;
  setMobileSettingsOpen(false);
  const reveal = () => {
    if (!DOM.boothScreen) return;
    DOM.boothScreen.classList.remove("countdown-mode");
    DOM.boothScreen.classList.add("finalizing-mode");
  };
  DOM.finalStrip.onload = reveal;
  DOM.finalStrip.src = finalUrl;
  if (DOM.finalStrip.complete && DOM.finalStrip.naturalWidth) reveal();
}

function leaveFinalizingState() {
  if (DOM.boothScreen) DOM.boothScreen.classList.remove("finalizing-mode");
}

// Photo mode capture
async function capturePhotoFlow() {
  lastCaptureFlow = capturePhotoFlow; // Store this function for retake
  setMobileSettingsOpen(false);
  setBoothControlsVisible(false);
  const livePhotoEnabled = mode === "live-photo" && getLivePhotoEnabled();
  const photo = await countdownAndSnap({
    live: livePhotoEnabled,
    instant: getInstantCaptureEnabled(),
  });
  let finalPreviewStarted = false;
  try {
    const finalUrl = await finalizeToPrint(photo, selectedOverlay);
    enterFinalizingState(finalUrl);
    const uploadResult = await uploadCaptureOnce({
      previewUrl: finalUrl,
      mediaBlob: livePhotoEnabled ? lastLiveClipBlob : null,
      resourceType: livePhotoEnabled && lastLiveClipBlob ? "video" : "image",
      modeName: livePhotoEnabled ? "live-photo" : "photo",
    });
    showFinal(
      finalUrl,
      livePhotoEnabled && lastLiveClipBlob
        ? {
            shareType: "video",
            shareBlob: lastLiveClipBlob,
            shareUrl: uploadResult.publicUrl,
            uploadQueued: uploadResult.queued,
          }
        : {
            shareUrl: uploadResult.publicUrl,
            uploadQueued: uploadResult.queued,
        }
    );
    finalPreviewStarted = true;
    recordAnalytics(livePhotoEnabled ? "live-photo" : "photo", selectedOverlay);
    addToGallery(finalUrl);
  } finally {
    if (!finalPreviewStarted) leaveFinalizingState();
  }
}

async function captureMessageFlow() {
  if (isMessageRecording) return;
  lastCaptureFlow = captureMessageFlow;
  setBoothControlsVisible(false);
  if (DOM.captureBtn) DOM.captureBtn.disabled = true;
  try {
    for (let n = 3; n > 0; n--) {
      await showCountdown(n);
    }
    isMessageRecording = true;
    if (DOM.captureBtn) {
      DOM.captureBtn.disabled = false;
      DOM.captureBtn.textContent = "Stop Recording";
      DOM.captureBtn.classList.add("recording-stop");
    }
    const clip = await captureMessageClip(MESSAGE_DURATION_MS);
    if (!clip) {
      showToast("Message recording failed.");
      setBoothControlsVisible(true);
      return;
    }
    setLiveClip(clip);
    const posterCanvas = drawToCanvasFromVideo();
    const posterUrl = posterCanvas.toDataURL("image/jpeg", 0.9);
    const uploadResult = await uploadCaptureOnce({
      previewUrl: posterUrl,
      mediaBlob: clip,
      resourceType: "video",
      modeName: "message",
    });
    showFinal(posterUrl, {
      shareType: "video",
      shareBlob: clip,
      shareUrl: uploadResult.publicUrl,
      uploadQueued: uploadResult.queued,
    });
    recordAnalytics("message", "video");
  } finally {
    if (DOM.captureBtn) {
      DOM.captureBtn.textContent = "Record Message";
      DOM.captureBtn.classList.remove("recording-stop");
      DOM.captureBtn.disabled = false;
    }
    isMessageRecording = false;
  }
}

function handlePrimaryAction() {
  unlockBoothAudio();
  playBoothSound("tap");
  if (DOM.boothScreen && DOM.boothScreen.classList.contains("welcome-active"))
    return;
  if (mode === "message") {
    if (isMessageRecording && typeof messageStopper === "function") {
      messageStopper();
      return;
    }
    captureMessageFlow();
    return;
  }
  const captureMode = getSelectedCaptureMode(mode);
  if (captureMode === "strip" || captureMode === "layout") {
    const templateKind = captureMode === "layout" ? "layout" : "strip";
    const template =
      pendingTemplate ||
      filterAssetsForMode(getTemplateList(activeTheme), templateKind)[0];
    if (!template || !template.src) {
      showToast(
        captureMode === "layout"
          ? "Choose a layout first."
          : "Choose a strip first."
      );
      setMobileSettingsOpen(true);
      return;
    }
    pendingTemplate = null;
    runStripSequence(template);
    return;
  }
  capturePhotoFlow();
}

function getResolvedCaptureAspectRatio() {
  const captureMode = getSelectedCaptureMode();
  if (captureMode === "photo") {
    return getPhotoOverlayAspectForOrientation();
  }
  if (
    (captureMode === "strip" || captureMode === "layout") &&
    typeof captureAspectRatio === "number" &&
    captureAspectRatio > 0
  )
    return captureAspectRatio;
  const rect =
    DOM.videoContainer &&
    typeof DOM.videoContainer.getBoundingClientRect === "function"
      ? DOM.videoContainer.getBoundingClientRect()
      : null;
  if (rect && rect.width > 0 && rect.height > 0)
    return rect.width / rect.height;
  return DOM.videoWrap && DOM.videoWrap.classList.contains("view-portrait")
    ? PRINT_SIZES.portrait.aspect
    : PRINT_SIZES.landscape.aspect;
}

function drawToCanvasFromVideo() {
  const v = DOM.video;
  const isPortrait = DOM.videoWrap.classList.contains("view-portrait");
  const targetAspect = getResolvedCaptureAspectRatio();

  // Demo or no camera stream ready: draw a placeholder frame
  if (demoMode || !v || !v.videoWidth || !v.videoHeight) {
    const baseSize = 900; // arbitrary base size
    const width = Math.round(baseSize * targetAspect);
    const height = baseSize;
    const buffer = CanvasBuffer.get("snapshot", width, height);
    const ctx = buffer.getContext("2d");
    // Gradient background placeholder
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, "#222");
    grad.addColorStop(1, "#555");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#fff";
    ctx.font = "28px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Demo Mode", width / 2, height / 2 - 10);
    ctx.fillText(isPortrait ? "2:3" : "3:2", width / 2, height / 2 + 26);
    return buffer;
  }

  const videoW = v.videoWidth;
  const videoH = v.videoHeight;
  const zoom = getCameraZoom();

  if (isPortrait) {
    let sWidth, sHeight, sx, sy;
    sHeight = videoH;
    sWidth = sHeight * targetAspect;
    if (sWidth > videoW) {
      sWidth = videoW;
      sHeight = sWidth / targetAspect;
    }
    if (zoom > 1) {
      sWidth = sWidth / zoom;
      sHeight = sHeight / zoom;
    }
    sx = (videoW - sWidth) / 2;
    sy = (videoH - sHeight) / 2;

    const buffer = CanvasBuffer.get("snapshot", sWidth, sHeight);
    const ctx = buffer.getContext("2d");
    ctx.drawImage(v, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
    return buffer;
  } else {
    let sWidth, sHeight, sx, sy;
    sWidth = videoW;
    sHeight = sWidth / targetAspect;
    if (sHeight > videoH) {
      sHeight = videoH;
      sWidth = sHeight * targetAspect;
    }
    if (zoom > 1) {
      sWidth = sWidth / zoom;
      sHeight = sHeight / zoom;
    }
    sx = (videoW - sWidth) / 2;
    sy = (videoH - sHeight) / 2;

    const buffer = CanvasBuffer.get("snapshot", sWidth, sHeight);
    const ctx = buffer.getContext("2d");
    ctx.drawImage(v, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
    return buffer;
  }
}

function applyAutoEnhanceCanvas(canvas) {
  if (!AUTO_ENHANCE_ENABLED || !canvas) return canvas;
  if (canvas.__enhancedMode === getEnhancementMode()) return canvas;
  const enhancement =
    ENHANCEMENT_MODE_CONFIG[getEnhancementMode()] ||
    ENHANCEMENT_MODE_CONFIG[ENHANCEMENT_MODE_DEFAULT];
  const out = CanvasBuffer.get("enhance", canvas.width, canvas.height);
  const ctx = out.getContext("2d");
  ctx.filter = enhancement.baseFilter || AUTO_ENHANCE_FILTER;
  ctx.drawImage(canvas, 0, 0);
  ctx.filter = "none";
  applyBeautyLightingPass(ctx, out.width, out.height, enhancement);
  out.__enhancedMode = getEnhancementMode();
  if (canvas.__aiMask) out.__aiMask = canvas.__aiMask;
  return out;
}

function ensureEnhancedCanvas(canvas) {
  if (!canvas) return canvas;
  return applyAutoEnhanceCanvas(canvas);
}

function cloneCanvasForStrip(source) {
  if (!source) return source;
  const width = source.width || source.naturalWidth || 0;
  const height = source.height || source.naturalHeight || 0;
  if (!width || !height) return source;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.drawImage(source, 0, 0, width, height);
  if (source.__aiMask) canvas.__aiMask = source.__aiMask;
  return canvas;
}

function applyBeautyLightingPass(ctx, width, height, enhancement) {
  if (!ctx || !width || !height) return;

  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const {
      shadowLift,
      highlightRollOff,
      warmthRedBoost,
      warmthBlueCut,
      smoothingBlend,
    } = enhancement || ENHANCEMENT_MODE_CONFIG[ENHANCEMENT_MODE_DEFAULT];

    for (let index = 0; index < data.length; index += 4) {
      let red = data[index];
      let green = data[index + 1];
      let blue = data[index + 2];

      const luminance = red * 0.299 + green * 0.587 + blue * 0.114;
      const shadowAmount = clampNumber((170 - luminance) / 170, 0, 1);
      const highlightAmount = clampNumber((luminance - 180) / 75, 0, 1);

      red += shadowLift * shadowAmount;
      green += shadowLift * 0.92 * shadowAmount;
      blue += shadowLift * 0.84 * shadowAmount;

      red -= highlightRollOff * 0.55 * highlightAmount;
      green -= highlightRollOff * 0.5 * highlightAmount;
      blue -= highlightRollOff * 0.45 * highlightAmount;

      red += warmthRedBoost * (0.35 + shadowAmount * 0.65);
      blue -= warmthBlueCut * (0.3 + shadowAmount * 0.7);

      data[index] = clampNumber(Math.round(red), 0, 255);
      data[index + 1] = clampNumber(Math.round(green), 0, 255);
      data[index + 2] = clampNumber(Math.round(blue), 0, 255);
    }

    ctx.putImageData(imageData, 0, 0);

    const softened = CanvasBuffer.get("beauty-pass", width, height);
    const softenedCtx = softened.getContext("2d");
    if (!softenedCtx) return;

    softenedCtx.filter = "blur(1.8px) brightness(1.02)";
    softenedCtx.drawImage(ctx.canvas, 0, 0);
    softenedCtx.filter = "none";

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = smoothingBlend;
    ctx.drawImage(softened, 0, 0);
    ctx.restore();
  } catch (error) {
    console.warn("Auto enhance pass failed", error);
  }
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clearLiveClip() {
  if (lastLiveClipUrl) {
    try {
      URL.revokeObjectURL(lastLiveClipUrl);
    } catch (_) {}
  }
  lastLiveClipUrl = null;
  lastLiveClipBlob = null;
  if (DOM.finalLive) {
    DOM.finalLive.pause();
    DOM.finalLive.removeAttribute("src");
    DOM.finalLive.load();
    DOM.finalLive.classList.add("hidden");
  }
  if (DOM.finalStrip) DOM.finalStrip.classList.remove("hidden");
}

function setLiveClip(blob) {
  clearLiveClip();
  if (!blob) return;
  lastLiveClipBlob = blob;
  lastLiveClipUrl = URL.createObjectURL(blob);
}

function pickLiveMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function setRecordingHighlight(isRecording) {
  if (!DOM.videoContainer) return;
  DOM.videoContainer.classList.toggle("recording", !!isRecording);
}

function setRecordingOverlayVisible(show, remainingMs = 0) {
  if (!DOM.recordingOverlay || !DOM.recordingTimer) return;
  DOM.recordingOverlay.classList.toggle("show", !!show);
  if (show) {
    DOM.recordingTimer.textContent = `REC ${formatRecordingTime(remainingMs)}`;
  }
}

function startRecordingTimer(durationMs) {
  if (!DOM.recordingTimer || !DOM.recordingOverlay) return () => {};
  const startedAt = Date.now();
  const tick = () => {
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, durationMs - elapsed);
    DOM.recordingTimer.textContent = `REC ${formatRecordingTime(remaining)}`;
    if (remaining <= 0) clearInterval(timer);
  };
  setRecordingOverlayVisible(true, durationMs);
  const timer = setInterval(tick, 250);
  return () => {
    clearInterval(timer);
    setRecordingOverlayVisible(false, 0);
  };
}

function stopStreamTracks(targetStream) {
  if (!targetStream) return;
  targetStream.getTracks().forEach((track) => track.stop());
}

async function ensureMessageStream() {
  if (demoMode) {
    showToast("Message recording is unavailable in demo mode.");
    return null;
  }
  if (stream && stream.getAudioTracks().length) return stream;
  try {
    const nextStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    if (stream && stream !== nextStream) stopStreamTracks(stream);
    stream = nextStream;
    if (DOM.video) {
      DOM.video.srcObject = stream;
      DOM.video.style.transform = "";
    }
    syncOverlayPreviewSurface({ mode: "live" });
    return stream;
  } catch (err) {
    console.warn("Microphone access failed", err);
    showToast("Mic permission denied; recording will be silent.");
    return stream || null;
  }
}

function pickMessageMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

async function captureMessageClip(durationMs) {
  try {
    const activeStream = await ensureMessageStream();
    if (!activeStream || typeof MediaRecorder === "undefined") return null;
    const mimeType = pickMessageMimeType();
    const recorder = new MediaRecorder(
      activeStream,
      mimeType ? { mimeType } : undefined
    );
    messageRecorder = recorder;
    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size) chunks.push(e.data);
    };
    const stopped = new Promise((resolve) => {
      recorder.onstop = () => resolve();
    });
    const stopTimer = startRecordingTimer(durationMs);
    setRecordingHighlight(true);
    recorder.start();
    messageStopper = () => {
      if (recorder.state === "recording") recorder.stop();
    };
    messageStopTimer = setTimeout(() => {
      if (recorder.state === "recording") recorder.stop();
    }, Math.max(500, durationMs));
    await stopped;
    stopTimer();
    setRecordingHighlight(false);
    clearTimeout(messageStopTimer);
    messageStopTimer = null;
    messageRecorder = null;
    messageStopper = null;
    if (!chunks.length) return null;
    return new Blob(chunks, { type: chunks[0].type || "video/webm" });
  } catch (e) {
    console.warn("Message recording failed", e);
    setRecordingHighlight(false);
    setRecordingOverlayVisible(false, 0);
    clearTimeout(messageStopTimer);
    messageStopTimer = null;
    messageRecorder = null;
    messageStopper = null;
    return null;
  }
}

async function captureLiveClip(durationMs) {
  try {
    const stream = DOM.video && DOM.video.srcObject;
    if (
      !stream ||
      typeof MediaRecorder === "undefined"
    )
      return null;
    const mimeType = pickLiveMimeType();
    const recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined
    );
    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size) chunks.push(e.data);
    };
    const stopped = new Promise((resolve) => {
      recorder.onstop = () => resolve();
    });
    setRecordingHighlight(true);
    recorder.start();
    await delay(Math.max(300, durationMs));
    recorder.stop();
    await stopped;
    setRecordingHighlight(false);
    if (!chunks.length) return null;
    return new Blob(chunks, { type: chunks[0].type || "video/webm" });
  } catch (e) {
    console.warn("Live clip capture failed", e);
    setRecordingHighlight(false);
    return null;
  }
}
function updateCaptureAspect() {
  if (!DOM.videoContainer) return;
  updateCountdownFontSize();
  requestAnimationFrame(syncFrameSizeVars);
}

function setCaptureAspect(aspect) {
  if (typeof aspect === "number" && aspect > 0) {
    captureAspectRatio = aspect;
  } else {
    captureAspectRatio = null;
  }
  updateCaptureAspect();
}

function syncFrameSizeVars() {
  if (!DOM.videoContainer) return;
  const rect = DOM.videoContainer.getBoundingClientRect();
  if (!rect || !rect.width || !rect.height) return;
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);
  document.documentElement.style.setProperty(
    "--frame-preview-width",
    `${width}px`
  );
  document.documentElement.style.setProperty(
    "--frame-preview-height",
    `${height}px`
  );
  document.documentElement.style.setProperty(
    "--frame-preview-aspect",
    `${width} / ${height}`
  );
}

function setFinalPreviewSharePanelVisible(visible) {
  if (DOM.finalPreviewActions) {
    DOM.finalPreviewActions.classList.remove("hidden");
    DOM.finalPreviewActions.classList.toggle("share-panel-empty", !visible);
  }
  if (DOM.qrCodeContainer) {
    DOM.qrCodeContainer.classList.toggle("hidden", !visible);
  }
}

const COUNTDOWN_SCALE_KEY = "photoboothCountdownScale";

function getCountdownScale() {
  try {
    const stored = localStorage.getItem(COUNTDOWN_SCALE_KEY);
    if (stored !== null) return clampZoom(parseFloat(stored), 0.5, 1);
    localStorage.setItem(COUNTDOWN_SCALE_KEY, "0.9");
  } catch (_) {}
  return 0.9;
}

function setCountdownScale(scale) {
  const normalized = clampZoom(scale, 0.5, 1);
  try {
    localStorage.setItem(COUNTDOWN_SCALE_KEY, String(normalized));
  } catch (_) {}
  updateCountdownFontSize();
}

function updateCountdownFontSize() {
  if (!DOM.videoContainer) return;
  const rect = DOM.videoContainer.getBoundingClientRect();
  if (!rect || !rect.height) return;
  const size = Math.max(80, Math.round(rect.height * getCountdownScale()));
  document.documentElement.style.setProperty("--countdown-size", `${size}px`);
}
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    try {
      if (location.protocol.startsWith("http")) img.crossOrigin = "anonymous";
    } catch (_) {}
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
async function getOrientationFromImage(imgSrc) {
  const img = await loadImage(imgSrc);
  if (img.naturalHeight > img.naturalWidth) return "portrait";
  return "landscape";
}

async function applyOverlay(canvas, overlaySrc) {
  if (!overlaySrc) return canvas;
  try {
    const ov = await loadImage(resolveOverlayRenderSrc(activeTheme, overlaySrc));
    const ctx = canvas.getContext("2d");
    // Optionally mask spot color to transparency
    const overlayToDraw = SPOT_MASK.enabled
      ? createMaskedOverlayCanvas(ov, SPOT_MASK.color, SPOT_MASK.tolerance)
      : ov;
    ctx.drawImage(overlayToDraw, 0, 0, canvas.width, canvas.height);
  } catch (e) {
    console.error("Failed to apply overlay:", overlaySrc, e);
  }
  return canvas;
}

// Draw image/canvas into a destination rect using CSS-like object-fit: cover math
function drawCoverInRect(ctx, source, dx, dy, dw, dh) {
  if (!source) return;
  const img = source;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih || !dw || !dh) return;
  const scale = Math.max(dw / iw, dh / ih);
  const rw = iw * scale;
  const rh = ih * scale;
  const rx = dx + (dw - rw) / 2;
  const ry = dy + (dh - rh) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(dx, dy, dw, dh);
  ctx.clip();
  ctx.drawImage(img, rx, ry, rw, rh);
  ctx.restore();
}

function drawImageCover(ctx, img, dx, dy, dw, dh) {
  drawCoverInRect(ctx, img, dx, dy, dw, dh);
}

// Draw image/canvas into a destination rect preserving aspect without cropping
function drawImageContain(ctx, img, dx, dy, dw, dh) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih || !dw || !dh) return;
  const scale = Math.min(dw / iw, dh / ih);
  const rw = iw * scale;
  const rh = ih * scale;
  const rx = dx + (dw - rw) / 2;
  const ry = dy + (dh - rh) / 2;
  ctx.drawImage(img, rx, ry, rw, rh);
}

function roundedRectPath(ctx, x, y, w, h, radius = 0) {
  const safeRadius = Math.max(0, Math.min(radius || 0, Math.min(w, h) / 2));
  ctx.beginPath();
  if (!safeRadius) {
    ctx.rect(x, y, w, h);
    return;
  }
  ctx.moveTo(x + safeRadius, y);
  ctx.arcTo(x + w, y, x + w, y + h, safeRadius);
  ctx.arcTo(x + w, y + h, x, y + h, safeRadius);
  ctx.arcTo(x, y + h, x, y, safeRadius);
  ctx.arcTo(x, y, x + w, y, safeRadius);
  ctx.closePath();
}

function normalizeSlotRect(slot, outputW, outputH) {
  return {
    x: Math.round((slot.x || 0) * outputW),
    y: Math.round((slot.y || 0) * outputH),
    w: Math.round((slot.width || 0) * outputW),
    h: Math.round((slot.height || 0) * outputH),
  };
}

function drawPhotoSlot(ctx, source, slot, outputW, outputH) {
  if (!ctx || !source || !slot) return;
  const img = source;
  const rect = normalizeSlotRect(slot, outputW, outputH);
  if (rect.w <= 0 || rect.h <= 0) return;
  console.debug("[photo-slot-render]", {
    slot,
    outputW,
    outputH,
    drawImage: rect,
  });
  ctx.save();
  if (Number.isFinite(slot.rotation) && slot.rotation !== 0) {
    ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.rotate((slot.rotation * Math.PI) / 180);
    ctx.translate(-(rect.x + rect.w / 2), -(rect.y + rect.h / 2));
  }
  roundedRectPath(
    ctx,
    rect.x,
    rect.y,
    rect.w,
    rect.h,
    Math.min(rect.w, rect.h) * clamp01(slot.borderRadius || 0)
  );
  ctx.clip();
  if (slot.objectFit === "contain") {
    drawImageContain(ctx, img, rect.x, rect.y, rect.w, rect.h);
  } else {
    drawCoverInRect(ctx, img, rect.x, rect.y, rect.w, rect.h);
  }
  ctx.restore();
}

async function renderOverlayToCanvas(ctx, overlay, sources, outputW, outputH) {
  if (!ctx || !overlay) return;
  const sourcePhoto =
    sources && sources.photo ? sources.photo : sources && sources.image;
  const sourcePhotos = Array.isArray(sources && sources.photos)
    ? sources.photos
    : [];
  const background = overlay.background;
  if (background) {
    if (background.type === "color") {
      ctx.save();
      ctx.fillStyle = background.value || "#ffffff";
      ctx.fillRect(0, 0, outputW, outputH);
      ctx.restore();
    } else if (background.type === "image" && background.src) {
      try {
        const bgImage = await loadImage(background.src);
        drawImageCover(ctx, bgImage, 0, 0, outputW, outputH);
      } catch (_) {}
    }
  }
  const slots = overlayUsesPhotoSlots(overlay)
    ? overlay.photoSlots
    : normalizeOverlayPhotoSlots({});
  const usePhotos = sourcePhotos.length ? sourcePhotos : [sourcePhoto];
  slots.forEach((slot, index) => {
    const sourceIndex =
      slot.sourceIndex != null
        ? slot.sourceIndex
        : sources && sources.repeatPhotos && usePhotos.length
        ? index % usePhotos.length
        : index;
    const photo =
      usePhotos[sourceIndex] ||
      (sources && sources.repeatPhotos && usePhotos.length
        ? usePhotos[index % usePhotos.length]
        : usePhotos[0]);
    if (!photo) return;
    drawPhotoSlot(ctx, photo, slot, outputW, outputH);
  });
  const foreground = overlay.foreground;
  if (foreground && foreground.type === "image" && foreground.src) {
    try {
      const fgImage = await loadImage(foreground.src);
      ctx.drawImage(fgImage, 0, 0, outputW, outputH);
    } catch (_) {}
  }
}

function toNumber(val, fallback) {
  const num = Number(val);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeTemplateLayout(layout) {
  const value = String(layout || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
  if (!value) return "double_column";
  if (value === "double-column") return "double_column";
  if (value === "photo-strip-3" || value === "strip-3" || value === "strip")
    return "photo_strip_3";
  if (value === "single-photo") return "single_photo";
  return value.replace(/-/g, "_");
}

function isStripTemplateLayout(layout) {
  const normalized = normalizeTemplateLayout(layout);
  return (
    normalized === "double_column" ||
    normalized === "vertical" ||
    normalized === "horizontal" ||
    normalized === "photo_strip_3" ||
    normalized === "photo_strip_2" ||
    normalized === "photo_strip_4" ||
    normalized === "spot_mask" ||
    normalized === "custom"
  );
}

function getTemplateColumnCount(layout) {
  const normalized = normalizeTemplateLayout(layout);
  return normalized === "double_column" ? 2 : 1;
}

function getTemplateRowCount(layout, slots) {
  const normalized = normalizeTemplateLayout(layout);
  if (normalized === "photo_strip_2") return 2;
  if (normalized === "photo_strip_3") return 3;
  if (normalized === "photo_strip_4") return 4;
  if (Array.isArray(slots) && slots[0] && Array.isArray(slots[0])) {
    return Math.max(1, slots[0].length);
  }
  return 3;
}

const STANDARD_DOUBLE_COLUMN_STRIP_SLOTS = [
  { x: 50, y: 357, w: 500, h: 414 },
  { x: 50, y: 823, w: 500, h: 414 },
  { x: 50, y: 1288, w: 500, h: 413 },
  { x: 650, y: 357, w: 500, h: 414 },
  { x: 650, y: 823, w: 500, h: 414 },
  { x: 650, y: 1288, w: 500, h: 413 },
];

function getStandardDoubleColumnStripSlots() {
  return STANDARD_DOUBLE_COLUMN_STRIP_SLOTS.map((slot) => ({ ...slot }));
}

function normalizeTemplateSlots(slots, columnCount = 1) {
  const normalized = normalizeAssetSlots(slots);
  if (!normalized.length) return null;
  if (columnCount <= 1) return [normalized];
  const maxRight = Math.max(
    ...normalized.map((slot) => (slot.x || 0) + (slot.w || 0))
  );
  const xScale = maxRight > 1 ? maxRight : 1;
  const groups = Array.from({ length: columnCount }, () => []);
  const sorted = normalized.slice().sort((a, b) => {
    if (Math.abs(a.x - b.x) > 4) return a.x - b.x;
    return a.y - b.y;
  });
  sorted.forEach((slot) => {
    const centerX = slot.x + slot.w / 2;
    let targetIndex = 0;
    let bestDistance = Infinity;
    for (let index = 0; index < columnCount; index++) {
      const expectedCenter = ((index + 0.5) / columnCount) * xScale;
      const distance = Math.abs(centerX - expectedCenter);
      if (distance < bestDistance) {
        bestDistance = distance;
        targetIndex = index;
      }
    }
    groups[targetIndex].push(slot);
  });
  groups.forEach((group) => group.sort((a, b) => a.y - b.y));
  return groups.every((group) => group.length) ? groups : [normalized];
}

function detectTransparentColumnSlots(img, rows, cols = 2) {
  try {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return null;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, w, h).data;
    const colWidth = w / cols;
    const marginX = Math.max(2, Math.floor(colWidth * 0.08));
    const stepX = Math.max(1, Math.floor(colWidth / 80));
    const alphaThreshold = 32;
    const minSlotHeight = Math.max(10, Math.floor(h * 0.08));
    const expandY = Math.floor(h * 0.005);
    const results = Array.from({ length: cols }, () => []);

    for (let col = 0; col < cols; col++) {
      const xStart = Math.max(0, Math.floor(col * colWidth + marginX));
      const xEnd = Math.min(w - 1, Math.floor((col + 1) * colWidth - marginX));
      let inSlot = false;
      let slotStart = 0;
      for (let y = 0; y < h; y++) {
        let alphaSum = 0;
        let count = 0;
        for (let x = xStart; x <= xEnd; x += stepX) {
          alphaSum += data[(y * w + x) * 4 + 3];
          count++;
        }
        const avgAlpha = alphaSum / (count || 1);
        if (!inSlot && avgAlpha < alphaThreshold) {
          inSlot = true;
          slotStart = y;
        } else if (inSlot && avgAlpha >= alphaThreshold) {
          const slotHeight = y - slotStart;
          if (slotHeight >= minSlotHeight) {
            const y1 = Math.max(0, slotStart - expandY);
            const y2 = Math.min(h, y + expandY);
            results[col].push({
              x: col * colWidth + marginX,
              y: y1,
              w: colWidth - marginX * 2,
              h: Math.max(1, y2 - y1),
            });
          }
          inSlot = false;
        }
      }
      if (inSlot) {
        const slotHeight = h - slotStart;
        if (slotHeight >= minSlotHeight) {
          const y1 = Math.max(0, slotStart - expandY);
          const y2 = h;
          results[col].push({
            x: col * colWidth + marginX,
            y: y1,
            w: colWidth - marginX * 2,
            h: Math.max(1, y2 - y1),
          });
        }
      }
      results[col].sort((a, b) => a.y - b.y);
      if (results[col].length > rows) {
        results[col] = results[col].slice(0, rows);
      }
    }

    if (results.every((arr) => arr.length === rows)) {
      return results;
    }
    return null;
  } catch (e) {
    console.warn("Slot detection failed", e);
    return null;
  }
}

// Convert hex like #rrggbb to {r,g,b}
function hexToRgb(hex) {
  const m = (hex || "").trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return { r: 0, g: 0, b: 0 };
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function colorClose(r, g, b, target, tol) {
  return (
    Math.abs(r - target.r) <= tol &&
    Math.abs(g - target.g) <= tol &&
    Math.abs(b - target.b) <= tol
  );
}

// Create a canvas from an image where spot-color pixels become transparent
function createMaskedOverlayCanvas(img, hexColor, tolerance) {
  const rgb = hexToRgb(hexColor);
  const c = document.createElement("canvas");
  const w = (c.width = img.naturalWidth || img.width);
  const h = (c.height = img.naturalHeight || img.height);
  const x = c.getContext("2d");
  x.drawImage(img, 0, 0);
  const data = x.getImageData(0, 0, w, h);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i],
      g = d[i + 1],
      b = d[i + 2];
    if (colorClose(r, g, b, rgb, tolerance)) d[i + 3] = 0; // make transparent
  }
  x.putImageData(data, 0, 0);
  return c;
}

// Strip mode auto flow
async function runStripSequence(template) {
  lastCaptureFlow = () => runStripSequence(template); // Store this function for retake
  // 3 photos automatically with pauses
  const shots = [];
  clearLiveClip();
  const lastShotImg = document.getElementById("lastShot");
  const { state: previewState, prevAspect } = await prepareStripCapture(
    template
  );
  let previewRestored = false;
  setBoothControlsVisible(false);
  if (lastShotImg) lastShotImg.style.display = "none";
  for (let i = 0; i < 3; i++) {
    if (lastShotImg) lastShotImg.style.display = "none";
    const snap = await countdownAndSnap();
    const frozenSnap = cloneCanvasForStrip(snap) || snap;
    shots.push(frozenSnap);
    if (i < 2) {
      try {
        if (lastShotImg) {
          lastShotImg.src = frozenSnap.toDataURL("image/png");
          lastShotImg.style.display = "block";
          await delay(1200);
          lastShotImg.style.display = "none";
        }
      } catch (_) {}
      const remaining = 3000 - (lastShotImg ? 1200 : 0);
      if (remaining > 0) await delay(remaining);
    }
  }
  try {
    const stripUrl = await composeStrip(template, shots);
    // Keep the capture surface cleared until the completed strip is ready for
    // showFinal(); restoring it here briefly exposed an empty template frame.
    enterFinalizingState(stripUrl);
    const uploadResult = await uploadCaptureOnce({
      previewUrl: stripUrl,
      resourceType: "image",
      modeName: "strip",
    });
    showFinal(stripUrl, {
      shareUrl: uploadResult.publicUrl,
      uploadQueued: uploadResult.queued,
    });
    previewRestored = true;
    recordAnalytics("strip", template.src);
  } finally {
    if (!previewRestored) restorePreviewState(previewState);
    setCaptureAspect(prevAspect);
  }
}
function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function unlockBoothAudio() {
  boothAudioEnabled = true;
  try {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return;
    if (!boothAudioContext) boothAudioContext = new AudioContextCtor();
    if (boothAudioContext.state === "suspended") {
      boothAudioContext.resume().catch(() => {});
    }
  } catch (_) {}
}

function playBoothSound(kind = "tap") {
  if (!boothAudioEnabled) return;
  try {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return;
    if (!boothAudioContext) boothAudioContext = new AudioContextCtor();
    const context = boothAudioContext;
    if (context.state === "suspended") context.resume().catch(() => {});
    const config =
      {
        tap: { frequency: 520, duration: 0.08, gain: 0.035 },
        countdown: { frequency: 660, duration: 0.12, gain: 0.04 },
        smile: { frequency: 880, duration: 0.16, gain: 0.045 },
        success: { frequency: 740, duration: 0.18, gain: 0.05 },
        qr: { frequency: 620, duration: 0.14, gain: 0.035 },
        goodbye: { frequency: 520, duration: 0.22, gain: 0.04 },
      }[kind] || { frequency: 520, duration: 0.08, gain: 0.035 };
    const now = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(config.frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(config.gain, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + config.duration);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(now);
    osc.stop(now + config.duration + 0.02);
  } catch (_) {}
}

function getVideoTrack() {
  try {
    if (!stream) return null;
    const tracks = stream.getVideoTracks();
    return tracks && tracks.length ? tracks[0] : null;
  } catch (_) {
    return null;
  }
}

async function setTorch(enabled) {
  const track = getVideoTrack();
  if (!track || typeof track.getCapabilities !== "function") return false;
  const caps = track.getCapabilities();
  if (!caps || !caps.torch) return false;
  try {
    await track.applyConstraints({ advanced: [{ torch: !!enabled }] });
    torchEnabled = !!enabled;
    return true;
  } catch (_) {
    return false;
  }
}
async function showCountdown(text) {
  setMobileSettingsOpen(false);
  const co = DOM.countdownOverlay;
  co.textContent = text;
  playBoothSound(String(text).toLowerCase().includes("smile") ? "smile" : "countdown");
  updateCountdownFontSize();
  if (DOM.boothScreen && getSelectedCaptureMode() !== "message")
    DOM.boothScreen.classList.add("countdown-mode");
  co.classList.add("show");
  await delay(800);
  co.classList.remove("show");
  await delay(200);
}
async function countdownAndSnap(options = {}) {
  const { live = false, instant = false } = options || {};
  const guide = DOM.silhouette;
  if (guide) guide.style.display = "none";
  const lowLightEnabled = getLowLightEnabled();
  const torchUsed = lowLightEnabled ? await setTorch(true) : false;
  if (!instant) {
    for (let n = 3; n > 0; n--) {
      await showCountdown(n);
    }
    await showCountdown("SMILE!");
  } else if (DOM.countdownOverlay) {
    DOM.countdownOverlay.classList.remove("show");
    if (DOM.boothScreen) DOM.boothScreen.classList.remove("countdown-mode");
  }
  if (!live || (lowLightEnabled && !torchUsed)) triggerFlash();
  if (!live) setRecordingHighlight(false);
  const livePromise = live ? captureLiveClip(LIVE_PHOTO_DURATION_MS) : null;
  const shot = applyAutoEnhanceCanvas(drawToCanvasFromVideo());
  if (getAiBackgroundEnabled()) {
    const mask = await getAiSegmentationMask(shot);
    if (mask) shot.__aiMask = mask;
  } else if (getGreenScreenEnabled()) {
    try {
      const ctx = shot.getContext("2d");
      if (ctx) removeGreen(ctx, shot.width, shot.height);
    } catch (_) {}
  }
  if (torchUsed) await setTorch(false);
  freezeCapturePreview(shot);
  if (livePromise) {
    const clip = await livePromise;
    setLiveClip(clip);
    setRecordingHighlight(false);
  } else {
    clearLiveClip();
    setRecordingHighlight(false);
  }
  if (guide) guide.style.display = "";
  return shot;
}

function freezeCapturePreview(photoCanvas) {
  if (!photoCanvas) return;
  let stillUrl = "";
  try {
    stillUrl = photoCanvas.toDataURL("image/png");
  } catch (_) {
    stillUrl = "";
  }
  showPreviewFreezeFrame(stillUrl);
}

function triggerFlash() {
  const fo = DOM.flashOverlay;
  if (!fo) return;
  // Restart animation by toggling class
  fo.classList.remove("flash");
  // Force reflow to restart the animation reliably
  void fo.offsetWidth;
  fo.classList.add("flash");
  // Clean up after animation ends (fallback timeout as well)
  const cleanup = () => fo.classList.remove("flash");
  fo.addEventListener("animationend", cleanup, { once: true });
  setTimeout(cleanup, 600);
}

function getThemeHeadingFont(theme) {
  return theme?.fontHeading || theme?.font || "serif";
}

function getThemeBodyFont(theme) {
  return theme?.fontBody || theme?.font || "sans-serif";
}

function resolveCanvasTextFamily(field, theme) {
  const family = field.fontFamily || "";
  if (family) return family;
  return field.key === "event_date"
    ? getThemeBodyFont(theme)
    : getThemeHeadingFont(theme);
}

function wrapCanvasText(ctx, text, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines = [];
  let current = words.shift() || "";
  words.forEach((word) => {
    const next = `${current} ${word}`;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  });
  if (current) lines.push(current);
  return lines;
}

function fitCanvasText(ctx, text, rect, family, weight, startSize, minSize) {
  let size = startSize;
  while (size > minSize) {
    ctx.font = `${weight} ${size}px ${family}`;
    const lines = wrapCanvasText(ctx, text, Math.max(20, rect.w - 16));
    const lineHeight = size * 1.14;
    if (lines.length * lineHeight <= rect.h) {
      return { size, lines, lineHeight };
    }
    size -= 1;
  }
  ctx.font = `${weight} ${minSize}px ${family}`;
  return {
    size: minSize,
    lines: wrapCanvasText(ctx, text, Math.max(20, rect.w - 16)),
    lineHeight: minSize * 1.14,
  };
}

function drawTemplateTextFields(ctx, width, height, fields, event, theme) {
  const normalized = normalizeTemplateTextFields(fields);
  if (!normalized.length || !event) return false;
  let drewText = false;
  normalized.forEach((field) => {
    const rawValue = resolveTemplateTextValue(field.key, event);
    const text = field.uppercase ? rawValue.toUpperCase() : rawValue;
    if (!text) return;
    const rect = resolveTemplateTextRect(field, width, height);
    if (!rect || rect.w <= 0 || rect.h <= 0) return;
    const family = resolveCanvasTextFamily(field, theme);
    const weight = field.fontWeight || "600";
    const startSize =
      field.fontSize || Math.max(18, Math.round(Math.min(width, height) * 0.03));
    const minSize =
      field.minFontSize || Math.max(10, Math.round(startSize * 0.5));
    const metrics = fitCanvasText(
      ctx,
      text,
      rect,
      family,
      weight,
      startSize,
      minSize
    );
    if (!metrics.lines.length) return;
    ctx.save();
    ctx.fillStyle = field.color || theme?.accent2 || "#ffffff";
    ctx.textBaseline = "top";
    ctx.textAlign =
      field.align === "left"
        ? "left"
        : field.align === "right"
        ? "right"
        : "center";
    ctx.font = `${weight} ${metrics.size}px ${family}`;
    const totalHeight = metrics.lines.length * metrics.lineHeight;
    const x =
      field.align === "left"
        ? rect.x + 8
        : field.align === "right"
        ? rect.x + rect.w - 8
        : rect.x + rect.w / 2;
    let y = rect.y + (rect.h - totalHeight) / 2;
    metrics.lines.forEach((line) => {
      ctx.fillText(line, x, y);
      y += metrics.lineHeight;
    });
    ctx.restore();
    drewText = true;
  });
  return drewText;
}

function drawDynamicEventText(
  ctx,
  width,
  height,
  event,
  theme,
  isStrip = false
) {
  const p1 = event?.partner1 || "";
  const p2 = event?.partner2 || "";
  const bday = event?.birthdayName || "";
  const expo = event?.expoCompany || "";
  if (!p1 && !p2 && !bday && !expo) return;

  const names = expo || bday || (p1 && p2 ? `${p1} & ${p2}` : p1 || p2);
  const date = event?.date || "";

  ctx.save();
  const headingFont = getThemeHeadingFont(theme);
  const bodyFont = getThemeBodyFont(theme);
  const textColor = theme?.accent2 || "#ffffff";

  ctx.fillStyle = textColor;
  ctx.textAlign = "center";

  if (!isStrip) {
    const fontSize = Math.round(height * 0.045);
    ctx.font = `bold ${fontSize}px ${headingFont}`;
    ctx.fillText(names.toUpperCase(), width / 2, height * 0.92);
    if (date) {
      ctx.font = `${Math.round(fontSize * 0.55)}px ${bodyFont}`;
      ctx.fillText(date, width / 2, height * 0.96);
    }
  }
  ctx.restore();
}

// Compose photostrip
async function composeStrip(template, photos) {
  const bg = await loadImage(template.src);
  const enhancedPhotos = Array.isArray(photos)
    ? photos.map((photo) => cloneCanvasForStrip(ensureEnhancedCanvas(photo)))
    : [];
  const layout = normalizeTemplateLayout(template && template.layout);
  const explicitPhotoSlots = hasExplicitPhotoSlots(template);
  const normalizedPhotoSlots = explicitPhotoSlots
    ? normalizeOverlayPhotoSlots(template)
    : [];
  const rows =
    (template && template.__slotMetrics && template.__slotMetrics.rows) ||
    getTemplateRowCount(layout, template && template.slots) ||
    Math.max(1, enhancedPhotos.length);
  const bgAspect =
    (bg.naturalWidth || bg.width || 1) / (bg.naturalHeight || bg.height || 1);
  let targetW = bg.naturalWidth || bg.width || 1800;
  let targetH = bg.naturalHeight || bg.height || 1200;
  if (!explicitPhotoSlots && layout === "double_column") {
    targetW = 1200;
    targetH = 1800;
  } else if (!explicitPhotoSlots && layout === "vertical") {
    targetW = 1200;
    targetH = 1800;
  } else if (layout === "custom" && Array.isArray(template && template.slots)) {
    targetW = bg.naturalWidth || bg.width || targetW;
    targetH = bg.naturalHeight || bg.height || targetH;
  }
  const c = CanvasBuffer.get("strip-composer", targetW, targetH);
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, targetW, targetH);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetW, targetH);

  if (explicitPhotoSlots) {
    logTemplateSlotResolution(template, normalizedPhotoSlots, targetW, targetH);
    const overlayDefinition = normalizeOverlayDefinition(template);
    await renderOverlayToCanvas(
      ctx,
      {
        ...(overlayDefinition || {}),
        photoSlots: normalizedPhotoSlots,
      },
      { photos: enhancedPhotos, repeatPhotos: true },
      targetW,
      targetH
    );
  } else if (layout === "double_column") {
    // Two identical strips on one print sheet
    renderDoubleColumn(c, enhancedPhotos, bg, template, rows);
  } else if (layout === "photo_strip_2" || layout === "photo_strip_3" || layout === "photo_strip_4") {
    renderSingleColumnStrip(c, enhancedPhotos, bg, template, rows);
  } else if (layout === "vertical") {
    // Draw template first
    drawImageContain(ctx, bg, 0, 0, targetW, targetH);
    const padding = Math.round(targetH * 0.03);
    const slotH = Math.floor((targetH - padding * 4) / 3);
    const slotW = targetW - padding * 2;
    for (let i = 0; i < 3; i++) {
      const x = padding,
        y = padding + i * (slotH + padding);
      drawImageContain(ctx, enhancedPhotos[i], x, y, slotW, slotH);
    }
  } else if (layout === "horizontal") {
    drawImageContain(ctx, bg, 0, 0, targetW, targetH);
    const padding = Math.round(targetW * 0.03);
    const slotW = Math.floor((targetW - padding * 5) / 4); // 3 slots + one decorative column
    const slotH = targetH - padding * 2;
    for (let i = 0; i < 3; i++) {
      const x = padding + i * (slotW + padding);
      const y = padding;
      drawImageContain(ctx, enhancedPhotos[i], x, y, slotW, slotH);
    }
  } else if (layout === "spot_mask" || layout === "spotmask") {
    drawImageContain(ctx, bg, 0, 0, targetW, targetH);
    const regions = await detectMaskRegions(
      bg,
      SPOT_MASK.color,
      SPOT_MASK.tolerance
    );
    const max = Math.min(photos.length, regions.length);
    for (let i = 0; i < max; i++) {
      const r = regions[i];
      if (!r) break;
      drawImageContain(ctx, enhancedPhotos[i], r.x, r.y, r.w, r.h);
    }
    const masked = createMaskedOverlayCanvas(
      bg,
      SPOT_MASK.color,
      SPOT_MASK.tolerance
    );
    drawImageContain(ctx, masked, 0, 0, targetW, targetH);
  } else if (layout === "custom" && template.slots) {
    drawImageContain(ctx, bg, 0, 0, targetW, targetH);
    for (
      let i = 0;
      i < Math.min(enhancedPhotos.length, template.slots.length);
      i++
    ) {
      const s = template.slots[i];
      drawImageContain(ctx, enhancedPhotos[i], s.x, s.y, s.w, s.h);
    }
  } else {
    drawImageContain(ctx, bg, 0, 0, targetW, targetH);
  }

  // Auto-fill names for strips
  const active = getActiveEvent();
  const renderedTemplateText = drawTemplateTextFields(
    ctx,
    targetW,
    targetH,
    template && template.textFields,
    active,
    activeTheme
  );
  if (
    !renderedTemplateText &&
    active &&
    (active.partner1 ||
      active.partner2 ||
      active.birthdayName ||
      active.expoCompany)
  ) {
    drawDynamicEventText(ctx, targetW, targetH, active, activeTheme, true);
  }

  // Since OffscreenCanvas doesn't have toDataURL, we convert or use convertToBlob
  return c instanceof HTMLCanvasElement
    ? c.toDataURL("image/png")
    : await offscreenToDataURL(c);
}

// Compose a single photo into a print-safe 4x6 canvas without cropping
async function finalizeToPrint(photoCanvas, overlaySrc) {
  const enhancedPhotoCanvas = ensureEnhancedCanvas(photoCanvas);
  const resolvedAspect = getResolvedCaptureAspectRatio();
  const orientation = resolvedAspect < 1 ? "portrait" : "landscape";
  const { canvas: c, ctx, size } = createPrintCanvas(orientation);
  if (!ctx) return "";
  const targetW = size.width;
  const targetH = size.height;
  const resolvedOverlaySrc = overlaySrc
    ? resolveOverlayRenderSrc(activeTheme, overlaySrc)
    : "";
  const overlayDefinition = overlaySrc
    ? getOverlayEntryBySrc(activeTheme, overlaySrc)
    : null;
  // Background fill
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetW, targetH);
  const aiEnabled = getAiBackgroundEnabled();
  // Background scene
  const bg =
    aiEnabled || getGreenScreenEnabled()
      ? getActiveGreenBackground(activeTheme) || ""
      : "";
  if (bg) {
    try {
      const bgImg = await loadImage(bg);
      drawImageCover(ctx, bgImg, 0, 0, targetW, targetH);
    } catch (_) {}
  }
  const photoForPrint = aiEnabled
    ? applyAiMaskToCanvas(
        enhancedPhotoCanvas,
        enhancedPhotoCanvas && enhancedPhotoCanvas.__aiMask
      )
    : enhancedPhotoCanvas;
  const overlayBundle =
    overlayDefinition ||
    (resolvedOverlaySrc ? normalizeOverlayDefinition({ src: resolvedOverlaySrc }) : null);
  if (overlayBundle) {
    await renderOverlayToCanvas(
      ctx,
      overlayBundle,
      { photo: photoForPrint },
      targetW,
      targetH
    );
  } else {
    drawCoverInRect(ctx, photoForPrint, 0, 0, targetW, targetH);
  }

  // Auto-fill names for single photos
  const active = getActiveEvent();
  const overlayTextDefinition = getOverlayList(activeTheme).find(
    (item) => item && item.src === overlaySrc
  );
  const renderedTemplateText = drawTemplateTextFields(
    ctx,
    targetW,
    targetH,
    overlayTextDefinition && overlayTextDefinition.textFields,
    active,
    activeTheme
  );
  if (
    !renderedTemplateText &&
    active &&
    (active.partner1 ||
      active.partner2 ||
      active.birthdayName ||
      active.expoCompany)
  ) {
    drawDynamicEventText(ctx, targetW, targetH, active, activeTheme);
  }

  applyFilterToCanvas(ctx, targetW, targetH);

  return c.toDataURL("image/png");
}

/**
 * Render a duplicated two-column strip sheet with shared geometry.
 */
function renderDoubleColumn(canvas, photos, overlayImage, template, rows = 3) {
  const ctx = canvas.getContext("2d");
  const cols = 2; // duplicate columns
  drawImageContain(ctx, overlayImage, 0, 0, canvas.width, canvas.height);

  const headerPct = Math.max(
    0,
    Math.min(
      0.5,
      toNumber(template && (template.headerPct || template.header_percent), 0.2)
    )
  );
  const columnPadPct = Math.max(
    0,
    Math.min(0.2, toNumber(template && template.columnPadPct, 0.055))
  );
  const slotSpacingPct = Math.max(
    0,
    Math.min(0.2, toNumber(template && template.slotSpacingPct, 0.022))
  );
  const footerPct = Math.max(
    0,
    Math.min(0.3, toNumber(template && template.footerPct, 0.03))
  );

  const columnW = canvas.width / cols;
  const columnPad = columnPadPct * columnW;
  const slotW = Math.max(1, columnW - columnPad * 2);
  const headerH = headerPct * canvas.height;
  const footerH = footerPct * canvas.height;
  const slotSpacing = slotSpacingPct * canvas.height;
  const usableH = canvas.height - headerH - footerH - slotSpacing * (rows + 1);
  const slotH = Math.max(1, usableH / rows);
  const startY = headerH + slotSpacing;

  const standardSlots = normalizeTemplateSlots(
    getStandardDoubleColumnStripSlots(),
    cols
  );
  if (standardSlots) {
    for (let row = 0; row < rows; row++) {
      const photo = photos[row];
      if (!photo) continue;
      for (let col = 0; col < cols; col++) {
        const slot = standardSlots[col] && standardSlots[col][row];
        if (!slot) continue;
        drawImageCover(ctx, photo, slot.x, slot.y, slot.w, slot.h);
      }
    }
  } else {
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) {
        const photo = photos[row]; // place same row photo into both columns
        if (!photo) continue;
        const x = Math.round(col * columnW + columnPad);
        const y = Math.round(startY + row * (slotH + slotSpacing));
        drawImageCover(ctx, photo, x, y, slotW, slotH);
      }
    }
  }
}

function renderSingleColumnStrip(canvas, photos, overlayImage, template, rows = 3) {
  const ctx = canvas.getContext("2d");
  const headerPct = Math.max(
    0,
    Math.min(
      0.5,
      toNumber(template && (template.headerPct || template.header_percent), 0.2)
    )
  );
  const columnPadPct = Math.max(
    0,
    Math.min(0.2, toNumber(template && template.columnPadPct, 0.11))
  );
  const slotSpacingPct = Math.max(
    0,
    Math.min(0.2, toNumber(template && template.slotSpacingPct, 0.024))
  );
  const footerPct = Math.max(
    0,
    Math.min(0.3, toNumber(template && template.footerPct, 0.05))
  );
  const cachedSlots =
    (template && template.__slotMetrics && template.__slotMetrics.slots) ||
    normalizeTemplateSlots(template && template.slots, 1);
  const detectedSlots =
    cachedSlots || detectTransparentColumnSlots(overlayImage, rows, 1);

  if (cachedSlots && cachedSlots[0] && cachedSlots[0].length === rows) {
    drawImageContain(ctx, overlayImage, 0, 0, canvas.width, canvas.height);
    const scaleX =
      canvas.width / (overlayImage.naturalWidth || overlayImage.width || 1);
    const scaleY =
      canvas.height / (overlayImage.naturalHeight || overlayImage.height || 1);
    for (let row = 0; row < rows; row++) {
      const photo = photos[row];
      const slot = cachedSlots[0][row];
      if (!photo || !slot) continue;
      drawImageCover(
        ctx,
        photo,
        slot.x * scaleX,
        slot.y * scaleY,
        slot.w * scaleX,
        slot.h * scaleY
      );
    }
    return;
  }

  if (detectedSlots && detectedSlots[0] && detectedSlots[0].length === rows) {
    const scaleX =
      canvas.width / (overlayImage.naturalWidth || overlayImage.width || 1);
    const scaleY =
      canvas.height / (overlayImage.naturalHeight || overlayImage.height || 1);
    for (let row = 0; row < rows; row++) {
      const photo = photos[row];
      const slot = detectedSlots[0][row];
      if (!photo || !slot) continue;
      drawImageCover(
        ctx,
        photo,
        slot.x * scaleX,
        slot.y * scaleY,
        slot.w * scaleX,
        slot.h * scaleY
      );
    }
  } else {
    const padX = canvas.width * columnPadPct;
    const slotW = Math.max(1, canvas.width - padX * 2);
    const headerH = canvas.height * headerPct;
    const footerH = canvas.height * footerPct;
    const slotSpacing = canvas.height * slotSpacingPct;
    const usableH =
      canvas.height - headerH - footerH - slotSpacing * (rows + 1);
    const slotH = Math.max(1, usableH / rows);
    const x = Math.round(padX);
    const startY = headerH + slotSpacing;
    for (let row = 0; row < rows; row++) {
      const photo = photos[row];
      if (!photo) continue;
      const y = Math.round(startY + row * (slotH + slotSpacing));
      drawImageCover(ctx, photo, x, y, slotW, slotH);
    }
  }

  ctx.drawImage(overlayImage, 0, 0, canvas.width, canvas.height);
}

// Detect contiguous regions matching the mask color; returns array of {x,y,w,h} in image coords
async function detectMaskRegions(img, hexColor, tolerance) {
  const rgb = hexToRgb(hexColor);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h);
  const d = data.data;
  const visited = new Uint8Array(w * h);
  const regions = [];
  const stack = [];
  const idx = (x, y) => y * w + x;
  const match = (x, y) => {
    const i = idx(x, y) * 4;
    return colorClose(d[i], d[i + 1], d[i + 2], rgb, tolerance);
  };
  const minArea = Math.max(50, Math.floor(w * h * 0.001)); // ignore tiny noise
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = idx(x, y);
      if (visited[p]) continue;
      visited[p] = 1;
      if (!match(x, y)) continue;
      // flood fill
      let minX = x,
        maxX = x,
        minY = y,
        maxY = y,
        area = 0;
      stack.length = 0;
      stack.push([x, y]);
      while (stack.length) {
        const [sx, sy] = stack.pop();
        const sp = idx(sx, sy);
        if (sx < 0 || sx >= w || sy < 0 || sy >= h) continue;
        if (visited[sp] && !(sx === x && sy === y)) continue; // allow seed already marked
        if (!visited[sp]) visited[sp] = 1;
        if (!match(sx, sy)) continue;
        area++;
        if (sx < minX) minX = sx;
        if (sx > maxX) maxX = sx;
        if (sy < minY) minY = sy;
        if (sy > maxY) maxY = sy;
        // neighbors
        const neigh = [
          [sx + 1, sy],
          [sx - 1, sy],
          [sx, sy + 1],
          [sx, sy - 1],
        ];
        for (const [nx, ny] of neigh) {
          const np = idx(nx, ny);
          if (nx >= 0 && nx < w && ny >= 0 && ny < h && !visited[np]) {
            visited[np] = 1;
            stack.push([nx, ny]);
          }
        }
      }
      if (area >= minArea) {
        regions.push({
          x: minX,
          y: minY,
          w: maxX - minX + 1,
          h: maxY - minY + 1,
        });
      }
    }
  }
  // Sort regions top-to-bottom, then left-to-right
  regions.sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
  return regions;
}

// Final preview
function setFinalMediaOrientation(element, width, height) {
  if (!element || !width || !height) return;
  element.dataset.orientation = height > width ? "portrait" : "landscape";
}

function resetTransientCaptureOverlays(options = {}) {
  capturePreviewFrozen = false;
  const keepFinalStrip = !!options.keepFinalStrip;
  const keepFinalLive = !!options.keepFinalLive;
  if (DOM.countdownOverlay) {
    DOM.countdownOverlay.classList.remove("show");
    DOM.countdownOverlay.textContent = "";
  }
  if (DOM.flashOverlay) DOM.flashOverlay.classList.remove("flash");
  if (DOM.lastShot) {
    DOM.lastShot.style.display = "none";
    DOM.lastShot.removeAttribute("src");
  }
  clearOverlayPreviewSurface();
  if (DOM.finalLive && !keepFinalLive) {
    DOM.finalLive.pause();
    DOM.finalLive.removeAttribute("src");
    DOM.finalLive.removeAttribute("poster");
    DOM.finalLive.load();
    DOM.finalLive.classList.add("hidden");
  }
  if (DOM.finalStrip && !keepFinalStrip) {
    DOM.finalStrip.classList.remove("hidden");
    DOM.finalStrip.removeAttribute("src");
    DOM.finalStrip.dataset.orientation = "";
  }
}

function setFinalExperienceStage(stage = "review") {
  const isReview = stage === "review";
  if (DOM.reviewPanel) DOM.reviewPanel.classList.toggle("hidden", !isReview);
  if (DOM.qrCodeContainer) {
    DOM.qrCodeContainer.classList.toggle("experience-reveal", !isReview);
    if (isReview) DOM.qrCodeContainer.classList.add("hidden");
  }
  if (DOM.paidPrintPanel) {
    DOM.paidPrintPanel.classList.toggle("experience-reveal", !isReview);
    if (isReview) DOM.paidPrintPanel.classList.remove("show");
  }
  if (DOM.lovePhotoBtn) {
    DOM.lovePhotoBtn.disabled = false;
    DOM.lovePhotoBtn.classList.remove("celebrate");
    DOM.lovePhotoBtn.textContent = "✅ LOVE IT!";
  }
}

function revealFinalSaveStage() {
  if (DOM.reviewPanel) DOM.reviewPanel.classList.add("hidden");
  if (DOM.qrCodeContainer && DOM.qrCodeContainer.dataset.ready === "true") {
    DOM.qrCodeContainer.classList.remove("hidden");
    DOM.qrCodeContainer.classList.add("experience-reveal");
    playBoothSound("qr");
  }
  if (DOM.paidPrintPanel && DOM.paidPrintPanel.dataset.ready === "true") {
    DOM.paidPrintPanel.classList.add("show", "experience-reveal");
  }
}

function handleLovePhoto() {
  unlockBoothAudio();
  playBoothSound("success");
  if (!DOM.lovePhotoBtn) {
    revealFinalSaveStage();
    return;
  }
  DOM.lovePhotoBtn.disabled = true;
  DOM.lovePhotoBtn.classList.add("celebrate");
  DOM.lovePhotoBtn.textContent = "💚 Awesome!";
  setTimeout(revealFinalSaveStage, 300);
}

let qrCodeLibraryPromise = null;

function loadQrCodeLibrary() {
  if (window.QRCode && typeof window.QRCode.toCanvas === "function") {
    return Promise.resolve(window.QRCode);
  }
  if (qrCodeLibraryPromise) return qrCodeLibraryPromise;
  qrCodeLibraryPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/qrcode@1.5.1/build/qrcode.min.js";
    script.async = true;
    script.onload = () => {
      if (window.QRCode && typeof window.QRCode.toCanvas === "function") {
        resolve(window.QRCode);
        return;
      }
      reject(new Error("QR library loaded without QRCode.toCanvas"));
    };
    script.onerror = () => reject(new Error("QR library failed to load"));
    document.head.appendChild(script);
  });
  return qrCodeLibraryPromise;
}

function showGoodbyeMoment() {
  if (!DOM.goodbyeOverlay) return;
  const personality = getBoothPersonality();
  const title = DOM.goodbyeOverlay.querySelector("h2");
  const body = DOM.goodbyeOverlay.querySelector("p");
  if (title) title.textContent = "Thank You!";
  if (body) body.textContent = personality.thanks.replace(/^thank you!?\s*/i, "") || "Enjoy your photos!";
  DOM.goodbyeOverlay.classList.add("show");
  playBoothSound("goodbye");
  setTimeout(() => {
    if (DOM.goodbyeOverlay) DOM.goodbyeOverlay.classList.remove("show");
  }, 1400);
}

function setupFinalExperienceActions() {
  if (DOM.lovePhotoBtn && !DOM.lovePhotoBtn.dataset.bound) {
    DOM.lovePhotoBtn.dataset.bound = "true";
    DOM.lovePhotoBtn.addEventListener("click", handleLovePhoto);
  }
  if (DOM.reviewRetakeBtn && !DOM.reviewRetakeBtn.dataset.bound) {
    DOM.reviewRetakeBtn.dataset.bound = "true";
    DOM.reviewRetakeBtn.addEventListener("click", () => {
      unlockBoothAudio();
      playBoothSound("tap");
      retakePhoto();
    });
  }
}

function showFinal(url, options = {}) {
  clearTimeout(hidePreviewTimer); // Clear any existing timer
  setupFinalExperienceActions();
  syncBoothPersonality();
  if (DOM.goodbyeOverlay) DOM.goodbyeOverlay.classList.remove("show");
  if (DOM.qrCodeContainer) DOM.qrCodeContainer.dataset.ready = "false";
  if (DOM.paidPrintPanel) DOM.paidPrintPanel.dataset.ready = "false";
  const img = DOM.finalStrip;
  const previewFit = getSelectedCaptureMode() === "strip" ? "contain" : "cover";
  if (img) img.style.objectFit = previewFit;
  if (DOM.finalLive) DOM.finalLive.style.objectFit = previewFit;
  syncFrameSizeVars();
  const shareType = options.shareType || "image";
  lastShareType = shareType;
  const shareBlob = options.shareBlob || null;
  const skipShare = !!options.skipShare;
  const providedShareUrl =
    options.shareUrl && /^https?:/i.test(String(options.shareUrl))
      ? String(options.shareUrl)
      : "";
  const printImageUrl =
    options.printImageUrl && /^https?:/i.test(String(options.printImageUrl))
      ? String(options.printImageUrl)
      : shareType === "image"
        ? providedShareUrl
        : "";
  const printEligible = options.printEligible !== false && shareType === "image";
  const offline = offlineModeActive();
  const qrContainer = DOM.qrCodeContainer;
  const qrCanvas = DOM.qrCode;
  const panel = DOM.finalPreview;
  const useLiveClip = !!(
    DOM.finalLive &&
    (lastLiveClipUrl || shareBlob) &&
    !options.forceImage
  );
  if (useLiveClip) {
    if (!lastLiveClipUrl && shareBlob) setLiveClip(shareBlob);
    DOM.finalLive.src = lastLiveClipUrl;
    DOM.finalLive.poster = url;
    if (img) img.classList.add("hidden");
    if (img) DOM.finalLive.dataset.orientation = img.dataset.orientation || "";
  } else if (DOM.finalLive) {
    DOM.finalLive.pause();
    DOM.finalLive.removeAttribute("src");
    DOM.finalLive.removeAttribute("poster");
    DOM.finalLive.load();
    DOM.finalLive.classList.add("hidden");
  }
  let finalPreviewShown = false;
  const revealFinalPreview = () => {
    if (finalPreviewShown) return;
    finalPreviewShown = true;
    resetTransientCaptureOverlays({
      keepFinalStrip: true,
      keepFinalLive: useLiveClip,
    });
    if (DOM.boothScreen) {
      DOM.boothScreen.classList.remove("countdown-mode", "finalizing-mode");
      DOM.boothScreen.classList.add("share-mode");
    }
    if (img) img.classList.toggle("hidden", useLiveClip);
    if (DOM.finalLive && DOM.finalLive.src) {
      DOM.finalLive.classList.remove("hidden");
    }
    panel.classList.add("show");
    setFinalExperienceStage("review");
    if (!skipShare && providedShareUrl) {
      lastShareUrl = providedShareUrl;
      if (DOM.shareStatus) {
        DOM.shareStatus.textContent = "Preparing QR";
        DOM.shareStatus.style.display = "inline-flex";
      }
      if (DOM.shareLink) {
        DOM.shareLink.href = lastShareUrl;
        DOM.shareLink.textContent = lastShareUrl;
      }
      renderQrCode(qrCanvas, lastShareUrl).then((qrRendered) => {
        if (qrContainer) qrContainer.dataset.ready = qrRendered ? "true" : "false";
        if (DOM.shareStatus) {
          DOM.shareStatus.textContent = qrRendered ? "Link ready" : "QR failed";
          DOM.shareStatus.style.display = qrRendered ? "none" : "inline-flex";
        }
        if (DOM.qrHint) {
          DOM.qrHint.textContent = qrRendered
            ? ""
            : "Open the link button if the QR does not appear.";
          DOM.qrHint.style.display = qrRendered ? "none" : "block";
        }
        if (qrRendered && DOM.reviewPanel && DOM.reviewPanel.classList.contains("hidden")) {
          revealFinalSaveStage();
        }
      });
    } else if (!skipShare) {
      lastShareUrl = null;
      if (options.uploadQueued && DOM.qrHint) {
        DOM.qrHint.textContent =
          "Upload queued: QR will be available after retry.";
        DOM.qrHint.style.display = "block";
      }
      if (offline && DOM.qrHint) {
        DOM.qrHint.textContent = "Offline: QR disabled";
        DOM.qrHint.style.display = "block";
      }
      if (!cloudinaryEnabled() && DOM.qrHint) {
        DOM.qrHint.textContent = "Enable Cloudinary in Admin to show QR";
        DOM.qrHint.style.display = "block";
      }
    }
    renderPaidPrintPanel(printEligible);
    if (DOM.paidPrintPanel) DOM.paidPrintPanel.classList.remove("show");
    enqueueFinalPrintIfNeeded(printImageUrl, printEligible);
    resetIdleTimer();
    if (!isBoothTestMode()) hidePreviewTimer = setTimeout(hideFinal, 15000);
  };

  // Reset form from previous use
  if (DOM.emailInput) DOM.emailInput.value = "";
  if (DOM.sendBtn) {
    DOM.sendBtn.textContent = "Send";
    DOM.sendBtn.disabled = false;
  }

  if (DOM.retakeBtn) {
    DOM.retakeBtn.style.display = "none";
    DOM.retakeBtn.disabled = true;
  }
  if (DOM.closePreviewBtn) DOM.closePreviewBtn.style.display = "block";

  if (img) {
    img.onload = () => {
      setFinalMediaOrientation(
        img,
        img.naturalWidth || img.width,
        img.naturalHeight || img.height
      );
      if (DOM.finalLive) {
        DOM.finalLive.dataset.orientation = img.dataset.orientation || "";
      }
      revealFinalPreview();
    };
    img.src = url;
    if (img.complete) {
      setFinalMediaOrientation(
        img,
        img.naturalWidth || img.width,
        img.naturalHeight || img.height
      );
      if (DOM.finalLive) {
        DOM.finalLive.dataset.orientation = img.dataset.orientation || "";
      }
      revealFinalPreview();
    }
  } else {
    revealFinalPreview();
  }
  if (useLiveClip && DOM.finalLive) DOM.finalLive.play().catch(() => {});
  // No local-QR fallback: only show QR when a public link is ready (handled above)
}

async function renderQrCode(canvas, text) {
  if (!canvas || !text) return false;
  try {
    const qrCode = await loadQrCodeLibrary();
    return await new Promise((resolve) => {
      qrCode.toCanvas(canvas, text, { width: 240, margin: 1 }, function (error) {
        if (error) {
          console.error(error);
          resolve(false);
          return;
        }
        resolve(true);
      });
    });
  } catch (e) {
    console.error(e);
    return false;
  }
}

function copyEventGalleryLink() {
  const link = getEventGalleryUrl();
  if (!link) {
    alert("Set Cloudinary Cloud Name first.");
    return;
  }
  copyText(link);
  showToast("Event gallery link copied");
}

function openEventGalleryLink() {
  const link = getEventGalleryUrl();
  if (!link) {
    alert("Set Cloudinary Cloud Name first.");
    return;
  }
  try {
    window.open(link, "_blank", "noopener");
  } catch (_) {
    location.href = link;
  }
}

// Build a slug for the current event selection to organize uploads per event
function getCurrentEventSlug() {
  try {
    const val =
      DOM.eventSelect && DOM.eventSelect.value ? DOM.eventSelect.value : "";
    if (!val) return "";
    // value is like "fall:halloween" or "school:hawks"; use it directly
    return String(val)
      .toLowerCase()
      .replace(/[^a-z0-9:_\-]+/g, "-")
      .replace(/:+/g, "-");
  } catch (_) {
    return "";
  }
}

function slugifyEventText(value) {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

const EVENTS_STORAGE_KEY = "photoboothEvents";
const ACTIVE_EVENT_KEY = "photoboothActiveEventId";

function getStoredEvents() {
  try {
    const raw = localStorage.getItem(EVENTS_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (_) {
    return [];
  }
}

function setStoredEvents(events, options = {}) {
  const list = Array.isArray(events) ? events.slice() : [];
  list.sort((a, b) => {
    const ad = a && a.date ? new Date(a.date).getTime() : 0;
    const bd = b && b.date ? new Date(b.date).getTime() : 0;
    if (ad !== bd) return bd - ad;
    const an = a && a.name ? a.name.toLowerCase() : "";
    const bn = b && b.name ? b.name.toLowerCase() : "";
    return an.localeCompare(bn);
  });
  localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(list));
  if (!options.skipRemoteSync) scheduleEventsRemoteSync();
}

function getActiveEventId() {
  return localStorage.getItem(ACTIVE_EVENT_KEY) || "";
}

function setActiveEventId(id, options = {}) {
  if (id) localStorage.setItem(ACTIVE_EVENT_KEY, id);
  else localStorage.removeItem(ACTIVE_EVENT_KEY);
  if (id) activeSessionTextDetails = {};
  if (DOM.eventProfileSelect) DOM.eventProfileSelect.value = id || "";
  if (!options.skipRemoteSync) scheduleEventsRemoteSync();
}

function getActiveEvent() {
  const id = getActiveEventId();
  if (!id) return null;
  const events = getStoredEvents();
  return events.find((event) => event && event.id === id) || null;
}

function ensureEventOverrides(event) {
  if (!event.overrides || typeof event.overrides !== "object") {
    event.overrides = {
      backgrounds: [],
      overlays: [],
      templates: [],
      backgroundIndex: 0,
      greenBackgrounds: [],
      greenBackgroundIndex: 0,
    };
  }
  if (!Array.isArray(event.overrides.backgrounds))
    event.overrides.backgrounds = [];
  if (!Array.isArray(event.overrides.overlays)) event.overrides.overlays = [];
  if (!Array.isArray(event.overrides.templates)) event.overrides.templates = [];
  if (typeof event.overrides.backgroundIndex !== "number")
    event.overrides.backgroundIndex = 0;
  if (!Array.isArray(event.overrides.greenBackgrounds))
    event.overrides.greenBackgrounds = [];
  if (typeof event.overrides.greenBackgroundIndex !== "number")
    event.overrides.greenBackgroundIndex = 0;
  return event.overrides;
}

function getActiveEventOverrides() {
  const active = getActiveEvent();
  if (!active)
    return {
      backgrounds: [],
      overlays: [],
      templates: [],
      backgroundIndex: 0,
      greenBackgrounds: [],
      greenBackgroundIndex: 0,
    };
  return ensureEventOverrides(active);
}

function hasOwnEventTextValue(active, key) {
  return !!(
    active &&
    Object.prototype.hasOwnProperty.call(active, key) &&
    typeof active[key] === "string"
  );
}

function getSavedEventTextValue(active, key) {
  return hasOwnEventTextValue(active, key) ? active[key] : "";
}

function isDefaultEventTextValue(value, fallback = "") {
  const current = typeof value === "string" ? value.trim() : "";
  const defaultValue = typeof fallback === "string" ? fallback.trim() : "";
  return !!current && !!defaultValue && current === defaultValue;
}

function setTextFieldValueAndPlaceholder(
  node,
  value = "",
  placeholder = "",
  disabled = false
) {
  if (!node) return;
  const safeValue = typeof value === "string" ? value : "";
  const safePlaceholder = typeof placeholder === "string" ? placeholder : "";
  node.placeholder = safePlaceholder;
  if (typeof document === "undefined" || document.activeElement !== node) {
    node.value = isDefaultEventTextValue(safeValue, safePlaceholder)
      ? ""
      : safeValue;
  }
  node.disabled = !!disabled;
}

function describeAssetSummaryCounts({
  backgrounds = 0,
  greenBackgrounds = 0,
  overlays = 0,
  templates = 0,
  hasLogo = false,
  hasCharacter = false,
} = {}) {
  const parts = [];
  if (backgrounds)
    parts.push(`${backgrounds} background${backgrounds === 1 ? "" : "s"}`);
  if (greenBackgrounds)
    parts.push(
      `${greenBackgrounds} green BG${greenBackgrounds === 1 ? "" : "s"}`
    );
  if (overlays) parts.push(`${overlays} overlay${overlays === 1 ? "" : "s"}`);
  if (templates)
    parts.push(`${templates} template${templates === 1 ? "" : "s"}`);
  if (hasLogo) parts.push("logo");
  return parts.length ? parts.join(", ") : "none";
}

function getEventEditorTheme(theme = null) {
  const active = getActiveEvent();
  const eventThemeKey =
    (active && active.themeKey) ||
    (DOM.eventSelect && DOM.eventSelect.value) ||
    "";
  return (
    theme ||
    resolveThemeByKey(eventThemeKey) ||
    activeTheme ||
    getSelectedThemeTarget() ||
    null
  );
}

function getEventEditorTextValue(active, key, fallback = "") {
  if (hasOwnEventTextValue(active, key)) return active[key];
  return fallback;
}

function syncEventSetupEditor(theme = null) {
  const active = getActiveEvent();
  const themeObj = getEventEditorTheme(theme);
  const hasActiveEvent = !!active;
  const hasEditableTarget = hasActiveEvent || !!themeObj;
  const textSource = hasActiveEvent ? active : activeSessionTextDetails;
  const setDisabled = (node) => {
    if (!node) return;
    node.disabled = !hasEditableTarget;
  };

  if (DOM.eventNameInput)
    setTextFieldValueAndPlaceholder(
      DOM.eventNameInput,
      getSavedEventTextValue(textSource, "name"),
      "Event name",
      !hasEditableTarget
    );
  if (DOM.eventPartner1Input)
    setTextFieldValueAndPlaceholder(
      DOM.eventPartner1Input,
      getSavedEventTextValue(textSource, "partner1"),
      "Partner 1",
      !hasEditableTarget
    );
  if (DOM.eventPartner2Input)
    setTextFieldValueAndPlaceholder(
      DOM.eventPartner2Input,
      getSavedEventTextValue(textSource, "partner2"),
      "Partner 2",
      !hasEditableTarget
    );
  if (DOM.eventBirthdayNameInput)
    setTextFieldValueAndPlaceholder(
      DOM.eventBirthdayNameInput,
      getSavedEventTextValue(textSource, "birthdayName"),
      "Birthday person",
      !hasEditableTarget
    );
  if (DOM.eventExpoCompanyInput)
    setTextFieldValueAndPlaceholder(
      DOM.eventExpoCompanyInput,
      getSavedEventTextValue(textSource, "expoCompany"),
      "Company name",
      !hasEditableTarget
    );
  if (DOM.eventDateInput)
    setTextFieldValueAndPlaceholder(
      DOM.eventDateInput,
      getSavedEventTextValue(textSource, "date"),
      "e.g., April 2026",
      !hasEditableTarget
    );
  if (DOM.eventBannerTextInput)
    setTextFieldValueAndPlaceholder(
      DOM.eventBannerTextInput,
      getSavedEventTextValue(textSource, "bannerText"),
      hasEditableTarget ? resolveThemeBannerText() : "Top booth banner",
      !hasEditableTarget
    );
  if (DOM.eventWelcomeTitleInput)
    setTextFieldValueAndPlaceholder(
      DOM.eventWelcomeTitleInput,
      getSavedEventTextValue(textSource, "welcomeTitle"),
      hasEditableTarget ? resolveThemeWelcomeTitle() : "Welcome screen title",
      !hasEditableTarget
    );
  if (DOM.eventStartButtonTextInput)
    setTextFieldValueAndPlaceholder(
      DOM.eventStartButtonTextInput,
      getSavedEventTextValue(textSource, "startButtonText"),
      hasEditableTarget ? resolveThemeStartButtonText() : "Touch to start",
      !hasEditableTarget
    );
  if (DOM.eventCaptureLabelInput)
    setTextFieldValueAndPlaceholder(
      DOM.eventCaptureLabelInput,
      getSavedEventTextValue(textSource, "captureLabel"),
      hasEditableTarget
        ? resolveThemeCaptureLabel() || resolveBoothCaptureButtonLabel(mode)
        : "Take Photo",
      !hasEditableTarget
    );
  const bannerSize = getBannerSize(themeObj);
  if (DOM.eventBannerSizeInput) {
    DOM.eventBannerSizeInput.value = String(bannerSize);
    DOM.eventBannerSizeInput.disabled = !hasEditableTarget;
  }
  if (DOM.eventBannerSizeValue)
    DOM.eventBannerSizeValue.textContent = `${bannerSize}px`;
  const welcomeSize = resolveWelcomeTitleSize(themeObj);
  if (DOM.eventWelcomeTitleSizeInput) {
    DOM.eventWelcomeTitleSizeInput.value = String(welcomeSize);
    DOM.eventWelcomeTitleSizeInput.disabled = !hasEditableTarget;
  }
  if (DOM.eventWelcomeTitleSizeValue)
    DOM.eventWelcomeTitleSizeValue.textContent = `${welcomeSize}px`;

  if (DOM.eventBaseThemeName) {
    const eventThemeKey = hasActiveEvent ? active.themeKey : "";
    DOM.eventBaseThemeName.textContent =
      themeObj && themeObj.name
        ? themeObj.name
        : eventThemeKey || "No base theme selected";
  }
  if (DOM.eventBaseThemeAssetsSummary) {
    const themeBackgrounds = themeObj
      ? getBaseBackgroundList(themeObj).length
      : 0;
    const themeGreenBackgrounds = Array.isArray(
      themeObj && themeObj.greenBackgrounds
    )
      ? themeObj.greenBackgrounds.filter(Boolean).length
      : 0;
    const themeOverlays = themeObj ? getBaseOverlayList(themeObj).length : 0;
    const themeTemplates = themeObj ? getBaseTemplateList(themeObj).length : 0;
    DOM.eventBaseThemeAssetsSummary.textContent = `Inherited assets: ${describeAssetSummaryCounts(
      {
        backgrounds: themeBackgrounds,
        greenBackgrounds: themeGreenBackgrounds,
        overlays: themeOverlays,
        templates: themeTemplates,
        hasLogo: !!(themeObj && themeObj.logo),
      }
    )}`;
  }
  if (DOM.eventThemeReferenceText) {
    if (!hasActiveEvent) {
      DOM.eventThemeReferenceText.textContent =
        "Theme sessions use the selected theme plus one-off session assets. Saved event edits are optional.";
    } else {
      const overrides = ensureEventOverrides(active);
      const eventSpecific = describeAssetSummaryCounts({
        backgrounds: overrides.backgrounds.length,
        greenBackgrounds: overrides.greenBackgrounds.length,
        overlays: overrides.overlays.length,
        templates: overrides.templates.length,
        hasLogo: !!active.logo,
          });
      DOM.eventThemeReferenceText.textContent = `Base theme: ${
        themeObj && themeObj.name ? themeObj.name : "None"
      }. Event-only assets: ${eventSpecific}.`;
    }
  }
}

function updateActiveEventDetails({
  name,
  date,
  themeKey,
  overrides,
  bannerText,
  welcomeTitle,
  welcomeTitleSize,
  startButtonText,
  captureLabel,
  partner1,
  partner2,
  birthdayName,
  expoCompany,
  bannerSize,
  logo,
}) {
  const events = getStoredEvents();
  const id = getActiveEventId();
  if (!id) return;
  const idx = events.findIndex((event) => event && event.id === id);
  if (idx < 0) return;
  const target = events[idx];
  if (typeof name === "string") target.name = name;
  if (typeof date === "string") target.date = date;
  if (typeof themeKey === "string") target.themeKey = themeKey;
  if (typeof partner1 === "string") target.partner1 = partner1;
  if (typeof partner2 === "string") target.partner2 = partner2;
  if (typeof birthdayName === "string") target.birthdayName = birthdayName;
  if (typeof expoCompany === "string") target.expoCompany = expoCompany;
  if (overrides && typeof overrides === "object") target.overrides = overrides;
  if (typeof bannerText === "string") target.bannerText = bannerText;
  if (typeof welcomeTitle === "string") target.welcomeTitle = welcomeTitle;
  if (typeof welcomeTitleSize === "number" && welcomeTitleSize > 0) {
    target.welcomeTitleSize = welcomeTitleSize;
  } else if (welcomeTitleSize === null) {
    delete target.welcomeTitleSize;
  }
  if (typeof bannerSize === "number" && bannerSize > 0) {
    target.bannerSize = bannerSize;
  } else if (bannerSize === null) {
    delete target.bannerSize;
  }
  if (typeof startButtonText === "string")
    target.startButtonText = startButtonText;
  if (typeof captureLabel === "string") target.captureLabel = captureLabel;
  if (typeof logo === "string") {
    if (logo) target.logo = logo;
    else delete target.logo;
  }
  setStoredEvents(events);
  populateEventProfileSelect(id);
  updateEventOverridesSummary();
  const themeObj = getEventEditorTheme();
  applyThemeBasics(themeObj || activeTheme || getSelectedThemeTarget() || {});
  syncEventSetupEditor(themeObj);
  renderCurrentAssets(themeObj);
  updateCurrentEventAssetsPanel(themeObj);
  updateStylePreview();
}

function updateActiveThemeTextDetails({
  bannerText,
  welcomeTitle,
  welcomeTitleSize,
  startButtonText,
  captureLabel,
  bannerSize,
}) {
  const target = activeTheme || getSelectedThemeTarget();
  if (!target || typeof target !== "object") return;
  applyThemeText(target, {
    bannerText,
    welcomeTitle,
    startButtonText,
    captureLabel,
  });
  if (typeof welcomeTitleSize === "number" && welcomeTitleSize > 0) {
    target.welcomeTitleSize = welcomeTitleSize;
  } else if (welcomeTitleSize === null) {
    delete target.welcomeTitleSize;
  }
  if (typeof bannerSize === "number" && bannerSize > 0) {
    target.bannerSize = bannerSize;
  } else if (bannerSize === null) {
    delete target.bannerSize;
  }
  if (activeTheme === target) {
    applyThemeBasics(target);
  }
  saveThemesToStorage();
  syncEventSetupEditor(target);
  renderCurrentAssets(target);
  updateCurrentEventAssetsPanel(target);
  updateStylePreview();
}

function syncEventInputsFromActive() {
  const active = getActiveEvent();
  if (!active) {
    updateEventOverridesSummary();
    syncEventSetupEditor();
    return;
  }
  syncEventSetupEditor(getEventEditorTheme());
  updateEventOverridesSummary();
}

function populateEventProfileSelect(preferredId) {
  if (!DOM.eventProfileSelect) return;
  const events = getStoredEvents();
  DOM.eventProfileSelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select an event";
  DOM.eventProfileSelect.appendChild(placeholder);
  const counts = {};
  events.forEach((event) => {
    if (!event) return;
    const key = `${event.name || ""}__${event.date || ""}`;
    counts[key] = (counts[key] || 0) + 1;
  });
  events.forEach((event) => {
    if (!event || !event.id) return;
    const option = document.createElement("option");
    const labelParts = [event.name || "Untitled event"];
    if (event.date) labelParts.push(`(${event.date})`);
    const key = `${event.name || ""}__${event.date || ""}`;
    if (counts[key] > 1 && event.createdAt) {
      const time = new Date(event.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      labelParts.push(`• ${time}`);
    }
    option.value = event.id;
    option.textContent = labelParts.join(" ");
    DOM.eventProfileSelect.appendChild(option);
  });
  const resolved =
    preferredId && events.some((event) => event && event.id === preferredId)
      ? preferredId
      : "";
  DOM.eventProfileSelect.value = resolved;
}

function getEventNameForUploads() {
  const active = getActiveEvent();
  if (active && active.name) return active.name;
  const nameInput = valueFromInput(DOM.eventNameInput);
  if (nameInput) return nameInput;
  if (activeTheme && activeTheme.welcome && activeTheme.welcome.title)
    return activeTheme.welcome.title;
  const key = DOM.eventSelect && DOM.eventSelect.value;
  const stored = key ? getStoredEventName(key) : "";
  return stored || key || "event";
}

function getEventDateForUploads() {
  const active = getActiveEvent();
  if (active && active.date) return active.date;
  const input = DOM.eventDateInput ? DOM.eventDateInput.value : "";
  if (input) return input;
  const key = DOM.eventSelect && DOM.eventSelect.value;
  return key ? getStoredEventDate(key) : "";
}

function getQuickStartFolderDate() {
  const active = getActiveEvent();
  if (active) return "";
  const raw = getQuickStartSessionDate();
  const safe = (raw || "").toString().trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(safe)) return "";
  return safe;
}

function getQuickStartFolderLabel() {
  const date = getQuickStartFolderDate();
  return date ? `QS(${date})` : "";
}

function getEventUploadSlug() {
  const quickStartDate = getQuickStartFolderDate();
  if (quickStartDate) return quickStartDate;
  const name = slugifyEventText(getEventNameForUploads());
  const date = slugifyEventText(getEventDateForUploads());
  if (name && date) return `${name}-${date}`;
  return name || date || getCurrentEventSlug() || "event";
}

function createNewEventFromSelection() {
  const themeKey = DOM.eventSelect && DOM.eventSelect.value;
  if (!themeKey) {
    alert("Select a theme before creating an event.");
    return;
  }
  const inputName = valueFromInput(DOM.eventNameInput);
  const name = inputName || prompt("New event name:");
  if (!name) return;
  const date = DOM.eventDateInput ? DOM.eventDateInput.value.trim() : "";
  const slug = slugifyEventText(name);
  if (!slug) {
    alert("Enter a valid event name.");
    return;
  }
  const events = getStoredEvents();
  const idBase = [slug, slugifyEventText(date)].filter(Boolean).join("-");
  const id = `${idBase || "event"}-${Date.now().toString(36)}`;
  const newEvent = {
    id,
    name,
    date,
    themeKey,
    createdAt: new Date().toISOString(),
    overrides: {
      backgrounds: [],
      overlays: [],
      templates: [],
      backgroundIndex: 0,
    },
  };
  events.push(newEvent);
  setStoredEvents(events);
  setActiveEventId(id);
  populateEventProfileSelect(id);
  syncEventInputsFromActive();
  updateStylePreview();
  showToast(`Event "${name}" created`);
}

function updateEventOverridesSummary() {
  if (!DOM.eventOverridesSummary) return;
  const active = getActiveEvent();
  if (!active) {
    DOM.eventOverridesSummary.textContent =
      "No saved event selected. Theme session assets stay one-off for this run.";
    updateEventDependentControls(false);
    updateCurrentEventAssetsPanel();
    return;
  }
  const overrides = getActiveEventOverrides();
  const summary = describeAssetSummaryCounts({
    backgrounds: overrides.backgrounds.length,
    greenBackgrounds: overrides.greenBackgrounds.length,
    overlays: overrides.overlays.length,
    templates: overrides.templates.length,
    hasLogo: !!active.logo,
  });
  DOM.eventOverridesSummary.textContent =
    summary === "none"
      ? "No event-only assets yet."
      : `Event-only assets: ${summary}`;
  updateEventDependentControls(true);
  updateCurrentEventAssetsPanel();
}

function updateEventDependentControls(hasActiveEvent = !!getActiveEvent()) {
  const hasTheme = hasActiveEvent || !!(activeTheme || getSelectedThemeTarget());
  if (DOM.currentAssetsContent)
    DOM.currentAssetsContent.classList.toggle("hidden", !hasTheme);
  if (DOM.eventGalleryActions)
    DOM.eventGalleryActions.classList.toggle("hidden", !hasTheme);
  if (DOM.currentEventAssetsSummary)
    DOM.currentEventAssetsSummary.classList.toggle("hidden", !hasTheme);
  if (DOM.clearEventOverridesBtn)
    DOM.clearEventOverridesBtn.classList.toggle("hidden", !hasActiveEvent);
  if (DOM.eventToSubThemeBtn)
    DOM.eventToSubThemeBtn.classList.toggle("hidden", !hasActiveEvent);
}

function updateCurrentEventAssetsPanel(theme = null) {
  if (
    !DOM.currentEventName ||
    !DOM.currentEventTheme ||
    !DOM.currentEventAssetsSummary ||
    !DOM.currentThemeAssetsSummary
  )
    return;
  const active = getActiveEvent();
  if (!active) {
    updateEventDependentControls(false);
    const themeObj = theme || activeTheme || getSelectedThemeTarget();
    DOM.currentEventName.textContent = `Session ${getDateSessionSlug()}`;
    if (DOM.currentEventDate) DOM.currentEventDate.textContent = "";
    DOM.currentEventTheme.textContent =
      themeObj && themeObj.name ? themeObj.name : "No theme selected";
    DOM.currentEventAssetsSummary.textContent = getSessionAssetSummaryText();
    const baseBackgrounds = themeObj ? getEffectiveBackgroundList(themeObj) : [];
    const baseGreen = Array.isArray(themeObj && themeObj.greenBackgrounds)
      ? themeObj.greenBackgrounds.filter(Boolean)
      : [];
    const baseOverlays = themeObj ? getEffectiveOverlayList(themeObj).length : 0;
    const baseTemplates = themeObj ? getEffectiveTemplateList(themeObj).length : 0;
    DOM.currentThemeAssetsSummary.textContent = `Theme assets: ${describeAssetSummaryCounts(
      {
        backgrounds: baseBackgrounds.length,
        greenBackgrounds: baseGreen.length,
        overlays: baseOverlays,
        templates: baseTemplates,
        hasLogo: !!(themeObj && themeObj.logo),
      }
    )}`;
    if (DOM.eventGalleryLink)
      DOM.eventGalleryLink.textContent = getEventGalleryUrl() || "Set Cloudinary to enable gallery link.";
    syncEventSetupEditor();
    return;
  }
  updateEventDependentControls(true);
  DOM.currentEventName.textContent = active.name || "Untitled event";
  if (DOM.currentEventDate)
    DOM.currentEventDate.textContent = active.date || "";
  const eventThemeKey =
    active.themeKey || (DOM.eventSelect && DOM.eventSelect.value) || "";
  const themeObj =
    theme ||
    getThemeByKey(eventThemeKey) ||
    activeTheme ||
    getSelectedThemeTarget();
  DOM.currentEventTheme.textContent =
    themeObj && themeObj.name ? themeObj.name : eventThemeKey || "None";

  const overrides = getActiveEventOverrides();
  const eventSummary = describeAssetSummaryCounts({
    backgrounds: overrides.backgrounds.length,
    greenBackgrounds: overrides.greenBackgrounds.length,
    overlays: overrides.overlays.length,
    templates: overrides.templates.length,
    hasLogo: !!active.logo,
  });
  DOM.currentEventAssetsSummary.textContent = `Event-only assets: ${eventSummary}`;

  const baseBackgrounds = themeObj ? getBaseBackgroundList(themeObj) : [];
  const baseGreen = Array.isArray(themeObj && themeObj.greenBackgrounds)
    ? themeObj.greenBackgrounds.filter(Boolean)
    : [];
  const baseOverlays = themeObj ? getBaseOverlayList(themeObj) : [];
  const baseTemplates = themeObj ? getBaseTemplateList(themeObj) : [];
  const themeSummary = describeAssetSummaryCounts({
    backgrounds: baseBackgrounds.length,
    greenBackgrounds: baseGreen.length,
    overlays: baseOverlays.length,
    templates: baseTemplates.length,
    hasLogo: !!(themeObj && themeObj.logo),
    hasCharacter: !!(themeObj && themeObj.character),
  });
  DOM.currentThemeAssetsSummary.textContent = `Theme assets: ${themeSummary}`;
  syncEventSetupEditor(themeObj);
}

async function handleEventOnlyAssetInput(kind, fileList) {
  const active = getActiveEvent();
  if (!active) {
    alert("Create or select an event first.");
    return;
  }
  if (!fileList || fileList.length === 0) return;
  const overrides = ensureEventOverrides(active);
  const files = Array.from(fileList);
  const tasks = files.map(async (file) => {
    const url = await uploadAsset(
      file,
      kind,
      getEventAssetUploadOptions(active, kind)
    );
    if (!url) return;
    if (kind === "templates") {
      overrides.templates.push({ src: url, layout: "double_column" });
    } else if (kind === "overlays") {
      overrides.overlays.push(url);
    } else if (kind === "backgrounds") {
      overrides.backgrounds.push(url);
    } else if (kind === "greenBackgrounds") {
      overrides.greenBackgrounds.push(url);
    }
  });
  await Promise.all(tasks);
  updateActiveEventDetails({ overrides });
  updateEventOverridesSummary();
  if (kind === "templates" && DOM.eventOnlyTemplates)
    DOM.eventOnlyTemplates.value = "";
  if (kind === "overlays" && DOM.eventOnlyOverlays)
    DOM.eventOnlyOverlays.value = "";
  if (kind === "backgrounds" && DOM.eventOnlyBackgrounds)
    DOM.eventOnlyBackgrounds.value = "";
  renderOptions();
}

async function handleEventSingleAssetInput(kind, fileList) {
  const active = getActiveEvent();
  if (!active) {
    alert("Create or select an event first.");
    return;
  }
  const file = fileList && fileList[0];
  if (!file) return;
  const url = await uploadAsset(
    file,
    kind,
    getEventAssetUploadOptions(active, kind)
  );
  if (!url) return;
  if (kind === "logo") updateActiveEventDetails({ logo: url });
  renderOptions();
}

function clearEventOverrides() {
  const active = getActiveEvent();
  if (!active) {
    alert("Create or select an event first.");
    return;
  }
  if (!confirm("Clear event-only assets?")) return;
  const overrides = {
    backgrounds: [],
    overlays: [],
    templates: [],
    backgroundIndex: 0,
    greenBackgrounds: [],
    greenBackgroundIndex: 0,
  };
  updateActiveEventDetails({ overrides });
  updateEventOverridesSummary();
  renderOptions();
}

function getEventFolderBase() {
  const base = valueFromInput(DOM.cloudFolderInput) || "photobooth/events";
  return base.replace(/\/+$/g, "");
}

function getEventUploadFolderPath() {
  const base = getEventFolderBase();
  const quickStartDate = getQuickStartFolderDate();
  if (quickStartDate)
    return buildDateSessionFolderPath({ base, date: quickStartDate });
  const name = slugifyEventText(getEventNameForUploads());
  const date = slugifyEventText(getEventDateForUploads());
  const fallback = getCurrentEventSlug() || "event";
  return buildEventFolderPath({ base, name, date, fallback });
}

function getThemeAssetUploadFolderPath(kind = "") {
  const base = getEventFolderBase();
  const themeSlug = getCurrentEventSlug() || "event";
  const cleanKind = (kind || "misc").toString().replace(/^\/+|\/+$/g, "");
  return `${base}/${themeSlug}/${cleanKind}`;
}

function getEventAssetUploadOptions(event = getActiveEvent(), kind = "") {
  const base = getEventFolderBase();
  const name = slugifyEventText(event && event.name);
  const date = slugifyEventText(event && event.date);
  const fallback =
    slugifyEventText(event && event.id) || getCurrentEventSlug() || "event";
  return {
    folder: buildEventAssetFolderPath({ base, name, date, fallback, kind }),
  };
}

function getEventGalleryUrl() {
  const cfg = getCloudinaryConfig();
  if (!cfg || !cfg.cloud) return "";
  const tag = getEventUploadSlug();
  const quickStartDate = getQuickStartFolderDate();
  const title = encodeURIComponent(
    quickStartDate
      ? `Photos - ${quickStartDate}`
      : `${getEventNameForUploads()}${
          getEventDateForUploads() ? " (" + getEventDateForUploads() + ")" : ""
        }`
  );
  const cloud = encodeURIComponent(cfg.cloud);
  return `${
    location.origin
  }/gallery.html?cloud=${cloud}&tag=${encodeURIComponent(tag)}&title=${title}`;
}

function getEventGalleryTitle() {
  const quickStartDate = getQuickStartFolderDate();
  return quickStartDate
    ? `Photos - ${quickStartDate}`
    : `${getEventNameForUploads()}${
        getEventDateForUploads() ? " (" + getEventDateForUploads() + ")" : ""
      }`;
}

// --- Event name storage helpers ---
function getEventNamesMap() {
  try {
    return JSON.parse(localStorage.getItem("photoboothEventNames") || "{}");
  } catch (_) {
    return {};
  }
}
function getStoredEventName(key) {
  if (!key) return "";
  const map = getEventNamesMap();
  return map[key] || "";
}
function saveStoredEventName(key, name) {
  if (!key) return;
  const map = getEventNamesMap();
  if (name) map[key] = name;
  else delete map[key];
  localStorage.setItem("photoboothEventNames", JSON.stringify(map));
}

function getEventDatesMap() {
  try {
    return JSON.parse(localStorage.getItem("photoboothEventDates") || "{}");
  } catch (_) {
    return {};
  }
}
function getStoredEventDate(key) {
  if (!key) return "";
  const map = getEventDatesMap();
  return map[key] || "";
}
function saveStoredEventDate(key, dateValue) {
  if (!key) return;
  const map = getEventDatesMap();
  if (dateValue) map[key] = dateValue;
  else delete map[key];
  localStorage.setItem("photoboothEventDates", JSON.stringify(map));
}

// --- Export current event (settings + theme) ---
function exportCurrentEvent() {
  const key = DOM.eventSelect && DOM.eventSelect.value;
  if (!key || !activeTheme) {
    alert("Select an event first.");
    return;
  }
  const active = getActiveEvent();
  const name =
    (active && active.name) ||
    getStoredEventName(key) ||
    (activeTheme.welcome && activeTheme.welcome.title) ||
    key;
  const payload = {
    key,
    name,
    exported_at: new Date().toISOString(),
    theme: activeTheme,
    event: active
      ? {
          id: active.id,
          name: active.name,
          date: active.date,
          themeKey: active.themeKey,
          overrides: active.overrides,
        }
      : null,
  };
  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(payload, null, 2));
  const a = document.createElement("a");
  const slug = (name || key).toLowerCase().replace(/[^a-z0-9\-]+/g, "-");
  a.href = dataStr;
  a.download = `photobooth-event-${slug || "export"}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast("Event exported");
}

async function uploadImageToCloudinary(blob, options = {}) {
  const cfg = getCloudinaryConfig();
  if ((!cfg.use && !options.force) || !cfg.cloud || !cfg.preset) return "";
  try {
    const form = new FormData();
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const baseName = `${options.baseName || "photo"}-${ts}.png`;
    const file = new File([blob], baseName, { type: blob.type || "image/png" });
    form.append("file", file);
    form.append("upload_preset", cfg.preset);
    if (options.folder) form.append("folder", options.folder);
    if (options.tags) form.append("tags", options.tags);
    if (options.transformation) form.append("transformation", options.transformation);
    const resp = await fetch(
      `https://api.cloudinary.com/v1_1/${cfg.cloud}/image/upload`,
      { method: "POST", body: form }
    );
    const json = await resp.json();
    return getCloudinaryDerivedUrl(json);
  } catch (e) {
    console.warn("Cloudinary upload failed", e);
  }
  return "";
}

function updateActiveSessionTextDetails(changes = {}) {
  if (!changes || typeof changes !== "object") return;
  [
    "name",
    "date",
    "bannerText",
    "welcomeTitle",
    "startButtonText",
    "captureLabel",
    "partner1",
    "partner2",
    "birthdayName",
    "expoCompany",
  ].forEach((key) => {
    if (typeof changes[key] === "string") {
      activeSessionTextDetails[key] = changes[key];
    }
  });
  updateStylePreview();
}

async function uploadVideoToCloudinary(blob, options = {}) {
  const cfg = getCloudinaryConfig();
  if ((!cfg.use && !options.force) || !cfg.cloud || !cfg.preset) return "";
  try {
    const form = new FormData();
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const baseName = `${options.baseName || "message"}-${ts}.webm`;
    const file = new File([blob], baseName, {
      type: blob.type || "video/webm",
    });
    form.append("file", file);
    form.append("upload_preset", cfg.preset);
    if (options.folder) form.append("folder", options.folder);
    if (options.tags) form.append("tags", options.tags);
    if (options.transformation) form.append("transformation", options.transformation);
    const resp = await fetch(
      `https://api.cloudinary.com/v1_1/${cfg.cloud}/video/upload`,
      { method: "POST", body: form }
    );
    const json = await resp.json();
    return getCloudinaryDerivedUrl(json);
  } catch (e) {
    console.warn("Cloudinary video upload failed", e);
  }
  return "";
}

const OFFLINE_DB_NAME = "PhotoboothOfflineQueue";
const OFFLINE_DB_STORE = "pendingUploads";
let offlineQueueDbPromise = null;

function offlineQueueSupported() {
  return typeof indexedDB !== "undefined";
}

function getOfflineQueueDb() {
  if (!offlineQueueSupported()) {
    return Promise.reject(new Error("IndexedDB offline queue unavailable"));
  }
  if (!offlineQueueDbPromise) {
    offlineQueueDbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(OFFLINE_DB_NAME, 1);
      request.onupgradeneeded = (event) => {
        const db = event && event.target ? event.target.result : null;
        if (!db) return;
        if (!db.objectStoreNames.contains(OFFLINE_DB_STORE)) {
          db.createObjectStore(OFFLINE_DB_STORE, {
            keyPath: "id",
            autoIncrement: true,
          });
        }
      };
      request.onsuccess = (event) => {
        const db = event && event.target ? event.target.result : null;
        if (!db) {
          reject(new Error("IndexedDB open succeeded without database instance"));
          return;
        }
        db.onclose = () => {
          offlineQueueDbPromise = null;
        };
        resolve(db);
      };
      request.onerror = () => {
        reject(request.error || new Error("IndexedDB open failed"));
      };
    });
  }
  return offlineQueueDbPromise;
}

function saveToOfflineQueue(imageBlob, metadata = {}) {
  return getOfflineQueueDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(OFFLINE_DB_STORE, "readwrite");
        const store = tx.objectStore(OFFLINE_DB_STORE);
        const item = {
          imageBlob,
          metadata: { ...(metadata || {}) },
          timestamp: Date.now(),
        };
        const request = store.add(item);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("Offline queue save failed"));
      })
  );
}

function getAllFromOfflineQueue() {
  return getOfflineQueueDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(OFFLINE_DB_STORE, "readonly");
        const store = tx.objectStore(OFFLINE_DB_STORE);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error || new Error("Offline queue read failed"));
      })
  );
}

function deleteFromOfflineQueue(id) {
  return getOfflineQueueDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(OFFLINE_DB_STORE, "readwrite");
        const store = tx.objectStore(OFFLINE_DB_STORE);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error || new Error("Offline queue delete failed"));
      })
  );
}

async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  if (!res.ok) throw new Error("Capture data could not be read.");
  return res.blob();
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Blob read failed"));
      reader.readAsDataURL(blob);
    } catch (err) {
      reject(err);
    }
  });
}

function createCaptureUploadId(prefix = "capture") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function getCaptureUploadMeta(options = {}) {
  const slug = options.slug || getEventUploadSlug();
  return {
    captureId: options.captureId || createCaptureUploadId(options.modeName),
    slug,
    folder: options.folder || getEventUploadFolderPath(),
    title: options.title || getEventGalleryTitle(),
  };
}

async function uploadCloudinaryWithRetry(
  uploadFn,
  blob,
  options = {},
  label = "capture"
) {
  const attempts = Math.max(1, options.attempts || 2);
  let lastUrl = "";
  for (let attempt = 1; attempt <= attempts; attempt++) {
    lastUrl = await uploadFn(blob, options);
    if (lastUrl) return lastUrl;
    console.warn(
      `Cloudinary ${label} upload attempt ${attempt} failed${
        attempt < attempts ? "; retrying" : ""
      }.`
    );
    if (attempt < attempts) await delay(700 * attempt);
  }
  return "";
}

async function queueCaptureForRetry(options = {}) {
  const {
    previewUrl = "",
    mediaBlob = null,
    resourceType = "image",
    meta = {},
    modeName = "pending",
  } = options;
  const queueMetadata = {
    captureId: meta.captureId,
    slug: meta.slug,
    folder: meta.folder,
    resourceType,
    modeName,
    title: meta.title,
    email: meta.email || "",
    createdAt: meta.createdAt || new Date().toISOString(),
  };
  if (mediaBlob && offlineQueueSupported()) {
    try {
      await saveToOfflineQueue(mediaBlob, queueMetadata);
      return true;
    } catch (error) {
      console.warn("IndexedDB capture queue failed; falling back to local retry queue", error);
    }
  }
  let retryDataUrl = previewUrl;
  let retryResourceType = "image";
  if (resourceType === "video" && mediaBlob) {
    try {
      retryDataUrl = await blobToDataUrl(mediaBlob);
      retryResourceType = "video";
    } catch (err) {
      console.warn("Video retry queue failed; falling back to poster", err);
      retryDataUrl = previewUrl;
      retryResourceType = "image";
      showToast("Video could not be stored offline; poster queued instead");
    }
  }
  if (!retryDataUrl) return false;
  const queued = queuePendingUpload(retryDataUrl, {
    captureId: meta.captureId,
    slug: meta.slug,
    folder: meta.folder,
    resourceType: retryResourceType,
    modeName,
    title: meta.title,
  });
  if (!queued && retryResourceType === "video" && previewUrl) {
    console.warn("Video retry queue was too large; falling back to poster");
    showToast("Video could not be stored offline; poster queued instead");
    return queuePendingUpload(previewUrl, {
      captureId: meta.captureId,
      slug: meta.slug,
      folder: meta.folder,
      resourceType: "image",
      modeName,
      title: meta.title,
    });
  }
  return queued;
}

async function uploadCaptureOnce(options = {}) {
  const previewUrl = options.previewUrl || "";
  const resourceType = options.resourceType === "video" ? "video" : "image";
  const mediaBlob = options.mediaBlob || null;
  const modeName = options.modeName || resourceType;
  const meta = getCaptureUploadMeta(options);
  const result = {
    publicUrl: "",
    queued: false,
    galleryQueued: false,
    captureId: meta.captureId,
    slug: meta.slug,
    folder: meta.folder,
    resourceType,
  };

  if (isBoothTestMode()) {
    result.publicUrl = BOOTH_TEST_SHARE_URL;
    showToast("Booth test upload ready");
    return result;
  }

  if (!cloudinaryConfigured()) {
    showToast("Cloudinary not configured: capture not uploaded");
    return result;
  }

  if (offlineModeActive() || !navigator.onLine) {
    const ok = await queueCaptureForRetry({
      previewUrl,
      mediaBlob,
      resourceType,
      meta,
      modeName,
    });
    if (ok) {
      showToast("Offline: capture queued for upload");
      result.queued = true;
      return result;
    }
    alert("Offline upload queue is full or unavailable.");
    return result;
  }

  const safetyQueued = await queueCaptureForRetry({
    previewUrl,
    mediaBlob,
    resourceType,
    meta,
    modeName,
  });
  if (!safetyQueued) {
    console.warn("Capture retry backup could not be saved before upload.");
    showToast("Capture backup unavailable; keep this screen open until upload finishes");
  }

  const blob = mediaBlob || (previewUrl ? await dataUrlToBlob(previewUrl) : null);
  if (!blob) return result;

  const publicUrl =
    resourceType === "video"
      ? await uploadCloudinaryWithRetry(
          uploadVideoToCloudinary,
          blob,
          {
            baseName: meta.slug || modeName || "message",
            folder: meta.folder,
            tags: meta.slug,
            force: true,
          },
          "video"
        )
      : await uploadCloudinaryWithRetry(
          uploadImageToCloudinary,
          blob,
          {
            baseName: meta.slug || modeName || "photo",
            folder: meta.folder,
            tags: meta.slug,
            force: true,
            transformation: DOM.effectSelect && DOM.effectSelect.value !== "" ? DOM.effectSelect.value : undefined,
          },
          "image"
        );

  if (!publicUrl) {
    const ok = await queueCaptureForRetry({
      previewUrl,
      mediaBlob,
      resourceType,
      meta,
      modeName,
    });
    if (ok) {
      showToast("Upload failed, queued for retry");
      result.queued = true;
    }
    return result;
  }

  result.publicUrl = publicUrl;
  removePendingUpload(meta.captureId);
  const galleryOk = await recordGalleryPhoto(meta.slug, publicUrl, {
    captureId: meta.captureId,
    title: meta.title,
    resourceType,
    modeName,
  });
  if (!galleryOk) {
    const queued = queuePendingGalleryRecord({
      captureId: meta.captureId,
      slug: meta.slug,
      url: publicUrl,
      title: meta.title,
      resourceType,
      modeName,
    });
    result.galleryQueued = queued;
    if (queued) showToast("Photo uploaded; gallery update queued for retry");
    else showToast("Photo uploaded; gallery update needs retry");
  }
  return result;
}

async function uploadEventPhoto(dataUrl, options = {}) {
  const result = await uploadCaptureOnce({
    previewUrl: dataUrl,
    resourceType: options.resourceType || "image",
    modeName: options.modeName || "pending",
    captureId: options.captureId,
    slug: options.slug,
    folder: options.folder,
    title: options.title,
  });
  if (!result.publicUrl) throw new Error("Cloudinary upload failed");
  return result.publicUrl;
}

async function recordGalleryPhoto(tag, url, options = {}) {
  const cleanTag = String(tag || "").trim();
  if (!cleanTag || !/^https?:\/\//i.test(String(url || ""))) return false;
  const resourceType = options.resourceType === "video" ? "video" : "image";
  const payload = {
    capture_id: options.captureId || createCaptureUploadId(options.modeName),
    url,
    secure_url: url,
    title: options.title || getEventGalleryTitle(),
    created_at: options.createdAt || new Date().toISOString(),
    resource_type: resourceType,
    type: resourceType,
    mode: options.modeName || "",
  };
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const resp = await fetch(`/api/gallery?tag=${encodeURIComponent(cleanTag)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (resp.ok) return true;
      console.warn(`Gallery index update failed with HTTP ${resp.status}.`);
    } catch (err) {
      console.warn("Gallery index update failed", err);
    }
    if (attempt < 2) await delay(500);
  }
  return false;
}

async function openShareLink() {
  const url = lastShareUrl || (DOM.finalStrip && DOM.finalStrip.src);
  if (!url) return;
  try {
    // Ensure the asset is retrievable (esp. right after SW publish) and open a stable blob URL
    const resp = await fetch(url, { cache: "reload" });
    if (!resp.ok) throw new Error("Link not ready");
    const blob = await resp.blob();
    const objUrl = URL.createObjectURL(blob);
    window.open(objUrl, "_blank", "noopener");
    // Revoke after some time to avoid leaks
    setTimeout(() => URL.revokeObjectURL(objUrl), 30000);
  } catch (e) {
    // Fallback to opening the original URL
    try {
      window.open(url, "_blank", "noopener");
    } catch (_) {
      location.href = url;
    }
  }
}
async function copyShareLink() {
  const url = lastShareUrl || (DOM.finalStrip && DOM.finalStrip.src);
  try {
    await navigator.clipboard.writeText(url);
    showToast("Link copied");
  } catch (e) {
    showToast("Copy failed");
  }
}
async function downloadShareImage() {
  const url = lastShareUrl || (DOM.finalStrip && DOM.finalStrip.src);
  if (!url) return;
  try {
    const resp = await fetch(url, { cache: "reload" });
    if (!resp.ok) throw new Error("Link not ready");
    const blob = await resp.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = "photobooth.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objUrl), 30000);
  } catch (e) {
    // Fallback: open in new tab; user can save manually
    try {
      window.open(url, "_blank", "noopener");
    } catch (_) {
      location.href = url;
    }
  }
}

function hideFinal() {
  selectedFilter = "natural";
  clearPreviewFreezeFrame();
  DOM.finalPreview.classList.remove("show");
  showGoodbyeMoment();
  if (DOM.boothScreen)
    DOM.boothScreen.classList.remove("share-mode", "finalizing-mode");
  DOM.qrCodeContainer.classList.add("hidden");
  if (DOM.qrCodeContainer) DOM.qrCodeContainer.dataset.ready = "false";
  if (DOM.paidPrintPanel) DOM.paidPrintPanel.classList.remove("show");
  if (DOM.paidPrintPanel) DOM.paidPrintPanel.dataset.ready = "false";
  if (DOM.reviewPanel) DOM.reviewPanel.classList.add("hidden");
  setFinalPreviewSharePanelVisible(false);
  if (DOM.shareLinkRow) DOM.shareLinkRow.style.display = "none";
  if (DOM.shareStatus) DOM.shareStatus.style.display = "none";
  if (DOM.retakeBtn) DOM.retakeBtn.style.display = "none";
  if (DOM.closePreviewBtn) DOM.closePreviewBtn.style.display = "none";
  clearLiveClip();
  lastCaptureFlow = null; // Clear the stored flow
  clearTimeout(hidePreviewTimer);
  setBoothControlsVisible(true);
  resetIdleTimer();
}

function retakePhoto() {
  hideFinal();
  if (typeof lastCaptureFlow === "function") {
    setTimeout(lastCaptureFlow, 500); // Give a small delay for the UI to hide
  }
}
function exitFinalPreview() {
  hideFinal();
}
function addToGallery(url) {
  const img = new Image();
  img.src = url;
  img.addEventListener("click", () =>
    showFinal(url, { skipShare: true, forceImage: true })
  );
  DOM.gallery.appendChild(img);
}

function cancelHideTimer() {
  clearTimeout(hidePreviewTimer);
  resetIdleTimer(); // Still reset the main idle timer
}

function startHideTimerIfIdle() {
  // If email input is empty, restart the hide timer
  if (!DOM.emailInput || DOM.emailInput.value.trim() === "") {
    cancelHideTimer();
    hidePreviewTimer = setTimeout(hideFinal, 4000);
  }
}

function sendEmail(event) {
  event.preventDefault();
  if (!DOM.emailInput || !DOM.sendBtn) return;
  cancelHideTimer();
  const email = DOM.emailInput.value;
  const sendBtn = DOM.sendBtn;
  const imgUrl = DOM.finalStrip && DOM.finalStrip.src;
  const offline = offlineModeActive();
  const isVideo = lastShareType === "video";

  if (offline) {
    if (isVideo) {
      alert("Video sharing requires an internet connection.");
      return;
    }
    // Queue locally for later sending
    const ok = queuePendingEmail(email, imgUrl);
    if (ok) {
      sendBtn.textContent = "Queued";
      updatePendingUI();
      hidePreviewTimer = setTimeout(hideFinal, 1200);
    } else {
      alert("Could not queue email. Check storage space.");
    }
    return;
  }

  sendBtn.textContent = "Sending...";
  sendBtn.disabled = true;

  const cfg = getEmailJsConfig();
  const templateParams = {
    to_email: email,
    photo_url: isVideo ? lastShareUrl || "" : lastShareUrl || imgUrl,
    link_url: lastShareUrl || "",
    image_data_url: isVideo ? "" : imgUrl,
    video_url: isVideo ? lastShareUrl || "" : "",
  };

  emailjs.send(cfg.service, cfg.template, templateParams).then(
    function (response) {
      console.log("SUCCESS!", response.status, response.text);
      sendBtn.textContent = "Sent!";
      hidePreviewTimer = setTimeout(hideFinal, 3000);
    },
    function (error) {
      const errMsg = formatEmailError(error);
      console.error("Email send failed:", error);
      sendBtn.textContent = "Failed!";
      sendBtn.disabled = false;
      alert("Email failed: " + errMsg);
    }
  );

  recordAnalytics("email", email);
}

function formatEmailError(err) {
  if (!err) return "unknown error";
  if (typeof err === "string") return err;
  if (err.text) return err.text;
  if (err.message) return err.message;
  if (typeof err.status !== "undefined") {
    const statusText = err.statusText || err.text || "";
    return `${err.status} ${statusText}`.trim();
  }
  try {
    return JSON.stringify(err);
  } catch (_) {
    return String(err);
  }
}

function appendEmailText(text) {
  const emailInput = DOM.emailInput;
  if (!emailInput) return;
  emailInput.value += text;
  emailInput.focus(); // Keep the input focused for a smooth flow
}

// --- Analytics ---
function getAnalytics() {
  const defaults = { total_sessions: 0, overlay_usage: {}, emails: [] };
  try {
    const data = localStorage.getItem("photoboothAnalytics");
    return data ? JSON.parse(data) : defaults;
  } catch (e) {
    return defaults;
  }
}

// --- Offline queue helpers ---
function offlineModeActive() {
  try {
    if (getOfflinePref()) return true;
  } catch (_) {}
  try {
    if (String(location.protocol).startsWith("file")) return true;
  } catch (_) {}
  return !navigator.onLine ? true : false;
}
function getOfflinePref() {
  return localStorage.getItem("offlineMode") === "true";
}
function setOfflinePref(v) {
  localStorage.setItem("offlineMode", v ? "true" : "false");
}
function getPending() {
  try {
    return JSON.parse(localStorage.getItem("photoboothPending") || "[]");
  } catch (_) {
    return [];
  }
}
function setPending(arr) {
  localStorage.setItem("photoboothPending", JSON.stringify(arr || []));
}
function queuePendingEmail(email, dataUrl) {
  try {
    const q = getPending();
    q.push({
      id: Date.now().toString(36),
      email,
      image: dataUrl,
      createdAt: new Date().toISOString(),
      event: DOM.eventSelect && DOM.eventSelect.value,
    });
    setPending(q);
    return true;
  } catch (e) {
    return false;
  }
}
function updatePendingUI() {
  const q = getPending();
  if (DOM.sendPendingBtn) {
    DOM.sendPendingBtn.textContent = `Send Pending (${q.length})`;
    DOM.sendPendingBtn.disabled = q.length === 0 || !navigator.onLine;
  }
  // Badge on admin button
  const adminBtn = document.getElementById("adminBtn");
  if (adminBtn) {
    adminBtn.textContent = q.length ? `⚙️ (${q.length})` : "⚙️";
  }
}

// --- Offline upload queue (Cloudinary) ---
let isFlushingPendingUploads = false;
let isFlushingPendingGalleryRecords = false;

function getPendingUploads() {
  try {
    return JSON.parse(localStorage.getItem("photoboothPendingUploads") || "[]");
  } catch (_) {
    return [];
  }
}
function setPendingUploads(arr) {
  localStorage.setItem("photoboothPendingUploads", JSON.stringify(arr || []));
}
function queuePendingUpload(dataUrl, meta = {}) {
  try {
    const q = getPendingUploads();
    const captureId = meta.captureId || createCaptureUploadId(meta.modeName);
    const next = {
      id: captureId,
      captureId,
      image: dataUrl,
      createdAt: new Date().toISOString(),
      slug: meta.slug || getEventUploadSlug(),
      folder: meta.folder || getEventUploadFolderPath(),
      title: meta.title || getEventGalleryTitle(),
      resourceType: meta.resourceType === "video" ? "video" : "image",
      modeName: meta.modeName || "pending",
      attempts: Number(meta.attempts || 0),
    };
    const existingIndex = q.findIndex(
      (item) => item && (item.captureId === captureId || item.id === captureId)
    );
    if (existingIndex >= 0) q[existingIndex] = { ...q[existingIndex], ...next };
    else q.push(next);
    setPendingUploads(q);
    return true;
  } catch (e) {
    console.warn("Queue upload failed", e);
    return false;
  }
}

function removePendingUpload(captureId) {
  if (!captureId) return;
  const q = getPendingUploads();
  const next = q.filter(
    (item) => item && item.captureId !== captureId && item.id !== captureId
  );
  if (next.length !== q.length) setPendingUploads(next);
}

function getPendingGalleryRecords() {
  try {
    return JSON.parse(localStorage.getItem("photoboothPendingGallery") || "[]");
  } catch (_) {
    return [];
  }
}

function setPendingGalleryRecords(arr) {
  localStorage.setItem("photoboothPendingGallery", JSON.stringify(arr || []));
}

function queuePendingGalleryRecord(record = {}) {
  try {
    const url = String(record.url || record.secure_url || "").trim();
    const slug = String(record.slug || getEventUploadSlug()).trim();
    if (!slug || !/^https?:\/\//i.test(url)) return false;
    const captureId = record.captureId || createCaptureUploadId(record.modeName);
    const q = getPendingGalleryRecords();
    const next = {
      id: captureId,
      captureId,
      slug,
      url,
      title: record.title || getEventGalleryTitle(),
      createdAt: record.createdAt || new Date().toISOString(),
      resourceType: record.resourceType === "video" ? "video" : "image",
      modeName: record.modeName || "",
      attempts: Number(record.attempts || 0),
    };
    const existingIndex = q.findIndex(
      (item) =>
        item &&
        (item.captureId === captureId ||
          item.id === captureId ||
          item.url === url ||
          item.secure_url === url)
    );
    if (existingIndex >= 0) q[existingIndex] = { ...q[existingIndex], ...next };
    else q.push(next);
    setPendingGalleryRecords(q);
    return true;
  } catch (e) {
    console.warn("Queue gallery update failed", e);
    return false;
  }
}

async function flushPendingUploads() {
  if (isFlushingPendingUploads || !cloudinaryConfigured() || !navigator.onLine)
    return;
  await flushPendingUploadsIndexedDB();
  const q = getPendingUploads();
  if (!q.length) return;
  isFlushingPendingUploads = true;
  let sent = 0;
  try {
    for (const item of q.slice()) {
      try {
        await uploadEventPhoto(item.image, {
          captureId: item.captureId || item.id,
          slug: item.slug,
          folder: item.folder,
          title: item.title,
          resourceType: item.resourceType || "image",
          modeName: item.modeName || "pending",
        });
        sent++;
        const cur = getPendingUploads();
        const idx = cur.findIndex((x) => x.id === item.id);
        if (idx >= 0) {
          cur.splice(idx, 1);
          setPendingUploads(cur);
        }
      } catch (err) {
        console.warn("Pending upload retry failed", err);
        const cur = getPendingUploads();
        const idx = cur.findIndex((x) => x.id === item.id);
        if (idx >= 0) {
          cur[idx].attempts = Number(cur[idx].attempts || 0) + 1;
          cur[idx].lastError =
            err && err.message ? err.message : "Pending upload failed";
          setPendingUploads(cur);
        }
      }
    }
  } finally {
    isFlushingPendingUploads = false;
  }
  if (sent) showToast(`Uploaded ${sent} pending photo${sent === 1 ? "" : "s"}`);
  flushPendingGalleryRecords();
}

async function flushPendingUploadsIndexedDB() {
  if (!offlineQueueSupported() || !cloudinaryConfigured() || !navigator.onLine) return;
  let pendingPhotos = [];
  try {
    pendingPhotos = await getAllFromOfflineQueue();
  } catch (error) {
    console.warn("IndexedDB offline queue read failed", error);
    return;
  }
  if (!pendingPhotos.length) return;
  let sent = 0;
  for (const photo of pendingPhotos) {
    if (!photo || !photo.imageBlob) continue;
    const metadata = photo.metadata || {};
    const resourceType = metadata.resourceType === "video" ? "video" : "image";
    const publicUrl =
      resourceType === "video"
        ? await uploadCloudinaryWithRetry(
            uploadVideoToCloudinary,
            photo.imageBlob,
            {
              baseName: metadata.slug || metadata.modeName || "message",
              folder: metadata.folder,
              tags: metadata.slug,
              force: true,
            },
            "video"
          )
        : await uploadCloudinaryWithRetry(
            uploadImageToCloudinary,
            photo.imageBlob,
            {
              baseName: metadata.slug || metadata.modeName || "photo",
              folder: metadata.folder,
              tags: metadata.slug,
              force: true,
            },
            "image"
          );
    if (!publicUrl) continue;
    if (metadata.slug) {
      const galleryOk = await recordGalleryPhoto(metadata.slug, publicUrl, {
        captureId: metadata.captureId,
        title: metadata.title,
        resourceType,
        modeName: metadata.modeName,
        createdAt: metadata.createdAt,
      });
      if (!galleryOk) {
        queuePendingGalleryRecord({
          captureId: metadata.captureId,
          slug: metadata.slug,
          url: publicUrl,
          title: metadata.title,
          resourceType,
          modeName: metadata.modeName,
          createdAt: metadata.createdAt,
        });
      }
    }
    try {
      await deleteFromOfflineQueue(photo.id);
      sent++;
    } catch (error) {
      console.warn("IndexedDB offline queue delete failed", error);
    }
  }
  if (sent) {
    showToast(`Uploaded ${sent} IndexedDB queued photo${sent === 1 ? "" : "s"}`);
  }
}

async function flushPendingGalleryRecords() {
  if (isFlushingPendingGalleryRecords || !navigator.onLine) return;
  const q = getPendingGalleryRecords();
  if (!q.length) return;
  isFlushingPendingGalleryRecords = true;
  let sent = 0;
  try {
    for (const item of q.slice()) {
      try {
        const ok = await recordGalleryPhoto(item.slug, item.url, {
          captureId: item.captureId || item.id,
          title: item.title,
          resourceType: item.resourceType,
          modeName: item.modeName,
          createdAt: item.createdAt,
        });
        if (!ok) throw new Error("Gallery API rejected retry");
        sent++;
        const cur = getPendingGalleryRecords();
        const idx = cur.findIndex((x) => x.id === item.id);
        if (idx >= 0) {
          cur.splice(idx, 1);
          setPendingGalleryRecords(cur);
        }
      } catch (err) {
        console.warn("Pending gallery retry failed", err);
        const cur = getPendingGalleryRecords();
        const idx = cur.findIndex((x) => x.id === item.id);
        if (idx >= 0) {
          cur[idx].attempts = Number(cur[idx].attempts || 0) + 1;
          cur[idx].lastError =
            err && err.message ? err.message : "Pending gallery retry failed";
          setPendingGalleryRecords(cur);
        }
      }
    }
  } finally {
    isFlushingPendingGalleryRecords = false;
  }
  if (sent) {
    showToast(`Updated ${sent} pending gallery entr${sent === 1 ? "y" : "ies"}`);
  }
}
async function sendPendingNow() {
  const q = getPending();
  if (!q.length) {
    showToast("No pending emails");
    return;
  }
  if (!navigator.onLine) {
    alert("Go online to send");
    return;
  }
  let sent = 0,
    failed = 0;
  for (const item of q.slice()) {
    try {
      // Try to publish to Cloudinary/SW for a link if available
      let share = null;
      try {
        const result = await uploadCaptureOnce({
          previewUrl: item.image,
          resourceType: "image",
          modeName: "pending-email",
        });
        share = result.publicUrl || null;
      } catch (_) {}
      const params = {
        to_email: item.email,
        photo_url: share || item.image,
        link_url: share || "",
        image_data_url: item.image,
      };
      const cfg = getEmailJsConfig();
      await emailjs.send(cfg.service, cfg.template, params);
      sent++;
      // remove from queue
      const cur = getPending();
      const idx = cur.findIndex((x) => x.id === item.id);
      if (idx >= 0) {
        cur.splice(idx, 1);
        setPending(cur);
      }
    } catch (e) {
      failed++;
    }
  }
  updatePendingUI();
  showToast(`Pending sent: ${sent}${failed ? `, failed: ${failed}` : ""}`);
}

// Cache active theme assets for offline use (PWA/HTTPS only)
async function makeAvailableOffline() {
  if (
    !("caches" in window) ||
    !("serviceWorker" in navigator) ||
    !location.protocol.startsWith("http")
  ) {
    alert(
      "Offline caching requires HTTPS and a service worker. Open your Cloudflare URL."
    );
    return;
  }
  try {
    const urls = new Set();
    const theme = activeTheme || getSelectedThemeTarget();
    if (theme) {
      // Backgrounds
      const bgList = Array.isArray(theme.backgroundsTmp)
        ? theme.backgroundsTmp
        : Array.isArray(theme.backgrounds)
        ? theme.backgrounds
        : theme.background
        ? [theme.background]
        : [];
      bgList.filter(Boolean).forEach((u) => urls.add(u));
      // Logo
      if (theme.logo) urls.add(theme.logo);
      // Overlays
      getOverlayList(theme).forEach((o) => {
        const s = typeof o === "string" ? o : (o && o.src) || "";
        if (s) urls.add(s);
      });
      // Templates
      getTemplateList(theme).forEach((t) => {
        if (t && t.src) urls.add(t.src);
      });
    }
    if (urls.size === 0) {
      showToast("No assets to cache");
      return;
    }
    const cache = await caches.open("pb-offline-assets-v1");
    let ok = 0,
      fail = 0;
    await Promise.all(
      Array.from(urls).map(async (u) => {
        try {
          const resp = await fetch(u, { cache: "reload" });
          if (resp.ok) {
            await cache.put(new Request(u), resp.clone());
            ok++;
          } else {
            fail++;
          }
        } catch (_) {
          fail++;
        }
      })
    );
    showToast(`Cached ${ok} assets${fail ? `, failed ${fail}` : ""}`);
  } catch (e) {
    alert("Cache failed: " + (e && e.message ? e.message : e));
  }
}

function recordAnalytics(type, value) {
  const data = getAnalytics();
  if (type === "photo" || type === "strip") {
    data.total_sessions = (data.total_sessions || 0) + 1;
    data.overlay_usage[value] = (data.overlay_usage[value] || 0) + 1;
  } else if (type === "email") {
    if (!data.emails.includes(value)) {
      data.emails.push(value);
    }
  }
  localStorage.setItem("photoboothAnalytics", JSON.stringify(data));
}

function displayAnalytics() {
  const data = getAnalytics();
  DOM.analyticsData.textContent = JSON.stringify(data, null, 2);
}

function toggleAnalytics() {
  DOM.analytics.classList.toggle("hidden");
  displayAnalytics();
}

function clearAnalytics() {
  if (
    confirm(
      "Are you sure you want to delete all analytics data? This cannot be undone."
    )
  ) {
    localStorage.removeItem("photoboothAnalytics");
    displayAnalytics();
  }
}

// --- Theme Management ---
function saveTheme() {
  if (!DOM.themeName) {
    alert("Theme creation is disabled in the simplified editor layout.");
    return;
  }
  const themeName = DOM.themeName.value.trim();
  if (!themeName) {
    alert("Please enter a theme name.");
    return;
  }

  const pickerSelection = getFontPickerSelection();
  const headingFamily = pickerSelection.heading || "Comic Neue";
  const bodyFamily = pickerSelection.body || headingFamily || "Comic Neue";
  const headingCss = composeFontString(headingFamily);
  const bodyCss = composeFontString(bodyFamily);

  const newTheme = {
    name: themeName,
    accent: DOM.themeAccent.value,
    accent2: DOM.themeAccent2.value,
    fontHeading: headingCss,
    fontBody: bodyCss,
    font: bodyCss,
    background: "",
    logo: "",
    overlays: [],
    templates: [],
    welcome: {
      title: DOM.themeWelcomeTitle ? DOM.themeWelcomeTitle.value : "Welcome!",
      portrait: "",
      landscape: "",
      prompt: DOM.themeWelcomePrompt
        ? DOM.themeWelcomePrompt.value
        : "Touch to start",
    },
  };

  ensureFontLoaded(headingFamily, true);
  ensureFontLoaded(bodyFamily, true);

  const backgroundFile = DOM.themeBackground.files[0];
  const logoFile = DOM.themeLogo.files[0];
  const overlayFiles = DOM.themeOverlays.files;
  const templateFiles = DOM.themeTemplates.files;
  const templatesFolder =
    DOM.themeTemplatesFolder && DOM.themeTemplatesFolder.value
      ? DOM.themeTemplatesFolder.value.trim()
      : "";
  const overlaysFolder =
    DOM.themeOverlaysFolder && DOM.themeOverlaysFolder.value
      ? DOM.themeOverlaysFolder.value.trim()
      : "";

  const filePromises = [];

  if (backgroundFile) {
    filePromises.push(
      uploadAsset(backgroundFile, "backgrounds").then((url) => {
        if (url) newTheme.background = url;
      })
    );
  }
  if (logoFile) {
    filePromises.push(
      uploadAsset(logoFile, "logo").then((url) => {
        if (url) newTheme.logo = url;
      })
    );
  }
  for (const file of overlayFiles) {
    filePromises.push(
      uploadAsset(file, "overlays").then((url) => {
        if (url) newTheme.overlays.push(url);
      })
    );
  }
  if (overlaysFolder) {
    newTheme.overlaysFolder = overlaysFolder.endsWith("/")
      ? overlaysFolder
      : overlaysFolder + "/";
  }
  for (const file of templateFiles) {
    filePromises.push(
      uploadAsset(file, "templates").then((url) => {
        if (url) newTheme.templates.push({ src: url, layout: "double_column" });
      })
    );
  }
  if (templatesFolder) {
    newTheme.templatesFolder = templatesFolder.endsWith("/")
      ? templatesFolder
      : templatesFolder + "/";
  }

  Promise.all(filePromises).then(() => {
    // Try to load/record the chosen fonts so they're available immediately
    ensureFontLoadedForFontString(newTheme.fontHeading);
    ensureFontLoadedForFontString(newTheme.fontBody);
    const newKey = themeName.toLowerCase().replace(/\s/g, "-");
    themes[newKey] = newTheme;
    saveThemesToStorage();
    populateThemeSelector(newKey);
    setEventSelection(newKey);
    loadTheme(newKey);
    if (DOM.themeEditorModeSelect) {
      DOM.themeEditorModeSelect.value = "edit";
      setThemeEditorMode("edit");
    } else {
      setThemeEditorMode("edit");
    }
    alert(`Theme '${themeName}' saved!`);
  });
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getAssetIndex() {
  if (!themes._meta) themes._meta = {};
  if (!themes._meta.assetIndex) themes._meta.assetIndex = {};
  return themes._meta.assetIndex;
}

function normalizeManagedLocalAssetReference(value) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    typeof location === "undefined"
  )
    return "";
  try {
    const resolved = new URL(value, location.origin);
    if (resolved.origin !== location.origin) return "";
    if (!resolved.pathname.startsWith("/uploads/")) return "";
    const filename = decodeURIComponent(
      resolved.pathname.slice("/uploads/".length)
    );
    if (!filename || filename.includes("/") || filename.includes("\\"))
      return "";
    return `/uploads/${filename}`;
  } catch (_err) {
    return "";
  }
}

function objectReferencesLocalAsset(node, targetPath) {
  if (!targetPath) return false;
  if (typeof node === "string")
    return normalizeManagedLocalAssetReference(node) === targetPath;
  if (Array.isArray(node))
    return node.some((item) => objectReferencesLocalAsset(item, targetPath));
  if (!node || typeof node !== "object") return false;
  return Object.values(node).some((value) =>
    objectReferencesLocalAsset(value, targetPath)
  );
}

function localAssetStillReferenced(targetPath) {
  if (!targetPath) return false;
  return (
    objectReferencesLocalAsset(themes, targetPath) ||
    objectReferencesLocalAsset(getStoredEvents(), targetPath)
  );
}

function pruneAssetIndexForUrl(targetPath) {
  if (!targetPath) return false;
  const index = getAssetIndex();
  let changed = false;
  Object.keys(index).forEach((key) => {
    if (normalizeManagedLocalAssetReference(index[key]) === targetPath) {
      delete index[key];
      changed = true;
    }
  });
  return changed;
}

async function cleanupUnusedLocalAsset(reference) {
  const targetPath = normalizeManagedLocalAssetReference(reference);
  if (!targetPath) return false;
  if (localAssetStillReferenced(targetPath)) return false;
  try {
    const resp = await fetch("/api/upload", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: targetPath }),
    });
    if (!resp.ok) return false;
    const pruned = pruneAssetIndexForUrl(targetPath);
    if (pruned) saveThemesToStorage();
    return true;
  } catch (_err) {
    return false;
  }
}

function scheduleLocalAssetCleanup(reference) {
  cleanupUnusedLocalAsset(reference).catch(() => {});
}

function slugifyThemeAssetScope(value) {
  return (
    (value || "")
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9:_\-]+/g, "-")
      .replace(/:+/g, "-")
      .replace(/^-+|-+$/g, "") || "theme"
  );
}

function getThemeAssetUploadOptionsForKey(themeKey = "", kind = "") {
  const base = getEventFolderBase();
  const scope = slugifyThemeAssetScope(themeKey);
  const cleanKind = (kind || "misc").toString().replace(/^\/+|\/+$/g, "");
  return { folder: `${base}/${scope}/${cleanKind}` };
}

function getManagedLocalAssetFilename(reference, fallback = "asset.png") {
  const normalized = normalizeManagedLocalAssetReference(reference);
  if (!normalized) return fallback;
  const filename = normalized.slice("/uploads/".length);
  return filename || fallback;
}

const managedLocalAssetMigrationCache = new Map();

async function migrateManagedLocalAsset(reference, kind, options = {}) {
  const normalized = normalizeManagedLocalAssetReference(reference);
  if (!normalized) return reference;
  if (managedLocalAssetMigrationCache.has(normalized)) {
    return managedLocalAssetMigrationCache.get(normalized);
  }
  const pending = (async () => {
    try {
      const resp = await fetch(normalized, { cache: "reload" });
      if (!resp.ok) return reference;
      const blob = await resp.blob();
      const filename = getManagedLocalAssetFilename(
        normalized,
        `${kind || "asset"}.png`
      );
      const file = new File([blob], filename, {
        type: blob.type || "application/octet-stream",
      });
      const uploaded = await uploadAsset(file, kind, options);
      return uploaded || reference;
    } catch (_err) {
      return reference;
    }
  })();
  managedLocalAssetMigrationCache.set(normalized, pending);
  return pending;
}

async function migrateManagedLocalStringList(list, kind, options) {
  if (!Array.isArray(list) || !list.length)
    return { list: Array.isArray(list) ? list : [], changed: 0, cleanup: [] };
  let changed = 0;
  const cleanup = [];
  const next = await Promise.all(
    list.map(async (item) => {
      const migrated = await migrateManagedLocalAsset(item, kind, options);
      if (migrated !== item && normalizeManagedLocalAssetReference(item)) {
        changed += 1;
        cleanup.push(item);
      }
      return migrated;
    })
  );
  return { list: next, changed, cleanup };
}

async function migrateManagedLocalTemplateList(list, kind, options) {
  if (!Array.isArray(list) || !list.length)
    return { list: Array.isArray(list) ? list : [], changed: 0, cleanup: [] };
  let changed = 0;
  const cleanup = [];
  const next = await Promise.all(
    list.map(async (item) => {
      if (typeof item === "string") {
        const migrated = await migrateManagedLocalAsset(item, kind, options);
        if (migrated !== item && normalizeManagedLocalAssetReference(item)) {
          changed += 1;
          cleanup.push(item);
        }
        return migrated;
      }
      if (!item || typeof item !== "object" || typeof item.src !== "string")
        return item;
      const migratedSrc = await migrateManagedLocalAsset(
        item.src,
        kind,
        options
      );
      if (
        migratedSrc !== item.src &&
        normalizeManagedLocalAssetReference(item.src)
      ) {
        changed += 1;
        cleanup.push(item.src);
        return { ...item, src: migratedSrc };
      }
      return item;
    })
  );
  return { list: next, changed, cleanup };
}

async function migrateManagedLocalSingle(reference, kind, options) {
  if (typeof reference !== "string" || !reference)
    return { value: reference, changed: 0, cleanup: [] };
  const migrated = await migrateManagedLocalAsset(reference, kind, options);
  if (
    migrated !== reference &&
    normalizeManagedLocalAssetReference(reference)
  ) {
    return { value: migrated, changed: 1, cleanup: [reference] };
  }
  return { value: migrated, changed: 0, cleanup: [] };
}

async function migrateThemeManagedLocalAssets(theme, themeKey) {
  if (!theme || typeof theme !== "object") return { changed: 0, cleanup: [] };
  const cleanup = [];
  let changed = 0;
  const backgroundOptions = getThemeAssetUploadOptionsForKey(
    themeKey,
    "backgrounds"
  );
  const greenOptions = getThemeAssetUploadOptionsForKey(
    themeKey,
    "greenBackgrounds"
  );
  const overlayOptions = getThemeAssetUploadOptionsForKey(themeKey, "overlays");
  const templateOptions = getThemeAssetUploadOptionsForKey(
    themeKey,
    "templates"
  );
  const logoOptions = getThemeAssetUploadOptionsForKey(themeKey, "logo");
  const characterOptions = getThemeAssetUploadOptionsForKey(
    themeKey,
    "character"
  );

  const backgroundSingle = await migrateManagedLocalSingle(
    theme.background,
    "backgrounds",
    backgroundOptions
  );
  theme.background = backgroundSingle.value || "";
  changed += backgroundSingle.changed;
  cleanup.push(...backgroundSingle.cleanup);

  const backgrounds = await migrateManagedLocalStringList(
    theme.backgrounds,
    "backgrounds",
    backgroundOptions
  );
  if (Array.isArray(theme.backgrounds)) theme.backgrounds = backgrounds.list;
  changed += backgrounds.changed;
  cleanup.push(...backgrounds.cleanup);

  const greenBackgrounds = await migrateManagedLocalStringList(
    theme.greenBackgrounds,
    "greenBackgrounds",
    greenOptions
  );
  if (Array.isArray(theme.greenBackgrounds))
    theme.greenBackgrounds = greenBackgrounds.list;
  changed += greenBackgrounds.changed;
  cleanup.push(...greenBackgrounds.cleanup);

  const overlays = await migrateManagedLocalStringList(
    theme.overlays,
    "overlays",
    overlayOptions
  );
  if (Array.isArray(theme.overlays)) theme.overlays = overlays.list;
  changed += overlays.changed;
  cleanup.push(...overlays.cleanup);

  const templates = await migrateManagedLocalTemplateList(
    theme.templates,
    "templates",
    templateOptions
  );
  if (Array.isArray(theme.templates)) theme.templates = templates.list;
  changed += templates.changed;
  cleanup.push(...templates.cleanup);

  const logo = await migrateManagedLocalSingle(theme.logo, "logo", logoOptions);
  if (typeof theme.logo === "string" || logo.changed)
    theme.logo = logo.value || "";
  changed += logo.changed;
  cleanup.push(...logo.cleanup);

  const character = await migrateManagedLocalSingle(
    theme.character,
    "character",
    characterOptions
  );
  if (typeof theme.character === "string" || character.changed)
    theme.character = character.value || "";
  changed += character.changed;
  cleanup.push(...character.cleanup);

  return { changed, cleanup };
}

async function migrateEventManagedLocalAssets(event) {
  if (!event || typeof event !== "object") return { changed: 0, cleanup: [] };
  const cleanup = [];
  let changed = 0;
  const overrides = ensureEventOverrides(event);

  const backgroundSingle = await migrateManagedLocalSingle(
    event.background,
    "backgrounds",
    getEventAssetUploadOptions(event, "backgrounds")
  );
  if (typeof event.background === "string" || backgroundSingle.changed)
    event.background = backgroundSingle.value || "";
  changed += backgroundSingle.changed;
  cleanup.push(...backgroundSingle.cleanup);

  const backgrounds = await migrateManagedLocalStringList(
    overrides.backgrounds,
    "backgrounds",
    getEventAssetUploadOptions(event, "backgrounds")
  );
  overrides.backgrounds = backgrounds.list;
  changed += backgrounds.changed;
  cleanup.push(...backgrounds.cleanup);

  const greenBackgrounds = await migrateManagedLocalStringList(
    overrides.greenBackgrounds,
    "greenBackgrounds",
    getEventAssetUploadOptions(event, "greenBackgrounds")
  );
  overrides.greenBackgrounds = greenBackgrounds.list;
  changed += greenBackgrounds.changed;
  cleanup.push(...greenBackgrounds.cleanup);

  const overlays = await migrateManagedLocalStringList(
    overrides.overlays,
    "overlays",
    getEventAssetUploadOptions(event, "overlays")
  );
  overrides.overlays = overlays.list;
  changed += overlays.changed;
  cleanup.push(...overlays.cleanup);

  const templates = await migrateManagedLocalTemplateList(
    overrides.templates,
    "templates",
    getEventAssetUploadOptions(event, "templates")
  );
  overrides.templates = templates.list;
  changed += templates.changed;
  cleanup.push(...templates.cleanup);

  const logo = await migrateManagedLocalSingle(
    event.logo,
    "logo",
    getEventAssetUploadOptions(event, "logo")
  );
  if (typeof event.logo === "string" || logo.changed) {
    if (logo.value) event.logo = logo.value;
    else delete event.logo;
  }
  changed += logo.changed;
  cleanup.push(...logo.cleanup);

  return { changed, cleanup };
}

async function migrateAllManagedLocalAssets() {
  if (!cloudinaryConfigured()) {
    alert("Configure Cloudinary first.");
    return;
  }
  if (DOM.migrateAssetsBtn) DOM.migrateAssetsBtn.disabled = true;
  updateSyncStatus("Migrating assets…");
  try {
    managedLocalAssetMigrationCache.clear();
    const cleanup = new Set();
    let changed = 0;

    const globalLogo = getGlobalLogo();
    if (normalizeManagedLocalAssetReference(globalLogo)) {
      const migratedLogo = await migrateManagedLocalAsset(
        globalLogo,
        "logo",
        getThemeAssetUploadOptionsForKey("global", "logo")
      );
      if (migratedLogo !== globalLogo) {
        changed += 1;
        cleanup.add(globalLogo);
        setGlobalLogo(migratedLogo, { quiet: true, skipSave: true });
      }
    }

    const themeTasks = [];
    forEachThemeEntry((theme, themeKey) => {
      themeTasks.push(migrateThemeManagedLocalAssets(theme, themeKey));
    });
    const themeResults = await Promise.all(themeTasks);
    themeResults.forEach((result) => {
      changed += result.changed;
      result.cleanup.forEach((item) => cleanup.add(item));
    });

    const events = getStoredEvents();
    const eventResults = await Promise.all(
      events.map((event) => migrateEventManagedLocalAssets(event))
    );
    eventResults.forEach((result) => {
      changed += result.changed;
      result.cleanup.forEach((item) => cleanup.add(item));
    });

    normalizeAllThemes();
    saveThemesToStorage();
    setStoredEvents(events);
    syncEventInputsFromActive();
    if (activeTheme) renderCurrentAssets(activeTheme);
    updateStylePreview();

    for (const reference of cleanup) {
      await cleanupUnusedLocalAsset(reference);
    }

    const message = changed
      ? `Migrated ${changed} local asset${
          changed === 1 ? "" : "s"
        } to Cloudinary`
      : "No local assets found to migrate";
    updateSyncStatus(changed ? "Migration complete" : "No local assets found");
    showToast(message);
  } catch (error) {
    console.error("Asset migration failed", error);
    updateSyncStatus("Migration failed");
    alert("Asset migration failed. Check Cloudinary settings and try again.");
  } finally {
    if (DOM.migrateAssetsBtn) DOM.migrateAssetsBtn.disabled = false;
  }
}

async function fileSha256Hex(file) {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
function extFromName(name, fallback) {
  const m = (name || "").match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : fallback || "png";
}

function normalizeUploadedAssetCategory(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "backgrounds" || raw === "greenbackgrounds") return "background";
  if (raw === "overlays") return "overlay";
  if (raw === "templates") return "template";
  if (raw === "background" || raw === "overlay" || raw === "template")
    return raw;
  return "";
}

function getAssetLibraryUrlKey(url) {
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

function getAssetLibraryId(category, url) {
  const normalizedCategory = normalizeUploadedAssetCategory(category);
  const value = getAssetLibraryUrlKey(url);
  return normalizedCategory && value ? `${normalizedCategory}:${value}` : "";
}

function normalizeAssetLibraryRecordId(category, url, id = "") {
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

function getAssetUrlValue(item) {
  return String(
    (item && (item.url || item.secure_url || item.src || item.renderSrc)) || ""
  ).trim();
}

function isManageableAssetUrl(url) {
  const value = String(url || "").trim();
  if (!value) return false;
  if (/^(javascript|vbscript):/i.test(value)) return false;
  return true;
}

const ASSET_EDITABLE_FIELD_LABELS = {
  eventName: "Event Name",
  date: "Date",
  schoolName: "School Name",
  title: "Title",
  subtitle: "Subtitle",
  buttonText: "Button Text",
  bannerText: "Banner Text",
};

const ASSET_EDITABLE_FIELD_ALIASES = {
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

function normalizeAssetTags(value) {
  const seen = new Set();
  const source = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",");
  return source
    .map((tag) => String(tag || "").trim().toLowerCase())
    .filter((tag) => {
      if (!tag || seen.has(tag)) return false;
      seen.add(tag);
      return true;
    });
}

function normalizeEditableFields(value) {
  const source = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",");
  const seen = new Set();
  return source
    .map((field) => {
      const raw = String(field || "").trim();
      const compact = raw.replace(/[\s_-]+/g, "").toLowerCase();
      return ASSET_EDITABLE_FIELD_LABELS[raw]
        ? raw
        : ASSET_EDITABLE_FIELD_ALIASES[compact] || "";
    })
    .filter((field) => {
      if (!field || seen.has(field)) return false;
      seen.add(field);
      return true;
    });
}

function getAssetEditableFieldLabel(field) {
  return ASSET_EDITABLE_FIELD_LABELS[field] || field;
}

function detectEditableFieldsFromText(...values) {
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

function normalizeAssetLibraryPayload(payload) {
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
    const detectedFields = detectEditableFieldsFromText(
      item.name,
      item.originalName,
      item.url,
      tags
    );
    const mergedFields = normalizeEditableFields([
      ...editableFields,
      ...detectedFields,
    ]);
    const normalized = {
      id,
      category,
      url,
      secure_url: url,
      name: String(item.name || item.originalName || url.split("/").pop() || category).trim(),
      tags,
      folder: String(item.folder || "").trim(),
      hash: String(item.hash || "").trim(),
      contentType: String(item.contentType || item.type || "").trim(),
      createdAt: String(item.createdAt || item.created_at || new Date().toISOString()),
      updatedAt: String(item.updatedAt || item.updated_at || new Date().toISOString()),
      customizable:
        item.customizable === true ||
        (item.customizable !== false && mergedFields.length > 0),
      editableFields: mergedFields,
      archived: item.archived === true,
      hidden: item.hidden === true || item.archived === true,
    };
    const mergeKey = getAssetLibraryId(category, url) || id;
    const existing = byId.get(mergeKey);
    if (existing) {
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
    } else {
      byId.set(mergeKey, normalized);
    }
  });
  return {
    assets: Array.from(byId.values()).sort((a, b) =>
      String(b.createdAt).localeCompare(String(a.createdAt))
    ),
  };
}

function saveAssetLibraryLocal() {
  try {
    localStorage.setItem(
      APP_CONFIG.STORAGE_KEYS.ASSET_LIBRARY,
      JSON.stringify(normalizeAssetLibraryPayload(assetLibrary))
    );
  } catch (_) {}
}

function loadAssetLibraryLocal() {
  try {
    assetLibrary = normalizeAssetLibraryPayload(
      JSON.parse(
        localStorage.getItem(APP_CONFIG.STORAGE_KEYS.ASSET_LIBRARY) || "{}"
      )
    );
  } catch (_) {
    assetLibrary = { assets: [] };
  }
}

function getVisibleLibraryAssets(category = "") {
  const normalizedCategory = normalizeUploadedAssetCategory(category);
  return getCanonicalAssetCollection(category).filter((asset) => {
    if (!asset || asset.hidden || asset.archived) return false;
    if (normalizedCategory && asset.category !== normalizedCategory) return false;
    return true;
  });
}

function getLibraryBackgroundUrls() {
  return getVisibleLibraryAssets("background").map((asset) => asset.url);
}

function getLibraryOverlayEntries() {
  return getVisibleLibraryAssets("overlay").map((asset) => ({
    src: asset.url,
    name: asset.name,
    category: asset.category,
    tags: asset.tags,
    textFields: asset.textFields,
    __library: true,
  }));
}

function getLibraryTemplateEntries() {
  return getVisibleLibraryAssets("template").map((asset) => ({
    src: asset.url,
    name: asset.name,
    tags: asset.tags,
    textFields: asset.textFields,
    layout: "double_column",
    __library: true,
  }));
}

function mergeLibraryAsset(asset) {
  const normalized = normalizeAssetLibraryPayload({ assets: [asset] }).assets[0];
  if (!normalized) return false;
  const library = normalizeAssetLibraryPayload(assetLibrary);
  const existingIndex = library.assets.findIndex(
    (item) =>
      item.id === normalized.id ||
      item.url === normalized.url ||
      getAssetLibraryId(item.category, item.url) ===
        getAssetLibraryId(normalized.category, normalized.url)
  );
  if (existingIndex >= 0) {
    const existing = library.assets[existingIndex];
    const tags = Array.from(
      new Set([...(existing.tags || []), ...(normalized.tags || [])])
    );
    library.assets[existingIndex] = {
      ...existing,
      ...normalized,
      tags,
      createdAt: existing.createdAt || normalized.createdAt,
      hidden: existing.hidden === true ? true : normalized.hidden,
      archived: existing.archived === true ? true : normalized.archived,
      updatedAt: new Date().toISOString(),
    };
  } else {
    library.assets.unshift(normalized);
  }
  assetLibrary = normalizeAssetLibraryPayload(library);
  saveAssetLibraryLocal();
  renderAssetLibrary();
  return true;
}

async function syncAssetLibraryRemoteAsset(asset) {
  if (!canSyncRemote()) return false;
  try {
    const resp = await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(asset),
    });
    return resp.ok;
  } catch (err) {
    console.warn("Asset library sync failed", err);
    return false;
  }
}

async function loadAssetLibraryRemote() {
  loadAssetLibraryLocal();
  if (!canSyncRemote()) {
    renderAssetLibrary();
    return;
  }
  try {
    const resp = await fetch("/api/assets", { cache: "no-store" });
    if (!resp.ok) {
      renderAssetLibrary();
      return;
    }
    const remote = normalizeAssetLibraryPayload(await resp.json());
    const merged = normalizeAssetLibraryPayload({
      assets: [...(assetLibrary.assets || []), ...(remote.assets || [])],
    });
    assetLibrary = merged;
    saveAssetLibraryLocal();
    renderAssetLibrary();
    if (activeTheme) {
      renderCurrentAssets(activeTheme);
      renderOptions();
    }
  } catch (err) {
    console.warn("Asset library load failed", err);
    renderAssetLibrary();
  }
}

function scheduleAssetLibraryRender() {
  renderAssetLibrary();
  if (activeTheme) {
    renderCurrentAssets(activeTheme);
    renderOptions();
  }
}

async function updateAssetLibraryItem(id, patch = {}, fallbackAsset = null) {
  if (!id) return;
  const library = normalizeAssetLibraryPayload(assetLibrary);
  const index = library.assets.findIndex(
    (asset) =>
      asset.id === id ||
      getAssetLibraryId(asset.category, asset.url) === id
  );
  const baseRecord =
    index >= 0
      ? library.assets[index]
      : fallbackAsset
      ? {
          id,
          category: fallbackAsset.category,
          url: fallbackAsset.url,
          secure_url: fallbackAsset.url,
          name: getAssetDisplayName(fallbackAsset),
          tags: fallbackAsset.tags || [],
          editableFields: fallbackAsset.editableFields || [],
          customizable: fallbackAsset.customizable === true,
          createdAt: fallbackAsset.createdAt || "",
        }
      : null;
  if (!baseRecord) return;
  const nextRecord = {
    ...baseRecord,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  if (index >= 0) library.assets[index] = nextRecord;
  else library.assets.unshift(nextRecord);
  assetLibrary = normalizeAssetLibraryPayload(library);
  saveAssetLibraryLocal();
  scheduleAssetLibraryRender();
  if (canSyncRemote()) {
    try {
      await fetch("/api/assets", {
        method: index >= 0 ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...nextRecord, id }),
      });
    } catch (err) {
      console.warn("Asset library update failed", err);
    }
  }
}

async function deleteAssetLibraryItem(id, fallbackAsset = null) {
  if (!id) return;
  const fallbackUrl = fallbackAsset && (fallbackAsset.url || fallbackAsset.secure_url);
  const repoBackedAsset = fallbackAsset && fallbackAsset.source === "theme";
  if (repoBackedAsset || !canSyncRemote()) {
    await updateAssetLibraryItem(
      id,
      {
        category: fallbackAsset.category,
        url: fallbackUrl,
        secure_url: fallbackUrl,
        name: getAssetDisplayName(fallbackAsset),
        tags: fallbackAsset.tags || [],
        hidden: true,
        archived: true,
      },
      fallbackAsset
    );
    return;
  }
  const library = normalizeAssetLibraryPayload(assetLibrary);
  const index = library.assets.findIndex(
    (asset) =>
      asset &&
      (asset.id === id || getAssetLibraryId(asset.category, asset.url) === id)
  );
  if (index !== -1) {
    library.assets.splice(index, 1);
  }
  assetLibrary = normalizeAssetLibraryPayload(library);
  saveAssetLibraryLocal();
  scheduleAssetLibraryRender();
  if (canSyncRemote()) {
    try {
      await fetch("/api/assets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          url: fallbackUrl,
        }),
      });
    } catch (err) {
      console.warn("Asset library delete failed", err);
    }
  }
}

function archiveLibraryAssetByUrl(url) {
  const asset = (assetLibrary.assets || []).find(
    (item) =>
      item &&
      (item.url === url ||
        getAssetLibraryUrlKey(item.url) === getAssetLibraryUrlKey(url))
  );
  const fallback = getCanonicalAssetCollection().find(
    (item) =>
      item &&
      (item.url === url ||
        getAssetLibraryUrlKey(item.url) === getAssetLibraryUrlKey(url))
  );
  if (!asset && !fallback) return;
  updateAssetLibraryItem(
    (asset && asset.id) || (fallback && fallback.id),
    { hidden: true, archived: true },
    fallback
  );
}

function getAssetDisplayName(asset) {
  if (asset && asset.name) return String(asset.name);
  const url = String((asset && asset.url) || "");
  const filename = decodeURIComponent(url.split("/").pop() || "");
  return filename.replace(/\.[a-z0-9]+$/i, "") || "Untitled asset";
}

function getAssetCreatedAtLabel(asset) {
  if (!asset) return "";
  const value = asset.createdAt || asset.created_at || "";
  if (!value || asset.source === "theme") return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function getAssetBadgeLabels(asset) {
  const labels = [];
  if (asset && asset.customizable) labels.push("Customizable");
  normalizeEditableFields(asset && asset.editableFields).forEach((field) => {
    labels.push(getAssetEditableFieldLabel(field));
  });
  return labels;
}

function createCanonicalAssetRow(entry, category, themeName, themeKey) {
  const src = getAssetEntrySrc(entry);
  if (!src) return null;
  const name = getAssetDisplayName({
    name: entry && typeof entry === "object" ? entry.name : "",
    url: src,
  });
  const textFields =
    entry && typeof entry === "object" && entry.textFields
      ? Object.keys(entry.textFields)
      : [];
  const editableFields = normalizeEditableFields([
    ...textFields,
    ...detectEditableFieldsFromText(name, src),
  ]);
  const normalizedCategory = normalizeUploadedAssetCategory(category);
  return {
    id: getAssetLibraryId(normalizedCategory, src),
    category: normalizedCategory,
    url: src,
    secure_url: src,
    name,
    tags: normalizeAssetTags([themeName, themeKey]),
    source: "theme",
    createdAt: "",
    updatedAt: "",
    customizable: editableFields.length > 0,
    editableFields,
    raw: entry,
  };
}

function themeKeyToCategory(themeKey) {
  const raw = String(themeKey || "").trim();
  if (!raw) return "general";
  const [root] = raw.split(":");
  if (["background", "overlay", "template"].includes(root)) return root;
  if (root === "school" || raw.startsWith("school:")) return "school";
  if (root === "wedding" || raw.startsWith("wedding:")) return "wedding";
  if (root === "holidays" || raw.startsWith("holidays:")) return "holidays";
  if (raw.includes("birthday")) return "birthday";
  if (raw.includes("summer")) return "general";
  return "general";
}

function collectThemeAssetRows(category = "") {
  const filterCategory = normalizeUploadedAssetCategory(category);
  const byKey = new Map();
  const add = (entry, rowCategory, themeName, themeKey) => {
    const row = createCanonicalAssetRow(entry, rowCategory, themeName, themeKey);
    if (!row) return;
    const key = row.id;
    if (!byKey.has(key)) {
      byKey.set(key, { ...row, themeKeys: [] });
    }
    const existing = byKey.get(key);
    if (!existing.themeKeys.includes(themeKey)) {
      existing.themeKeys.push(themeKey);
    }
  };
  forEachThemeEntry((theme, themeKey) => {
    const themeName = theme && theme.name ? theme.name : themeKey;
    const backgroundFolder = ensureFolderPath(
      (theme && theme.backgroundFolder) ||
        (theme && typeof theme.background === "string" && theme.background.endsWith("/")
          ? theme.background
          : "")
    );
    const overlaysFolder = ensureFolderPath(theme && theme.overlaysFolder);
    const templatesFolder = ensureFolderPath(theme && theme.templatesFolder);
    if (
      theme &&
      typeof theme.background === "string" &&
      theme.background &&
      !theme.background.endsWith("/")
    ) {
      add(theme.background, "background", themeName, themeKey);
    }
    if (Array.isArray(theme && theme.backgrounds)) {
      theme.backgrounds.forEach((src) => add(src, "background", themeName, themeKey));
    }
    if (Array.isArray(theme && theme.backgroundsTmp)) {
      theme.backgroundsTmp.forEach((src) => add(src, "background", themeName, themeKey));
    }
    if (Array.isArray(theme && theme.overlays)) {
      theme.overlays.forEach((entry) => add(entry, "overlay", themeName, themeKey));
    }
    if (Array.isArray(theme && theme.overlaysTmp)) {
      theme.overlaysTmp.forEach((entry) => add(entry, "overlay", themeName, themeKey));
    }
    if (Array.isArray(theme && theme.templates)) {
      theme.templates.forEach((entry) => add(entry, "template", themeName, themeKey));
    }
    if (Array.isArray(theme && theme.templatesTmp)) {
      theme.templatesTmp.forEach((entry) => add(entry, "template", themeName, themeKey));
    }
    if (backgroundFolder) {
      getBuiltinFolderStrings(backgroundFolder).forEach((src) =>
        add(src, "background", themeName, themeKey)
      );
    }
    if (overlaysFolder) {
      getBuiltinOverlayEntries(overlaysFolder).forEach((entry) =>
        add(entry, "overlay", themeName, themeKey)
      );
    }
    if (templatesFolder) {
      getBuiltinTemplateEntries(templatesFolder).forEach((entry) =>
        add(entry, "template", themeName, themeKey)
      );
    }
  });
  return Array.from(byKey.values()).map((row) => ({
    ...row,
    categories: [...new Set(row.themeKeys.map(themeKeyToCategory))],
  }));
}

function mergeCanonicalAssetWithStoredRecord(base, stored) {
  if (!stored) return base;
  return {
    ...base,
    ...stored,
    source: base.source || stored.source || "library",
    url: base.url || stored.url,
    secure_url: base.secure_url || stored.secure_url || base.url || stored.url,
    category: base.category || stored.category,
    id: base.id || stored.id,
    tags: normalizeAssetTags(stored.tags && stored.tags.length ? stored.tags : base.tags),
    editableFields: normalizeEditableFields(
      stored.editableFields && stored.editableFields.length
        ? stored.editableFields
        : base.editableFields
    ),
    customizable:
      stored.customizable === true ||
      (stored.customizable !== false && base.customizable === true),
    hidden: stored.hidden === true || stored.archived === true,
    archived: stored.archived === true,
  };
}

function getCanonicalAssetCollection(category = "") {
  const filterCategory = normalizeUploadedAssetCategory(category);
  const themeRows = collectThemeAssetRows(filterCategory);
  const storedRows = (assetLibrary.assets || []).filter((asset) => {
    if (!asset) return false;
    if (filterCategory && asset.category !== filterCategory) return false;
    return true;
  });
  const storedById = new Map();
  storedRows.forEach((asset) => {
    if (!asset) return;
    if (asset.id) storedById.set(asset.id, asset);
    const canonicalId = getAssetLibraryId(asset.category, asset.url);
    if (canonicalId) storedById.set(canonicalId, asset);
  });
  const byId = new Map();
  themeRows.forEach((row) => {
    const merged = mergeCanonicalAssetWithStoredRecord(row, storedById.get(row.id));
    if (!merged.hidden && !merged.archived) byId.set(merged.id, merged);
  });
  storedRows.forEach((asset) => {
    if (byId.has(asset.id)) return;
    if (asset.hidden || asset.archived) return;
    byId.set(asset.id, { ...asset, source: "library" });
  });
  return Array.from(byId.values()).sort((a, b) =>
    getAssetDisplayName(a).localeCompare(getAssetDisplayName(b))
  );
}

function getAllAssetLibraryRows() {
  return getCanonicalAssetCollection();
}

function getAssetLibraryTrackingKey(asset) {
  const category = normalizeUploadedAssetCategory(asset && asset.category);
  const src = getAssetEntrySrc(asset);
  return category && src ? `${category}:${src}` : "";
}

function readAssetLibraryKeyList(storageKey) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === "string" && item.trim())
      : [];
  } catch (_) {
    return [];
  }
}

function saveAssetLibraryKeyList(storageKey, keys) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(keys));
  } catch (_) {}
}

function getAssetLibraryFavoriteKeys() {
  return new Set(readAssetLibraryKeyList(ASSET_LIBRARY_FAVORITES_STORAGE_KEY));
}

function isAssetLibraryFavorite(asset) {
  const key = getAssetLibraryTrackingKey(asset);
  return !!key && getAssetLibraryFavoriteKeys().has(key);
}

function toggleAssetLibraryFavorite(asset) {
  const key = getAssetLibraryTrackingKey(asset);
  if (!key) return false;
  const keys = getAssetLibraryFavoriteKeys();
  const nextIsFavorite = !keys.has(key);
  if (nextIsFavorite) keys.add(key);
  else keys.delete(key);
  saveAssetLibraryKeyList(
    ASSET_LIBRARY_FAVORITES_STORAGE_KEY,
    Array.from(keys)
  );
  return nextIsFavorite;
}

function getAssetLibraryRecentKeys() {
  return readAssetLibraryKeyList(ASSET_LIBRARY_RECENTS_STORAGE_KEY);
}

function recordAssetLibraryRecent(asset) {
  const key = getAssetLibraryTrackingKey(asset);
  if (!key) return;
  const keys = getAssetLibraryRecentKeys().filter((item) => item !== key);
  keys.unshift(key);
  saveAssetLibraryKeyList(
    ASSET_LIBRARY_RECENTS_STORAGE_KEY,
    keys.slice(0, ASSET_LIBRARY_RECENT_LIMIT)
  );
}

function sortAssetLibraryRows(rows, sortMode) {
  const assets = Array.isArray(rows) ? rows.slice() : [];
  const favoriteKeys = getAssetLibraryFavoriteKeys();
  const recentKeys = getAssetLibraryRecentKeys();
  const recentRank = new Map(recentKeys.map((key, index) => [key, index]));
  const byName = (a, b) =>
    getAssetDisplayName(a).localeCompare(getAssetDisplayName(b));
  const byNewest = (a, b) => {
    const aTime = Date.parse(a.createdAt || "") || 0;
    const bTime = Date.parse(b.createdAt || "") || 0;
    return bTime - aTime || byName(a, b);
  };
  const categoryOrder = { background: 0, overlay: 1, template: 2 };
  const byCategory = (a, b) => {
    const ac = categoryOrder[normalizeUploadedAssetCategory(a.category)] ?? 99;
    const bc = categoryOrder[normalizeUploadedAssetCategory(b.category)] ?? 99;
    return ac - bc || byName(a, b);
  };
  assets.sort((a, b) => {
    if (sortMode === "name") return byName(a, b);
    if (sortMode === "category") return byCategory(a, b);
    if (sortMode === "favorites") {
      const aFav = favoriteKeys.has(getAssetLibraryTrackingKey(a)) ? 1 : 0;
      const bFav = favoriteKeys.has(getAssetLibraryTrackingKey(b)) ? 1 : 0;
      return bFav - aFav || byNewest(a, b);
    }
    if (sortMode === "recent") {
      const aRank = recentRank.has(getAssetLibraryTrackingKey(a))
        ? recentRank.get(getAssetLibraryTrackingKey(a))
        : Number.MAX_SAFE_INTEGER;
      const bRank = recentRank.has(getAssetLibraryTrackingKey(b))
        ? recentRank.get(getAssetLibraryTrackingKey(b))
        : Number.MAX_SAFE_INTEGER;
      return aRank - bRank || byNewest(a, b);
    }
    const aTime = Date.parse(a.createdAt || "") || 0;
    const bTime = Date.parse(b.createdAt || "") || 0;
    return sortMode === "oldest" ? aTime - bTime || byName(a, b) : byNewest(a, b);
  });
  return assets;
}

function normalizeAssetLibraryCategoryFilter(value = "") {
  const raw = String(value || "").trim().toLowerCase();
  return normalizeUploadedAssetCategory(raw) || raw;
}

function getAssetLibraryFilterCategories(asset) {
  const categories = Array.isArray(asset && asset.categories)
    ? asset.categories
    : [];
  return categories
    .map((category) => String(category || "").trim().toLowerCase())
    .filter(Boolean);
}

function assetMatchesLibraryCategoryFilter(asset, value = "") {
  const filter = normalizeAssetLibraryCategoryFilter(value);
  if (!filter || filter === "all") return true;
  const assetCategory = normalizeUploadedAssetCategory(asset && asset.category);
  if (["background", "overlay", "template"].includes(filter)) {
    return assetCategory === filter;
  }
  return getAssetLibraryFilterCategories(asset).includes(filter);
}

function getAssetLibrarySearchText(asset) {
  return [
    asset && asset.name,
    asset && asset.category,
    asset && asset.url,
    ...(Array.isArray(asset && asset.tags) ? asset.tags : []),
    ...getAssetLibraryFilterCategories(asset),
    ...(Array.isArray(asset && asset.themeKeys) ? asset.themeKeys : []),
  ]
    .join(" ")
    .toLowerCase();
}

function getFilteredAssetLibraryRows() {
  const query = DOM.assetLibrarySearch
    ? DOM.assetLibrarySearch.value.trim().toLowerCase()
    : "";
  const category = DOM.assetLibraryCategory
    ? DOM.assetLibraryCategory.value
    : "";
  const pillCategory = assetLibraryState.selectedCategory || "";
  const sortMode = DOM.assetLibrarySort ? DOM.assetLibrarySort.value : "newest";
  const rows = getAllAssetLibraryRows().filter((asset) => {
    if (!asset) return false;
    if (!assetMatchesLibraryCategoryFilter(asset, pillCategory)) return false;
    if (!assetMatchesLibraryCategoryFilter(asset, category)) return false;
    if (!query) return true;
    return getAssetLibrarySearchText(asset).includes(query);
  });
  return sortAssetLibraryRows(rows, sortMode);
}

function getActiveAssetLibraryFilterLabels() {
  const labels = [];
  if (DOM.assetLibraryCategory && DOM.assetLibraryCategory.value)
    labels.push("Category");
  if (DOM.assetLibrarySearch && DOM.assetLibrarySearch.value.trim())
    labels.push("Search");
  if (assetLibraryState.selectedCategory && assetLibraryState.selectedCategory !== "all")
    labels.push("Asset type");
  return labels;
}

function clearAssetLibraryFilters() {
  if (DOM.assetLibrarySearch) DOM.assetLibrarySearch.value = "";
  if (DOM.assetLibraryCategory) DOM.assetLibraryCategory.value = "";
  assetLibraryState.selectedCategory = "";
  assetLibraryState.visibleCount = 40;
  renderAssetLibrary();
}

function isAssetHiddenByCurrentLibraryFilters(asset) {
  if (!asset) return false;
  return !getFilteredAssetLibraryRows().some((row) => row.id === asset.id);
}

function getAssetThemeDefaultCount(asset) {
  const category = normalizeUploadedAssetCategory(asset && asset.category);
  const src = getAssetEntrySrc(asset);
  if (!category || !src) return 0;
  return getSelectableThemeEntries().filter(({ theme }) =>
    getExplicitThemeAssetEntries(category, theme).some(
      (item) => getAssetEntrySrc(item) === src
    )
  ).length;
}

function promptForAssetTags(asset) {
  if (!asset) return;
  const value = prompt("Tags, comma-separated", (asset.tags || []).join(", "));
  if (value === null) return;
  updateAssetLibraryItem(
    asset.id,
    { tags: normalizeAssetTags(value) },
    asset
  );
}

function promptForAssetName(asset) {
  if (!asset) return;
  const value = prompt("Asset name", getAssetDisplayName(asset));
  if (value === null) return;
  const name = value.trim();
  if (!name) return;
  updateAssetLibraryItem(asset.id, { name }, asset);
}

function getSelectableThemeEntries() {
  const entries = [];
  const seenKeys = new Set();
  const addEntry = (entry) => {
    if (!entry || !entry.key || seenKeys.has(entry.key)) return;
    seenKeys.add(entry.key);
    entries.push(entry);
  };
  for (const rootKey of Object.keys(themes || {})) {
    if (rootKey === "_meta") continue;
    const group = themes[rootKey];
    if (!group || typeof group !== "object") continue;
    const groupName = String(group.name || rootKey).trim();
    for (const bucket of ["themes", "holidays"]) {
      const children = group[bucket];
      if (!children || typeof children !== "object") continue;
      for (const leafKey of Object.keys(children)) {
        const theme = children[leafKey];
        if (!theme || typeof theme !== "object") continue;
        addEntry({
          key: `${rootKey}:${leafKey}`,
          group: groupName,
          label: String(theme.name || leafKey).trim(),
          theme,
        });
      }
    }
    const builtinGroup = BUILTIN_THEMES[rootKey];
    const isBuiltinCategory = !!(
      builtinGroup &&
      (builtinGroup.themes || builtinGroup.holidays)
    );
    if (!isBuiltinCategory && !group.themes && !group.holidays && group.name) {
      addEntry({ key: rootKey, group: "Other", label: groupName, theme: group });
    }
  }
  return entries.sort((a, b) =>
    `${a.group} ${a.label}`.localeCompare(`${b.group} ${b.label}`)
  );
}

function getExplicitThemeAssetEntries(category, theme) {
  if (!theme || typeof theme !== "object") return [];
  if (category === "background")
    return Array.isArray(theme.backgrounds) ? theme.backgrounds : [];
  if (category === "overlay")
    return Array.isArray(theme.overlays) ? theme.overlays : [];
  if (category === "template")
    return Array.isArray(theme.templates) ? theme.templates : [];
  return [];
}

function buildThemeDefaultAssetEntry(asset) {
  const src = getAssetEntrySrc(asset);
  if (!src) return null;
  const category = normalizeUploadedAssetCategory(asset.category);
  if (category === "background") return src;
  const raw = asset.raw && typeof asset.raw === "object" ? asset.raw : {};
  if (category === "overlay") return { ...cloneThemeValue(raw), src };
  if (category === "template") {
    return {
      ...cloneThemeValue(raw),
      src,
      layout: normalizeTemplateLayout(raw.layout || asset.layout || "double_column"),
      slots: raw.slots,
      photoSlots: raw.photoSlots,
      background: raw.background,
      foreground: raw.foreground,
      textFields: normalizeTemplateTextFields(raw.textFields || asset.textFields),
    };
  }
  return null;
}

function getThemeDefaultArrayName(category) {
  if (category === "background") return "backgrounds";
  if (category === "overlay") return "overlays";
  if (category === "template") return "templates";
  return "";
}

function getThemeRemovedArrayName(category) {
  if (category === "background") return "backgroundsRemoved";
  if (category === "overlay") return "overlaysRemoved";
  if (category === "template") return "templatesRemoved";
  return "";
}

function openAssetThemeDefaultsModal(asset) {
  const category = normalizeUploadedAssetCategory(asset && asset.category);
  const src = getAssetEntrySrc(asset);
  if (!asset || !category || !src || !DOM.assetThemeDefaultsModal) return;
  activeThemeDefaultsAsset = asset;
  if (DOM.assetThemeDefaultsTitle)
    DOM.assetThemeDefaultsTitle.textContent = "Theme Defaults";
  if (DOM.assetThemeDefaultsSummary)
    DOM.assetThemeDefaultsSummary.textContent =
      "Choose which themes use this asset by default.";
  const list = DOM.assetThemeDefaultsList;
  if (list) {
    list.innerHTML = "";
    const groups = new Map();
    getSelectableThemeEntries().forEach((entry) => {
      if (!groups.has(entry.group)) groups.set(entry.group, []);
      groups.get(entry.group).push(entry);
    });
    groups.forEach((entries, groupName) => {
      const group = document.createElement("div");
      group.className = "theme-defaults-group";
      const title = document.createElement("div");
      title.className = "theme-defaults-group-title";
      title.textContent = groupName;
      group.appendChild(title);
      entries.forEach((entry) => {
        const label = document.createElement("label");
        label.className = "theme-defaults-option";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = entry.key;
        checkbox.checked = getExplicitThemeAssetEntries(category, entry.theme)
          .some((item) => getAssetEntrySrc(item) === src);
        checkbox.addEventListener("change", updateAssetThemeDefaultsSelectionCount);
        const text = document.createElement("span");
        text.textContent = entry.label;
        label.append(checkbox, text);
        group.appendChild(label);
      });
      list.appendChild(group);
    });
  }
  updateAssetThemeDefaultsSelectionCount();
  DOM.assetThemeDefaultsModal.classList.remove("hidden");
  DOM.assetThemeDefaultsModal.classList.add("show");
}

function updateAssetThemeDefaultsSelectionCount() {
  if (!DOM.assetThemeDefaultsSelectionCount) return;
  const count = DOM.assetThemeDefaultsList
    ? DOM.assetThemeDefaultsList.querySelectorAll("input[type=checkbox]:checked")
        .length
    : 0;
  DOM.assetThemeDefaultsSelectionCount.textContent = `Selected for ${count} theme${
    count === 1 ? "" : "s"
  }`;
}

function selectCurrentThemeForAssetDefaults() {
  const key = normalizeThemeSelectionKey(getSelectedThemeKey());
  if (!key || !DOM.assetThemeDefaultsList) return;
  const checkbox = Array.from(
    DOM.assetThemeDefaultsList.querySelectorAll("input[type=checkbox]")
  ).find((input) => input.value === key);
  if (!checkbox) return;
  checkbox.checked = true;
  updateAssetThemeDefaultsSelectionCount();
}

function clearAssetThemeDefaults() {
  if (!DOM.assetThemeDefaultsList) return;
  DOM.assetThemeDefaultsList
    .querySelectorAll("input[type=checkbox]")
    .forEach((input) => {
      input.checked = false;
    });
  updateAssetThemeDefaultsSelectionCount();
}

function closeAssetThemeDefaultsModal() {
  activeThemeDefaultsAsset = null;
  if (DOM.assetThemeDefaultsModal) {
    DOM.assetThemeDefaultsModal.classList.remove("show");
    DOM.assetThemeDefaultsModal.classList.add("hidden");
  }
}

function saveAssetThemeDefaults() {
  const asset = activeThemeDefaultsAsset;
  const category = normalizeUploadedAssetCategory(asset && asset.category);
  const src = getAssetEntrySrc(asset);
  const arrayName = getThemeDefaultArrayName(category);
  const removedArrayName = getThemeRemovedArrayName(category);
  if (!asset || !category || !src || !arrayName) return;
  const selected = new Set(
    Array.from(
      DOM.assetThemeDefaultsList
        ? DOM.assetThemeDefaultsList.querySelectorAll("input[type=checkbox]:checked")
        : []
    ).map((input) => input.value)
  );
  const entryForDefaults = buildThemeDefaultAssetEntry(asset);
  getSelectableThemeEntries().forEach(({ key, theme }) => {
    const current = getExplicitThemeAssetEntries(category, theme);
    const hasAsset = current.some((item) => getAssetEntrySrc(item) === src);
    if (selected.has(key) && !hasAsset && entryForDefaults) {
      theme[arrayName] = [...current, cloneThemeValue(entryForDefaults)];
      if (removedArrayName && Array.isArray(theme[removedArrayName])) {
        theme[removedArrayName] = theme[removedArrayName].filter(
          (item) => getAssetEntrySrc(item) !== src
        );
      }
    } else if (!selected.has(key) && hasAsset) {
      theme[arrayName] = current.filter((item) => getAssetEntrySrc(item) !== src);
    }
  });
  saveThemesToStorage();
  const selectedThemeKey = DOM.eventSelect && DOM.eventSelect.value;
  if (selectedThemeKey) loadTheme(selectedThemeKey);
  renderAssetLibrary();
  updateCreatePathAssetSummary();
  updateLaunchSummary();
  closeAssetThemeDefaultsModal();
  showToast("Default theme choices saved.");
}

const THEME_DEFAULTS_SETUP_CATEGORIES = [
  { key: "background", label: "Backgrounds" },
  { key: "overlay", label: "Overlays" },
  { key: "template", label: "Templates" },
];

function openThemeDefaultsSetupModal() {
  const key = normalizeThemeSelectionKey(
    (DOM.eventSelect && DOM.eventSelect.value) || ""
  );
  const theme = resolveThemeByKey(key);
  if (!key || !theme || !DOM.themeDefaultsSetupModal) return;
  activeThemeDefaultsSetupKey = key;
  const label = getThemeSetupDisplayLabel(key, theme);
  if (DOM.themeDefaultsSetupTitle)
    DOM.themeDefaultsSetupTitle.textContent = `Set Up Defaults: ${label}`;
  if (DOM.themeDefaultsSetupSummary)
    DOM.themeDefaultsSetupSummary.textContent =
      "Choose the assets included by default whenever this theme is selected.";

  const list = DOM.themeDefaultsSetupList;
  if (list) {
    list.innerHTML = "";
    const assets = getCanonicalAssetCollection();
    THEME_DEFAULTS_SETUP_CATEGORIES.forEach(({ key: category, label: title }) => {
      const section = document.createElement("section");
      section.className = "theme-defaults-setup-section";
      const heading = document.createElement("div");
      heading.className = "theme-defaults-group-title";
      heading.textContent = title;
      const grid = document.createElement("div");
      grid.className = "theme-defaults-setup-grid";
      const explicitSources = new Set(
        getExplicitThemeAssetEntries(category, theme)
          .map(getAssetEntrySrc)
          .filter(Boolean)
      );
      assets
        .filter(
          (asset) =>
            asset.category === category && !getAssetEntrySrc(asset).endsWith("/")
        )
        .forEach((asset) => {
          const src = getAssetEntrySrc(asset);
          if (!src) return;
          const option = document.createElement("label");
          option.className = "theme-defaults-setup-option";
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.value = asset.id;
          checkbox.dataset.category = category;
          checkbox.checked = explicitSources.has(src);
          const thumbnail = document.createElement("img");
          thumbnail.src = withBust(src);
          thumbnail.alt = "";
          thumbnail.onerror = () => thumbnail.remove();
          const name = document.createElement("span");
          name.className = "theme-defaults-setup-name";
          name.textContent = getAssetDisplayName(asset);
          option.append(checkbox, thumbnail, name);
          grid.appendChild(option);
        });
      if (!grid.childNodes.length) {
        const empty = document.createElement("div");
        empty.className = "asset-library-empty";
        empty.textContent = "No assets available.";
        grid.appendChild(empty);
      }
      section.append(heading, grid);
      list.appendChild(section);
    });
  }
  DOM.themeDefaultsSetupModal.classList.remove("hidden");
  DOM.themeDefaultsSetupModal.classList.add("show");
}

function closeThemeDefaultsSetupModal() {
  activeThemeDefaultsSetupKey = "";
  if (DOM.themeDefaultsSetupModal) {
    DOM.themeDefaultsSetupModal.classList.remove("show");
    DOM.themeDefaultsSetupModal.classList.add("hidden");
  }
}

function saveThemeDefaultsSetup() {
  const key = normalizeThemeSelectionKey(activeThemeDefaultsSetupKey);
  const theme = resolveThemeByKey(key);
  if (!key || !theme) return;
  const assetsById = new Map(
    getCanonicalAssetCollection().map((asset) => [asset.id, asset])
  );
  const selectedByCategory = new Map(
    THEME_DEFAULTS_SETUP_CATEGORIES.map(({ key: category }) => [category, []])
  );
  const checked = DOM.themeDefaultsSetupList
    ? DOM.themeDefaultsSetupList.querySelectorAll("input[type=checkbox]:checked")
    : [];
  checked.forEach((input) => {
    const asset = assetsById.get(input.value);
    const category = normalizeUploadedAssetCategory(input.dataset.category);
    if (asset && selectedByCategory.has(category)) {
      selectedByCategory.get(category).push(asset);
    }
  });

  THEME_DEFAULTS_SETUP_CATEGORIES.forEach(({ key: category }) => {
    const arrayName = getThemeDefaultArrayName(category);
    const removedArrayName = getThemeRemovedArrayName(category);
    const selectedAssets = selectedByCategory.get(category) || [];
    const selectedSources = new Set(selectedAssets.map(getAssetEntrySrc).filter(Boolean));
    theme[arrayName] = selectedAssets
      .map((asset) => buildThemeDefaultAssetEntry(asset))
      .filter(Boolean);
    if (removedArrayName && Array.isArray(theme[removedArrayName])) {
      theme[removedArrayName] = theme[removedArrayName].filter(
        (item) => !selectedSources.has(getAssetEntrySrc(item))
      );
    }
  });

  saveThemesToStorage();
  loadTheme(key);
  renderAssetLibrary();
  renderCurrentAssets(activeTheme || theme);
  updateCreatePathAssetSummary();
  updateLaunchSummary();
  closeThemeDefaultsSetupModal();
  showToast(`Theme defaults saved for ${getThemeSetupDisplayLabel(key, theme)}.`);
}

function registerUploadedAsset(url, kind, details = {}) {
  const category = normalizeUploadedAssetCategory(kind);
  if (!url || !category) return;
  const asset = {
    id: `${category}:${url}`,
    category,
    url,
    secure_url: url,
    name: details.name || details.originalName || url.split("/").pop() || category,
    tags: details.tags || [],
    folder: details.folder || "",
    hash: details.hash || "",
    contentType: details.contentType || "",
    createdAt: details.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    customizable: details.customizable === true,
    editableFields: normalizeEditableFields(details.editableFields),
    hidden: false,
    archived: false,
  };
  if (mergeLibraryAsset(asset)) {
    syncAssetLibraryRemoteAsset(asset).catch(() => {});
    showToast(
      isAssetHiddenByCurrentLibraryFilters(asset)
        ? "Asset saved, but hidden by current filters. Clear filters to view it."
        : "Asset saved and visible in Asset Library."
    );
  }
}

let assetLibraryState = {
  selectedCategory: "",
  searchQuery: "",
  visibleCount: 40,
};

function renderAssetLibraryPills() {
  const pillsContainer = DOM.assetLibraryPills;
  if (!pillsContainer) return;
  
  const allAssets = getAllAssetLibraryRows();
  const counts = {
    all: allAssets.length,
    background: 0,
    overlay: 0,
    template: 0,
  };
  
  allAssets.forEach((asset) => {
    const category = normalizeUploadedAssetCategory(asset.category);
    if (counts[category] !== undefined) {
      counts[category]++;
    }
  });
  
  const categories = [
    { key: "all", label: "All" },
    { key: "background", label: "Backgrounds" },
    { key: "overlay", label: "Overlays" },
    { key: "template", label: "Templates" },
  ];
  
  pillsContainer.innerHTML = "";
  categories.forEach((cat) => {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "asset-library-pill";
    const activeKey = assetLibraryState.selectedCategory || "all";
    if (activeKey === cat.key) {
      pill.classList.add("active");
    }
    pill.innerHTML = `${cat.label} <span class="asset-library-pill-count">${counts[cat.key] || 0}</span>`;
    pill.addEventListener("click", () => {
      assetLibraryState.selectedCategory = cat.key;
      assetLibraryState.visibleCount = 40;
      renderAssetLibraryPills();
      renderAssetLibrary();
    });
    pillsContainer.appendChild(pill);
  });
}

function renderAssetLibrary() {
  const grid = DOM.assetLibraryGrid;
  const status = DOM.assetLibraryStatus;
  if (!grid && !status) return;
  renderAssetLibraryPills();
  
  // Update search query from DOM
  if (DOM.assetLibrarySearch) {
    assetLibraryState.searchQuery = DOM.assetLibrarySearch.value.trim().toLowerCase();
  }
  
  // Get filtered and sorted assets
  const assets = getFilteredAssetLibraryRows();
  
  // Render grid
  if (grid) {
    grid.innerHTML = "";
    const visibleAssets = assets.slice(0, assetLibraryState.visibleCount);
    
    if (visibleAssets.length === 0) {
      const empty = document.createElement("div");
      empty.className = "asset-library-empty";
      empty.textContent = "No assets available.";
      grid.appendChild(empty);
    } else {
      visibleAssets.forEach((asset) => {
        const assetSrc = getAssetEntrySrc(asset);
        const effectiveAssetSet = getSessionEffectiveAssetSourceSet(asset.category);
        const isSelected = effectiveAssetSet.has(assetSrc);
        const card = document.createElement("div");
        card.className = "asset-library-card";
        card.classList.toggle("selected", isSelected);
        card.setAttribute("aria-selected", isSelected ? "true" : "false");
        card.setAttribute("role", "button");
        card.tabIndex = 0;
        card.addEventListener("click", () => toggleLibraryAsset(asset));
        card.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          toggleLibraryAsset(asset);
        });
        const img = document.createElement("img");
        img.src = withBust(assetSrc);
        img.alt = asset.name || asset.category;
        img.loading = "lazy";
        img.decoding = "async";
        img.onerror = () => renderMissingThumbnail(card, assetSrc);
        const name = document.createElement("div");
        name.className = "asset-library-name";
        name.title = `${asset.name}${asset.tags && asset.tags.length ? ` (${asset.tags.join(", ")})` : ""}`;
        name.textContent = getAssetDisplayName(asset);
        const meta = document.createElement("div");
        meta.className = "asset-library-meta";
        meta.textContent = [asset.category, getAssetCreatedAtLabel(asset)]
          .filter(Boolean)
          .join(" • ");
        const badges = document.createElement("div");
        badges.className = "asset-library-badges";
        if (isAssetLibraryFavorite(asset)) {
          const favoriteBadge = document.createElement("span");
          favoriteBadge.className = "asset-library-badge";
          favoriteBadge.textContent = "Favorite";
          badges.appendChild(favoriteBadge);
        }
        const actions = document.createElement("div");
        actions.className = "asset-library-actions";
        const favoriteBtn = document.createElement("button");
        favoriteBtn.type = "button";
        favoriteBtn.className = "asset-library-favorite";
        favoriteBtn.textContent = isAssetLibraryFavorite(asset)
          ? "Unfavorite"
          : "Favorite";
        favoriteBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          const isFavorite = toggleAssetLibraryFavorite(asset);
          renderAssetLibrary();
          showToast(isFavorite ? "Asset added to favorites." : "Asset removed from favorites.");
        });
        const renameBtn = document.createElement("button");
        renameBtn.type = "button";
        renameBtn.textContent = "Rename";
        renameBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          promptForAssetName(asset);
        });
        const tagsBtn = document.createElement("button");
        tagsBtn.type = "button";
        tagsBtn.textContent = "Tags";
        tagsBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          promptForAssetTags(asset);
        });
        const defaultsBtn = document.createElement("button");
        defaultsBtn.type = "button";
        defaultsBtn.textContent = "Theme defaults";
        defaultsBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          openAssetThemeDefaultsModal(asset);
        });
        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.textContent = "Delete";
        deleteBtn.className = "asset-library-delete";
        deleteBtn.addEventListener("click", async (event) => {
          event.stopPropagation();
          const defaultCount = getAssetThemeDefaultCount(asset);
          const warning = defaultCount
            ? "\n\nThis asset is used by theme defaults."
            : "";
          if (!confirm(`Remove this asset from the Asset Library?${warning}`)) return;
          await deleteAssetLibraryItem(asset.id, asset);
          showToast("Asset removed from Asset Library.");
        });
        actions.appendChild(favoriteBtn);
        actions.appendChild(renameBtn);
        actions.appendChild(tagsBtn);
        actions.appendChild(defaultsBtn);
        actions.appendChild(deleteBtn);
        card.appendChild(img);
        card.appendChild(name);
        card.appendChild(meta);
        if (badges.childNodes.length) card.appendChild(badges);
        card.appendChild(actions);
        grid.appendChild(card);
      });
      
      // Show More button
      if (assets.length > assetLibraryState.visibleCount) {
        const showMoreBtn = document.createElement("button");
        showMoreBtn.type = "button";
        showMoreBtn.className = "asset-library-show-more";
        showMoreBtn.textContent = `Show More (${assets.length - assetLibraryState.visibleCount} remaining)`;
        showMoreBtn.addEventListener("click", () => {
          assetLibraryState.visibleCount += 40;
          renderAssetLibrary();
        });
        grid.appendChild(showMoreBtn);
      }
    }
    grid.classList.toggle("has-selection", assets.some((asset) => {
      const assetSrc = getAssetEntrySrc(asset);
      const effectiveAssetSet = getSessionEffectiveAssetSourceSet(asset.category);
      return effectiveAssetSet.has(assetSrc);
    }));
  }
  if (status) {
    const total = getAllAssetLibraryRows().length;
    const filterLabels = [];
    if (assetLibraryState.selectedCategory && assetLibraryState.selectedCategory !== "all") {
      filterLabels.push(`Asset type: ${assetLibraryState.selectedCategory}`);
    }
    if (DOM.assetLibraryCategory && DOM.assetLibraryCategory.value) {
      const option = DOM.assetLibraryCategory.selectedOptions[0];
      filterLabels.push(`Category: ${(option && option.textContent) || DOM.assetLibraryCategory.value}`);
    }
    if (assetLibraryState.searchQuery) {
      filterLabels.push(`Search: ${assetLibraryState.searchQuery}`);
    }
    if (DOM.assetLibraryClearFilters)
      DOM.assetLibraryClearFilters.classList.toggle(
        "hidden",
        filterLabels.length === 0
      );
    status.textContent = total
      ? filterLabels.length
        ? `Showing ${assets.length} of ${total} assets. Filters active: ${filterLabels.join(", ")}`
        : `Showing ${assets.length} of ${total} assets`
      : "No assets available yet.";
  }
}

function toggleLibraryAsset(asset) {
  if (!asset) return;
  const src = getAssetEntrySrc(asset);
  const category = normalizeUploadedAssetCategory(asset.category);
  if (!src || !category) return;
  recordAssetLibraryRecent(asset);
  const effectiveAssetSet = getSessionEffectiveAssetSourceSet(category);
  const isSelected = effectiveAssetSet.has(src);
  const themeSources = getThemeAssetSourceSet(
    category,
    activeTheme || getSelectedThemeTarget()
  );
  if (isSelected) {
    removeSessionAssetBySrc(category, src);
  } else if (themeSources.has(src)) {
    clearSessionRemovedAsset(category, src);
  } else if (category === "background") {
    addSessionAssetUrl("backgrounds", src);
  } else if (category === "overlay") {
    addSessionAssetUrl("overlays", src);
  } else if (category === "template") {
    addSessionAssetUrl("templates", src);
  }
  const key = DOM.eventSelect && DOM.eventSelect.value;
  if (key) loadTheme(key);
  renderCurrentAssets(activeTheme || getSelectedThemeTarget());
  renderAssetLibrary();
  updateCreatePathAssetSummary();
  updateLaunchSummary();
  showToast(isSelected ? "Asset removed from this session" : "Asset added to this session");
}

// Upload an asset to a shared Cloudinary URL.
async function uploadAsset(file, kind, options = {}) {
  try {
    const index = getAssetIndex();
    const hash = await fileSha256Hex(file);
    const folder = (
      options.folder || getThemeAssetUploadFolderPath(kind)
    ).replace(/\/+$/g, "");
    const indexKey = buildAssetIndexKey({ hash, folder });
    if (index[indexKey]) {
      registerUploadedAsset(index[indexKey], kind, {
        name: file && file.name,
        hash,
        folder,
        contentType: file && file.type,
      });
      return index[indexKey];
    }
    const cfg = getCloudinaryConfig();
    if (!cfg.use || !cfg.cloud || !cfg.preset) return "";
    const form = new FormData();
    const fname = `${kind || "file"}-${hash}.${extFromName(
      file && file.name,
      "png"
    )}`;
    const wrapped = new File([file], fname, {
      type: file.type || "application/octet-stream",
    });
    form.append("file", wrapped);
    form.append("upload_preset", cfg.preset);
    form.append("folder", folder);
    const resp = await fetch(
      `https://api.cloudinary.com/v1_1/${cfg.cloud}/image/upload`,
      { method: "POST", body: form }
    );
    const json = await resp.json();
    if (json && json.secure_url) {
      index[indexKey] = json.secure_url;
      saveThemesToStorage();
      registerUploadedAsset(json.secure_url, kind, {
        name: file && file.name,
        hash,
        folder,
        contentType: file && file.type,
      });
      return json.secure_url;
    }
  } catch (_) {}
  showToast("Upload failed: configure Cloudinary to store assets.");
  return "";
}

function saveThemesToStorage() {
  // Normalize to avoid duplicates across overlays/templates, and strip empties
  ensureBuiltinThemes();
  if (!hasCoreBuiltins(themes)) {
    resetThemesToBuiltins("core themes missing before save");
  }
  try {
    normalizeAllThemes();
  } catch (_e) {}
  localStorage.setItem("photoboothThemes", JSON.stringify(themes));
  // Best-effort remote sync
  scheduleThemesRemoteSync();
}

function cloneThemeValue(val) {
  if (Array.isArray(val)) return val.map(cloneThemeValue);
  if (val && typeof val === "object") {
    const out = {};
    for (const key of Object.keys(val)) {
      out[key] = cloneThemeValue(val[key]);
    }
    return out;
  }
  return val;
}

function addMissingDefaults(target, source) {
  if (!source || typeof source !== "object") return;
  if (!target || typeof target !== "object") return;
  for (const key of Object.keys(source)) {
    const src = source[key];
    const tgt = target ? target[key] : undefined;
    if (Array.isArray(src)) {
      if (!Array.isArray(tgt) || tgt.length === 0) {
        target[key] = src.slice();
      }
    } else if (src && typeof src === "object") {
      if (!tgt || typeof tgt !== "object") {
        target[key] = cloneThemeValue(src);
      } else {
        addMissingDefaults(tgt, src);
      }
    } else {
      const needs =
        tgt === undefined ||
        tgt === null ||
        (typeof tgt === "string" && tgt.trim() === "");
      if (needs) {
        target[key] = src;
      }
    }
  }
}

function pruneMisplacedBuiltinThemes(target) {
  if (!target || typeof target !== "object") return;
  for (const rootKey of Object.keys(target)) {
    const group = target[rootKey];
    if (!group || typeof group !== "object") continue;
    if (BUILTIN_THEMES[rootKey] && BUILTIN_THEMES[rootKey].name) {
      group.name = BUILTIN_THEMES[rootKey].name;
    }
    for (const extraKey of Object.keys(group)) {
      if (!["name", "themes", "holidays"].includes(extraKey)) {
        delete group[extraKey];
      }
    }
    for (const bucket of ["themes", "holidays"]) {
      if (!group[bucket] || typeof group[bucket] !== "object") continue;
      for (const key of Object.keys(group[bucket])) {
        const loc = BUILTIN_THEME_LOCATIONS[key];
        if (loc && (loc.root !== rootKey || loc.bucket !== bucket)) {
          delete group[bucket][key];
        }
      }
    }
  }
}

function ensureBuiltinThemes() {
  if (!themes || typeof themes !== "object") themes = {};
  migrateLegacyBuiltinRootThemeDefaults();
  for (const rootKey of Object.keys(BUILTIN_THEMES)) {
    const builtinGroup = BUILTIN_THEMES[rootKey];
    if (!builtinGroup || typeof builtinGroup !== "object") continue;
    if (!themes[rootKey] || typeof themes[rootKey] !== "object") {
      themes[rootKey] = cloneThemeValue(builtinGroup);
      continue;
    }
    const targetGroup = themes[rootKey];
    // Ensure optgroup metadata like name exists
    addMissingDefaults(targetGroup, builtinGroup);
    for (const bucket of ["themes", "holidays"]) {
      if (!builtinGroup[bucket] || typeof builtinGroup[bucket] !== "object")
        continue;
      if (!targetGroup[bucket] || typeof targetGroup[bucket] !== "object") {
        targetGroup[bucket] = {};
      }
      const targetBucket = targetGroup[bucket];
      for (const subKey of Object.keys(builtinGroup[bucket])) {
        const builtinTheme = builtinGroup[bucket][subKey];
        if (!targetBucket[subKey] || typeof targetBucket[subKey] !== "object") {
          targetBucket[subKey] = cloneThemeValue(builtinTheme);
        } else {
          addMissingDefaults(targetBucket[subKey], builtinTheme);
        }
      }
    }
  }
  pruneMisplacedBuiltinThemes(themes);
}

function migrateLegacyBuiltinRootThemeDefaults() {
  for (const rootKey of Object.keys(BUILTIN_THEMES)) {
    const builtinGroup = BUILTIN_THEMES[rootKey];
    const storedGroup = themes[rootKey];
    if (!builtinGroup || !storedGroup || typeof storedGroup !== "object")
      continue;
    if (storedGroup.themes || storedGroup.holidays) continue;

    const bucket = builtinGroup.themes ? "themes" : builtinGroup.holidays ? "holidays" : "";
    const builtinChildren = bucket ? builtinGroup[bucket] : null;
    const leafKey = builtinChildren && Object.keys(builtinChildren)[0];
    if (!leafKey) continue;

    const defaultFields = [
      "backgrounds",
      "overlays",
      "templates",
      "backgroundsRemoved",
      "overlaysRemoved",
      "templatesRemoved",
    ];
    const savedDefaults = defaultFields.filter((field) =>
      Array.isArray(storedGroup[field])
    );
    if (!savedDefaults.length) continue;

    storedGroup[bucket] = storedGroup[bucket] || {};
    const target =
      storedGroup[bucket][leafKey] || cloneThemeValue(builtinChildren[leafKey]);
    savedDefaults.forEach((field) => {
      target[field] = cloneThemeValue(storedGroup[field]);
    });
    storedGroup[bucket][leafKey] = target;
  }
}

function hasCoreBuiltins(obj) {
  try {
    return !!(
      obj &&
      obj.general &&
      obj.general.themes &&
      obj.general.themes.birthday &&
      obj.fall &&
      obj.fall.holidays &&
      obj.fall.holidays.halloween
    );
  } catch (_) {
    return false;
  }
}

function resetThemesToBuiltins(reason) {
  console.warn("Resetting themes to built-ins:", reason || "unknown");
  themes = cloneThemeValue(BUILTIN_THEMES);
  try {
    localStorage.removeItem("photoboothThemes");
  } catch (_) {}
}

function mergePlainObject(baseObj, overrideObj) {
  const baseClone =
    baseObj && typeof baseObj === "object" && !Array.isArray(baseObj)
      ? cloneThemeValue(baseObj)
      : {};
  if (
    !overrideObj ||
    typeof overrideObj !== "object" ||
    Array.isArray(overrideObj)
  ) {
    if (Array.isArray(overrideObj)) return overrideObj.slice();
    return baseClone;
  }
  const out = baseClone || {};
  for (const key of Object.keys(overrideObj)) {
    const value = overrideObj[key];
    if (Array.isArray(value)) out[key] = value.slice();
    else if (value && typeof value === "object")
      out[key] = mergePlainObject(out[key], value);
    else out[key] = value;
  }
  return out;
}

const stringOrEmpty = (val) => (typeof val === "string" ? val.trim() : "");
const arrayFromMaybeList = (list) =>
  Array.isArray(list) ? list.filter(Boolean) : [];
const hasValues = (arr) => Array.isArray(arr) && arr.length > 0;

function applyThemeFallbacks(baseLeaf, merged, storedLeaf) {
  if (
    !baseLeaf ||
    typeof baseLeaf !== "object" ||
    !merged ||
    typeof merged !== "object"
  )
    return;
  applyBackgroundFallback(baseLeaf, merged, storedLeaf);
  applyTemplatesFallback(baseLeaf, merged, storedLeaf);
  applyOverlaysFallback(baseLeaf, merged, storedLeaf);
  applyArrayFallback(baseLeaf, merged, "backgroundsRemoved");
  applyArrayFallback(baseLeaf, merged, "overlaysRemoved");
  applyArrayFallback(baseLeaf, merged, "templatesRemoved");
  mergeWelcomeAndMeta(baseLeaf, merged);
}

function applyBackgroundFallback(baseLeaf, merged, storedLeaf) {
  const baseList = arrayFromMaybeList(baseLeaf.backgrounds);
  const baseSingle = stringOrEmpty(baseLeaf.background);
  const mergedList = arrayFromMaybeList(merged.backgrounds);
  const mergedSingle = stringOrEmpty(merged.background);
  const storedList = arrayFromMaybeList(storedLeaf && storedLeaf.backgrounds);
  const storedSingle = stringOrEmpty(storedLeaf && storedLeaf.background);
  const storedAllowsFallback =
    !storedLeaf || (!storedList.length && !storedSingle);

  if (!storedAllowsFallback) return;
  if (!baseList.length && !baseSingle) return;
  if (mergedList.length || mergedSingle) return;

  if (baseList.length) merged.backgrounds = baseList.slice();
  if (baseSingle) merged.background = baseLeaf.background;
  if (typeof baseLeaf.backgroundIndex === "number") {
    merged.backgroundIndex = baseLeaf.backgroundIndex;
  }
}

function applyTemplatesFallback(baseLeaf, merged, storedLeaf) {
  const storedFolder = stringOrEmpty(storedLeaf && storedLeaf.templatesFolder);
  const storedArrayExists = Array.isArray(storedLeaf && storedLeaf.templates);
  if (baseLeaf.templatesFolder && !merged.templatesFolder && !storedFolder) {
    merged.templatesFolder = baseLeaf.templatesFolder;
  }
  const baseTemplates = Array.isArray(baseLeaf.templates)
    ? baseLeaf.templates
    : null;
  const mergedTemplates = Array.isArray(merged.templates)
    ? merged.templates
    : null;
  if (
    baseTemplates &&
    baseTemplates.length &&
    (!mergedTemplates || mergedTemplates.length === 0) &&
    !storedArrayExists
  ) {
    merged.templates = baseTemplates.map((tpl) => mergePlainObject(tpl, {}));
  }
}

function applyOverlaysFallback(baseLeaf, merged, storedLeaf) {
  const storedFolder = stringOrEmpty(storedLeaf && storedLeaf.overlaysFolder);
  const storedArrayExists = Array.isArray(storedLeaf && storedLeaf.overlays);
  if (baseLeaf.overlaysFolder && !merged.overlaysFolder && !storedFolder) {
    merged.overlaysFolder = baseLeaf.overlaysFolder;
  }
  const baseOverlays = Array.isArray(baseLeaf.overlays)
    ? baseLeaf.overlays
    : null;
  const mergedOverlays = Array.isArray(merged.overlays)
    ? merged.overlays
    : null;
  if (
    baseOverlays &&
    baseOverlays.length &&
    (!mergedOverlays || mergedOverlays.length === 0) &&
    !storedArrayExists
  ) {
    merged.overlays = baseOverlays.slice();
  }
}

function applyArrayFallback(baseLeaf, merged, prop) {
  if (Array.isArray(baseLeaf[prop]) && !Array.isArray(merged[prop])) {
    merged[prop] = baseLeaf[prop].slice();
  }
}

function mergeWelcomeAndMeta(baseLeaf, merged) {
  if (baseLeaf.welcome)
    merged.welcome = mergePlainObject(baseLeaf.welcome, merged.welcome);
  if (baseLeaf.accent && !merged.accent) merged.accent = baseLeaf.accent;
  if (baseLeaf.accent2 && !merged.accent2) merged.accent2 = baseLeaf.accent2;
  if (baseLeaf.font && !merged.font) merged.font = baseLeaf.font;
  if (baseLeaf.fontHeading && !merged.fontHeading)
    merged.fontHeading = baseLeaf.fontHeading;
  if (baseLeaf.fontBody && !merged.fontBody)
    merged.fontBody = baseLeaf.fontBody;
}

function mergeThemeLeaf(baseLeaf, storedLeaf) {
  if (storedLeaf === null || storedLeaf === undefined) {
    return cloneThemeValue(baseLeaf);
  }
  if (Array.isArray(storedLeaf)) return storedLeaf.slice();
  if (typeof storedLeaf !== "object") return storedLeaf;
  const merged = mergePlainObject(baseLeaf, storedLeaf);
  applyThemeFallbacks(baseLeaf, merged, storedLeaf);
  return merged;
}

function fixBuiltinThemePlacements(target) {
  if (!target || typeof target !== "object") return;
  for (const rootKey of Object.keys(target)) {
    const group = target[rootKey];
    if (!group || typeof group !== "object") continue;
    for (const bucket of ["themes", "holidays"]) {
      const sub = group[bucket];
      if (!sub || typeof sub !== "object") continue;
      for (const subKey of Object.keys({ ...sub })) {
        const loc = BUILTIN_THEME_LOCATIONS[subKey];
        if (!loc || (loc.root === rootKey && loc.bucket === bucket)) continue;
        const currentTheme = sub[subKey];
        delete sub[subKey];
        if (!target[loc.root])
          target[loc.root] = cloneThemeValue(
            BUILTIN_THEMES[loc.root] || { name: loc.root }
          );
        if (!target[loc.root][loc.bucket]) target[loc.root][loc.bucket] = {};
        const base =
          BUILTIN_THEMES[loc.root] && BUILTIN_THEMES[loc.root][loc.bucket]
            ? BUILTIN_THEMES[loc.root][loc.bucket][subKey]
            : null;
        target[loc.root][loc.bucket][subKey] = mergeThemeLeaf(
          base,
          currentTheme
        );
      }
    }
  }
}

function mergeStoredThemes(base, stored) {
  if (
    !base ||
    typeof base !== "object" ||
    !stored ||
    typeof stored !== "object"
  )
    return;
  for (const key of Object.keys(stored)) {
    const storedGroup = stored[key];
    if (
      storedGroup &&
      typeof storedGroup === "object" &&
      !Array.isArray(storedGroup)
    ) {
      const bucketKey = storedGroup.themes
        ? "themes"
        : storedGroup.holidays
        ? "holidays"
        : null;
      const baseGroup = base[key];
      if (bucketKey) {
        if (!baseGroup || typeof baseGroup !== "object") {
          base[key] = cloneThemeValue(storedGroup);
          continue;
        }
        if (!baseGroup[bucketKey]) baseGroup[bucketKey] = {};
        const baseBucket = baseGroup[bucketKey];
        const storedBucket = storedGroup[bucketKey] || {};
        for (const subKey of Object.keys(storedBucket)) {
          baseBucket[subKey] = mergeThemeLeaf(
            baseBucket[subKey],
            storedBucket[subKey]
          );
        }
        for (const prop of Object.keys(storedGroup)) {
          if (prop === "themes" || prop === "holidays") continue;
          const val = storedGroup[prop];
          if (Array.isArray(val)) baseGroup[prop] = val.slice();
          else if (val && typeof val === "object")
            baseGroup[prop] = mergePlainObject(baseGroup[prop], val);
          else baseGroup[prop] = val;
        }
      } else {
        base[key] = mergeThemeLeaf(baseGroup, storedGroup);
      }
    } else {
      base[key] = cloneThemeValue(storedGroup);
    }
  }
}

function loadThemesFromStorage() {
  if (!hasCoreBuiltins(themes)) {
    resetThemesToBuiltins("missing core themes before storage merge");
  }
  const storedThemes = localStorage.getItem("photoboothThemes");
  if (storedThemes) {
    try {
      const parsed = JSON.parse(storedThemes);
      mergeStoredThemes(themes, parsed);
      fixBuiltinThemePlacements(themes);
      ensureBuiltinThemes();
      try {
        normalizeAllThemes();
      } catch (_e) {}
      if (!hasCoreBuiltins(themes)) {
        resetThemesToBuiltins("stored themes missing core entries");
      }
    } catch (err) {
      console.warn("Failed to parse stored themes", err);
    }
  }
  const globalLogo = getGlobalLogo();
  if (globalLogo !== null) applyGlobalLogoToAllThemes(globalLogo);
  // Attempt remote load and prefer remote if available
  loadThemesRemote().catch(() => {});
}

function openLayoutBuilder() {
  const url = new URL("./overlay-maker.html", window.location.href);
  const themeKey = (DOM.eventSelect && DOM.eventSelect.value) || "";
  if (themeKey) url.searchParams.set("themeKey", themeKey);
  window.open(url.toString(), "_blank", "noopener");
}

function loadEventsFromStorage() {
  populateEventProfileSelect(getActiveEventId());
  loadEventsRemote().catch(() => {});
}

// Folder import (device-only) helpers
async function handleOverlayFolderPick(e) {
  const key = getSelectedThemeKey();
  const target = getSelectedThemeTarget();
  if (!key || !target) {
    alert("Select a theme first.");
    e.target.value = "";
    return;
  }
  const files = Array.from(e.target.files || []).filter((f) =>
    /^image\//i.test(f.type)
  );
  if (!files.length) {
    e.target.value = "";
    return;
  }
  if (!Array.isArray(target.overlays)) target.overlays = [];
  const promises = files.map((f) =>
    uploadAsset(f, "overlays").then((u) => {
      if (u) target.overlays.push(u);
    })
  );
  await Promise.all(promises);
  try {
    normalizeThemeObject(target);
  } catch (_e) {}
  saveThemesToStorage();
  loadTheme(key);
  syncThemeEditorWithActiveTheme();
  showToast(`Imported ${files.length} overlays`);
  e.target.value = "";
}

async function handleTemplateFolderPick(e) {
  const key = getSelectedThemeKey();
  const target = getSelectedThemeTarget();
  if (!key || !target) {
    alert("Select a theme first.");
    e.target.value = "";
    return;
  }
  const files = Array.from(e.target.files || []).filter((f) =>
    /^image\//i.test(f.type)
  );
  if (!files.length) {
    e.target.value = "";
    return;
  }
  if (!Array.isArray(target.templates)) target.templates = [];
  const promises = files.map((f) =>
    uploadAsset(f, "templates").then((u) => {
      if (u) target.templates.push({ src: u, layout: "double_column" });
    })
  );
  await Promise.all(promises);
  try {
    normalizeThemeObject(target);
  } catch (_e) {}
  saveThemesToStorage();
  loadTheme(key);
  syncThemeEditorWithActiveTheme();
  showToast(`Imported ${files.length} templates`);
  e.target.value = "";
}

// --- Font Management ---
const FONT_FALLBACK_STACK =
  "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
const DEFAULT_FONT_PREVIEW = "Welcome to Fletch Photobooth";
let fontCatalog = { available: [], defaults: {}, pairings: [] };
const CUSTOM_PAIRINGS_STORAGE_KEY = "photoboothCustomPairings";
let baseFontPairings = [];
let customFontPairings = [];
let fontPickerInitialized = false;
let fontPickerSetupPromise = null;
let ignoreFontPickerEvents = false;
let quickPicksExpanded = false;

function normalizePairingField(value) {
  return (value || "").toString().trim();
}

function normalizePairingDef(def) {
  if (!def) return null;
  const heading = normalizePairingField(def.heading);
  const body = normalizePairingField(def.body);
  if (!heading || !body) return null;
  const normalized = { heading, body };
  const notes = normalizePairingField(def.notes);
  if (notes) normalized.notes = notes;
  const preview = normalizePairingField(def.preview);
  if (preview) normalized.preview = preview;
  return normalized;
}

function pairingKey(def) {
  return `${normalizePairingField(
    def.heading
  ).toLowerCase()}::${normalizePairingField(def.body).toLowerCase()}`;
}

function loadCustomFontPairings() {
  if (customFontPairings.length) return customFontPairings.slice();
  try {
    const raw = JSON.parse(
      localStorage.getItem(CUSTOM_PAIRINGS_STORAGE_KEY) || "[]"
    );
    if (Array.isArray(raw)) {
      customFontPairings = raw.map(normalizePairingDef).filter(Boolean);
    } else {
      customFontPairings = [];
    }
  } catch (_) {
    customFontPairings = [];
  }
  return customFontPairings.slice();
}

function saveCustomFontPairings(list) {
  customFontPairings = Array.isArray(list)
    ? list.map(normalizePairingDef).filter(Boolean)
    : [];
  try {
    localStorage.setItem(
      CUSTOM_PAIRINGS_STORAGE_KEY,
      JSON.stringify(customFontPairings)
    );
  } catch (_) {}
}

function mergeCustomPairingsIntoCatalog() {
  const base = Array.isArray(baseFontPairings) ? baseFontPairings.slice() : [];
  const extras = loadCustomFontPairings();
  const seen = new Set();
  const merged = [];
  base.forEach((pair) => {
    const normalized = normalizePairingDef(pair);
    if (!normalized) return;
    const key = pairingKey(normalized);
    if (seen.has(key)) return;
    seen.add(key);
    merged.push({ ...normalized, isCustom: false });
  });
  extras.forEach((pair) => {
    const normalized = normalizePairingDef(pair);
    if (!normalized) return;
    const key = pairingKey(normalized);
    if (seen.has(key)) return;
    seen.add(key);
    merged.push({ ...normalized, isCustom: true });
  });
  fontCatalog.pairings = merged;
}

function renderCustomPairingsList() {
  const wrap = DOM.customPairingsList;
  if (!wrap) return;
  const extras = loadCustomFontPairings();
  wrap.innerHTML = "";
  if (!extras.length) {
    const placeholder = document.createElement("div");
    placeholder.className = "custom-pairings-empty";
    placeholder.textContent = "No custom quick picks yet.";
    wrap.appendChild(placeholder);
    return;
  }
  extras.forEach((pair) => {
    const item = document.createElement("div");
    item.className = "custom-pairing-row";
    const label = document.createElement("div");
    label.className = "custom-pairing-label";
    const heading = normalizePairingField(pair.heading);
    const body = normalizePairingField(pair.body);
    const notes = normalizePairingField(pair.notes);
    label.textContent = notes
      ? `${heading} + ${body} — ${notes}`
      : `${heading} + ${body}`;
    const actions = document.createElement("div");
    actions.className = "custom-pairing-actions";
    const applyBtn = document.createElement("button");
    applyBtn.type = "button";
    applyBtn.textContent = "Apply";
    applyBtn.addEventListener("click", () => {
      const previewText =
        normalizePairingField(pair.preview) || findPairingPreview(pair);
      applyFontSelection(heading, body, {
        keepPairing: true,
        headingPreviewText: previewText,
        bodyPreviewText: getFontPreviewText(body),
      });
      showToast("Pairing applied");
    });
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "link-button";
    removeBtn.textContent = "Remove";
    removeBtn.dataset.removePairing = pairingKey(pair);
    actions.appendChild(applyBtn);
    actions.appendChild(removeBtn);
    item.appendChild(label);
    item.appendChild(actions);
    wrap.appendChild(item);
  });
}

function handleAddQuickPickPairing() {
  if (!DOM.addPairingHeading || !DOM.addPairingBody) return;
  const heading = normalizePairingField(DOM.addPairingHeading.value);
  const body = normalizePairingField(DOM.addPairingBody.value);
  if (!heading || !body) {
    alert("Enter both a heading and body font.");
    return;
  }
  const notes = normalizePairingField(
    DOM.addPairingNotes && DOM.addPairingNotes.value
  );
  const preview = normalizePairingField(
    DOM.addPairingPreview && DOM.addPairingPreview.value
  );
  const candidate = normalizePairingDef({ heading, body, notes, preview });
  if (!candidate) return;
  const current = loadCustomFontPairings();
  const key = pairingKey(candidate);
  if (current.some((pair) => pairingKey(pair) === key)) {
    alert("That pairing already exists.");
    return;
  }
  current.push(candidate);
  saveCustomFontPairings(current);
  ensureFontLoaded(candidate.heading, true);
  ensureFontLoaded(candidate.body, true);
  mergeCustomPairingsIntoCatalog();
  renderQuickPickButtons();
  renderCustomPairingsList();
  applyFontSelection(candidate.heading, candidate.body, {
    keepPairing: true,
    headingPreviewText: preview || findPairingPreview(candidate),
    bodyPreviewText: getFontPreviewText(candidate.body),
  });
  DOM.addPairingHeading.value = "";
  DOM.addPairingBody.value = "";
  if (DOM.addPairingNotes) DOM.addPairingNotes.value = "";
  if (DOM.addPairingPreview) DOM.addPairingPreview.value = "";
  showToast("Quick pick added");
}

function handleRemoveQuickPickPairing(key) {
  if (!key) return;
  const current = loadCustomFontPairings();
  const filtered = current.filter((pair) => pairingKey(pair) !== key);
  saveCustomFontPairings(filtered);
  mergeCustomPairingsIntoCatalog();
  renderQuickPickButtons();
  renderCustomPairingsList();
  showToast("Quick pick removed");
}

function setupCustomPairingControls() {
  if (DOM.quickPickForm) {
    DOM.quickPickForm.addEventListener("submit", (event) => {
      event.preventDefault();
      handleAddQuickPickPairing();
    });
  } else if (DOM.addPairingBtn) {
    DOM.addPairingBtn.addEventListener("click", handleAddQuickPickPairing);
  }
  if (DOM.customPairingsList) {
    DOM.customPairingsList.addEventListener("click", (event) => {
      const target =
        event.target instanceof HTMLElement
          ? event.target.closest("[data-remove-pairing]")
          : null;
      if (!target) return;
      const key = target.getAttribute("data-remove-pairing");
      if (key) handleRemoveQuickPickPairing(key);
    });
  }
  renderCustomPairingsList();
}

function getStoredFonts() {
  try {
    const raw = localStorage.getItem("photoboothFonts");
    const local = raw ? JSON.parse(raw) : [];
    // Fire-and-forget remote merge so new fonts sync to other devices
    if (!fontsRemoteRequested) {
      fontsRemoteRequested = true;
      loadFontsRemote()
        .then((remote) => {
          if (Array.isArray(remote) && remote.length) {
            const merged = mergeFonts(local, remote);
            localStorage.setItem("photoboothFonts", JSON.stringify(merged));
          }
        })
        .catch(() => {});
    }
    return local;
  } catch (e) {
    return [];
  }
}

function saveStoredFonts(fonts) {
  localStorage.setItem("photoboothFonts", JSON.stringify(fonts));
  scheduleFontsRemoteSync(fonts);
  queueFontPickerRefresh({ preserveSelection: true });
}

function queueFontPickerRefresh(options = {}) {
  if (!fontPickerInitialized) return;
  reloadFontPickerOptions(options).catch(() => {});
}

function slugifyFontName(name) {
  return (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function composeFontString(family) {
  if (!family) return "";
  return `'${family}', ${FONT_FALLBACK_STACK}`;
}

function primaryFontFamily(fontStr) {
  if (!fontStr) return "";
  const m = fontStr.match(/'([^']+)'/);
  if (m) return m[1];
  return fontStr.split(",")[0].trim();
}

function ensureFontLoadedForFontString(fontStr) {
  const fam = primaryFontFamily(fontStr);
  if (fam) ensureFontLoaded(fam, true);
}

function ensureFontLoaded(family, storeIfNew = false) {
  const fam = (family || "").replace(/^['"]|['"]$/g, "").trim();
  if (!fam) return;
  const id = "gf-" + slugifyFontName(fam);
  if (!document.getElementById(id)) {
    const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
      fam
    ).replace(/%20/g, "+")}&display=swap`;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }
  if (storeIfNew) {
    const fonts = getStoredFonts();
    if (
      !fonts.find(
        (f) =>
          f.type === "family" && f.value.toLowerCase() === fam.toLowerCase()
      )
    ) {
      fonts.push({ type: "family", value: fam });
      saveStoredFonts(fonts);
      updateFontSuggestions();
      renderCurrentFonts();
    }
  }
}

function addFontByFamily() {
  const fam = ((DOM.addFontFamily && DOM.addFontFamily.value) || "")
    .replace(/^['"]|['"]$/g, "")
    .trim();
  if (!fam) {
    alert("Enter a font family name.");
    return;
  }
  ensureFontLoaded(fam, true);
  alert(`Added Google Font: ${fam}`);
}

function addFontByUrl() {
  const url = ((DOM.addFontUrl && DOM.addFontUrl.value) || "").trim();
  if (!url) {
    alert("Paste a Google Fonts CSS URL.");
    return;
  }
  try {
    new URL(url);
  } catch (e) {
    alert("Invalid URL.");
    return;
  }
  const id = "gf-url-" + btoa(url).replace(/=/g, "");
  if (!document.getElementById(id)) {
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = url;
    document.head.appendChild(link);
  }
  const fonts = getStoredFonts();
  if (!fonts.find((f) => f.type === "url" && f.value === url)) {
    let famLabel = "";
    try {
      const u = new URL(url);
      const fam = u.searchParams.get("family");
      famLabel = fam ? fam.split(":")[0].replace(/\+/g, " ") : "";
    } catch (_e) {}
    fonts.push({ type: "url", value: url, label: famLabel });
    saveStoredFonts(fonts);
  }
  updateFontSuggestions();
  renderCurrentFonts();
  alert("Font URL added.");
}

function updateFontSuggestions() {
  const dl = document.getElementById("fontSuggestions");
  if (!dl) return;
  dl.innerHTML = "";
  const suggestions = new Set([
    "Comic Neue",
    "Creepster",
    "Inter",
    "Montserrat",
  ]);
  const fonts = getStoredFonts();
  fonts.forEach((f) => {
    const fam = f.type === "family" ? f.value : (f.label || "").trim();
    if (fam) suggestions.add(fam);
  });
  if (Array.isArray(fontCatalog.available)) {
    fontCatalog.available.forEach((font) => {
      if (font && font.name) suggestions.add(font.name);
    });
  }
  Array.from(suggestions)
    .sort((a, b) => a.localeCompare(b))
    .forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      dl.appendChild(opt);
    });
}

function renderCurrentFonts() {
  if (!DOM.currentFonts) return;
  const fonts = getStoredFonts();
  if (fonts.length === 0) {
    DOM.currentFonts.textContent = "No added fonts yet.";
    return;
  }
  const parts = fonts.map((f) =>
    f.type === "family" ? f.value : f.label || "Custom URL"
  );
  DOM.currentFonts.textContent = `Available fonts: ${parts.join(", ")}`;
}

function loadFontsFromStorage() {
  const fonts = getStoredFonts();
  fonts.forEach((f) => {
    if (f.type === "family") ensureFontLoaded(f.value, false);
    if (f.type === "url") {
      const id = "gf-url-" + btoa(f.value).replace(/=/g, "");
      if (!document.getElementById(id)) {
        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = f.value;
        document.head.appendChild(link);
      }
    }
  });
  updateFontSuggestions();
  renderCurrentFonts();
  if (fontPickerInitialized) {
    queueFontPickerRefresh({ preserveSelection: true });
  }
}

function injectStylesheetOnce(href) {
  if (!href) return;
  const existing = Array.from(
    document.querySelectorAll('link[rel="stylesheet"]')
  );
  if (existing.some((l) => l instanceof HTMLLinkElement && l.href === href))
    return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

function getFontPreviewText(name) {
  if (!name) return DEFAULT_FONT_PREVIEW;
  const match = (
    Array.isArray(fontCatalog.available) ? fontCatalog.available : []
  ).find((f) => f && f.name && f.name.toLowerCase() === name.toLowerCase());
  return (match && match.preview) || DEFAULT_FONT_PREVIEW;
}

function getFontPreviewFamily(name) {
  return getFontPreviewText(name);
}

function findPairingPreview(pairing, fonts = fontCatalog.available) {
  if (!pairing) return DEFAULT_FONT_PREVIEW;
  if (pairing.preview) return pairing.preview;
  const heading = pairing.heading;
  if (heading && Array.isArray(fonts)) {
    const normalized = normalizeFontFamilyName(heading);
    const match = fonts.find(
      (font) =>
        font && normalizeFontFamilyName(font.name || font.value) === normalized
    );
    if (match && match.preview) return match.preview;
  }
  return getFontPreviewText(heading);
}

function populateFontPickerOptions(fonts) {
  const list = Array.isArray(fonts) ? fonts : [];
  renderSessionFontOptions();
  const selects = [
    DOM.headingFontSelect,
    DOM.bodyFontSelect,
    DOM.editorHeadingFontSelect,
    DOM.editorBodyFontSelect,
  ];
  selects.forEach((sel) => {
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = "";
    list.forEach((font) => {
      if (!font || !font.name) return;
      const opt = document.createElement("option");
      opt.value = font.name;
      opt.textContent = font.name;
      opt.style.fontFamily = composeFontString(font.name);
      sel.appendChild(opt);
    });
    if (current) {
      ensureOptionExists(sel, current);
      sel.value = current;
    }
  });
  syncSessionFontSearch();
}

function ensureOptionExists(select, family) {
  if (!select || !family) return;
  const exists = Array.from(select.options).some(
    (opt) => opt.value.toLowerCase() === family.toLowerCase()
  );
  if (!exists) {
    const opt = document.createElement("option");
    opt.value = family;
    opt.textContent = family;
    opt.style.fontFamily = composeFontString(family);
    select.appendChild(opt);
  }
}

function getFontPickerSelection() {
  return {
    heading: DOM.headingFontSelect ? DOM.headingFontSelect.value : "",
    body: DOM.bodyFontSelect ? DOM.bodyFontSelect.value : "",
  };
}

function updateFontPreviewElements(heading, body, options = {}) {
  const welcomeText = resolveWelcomeTitle();
  const startText = resolveStartButtonText();
  const bannerText = resolveBannerText();
  const headingText =
    options.headingPreviewText ||
    welcomeText ||
    bannerText ||
    getFontPreviewText(heading);
  const bodyText =
    options.bodyPreviewText ||
    startText ||
    bannerText ||
    getFontPreviewText(body);
  const applyPreview = (node, family, text) => {
    if (!node) return;
    node.style.fontFamily = composeFontString(family || "");
    const textNode = node.querySelector(".font-preview-text");
    if (textNode) {
      textNode.textContent = text;
    } else {
      node.textContent = text;
    }
  };
  [DOM.headingFontPreview, DOM.editorHeadingFontPreview].forEach((node) =>
    applyPreview(node, heading, headingText)
  );
  [DOM.bodyFontPreview, DOM.editorBodyFontPreview].forEach((node) =>
    applyPreview(node, body, bodyText)
  );
}

function setFontPickerSelection(heading, body, options = {}) {
  ignoreFontPickerEvents = true;
  [DOM.headingFontSelect, DOM.editorHeadingFontSelect].forEach((select) => {
    if (!select || !heading) return;
    ensureOptionExists(select, heading);
    select.value = heading;
  });
  [DOM.bodyFontSelect, DOM.editorBodyFontSelect].forEach((select) => {
    if (!select || !body) return;
    ensureOptionExists(select, body);
    select.value = body;
  });
  ignoreFontPickerEvents = false;
  updateFontPreviewElements(heading, body, options);
  if (!options.keepPairing) {
    if (DOM.fontPairingSelect) DOM.fontPairingSelect.value = "";
    if (DOM.editorFontPairingSelect) DOM.editorFontPairingSelect.value = "";
  }
}

function applyFontsToActiveTheme(headingName, bodyName, options = {}) {
  const target = getSelectedThemeTarget();
  if (!target) return;
  const heading =
    headingName || primaryFontFamily(target.fontHeading || target.font || "");
  const body =
    bodyName || primaryFontFamily(target.fontBody || target.font || "");
  if (heading) ensureFontLoaded(heading, false);
  if (body) ensureFontLoaded(body, false);
  if (heading) target.fontHeading = composeFontString(heading);
  else delete target.fontHeading;
  if (body) target.fontBody = composeFontString(body);
  else delete target.fontBody;
  target.font = composeFontString(body || heading || "Comic Neue");
  if (activeTheme === target) {
    applyThemeFontStyles(target);
    renderCurrentAssets(target);
  }
  saveThemesToStorage();
  if (!options.quiet) showToast("Fonts updated");
  syncThemeEditorSummary();
}

function applyFontSelection(heading, body, options = {}) {
  if (!heading && !body) return;
  setFontPickerSelection(heading, body, options);
  applyFontsToActiveTheme(heading, body, options);
}

function refreshFontPickerUI(theme, options = {}) {
  const defaults = fontCatalog.defaults || {};
  const fallback =
    fontCatalog.available && fontCatalog.available.length
      ? fontCatalog.available[0].name
      : "";
  const heading =
    options.heading ||
    primaryFontFamily((theme && (theme.fontHeading || theme.font)) || "") ||
    defaults.heading ||
    fallback ||
    "";
  const body =
    options.body ||
    primaryFontFamily((theme && (theme.fontBody || theme.font)) || "") ||
    defaults.body ||
    heading ||
    fallback ||
    "";
  setFontPickerSelection(heading, body, { keepPairing: true });
  syncSessionFontSearch();
}

function syncSessionFontSearch() {
  const theme = activeTheme || getSelectedThemeTarget() || {};
  const heading = primaryFontFamily(theme.fontHeading || theme.font || "");
  const body = primaryFontFamily(theme.fontBody || theme.font || "") || heading;
  const label =
    heading && body && heading === body
      ? heading
      : heading && body
      ? `${heading} + ${body}`
      : heading || body || "";
  if (DOM.sessionFontValue) DOM.sessionFontValue.textContent = label || "Choose font";
  if (DOM.sessionFontSearch) DOM.sessionFontSearch.value = "";
  renderSessionFontOptions();
}

function getSessionFontOptions(filter = "") {
  const needle = String(filter || "").trim().toLowerCase();
  return (fontCatalog.available || []).filter((font) => {
    if (!font || !font.name) return false;
    if (!needle) return true;
    return String(font.name || "").toLowerCase().includes(needle);
  });
}

function renderSessionFontOptions(filter = "") {
  if (!DOM.sessionFontOptions) return;
  DOM.sessionFontOptions.innerHTML = "";
  const theme = activeTheme || getSelectedThemeTarget() || {};
  const selected = primaryFontFamily(theme.fontHeading || theme.font || "");
  const options = getSessionFontOptions(filter);
  options.forEach((font) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "setup-combobox-option";
    item.textContent = font.name;
    item.dataset.fontName = font.name;
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", font.name === selected ? "true" : "false");
    item.addEventListener("click", () => activateFontFromSetupFamily(font.name));
    DOM.sessionFontOptions.appendChild(item);
  });
  if (!options.length) {
    const empty = document.createElement("div");
    empty.className = "setup-combobox-empty";
    empty.textContent = "No fonts found";
    DOM.sessionFontOptions.appendChild(empty);
  }
}

function activateFontFromSetupFamily(family) {
  if (!family) return;
  applyFontSelection(family, family, { keepPairing: true });
  updateLaunchSummary();
  syncSessionFontSearch();
  closeSetupCombobox("font");
}

function activateFontFromSetupSearch() {
  if (!DOM.sessionFontSearch) return;
  const value = DOM.sessionFontSearch.value.trim();
  if (!value) return;
  const normalized = value.toLowerCase();
  const match = (fontCatalog.available || []).find(
    (font) => font && String(font.name || "").toLowerCase() === normalized
  );
  const family = match ? match.name : value;
  activateFontFromSetupFamily(family);
}

function updateQuickPickExpansion() {
  const wrap = DOM.quickPicks;
  if (!wrap) return;
  wrap.classList.toggle("expanded", quickPicksExpanded);
  if (DOM.quickPicksToggle) {
    DOM.quickPicksToggle.textContent = quickPicksExpanded
      ? "show less"
      : "show all";
  }
}

function toggleQuickPicks() {
  quickPicksExpanded = !quickPicksExpanded;
  updateQuickPickExpansion();
}

function renderQuickPickButtons() {
  const wrap = DOM.quickPicks;
  if (!wrap) return;
  wrap.innerHTML = "";
  const pairings = Array.isArray(fontCatalog.pairings)
    ? fontCatalog.pairings.slice()
    : [];
  if (DOM.quickPicksToggle) DOM.quickPicksToggle.style.display = "none";
  if (!pairings.length) return;
  const seasonalWords = [
    "Christmas",
    "Holiday",
    "Spooky",
    "Valentine",
    "Easter",
    "New Year",
  ];
  pairings.sort((a, b) => {
    if (a.isCustom && !b.isCustom) return -1;
    if (!a.isCustom && b.isCustom) return 1;
    const aSeason =
      a.preview && seasonalWords.some((w) => a.preview.includes(w));
    const bSeason =
      b.preview && seasonalWords.some((w) => b.preview.includes(w));
    if (aSeason === bSeason) return 0;
    return aSeason ? -1 : 1;
  });
  pairings.forEach((pair) => {
    const heading = pair.heading;
    const body = pair.body;
    const card = document.createElement("button");
    card.type = "button";
    card.className = `quick-pick-card${
      pair.isCustom ? " quick-pick-card-custom" : ""
    }`;
    const previewText = findPairingPreview(pair);
    card.innerHTML = `
      <div class="quick-pick-label${
        pair.isCustom ? " quick-pick-label-custom" : ""
      }">${pair.isCustom ? "Custom quick pick" : "Quick pick"}</div>
      <div class="quick-pick-title">${heading} + ${body}${
      pair.notes ? ` — ${pair.notes}` : ""
    }</div>
      <div class="quick-pick-preview" style="font-family: ${composeFontString(
        heading
      )};">${previewText}</div>
    `;
    card.addEventListener("click", () => {
      applyFontSelection(heading, body, {
        keepPairing: true,
        headingPreviewText: previewText,
        bodyPreviewText: getFontPreviewText(body),
      });
    });
    wrap.appendChild(card);
  });
  updateQuickPickExpansion();
}

function getPairingCategory(pair) {
  const text = `${pair.notes || ""} ${pair.preview || ""}`.toLowerCase();
  if (text.includes("christmas") || text.includes("holiday"))
    return "Christmas";
  if (text.includes("new year")) return "New Year";
  if (text.includes("halloween") || text.includes("spooky")) return "Halloween";
  if (text.includes("valentine")) return "Valentine's";
  if (text.includes("graduation") || text.includes("grad")) return "Graduation";
  if (text.includes("birthday")) return "Birthday";
  if (text.includes("wedding") || text.includes("romantic")) return "Weddings";
  return "General";
}

function renderGroupedQuickPicks() {
  const wrap = DOM.quickPicksGrouped;
  if (!wrap) return;
  wrap.innerHTML = "";
  const pairings = Array.isArray(fontCatalog.pairings)
    ? fontCatalog.pairings.slice()
    : [];
  if (!pairings.length) {
    const note = document.createElement("div");
    note.style.fontSize = "0.9em";
    note.style.opacity = "0.7";
    note.textContent = "No quick picks configured yet.";
    wrap.appendChild(note);
    return;
  }
  const groups = new Map();
  pairings.forEach((pair) => {
    const cat = getPairingCategory(pair);
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(pair);
  });
  const order = [
    "Christmas",
    "New Year",
    "Halloween",
    "Valentine's",
    "Graduation",
    "Birthday",
    "Weddings",
    "General",
  ];
  order.forEach((cat) => {
    const list = groups.get(cat);
    if (!list || !list.length) return;
    const group = document.createElement("div");
    group.className = "quick-pick-group";
    const title = document.createElement("div");
    title.className = "quick-pick-group-title";
    title.textContent = cat;
    const grid = document.createElement("div");
    grid.className = "quick-pick-group-grid";
    list.forEach((pair) => {
      const heading = pair.heading;
      const body = pair.body;
      const card = document.createElement("button");
      card.type = "button";
      card.className = `quick-pick-card${
        pair.isCustom ? " quick-pick-card-custom" : ""
      }`;
      const previewText = findPairingPreview(pair);
      card.innerHTML = `
        <div class="quick-pick-label${
          pair.isCustom ? " quick-pick-label-custom" : ""
        }">${pair.isCustom ? "Custom quick pick" : "Quick pick"}</div>
        <div class="quick-pick-title">${heading} + ${body}${
        pair.notes ? ` — ${pair.notes}` : ""
      }</div>
        <div class="quick-pick-preview" style="font-family: ${composeFontString(
          heading
        )};">${previewText}</div>
      `;
      card.addEventListener("click", () => {
        applyFontSelection(heading, body, {
          keepPairing: true,
          headingPreviewText: previewText,
          bodyPreviewText: getFontPreviewText(body),
        });
      });
      grid.appendChild(card);
    });
    group.appendChild(title);
    group.appendChild(grid);
    wrap.appendChild(group);
  });
}

async function reloadFontPickerOptions(options = {}) {
  if (!DOM.headingFontSelect || !DOM.bodyFontSelect) return;
  const preserveSelection = !!options.preserveSelection;
  const previous = preserveSelection ? getFontPickerSelection() : null;
  let base = { available: [], defaults: {}, pairings: [] };
  const manifestCandidates = ["fonts.json", "./fonts.json", "/fonts.json"];
  for (const candidate of manifestCandidates) {
    try {
      const res = await fetch(candidate, { cache: "no-store" });
      if (res && res.ok) {
        base = await res.json();
        break;
      }
    } catch (e) {
      console.warn("Failed to load fonts manifest from", candidate, e);
    }
  }
  const stored = getStoredFonts();
  const extras = stored
    .filter((f) => f && f.type === "family" && f.value)
    .map((f) => ({
      name: f.value,
      weights: [400],
      ital: false,
      preview: DEFAULT_FONT_PREVIEW,
    }));
  const merged = [];
  const seen = new Set();
  [...(Array.isArray(base.available) ? base.available : []), ...extras].forEach(
    (font) => {
      if (!font || !font.name) return;
      const key = font.name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      merged.push({
        name: font.name,
        weights:
          Array.isArray(font.weights) && font.weights.length
            ? font.weights
            : [400],
        ital: !!font.ital,
        preview: font.preview || DEFAULT_FONT_PREVIEW,
      });
    }
  );
  fontCatalog = {
    available: merged,
    defaults: base.defaults || {},
    pairings: Array.isArray(base.pairings) ? base.pairings.slice() : [],
  };
  baseFontPairings = Array.isArray(fontCatalog.pairings)
    ? fontCatalog.pairings.slice()
    : [];
  mergeCustomPairingsIntoCatalog();
  const href = buildGoogleFontsURL(fontCatalog.available);
  if (href) injectStylesheetOnce(href);
  populateFontPickerOptions(fontCatalog.available);
  renderQuickPickButtons();
  renderGroupedQuickPicks();
  renderCustomPairingsList();
  if (previous && previous.heading)
    ensureOptionExists(DOM.headingFontSelect, previous.heading);
  if (previous && previous.body)
    ensureOptionExists(DOM.bodyFontSelect, previous.body);
  const targetTheme = activeTheme || getSelectedThemeTarget();
  if (previous && preserveSelection) {
    setFontPickerSelection(previous.heading, previous.body, {
      keepPairing: true,
    });
  } else {
    refreshFontPickerUI(targetTheme, { quiet: true });
  }
  updateEventTypeSetupUI();
}

function attachFontPickerListeners() {
  const openSelect = (select) => {
    if (!select) return;
    if (typeof select.showPicker === "function") {
      select.showPicker();
      return;
    }
    select.focus();
    select.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    select.click();
  };
  if (DOM.headingFontSelect) {
    DOM.headingFontSelect.addEventListener("change", () => {
      if (ignoreFontPickerEvents) return;
      const heading = DOM.headingFontSelect.value;
      const body =
        DOM.bodyFontSelect && DOM.bodyFontSelect.value
          ? DOM.bodyFontSelect.value
          : heading;
      applyFontSelection(heading, body, { keepPairing: false });
    });
  }
  if (DOM.bodyFontSelect) {
    DOM.bodyFontSelect.addEventListener("change", () => {
      if (ignoreFontPickerEvents) return;
      const body = DOM.bodyFontSelect.value;
      const heading =
        DOM.headingFontSelect && DOM.headingFontSelect.value
          ? DOM.headingFontSelect.value
          : body;
      applyFontSelection(heading, body, { keepPairing: false });
    });
  }
  if (DOM.headingFontPreview) {
    DOM.headingFontPreview.addEventListener("click", () =>
      openSelect(DOM.headingFontSelect)
    );
  }
  if (DOM.bodyFontPreview) {
    DOM.bodyFontPreview.addEventListener("click", () =>
      openSelect(DOM.bodyFontSelect)
    );
  }
  if (DOM.fontPairingSelect) {
    DOM.fontPairingSelect.addEventListener("change", () => {
      if (ignoreFontPickerEvents) return;
      const value = DOM.fontPairingSelect.value;
      if (!value) return;
      const [heading, body] = value.split("|");
      const pairing = (fontCatalog.pairings || []).find(
        (p) => p.heading === heading && p.body === body
      );
      applyFontSelection(heading, body, {
        keepPairing: true,
        headingPreviewText: findPairingPreview(pairing),
        bodyPreviewText: getFontPreviewText(body),
      });
    });
  }
  if (DOM.quickPicksToggle) {
    DOM.quickPicksToggle.addEventListener("click", toggleQuickPicks);
  }
}

async function setupFontPicker() {
  if (!DOM.headingFontSelect || !DOM.bodyFontSelect) return;
  if (!fontPickerSetupPromise) {
    fontPickerSetupPromise = (async () => {
      attachFontPickerListeners();
      await reloadFontPickerOptions({ preserveSelection: false });
      fontPickerInitialized = true;
    })();
  } else if (fontPickerInitialized) {
    await reloadFontPickerOptions({ preserveSelection: true });
  }
  return fontPickerSetupPromise;
}

function populateFontSelect(preselectFamily = "") {
  setupFontPicker()
    .then(() => {
      const theme = activeTheme || getSelectedThemeTarget() || {};
      if (preselectFamily) {
        refreshFontPickerUI(theme, {
          heading: preselectFamily,
          body: preselectFamily,
        });
      } else {
        refreshFontPickerUI(theme, {});
      }
    })
    .catch(() => {});
}

function setThemeEditorMode(mode) {
  let resolved =
    mode ||
    (DOM.themeEditorModeSelect ? DOM.themeEditorModeSelect.value : "edit");
  if (resolved === "clone") resolved = "edit";
  if (DOM.themeEditorModeSelect) DOM.themeEditorModeSelect.value = resolved;
  const isCreate = resolved === "create";

  if (DOM.btnUpdateTheme)
    DOM.btnUpdateTheme.style.display = isCreate ? "none" : "inline-block";
  if (DOM.btnSaveTheme)
    DOM.btnSaveTheme.style.display = isCreate ? "inline-block" : "none";
  if (DOM.themeCloneSection) DOM.themeCloneSection.classList.add("hidden");
  if (DOM.themeCloneName) DOM.themeCloneName.value = "";

  if (isCreate) {
    resetCreateThemeModal();
    showCreateThemeModal();
    if (DOM.themeName) DOM.themeName.value = "";
    if (DOM.themeWelcomeTitle) DOM.themeWelcomeTitle.value = "";
    if (DOM.themeWelcomePrompt) DOM.themeWelcomePrompt.value = "";
    clearThemeFileInputs();
    if (DOM.summaryBackground) DOM.summaryBackground.textContent = "";
    if (DOM.summaryLogo) DOM.summaryLogo.textContent = "";
    if (DOM.summaryOverlays) DOM.summaryOverlays.textContent = "";
    if (DOM.summaryTemplates) DOM.summaryTemplates.textContent = "";
    if (DOM.themeAccent) DOM.themeAccent.value = "#ff0000";
    if (DOM.themeAccent2) DOM.themeAccent2.value = "#ffffff";
    setupFontPicker()
      .then(() => {
        const defaults =
          fontCatalog && fontCatalog.defaults ? fontCatalog.defaults : {};
        const heading = defaults.heading || "Montserrat";
        const body = defaults.body || "Inter";
        refreshFontPickerUI({}, { heading, body });
      })
      .catch(() => {});
  } else {
    hideCreateThemeModal();
    resetCreateThemeModal();
    syncThemeEditorWithActiveTheme();
  }
  updateThemeEditorSummary();
}

const DEFAULT_FONTS_PAYLOAD = {
  available: [
    {
      name: "Comic Neue",
      weights: [400, 700],
      preview: "Welcome to the celebration!",
    },
    { name: "Creepster", weights: [400], preview: "Spooky season starts now!" },
    {
      name: "Nosifer",
      weights: [400],
      preview: "Dripping thrills at Fletch Photobooth!",
    },
    {
      name: "Montserrat",
      weights: [400, 600, 700],
      preview: "Modern, clean, and easy to read.",
    },
    {
      name: "Inter",
      weights: [400, 600, 700],
      preview: "Friendly and versatile for body copy.",
    },
    {
      name: "Source Sans 3",
      weights: [400, 600],
      preview: "Reliable for long-form event details.",
    },
    {
      name: "Playfair Display",
      weights: [400, 600],
      preview: "Elegant serif headlines for upscale events.",
    },
    {
      name: "Raleway",
      weights: [400, 600],
      preview: "Sophisticated sans with personality.",
    },
    {
      name: "Lora",
      weights: [400, 600],
      preview: "Warm serif that stays readable.",
    },
    {
      name: "Oswald",
      weights: [400, 600],
      preview: "Tall, bold titles that grab attention.",
    },
    {
      name: "Poppins",
      weights: [400, 600],
      preview: "Rounded geometric for friendly events.",
    },
    {
      name: "Lato",
      weights: [400, 700],
      preview: "Balanced body font for signage.",
    },
    {
      name: "Bangers",
      weights: [400],
      preview: "Let's make some noise tonight!",
    },
    { name: "Great Vibes", weights: [400], preview: "Love is in the air." },
    {
      name: "Dancing Script",
      weights: [400, 700],
      preview: "Handwritten flair for celebrations.",
    },
    {
      name: "Mountains of Christmas",
      weights: [400, 700],
      preview: "Merry Christmas from Fletch Photobooth 🎄",
    },
    {
      name: "Roboto",
      weights: [400, 500, 700],
      preview: "Ultra clear and neutral.",
    },
    {
      name: "Open Sans",
      weights: [400, 600, 700],
      preview: "Highly legible on dark UIs.",
    },
    {
      name: "Abril Fatface",
      weights: [400],
      preview: "Glam display for chic events.",
    },
    {
      name: "Crimson Text",
      weights: [400, 600, 700],
      preview: "Classic bookish elegance.",
    },
    {
      name: "Work Sans",
      weights: [400, 600, 700],
      preview: "Modern, friendly workhorse.",
    },
    {
      name: "Sniglet",
      weights: [400, 800],
      preview: "Round and playful for kids.",
    },
    {
      name: "Cabin",
      weights: [400, 600, 700],
      preview: "Warm, readable companion.",
    },
  ],
  defaults: {
    heading: "Comic Neue",
    body: "Montserrat",
  },
  pairings: [
    {
      heading: "Montserrat",
      body: "Inter",
      notes: "Modern Minimalist",
      preview: "Modern & clean for any celebration.",
      styles: ["general", "expo"],
    },
    {
      heading: "Roboto",
      body: "Open Sans",
      notes: "Ultra Readable",
      preview: "Crystal-clear on dark backgrounds.",
      styles: ["general", "expo", "community"],
    },
    {
      heading: "Raleway",
      body: "Open Sans",
      notes: "Minimal Harmony",
      preview: "Sleek look for promos & tech.",
      styles: ["expo"],
    },
    {
      heading: "Playfair Display",
      body: "Source Sans 3",
      notes: "Timeless Elegance (Weddings/Formal)",
      preview: "A timeless moment captured by Fletch Photo.",
      styles: ["wedding"],
    },
    {
      heading: "Great Vibes",
      body: "Montserrat",
      notes: "Romantic Flow (Valentine’s/Weddings)",
      preview: "Love is in the air at Fletch Photo.",
      styles: ["wedding"],
    },
    {
      heading: "Abril Fatface",
      body: "Lato",
      notes: "Chic Impact (Gala/NYE)",
      preview: "Ring in the New Year with style ✨",
      styles: ["wedding", "newyear"],
    },
    {
      heading: "Great Vibes",
      body: "Lora",
      notes: "Romantic Elegance (Weddings)",
      preview: "Happily ever after starts here.",
      styles: ["wedding"],
    },
    {
      heading: "Oswald",
      body: "Inter",
      notes: "Grad Glory (Graduation)",
      preview: "Congrats, Grad! 🎓",
      styles: ["community"],
    },
    {
      heading: "Dancing Script",
      body: "Poppins",
      notes: "Joyful Moments (Birthdays/Family)",
      preview: "Happy Birthday from Fletch Photobooth!",
      styles: ["birthday", "community"],
    },
    {
      heading: "Bangers",
      body: "Montserrat",
      notes: "Comic Energy (Kids/Spirit)",
      preview: "Let’s make some noise tonight!",
      styles: ["birthday", "community"],
    },
    {
      heading: "Sniglet",
      body: "Cabin",
      notes: "Playtime Fun (Kids)",
      preview: "Let’s celebrate with Fletch Photobooth!",
      styles: ["birthday", "community"],
    },
    {
      heading: "Oswald",
      body: "Montserrat",
      notes: "Bold Statement (Sports/Birthdays)",
      preview: "Big energy for team spirit.",
      styles: ["community", "birthday"],
    },
    {
      heading: "Poppins",
      body: "Lato",
      notes: "Friendly Geometric (Elementary)",
      preview: "Family Fun Night with Fletch Photo!",
      styles: ["community"],
    },
    {
      heading: "Creepster",
      body: "Inter",
      notes: "Spooky Season (Halloween)",
      preview: "Spooky season starts now!",
      styles: ["halloween"],
    },
    {
      heading: "Mountains of Christmas",
      body: "Inter",
      notes: "Festive Cheer (Christmas)",
      preview: "Merry Christmas from Fletch Photobooth 🎄",
      styles: ["christmas"],
    },
    {
      heading: "Raleway",
      body: "Lora",
      notes: "Warm Whispers (Thanksgiving/Fall)",
      preview: "Give thanks with Fletch Photobooth.",
      styles: ["general"],
    },
  ],
};

function normalizeFontFamilyName(name) {
  return (name || "")
    .toString()
    .replace(/^['"]|['"]$/g, "")
    .trim();
}

function dedupeFontDefs(fonts) {
  const seen = new Set();
  const out = [];
  (Array.isArray(fonts) ? fonts : []).forEach((font) => {
    if (!font || typeof font !== "object") return;
    const cleanName = normalizeFontFamilyName(font.name || font.value);
    if (!cleanName) return;
    const key = cleanName.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const weights = Array.isArray(font.weights)
      ? font.weights.filter((w) => Number.isFinite(w)).map((w) => Number(w))
      : [];
    out.push({
      name: cleanName,
      weights: weights.length ? weights : undefined,
      ital: Boolean(font.ital),
      preview: font.preview || font.label || "",
    });
  });
  return out;
}

function normalizeFontsPayload(raw) {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const converted = raw
      .filter(
        (item) => item && typeof item === "object" && item.type === "family"
      )
      .map((item) => ({
        name: normalizeFontFamilyName(item.value),
        weights: item.weights,
        preview: item.label || "",
      }))
      .filter((item) => item.name);
    return {
      available: dedupeFontDefs([
        ...DEFAULT_FONTS_PAYLOAD.available,
        ...converted,
      ]),
      defaults: { ...DEFAULT_FONTS_PAYLOAD.defaults },
      pairings: [...DEFAULT_FONTS_PAYLOAD.pairings],
    };
  }
  if (typeof raw === "object") {
    const available =
      Array.isArray(raw.available) && raw.available.length
        ? dedupeFontDefs(raw.available)
        : dedupeFontDefs(DEFAULT_FONTS_PAYLOAD.available);
    const defaults = {
      ...DEFAULT_FONTS_PAYLOAD.defaults,
      ...(raw.defaults && typeof raw.defaults === "object" ? raw.defaults : {}),
    };
    const pairings =
      Array.isArray(raw.pairings) && raw.pairings.length
        ? raw.pairings
        : DEFAULT_FONTS_PAYLOAD.pairings;
    return { available, defaults, pairings };
  }
  return null;
}

function buildGoogleFontsURL(fonts) {
  const items = (Array.isArray(fonts) ? fonts : []).filter(
    (font) => font && font.name
  );
  if (!items.length) return "";
  const fams = items
    .map((font) => {
      const fam = encodeURIComponent(font.name).replace(/%20/g, "+");
      const weights =
        Array.isArray(font.weights) && font.weights.length
          ? Array.from(new Set(font.weights)).sort((a, b) => a - b)
          : [400];
      if (font.ital) {
        const pairs = [
          ...weights.map((w) => `0,${w}`),
          ...weights.map((w) => `1,${w}`),
        ].join(";");
        return `family=${fam}:ital,wght@${pairs}`;
      }
      return `family=${fam}:wght@${weights.join(";")}`;
    })
    .join("&");
  return `https://fonts.googleapis.com/css2?${fams}&display=swap`;
}

function setHeadingFont(family) {
  const clean =
    normalizeFontFamilyName(family) ||
    normalizeFontFamilyName(DEFAULT_FONTS_PAYLOAD.defaults.heading);
  const stack = `'${clean}', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`;
  document.documentElement.style.setProperty("--font-heading", stack);
  localStorage.setItem("font.heading", clean);
}

function setBodyFont(family) {
  const clean =
    normalizeFontFamilyName(family) ||
    normalizeFontFamilyName(DEFAULT_FONTS_PAYLOAD.defaults.body);
  const stack = `'${clean}', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`;
  document.documentElement.style.setProperty("--font-body", stack);
  document.documentElement.style.setProperty("--font", stack);
  localStorage.setItem("font.body", clean);
}

function findFontPreview(fonts, name) {
  const clean = normalizeFontFamilyName(name);
  const match = (Array.isArray(fonts) ? fonts : []).find(
    (f) => normalizeFontFamilyName(f.name) === clean
  );
  return match && match.preview ? match.preview : DEFAULT_FONT_PREVIEW;
}

function renderQuickPicks(args) {
  const { container, pairings, fonts, apply } = args;
  container.innerHTML = "";
  const seasonalWords = [
    "Christmas",
    "Holiday",
    "Spooky",
    "Valentine",
    "Easter",
    "New Year",
  ];
  const sorted = [...pairings].sort((a, b) => {
    const aSeason =
      a && a.preview && seasonalWords.some((w) => a.preview.includes(w));
    const bSeason =
      b && b.preview && seasonalWords.some((w) => b.preview.includes(w));
    if (aSeason === bSeason) return 0;
    return aSeason ? -1 : 1;
  });
  sorted.forEach((pairing) => {
    if (!pairing || !pairing.heading || !pairing.body) return;
    const headingPreview =
      pairing.preview ||
      findFontPreview(fonts, pairing.heading) ||
      DEFAULT_FONT_PREVIEW;
    const card = document.createElement("button");
    card.type = "button";
    card.className = "quick-pick-card";
    card.innerHTML = `
      <div class="quick-pick-label">Quick Pick</div>
      <div class="quick-pick-fonts"><span class="quick-pick-heading">${
        pairing.heading
      }</span> + ${pairing.body}</div>
      <div class="quick-pick-preview" style="font-family: '${
        pairing.heading
      }', system-ui, sans-serif;">${headingPreview}</div>
      ${
        pairing.notes
          ? `<div class="quick-pick-notes">${pairing.notes}</div>`
          : ""
      }
    `;
    card.addEventListener("click", () =>
      apply(pairing.heading, pairing.body, headingPreview)
    );
    container.appendChild(card);
  });
}

async function setupDualFontPicker(opts) {
  if (!opts || !opts.headingSelect || !opts.bodySelect) return;
  const endpointRaw =
    typeof opts.fontsEndpoint === "string"
      ? opts.fontsEndpoint.trim()
      : "/api/fonts";
  const endpoint = endpointRaw.length ? endpointRaw : null;
  let payload = null;
  if (endpoint) {
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        payload = normalizeFontsPayload(data);
      }
    } catch (e) {
      console.warn("Failed to fetch fonts payload", e);
    }
  }
  const effective =
    payload ||
    normalizeFontsPayload(DEFAULT_FONTS_PAYLOAD) ||
    DEFAULT_FONTS_PAYLOAD;
  const fonts = dedupeFontDefs(effective.available);
  const pairings = Array.isArray(effective.pairings) ? effective.pairings : [];
  if (!fonts.length) return;
  const href = buildGoogleFontsURL(fonts);
  injectStylesheetOnce(href);

  const populate = (sel) => {
    if (!sel) return;
    sel.innerHTML = "";
    fonts.forEach((font) => {
      const opt = document.createElement("option");
      opt.value = font.name;
      opt.textContent = font.name;
      opt.style.fontFamily = `'${font.name}', system-ui, sans-serif`;
      sel.appendChild(opt);
    });
  };

  populate(opts.headingSelect);
  populate(opts.bodySelect);

  const storedHeading = normalizeFontFamilyName(
    localStorage.getItem("font.heading")
  );
  const storedBody = normalizeFontFamilyName(localStorage.getItem("font.body"));
  const defaultHeading =
    storedHeading ||
    normalizeFontFamilyName(effective.defaults && effective.defaults.heading) ||
    fonts[0].name;
  const defaultBody =
    storedBody ||
    normalizeFontFamilyName(effective.defaults && effective.defaults.body) ||
    fonts[0].name;

  setHeadingFont(defaultHeading);
  setBodyFont(defaultBody);

  if (opts.headingSelect) opts.headingSelect.value = defaultHeading;
  if (opts.bodySelect) opts.bodySelect.value = defaultBody;
  if (opts.headingPreview) {
    opts.headingPreview.style.fontFamily = `'${defaultHeading}', system-ui, sans-serif`;
    opts.headingPreview.textContent = findFontPreview(fonts, defaultHeading);
  }
  if (opts.bodyPreview) {
    opts.bodyPreview.style.fontFamily = `'${defaultBody}', system-ui, sans-serif`;
    opts.bodyPreview.textContent = findFontPreview(fonts, defaultBody);
  }

  if (opts.headingSelect) {
    opts.headingSelect.addEventListener("change", () => {
      const val = opts.headingSelect.value;
      setHeadingFont(val);
      if (opts.headingPreview) {
        opts.headingPreview.style.fontFamily = `'${val}', system-ui, sans-serif`;
        opts.headingPreview.textContent = findFontPreview(fonts, val);
      }
      if (opts.pairingSelect) opts.pairingSelect.value = "";
    });
  }

  if (opts.bodySelect) {
    opts.bodySelect.addEventListener("change", () => {
      const val = opts.bodySelect.value;
      setBodyFont(val);
      if (opts.bodyPreview) {
        opts.bodyPreview.style.fontFamily = `'${val}', system-ui, sans-serif`;
        opts.bodyPreview.textContent = findFontPreview(fonts, val);
      }
      if (opts.pairingSelect) opts.pairingSelect.value = "";
    });
  }

  if (opts.pairingSelect) {
    const sel = opts.pairingSelect;
    sel.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "-- Choose a pairing --";
    sel.appendChild(placeholder);
    pairings.forEach((pairing) => {
      if (!pairing || !pairing.heading || !pairing.body) return;
      const opt = document.createElement("option");
      opt.value = `${pairing.heading}|${pairing.body}`;
      opt.textContent = pairing.notes
        ? `${pairing.heading} + ${pairing.body} - ${pairing.notes}`
        : `${pairing.heading} + ${pairing.body}`;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", () => {
      if (!sel.value) return;
      const [h, b] = sel.value.split("|");
      const pairing = pairings.find((p) => p.heading === h && p.body === b);
      if (opts.headingSelect) opts.headingSelect.value = h;
      if (opts.bodySelect) opts.bodySelect.value = b;
      setHeadingFont(h);
      setBodyFont(b);
      const headingPreviewText = findPairingPreview(pairing, fonts);
      if (opts.headingPreview) {
        opts.headingPreview.style.fontFamily = `'${h}', system-ui, sans-serif`;
        opts.headingPreview.textContent = headingPreviewText;
      }
      if (opts.bodyPreview) {
        opts.bodyPreview.style.fontFamily = `'${b}', system-ui, sans-serif`;
        opts.bodyPreview.textContent = findFontPreview(fonts, b);
      }
    });
  }

  const qpEl = document.getElementById("quickPicks");
  const qpToggle = document.getElementById("qpToggle");
  const applyBoth = (h, b, previewText) => {
    if (opts.headingSelect) opts.headingSelect.value = h;
    if (opts.bodySelect) opts.bodySelect.value = b;
    setHeadingFont(h);
    setBodyFont(b);
    const bodyPreviewText = findFontPreview(fonts, b);
    if (opts.headingPreview) {
      opts.headingPreview.style.fontFamily = `'${h}', system-ui, sans-serif`;
      opts.headingPreview.textContent =
        previewText || findFontPreview(fonts, h);
    }
    if (opts.bodyPreview) {
      opts.bodyPreview.style.fontFamily = `'${b}', system-ui, sans-serif`;
      opts.bodyPreview.textContent = bodyPreviewText;
    }
    if (opts.pairingSelect) opts.pairingSelect.value = "";
  };

  if (qpEl && pairings.length) {
    renderQuickPicks({ container: qpEl, pairings, fonts, apply: applyBoth });
    let expanded = false;
    const updateGrid = () => {
      qpEl.style.maxHeight = expanded ? "" : "220px";
      qpEl.style.overflow = expanded ? "visible" : "hidden";
      if (qpToggle) qpToggle.textContent = expanded ? "show less" : "show all";
    };
    updateGrid();
    if (qpToggle) {
      qpToggle.style.display = "inline-block";
      qpToggle.addEventListener("click", () => {
        expanded = !expanded;
        updateGrid();
      });
    }
  } else if (qpToggle) {
    qpToggle.style.display = "none";
  }
}

// --- Editing Existing Themes ---
function getSelectedThemeKey() {
  const eventKey = DOM.eventSelect && DOM.eventSelect.value;
  return eventKey || "";
}
function getSelectedThemeTarget() {
  const key = getSelectedThemeKey();
  return resolveThemeByKey(key);
}

async function updateSelectedTheme(reason = "") {
  const key = getSelectedThemeKey();
  const target = getSelectedThemeTarget();
  if (!key || !target) {
    alert("Select a theme first.");
    clearThemeFileInputs();
    return;
  }
  const name = valueFromInput(DOM.themeName) || target.name || "New Theme";
  const slug = slugifyThemeName(name);
  if (!slug) {
    alert("Enter a valid name for the new sub theme.");
    clearThemeFileInputs();
    return;
  }

  const location = resolveThemeStorage(key);
  let parent = location.parent;
  let bucket = location.bucket;
  let rootKey = location.root || "";
  if (
    !bucket &&
    rootKey &&
    themes[rootKey] &&
    typeof themes[rootKey] === "object"
  ) {
    parent = themes[rootKey];
    if (!parent.themes) parent.themes = {};
    bucket = "themes";
  }

  if (bucket) {
    if (!parent[bucket]) parent[bucket] = {};
    if (parent[bucket][slug]) {
      alert("A sub theme with that name already exists.");
      clearThemeFileInputs();
      return;
    }
  } else if (themes[slug]) {
    alert("A theme with that name already exists.");
    clearThemeFileInputs();
    return;
  }

  const newTheme = cloneThemeValue(target);
  applyThemeBasicsFromEditor(newTheme);
  newTheme.name = name;
  newTheme.welcome = newTheme.welcome || {};
  newTheme.welcome.title = newTheme.welcome.title || name;

  const folders = readThemeFolderInputs();
  let assetChanges = null;
  try {
    assetChanges = await uploadThemeAssetsFromEditor(newTheme);
  } catch (err) {
    console.error("Failed to upload theme assets", err);
    clearThemeFileInputs();
    alert("Could not create the sub theme. Check the console for details.");
    return;
  }
  if (assetChanges && assetChanges.logoUrl) {
    setGlobalLogo(assetChanges.logoUrl, { quiet: true, skipSave: true });
  } else {
    const currentGlobalLogo = getGlobalLogo();
    if (currentGlobalLogo !== null)
      applyGlobalLogoToTheme(newTheme, currentGlobalLogo);
  }
  applyThemeFolderSettings(newTheme, folders);

  try {
    normalizeThemeObject(newTheme);
  } catch (_e) {}
  if (bucket) {
    parent[bucket][slug] = newTheme;
  } else {
    themes[slug] = newTheme;
  }
  saveThemesToStorage();

  const newKey = bucket && rootKey ? `${rootKey}:${slug}` : slug;
  populateThemeSelector(newKey);
  setEventSelection(newKey);
  loadTheme(newKey);
  clearThemeFileInputs();
  syncThemeEditorWithActiveTheme();
  showToast(`Sub theme "${name}" created`);
}

async function updateCurrentThemeAssets(reason = "") {
  const key = getSelectedThemeKey();
  const target = getSelectedThemeTarget();
  if (!key || !target) {
    alert("Select a theme first.");
    clearThemeFileInputs();
    return;
  }

  const folders = readThemeFolderInputs();
  let assetChanges = null;
  setAssetPanelMessage("overlay", "loading", "Loading overlays…");
  setAssetPanelMessage("template", "loading", "Loading templates…");
  try {
    assetChanges = await uploadThemeAssetsFromEditor(target);
  } catch (err) {
    console.error("Failed to upload theme assets", err);
    setAssetPanelMessage("overlay", "error", "Couldn’t load overlay thumbnails.");
    setAssetPanelMessage("template", "error", "Couldn’t load template thumbnails.");
    clearThemeFileInputs();
    alert("Could not update the theme assets. Check the console for details.");
    return;
  }
  if (assetChanges && assetChanges.logoUrl) {
    setGlobalLogo(assetChanges.logoUrl, { quiet: true, skipSave: true });
  } else {
    const currentGlobalLogo = getGlobalLogo();
    if (currentGlobalLogo !== null)
      applyGlobalLogoToTheme(target, currentGlobalLogo);
  }
  applyThemeFolderSettings(target, folders);

  try {
    normalizeThemeObject(target);
  } catch (_e) {}
  saveThemesToStorage();

  populateThemeSelector(key);
  setEventSelection(key);
  loadTheme(key);
  clearThemeFileInputs();
  syncThemeEditorWithActiveTheme();
  if (assetChanges && assetChanges.overlaysAdded > 0) {
    setAssetPanelOpen("overlay", true);
  }
  if (assetChanges && assetChanges.templatesAdded > 0) {
    setAssetPanelOpen("template", true);
  }
  setAssetPanelMessage("overlay", null);
  setAssetPanelMessage("template", null);
  showToast(describeThemeUpdate(assetChanges, reason));
}

function createSubThemeFromEvent() {
  const active = getActiveEvent();
  if (!active) {
    alert("Select an event first.");
    return;
  }
  const overrides = getActiveEventOverrides();
  const hasOverrides =
    (overrides.backgrounds && overrides.backgrounds.length) ||
    (overrides.greenBackgrounds && overrides.greenBackgrounds.length) ||
    (overrides.overlays && overrides.overlays.length) ||
    (overrides.templates && overrides.templates.length);
  if (!hasOverrides) {
    alert("This event has no custom assets to save as a sub theme.");
    return;
  }

  const baseKey =
    active.themeKey || (DOM.eventSelect && DOM.eventSelect.value) || "";
  const baseTheme = getThemeByKey(baseKey) || getSelectedThemeTarget();
  if (!baseTheme) {
    alert("Select a theme first.");
    return;
  }

  const defaultName = `${baseTheme.name || "Theme"} - ${
    active.name || "Event"
  }`;
  const name = (
    prompt("Name for the new sub theme:", defaultName) || ""
  ).trim();
  if (!name) return;
  const slug = slugifyThemeName(name);
  if (!slug) {
    alert("Enter a valid sub theme name.");
    return;
  }

  const location = resolveThemeStorage(baseKey);
  let parent = location.parent;
  let bucket = location.bucket;
  let rootKey = location.root || "";
  if (
    !bucket &&
    rootKey &&
    themes[rootKey] &&
    typeof themes[rootKey] === "object"
  ) {
    parent = themes[rootKey];
    if (!parent.themes) parent.themes = {};
    bucket = "themes";
  }
  if (bucket) {
    if (!parent[bucket]) parent[bucket] = {};
    if (parent[bucket][slug]) {
      alert("A sub theme with that name already exists.");
      return;
    }
  } else if (themes[slug]) {
    alert("A theme with that name already exists.");
    return;
  }

  const newTheme = cloneThemeValue(baseTheme);
  newTheme.name = name;
  newTheme.welcome = newTheme.welcome || {};
  newTheme.welcome.title = newTheme.welcome.title || name;

  const baseBackgrounds = getBaseBackgroundList(baseTheme);
  const baseGreen = Array.isArray(baseTheme.greenBackgrounds)
    ? baseTheme.greenBackgrounds.filter(Boolean)
    : [];
  const baseOverlays = getBaseOverlayList(baseTheme).map((o) => o.src);
  const baseTemplates = getBaseTemplateList(baseTheme).map((t) => t);

  if (overrides.backgrounds && overrides.backgrounds.length) {
    newTheme.backgrounds = mergeUniqueUrls(
      overrides.backgrounds,
      baseBackgrounds
    );
    newTheme.background = newTheme.backgrounds[0] || newTheme.background || "";
    newTheme.backgroundIndex = 0;
  }
  if (overrides.greenBackgrounds && overrides.greenBackgrounds.length) {
    newTheme.greenBackgrounds = mergeUniqueUrls(
      overrides.greenBackgrounds,
      baseGreen
    );
    newTheme.greenBackgroundIndex = 0;
  }
  if (overrides.overlays && overrides.overlays.length) {
    newTheme.overlays = mergeUniqueUrls(overrides.overlays, baseOverlays);
  }
  if (overrides.templates && overrides.templates.length) {
    const mergedTemplates = [];
    const seen = new Set();
    const pushTemplate = (t) => {
      if (!t || !t.src) return;
      if (seen.has(t.src)) return;
      seen.add(t.src);
      mergedTemplates.push({
        src: t.src,
        layout: t.layout || "double_column",
        slots: t.slots,
      });
    };
    overrides.templates.forEach((t) =>
      pushTemplate(typeof t === "string" ? { src: t } : t)
    );
    baseTemplates.forEach((t) => pushTemplate(t));
    newTheme.templates = mergedTemplates;
  }
  if (active.logo) newTheme.logo = active.logo;
  if (typeof active.bannerText === "string" && active.bannerText)
    newTheme.bannerText = active.bannerText;
  if (typeof active.welcomeTitle === "string" && active.welcomeTitle) {
    newTheme.welcome = newTheme.welcome || {};
    newTheme.welcome.title = active.welcomeTitle;
  }
  if (typeof active.startButtonText === "string" && active.startButtonText) {
    newTheme.welcome = newTheme.welcome || {};
    newTheme.welcome.prompt = active.startButtonText;
  }
  if (typeof active.captureLabel === "string" && active.captureLabel)
    newTheme.captureLabel = active.captureLabel;
  if (typeof active.bannerSize === "number" && active.bannerSize > 0)
    newTheme.bannerSize = active.bannerSize;
  if (
    typeof active.welcomeTitleSize === "number" &&
    active.welcomeTitleSize > 0
  )
    newTheme.welcomeTitleSize = active.welcomeTitleSize;
  if (bucket) parent[bucket][slug] = newTheme;
  else themes[slug] = newTheme;

  saveThemesToStorage();
  const newKey = bucket && rootKey ? `${rootKey}:${slug}` : slug;
  setEventSelection(newKey);
  loadTheme(newKey);
  updateActiveEventDetails({
    themeKey: newKey,
    overrides: {
      backgrounds: [],
      overlays: [],
      templates: [],
      backgroundIndex: 0,
      greenBackgrounds: [],
      greenBackgroundIndex: 0,
    },
  });
  showToast(`Sub theme "${name}" created`);
}

function describeThemeUpdate(changes, reason) {
  if (!changes) return "Theme updated";
  const parts = [];
  if (changes.backgroundsAdded) {
    parts.push(
      `Added ${changes.backgroundsAdded} background${
        changes.backgroundsAdded === 1 ? "" : "s"
      }`
    );
  }
  if (changes.greenBackgroundsAdded) {
    parts.push(
      `Added ${changes.greenBackgroundsAdded} green BG${
        changes.greenBackgroundsAdded === 1 ? "" : "s"
      }`
    );
  }
  if (changes.overlaysAdded) {
    parts.push(
      `Added ${changes.overlaysAdded} overlay${
        changes.overlaysAdded === 1 ? "" : "s"
      }`
    );
  }
  if (changes.templatesAdded) {
    parts.push(
      `Added ${changes.templatesAdded} template${
        changes.templatesAdded === 1 ? "" : "s"
      }`
    );
  }
  if (changes.logoUrl) {
    parts.push("Logo applied to all themes");
  }
  if (parts.length) return parts.join(" • ");
  if (reason === "logo") return "Logo unchanged";
  return "Theme updated";
}

function valueFromInput(node) {
  return node && typeof node.value === "string" ? node.value.trim() : "";
}

function normalizeBannerText(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function fitTextToBox(node, maxWidth, maxHeight = 0, minSize = 18) {
  if (!node) return;
  const availableWidth = Math.max(0, Number(maxWidth) || 0);
  if (!availableWidth) return;
  const measured = parseFloat(
    node.dataset.baseFontSize ||
      node.style.fontSize ||
      window.getComputedStyle(node).fontSize ||
      "0"
  );
  if (!Number.isFinite(measured) || measured <= 0) return;
  let nextSize = measured;
  node.style.fontSize = `${nextSize}px`;
  while (
    (node.scrollWidth > availableWidth ||
      (maxHeight > 0 && node.scrollHeight > maxHeight)) &&
    nextSize > minSize
  ) {
    nextSize -= 1;
    node.style.fontSize = `${nextSize}px`;
  }
}

function fitBannerTextToViewport() {
  if (!DOM.eventTitle || !DOM.boothHeader) return;
  const availableWidth = DOM.boothHeader.clientWidth - 140;
  fitTextToBox(DOM.eventTitle, availableWidth, 0, 18);
}

function fitWelcomeTitleToViewport() {
  if (!DOM.welcomeTitle || !DOM.welcomeOverlay) return;
  const availableWidth = DOM.welcomeOverlay.clientWidth - 72;
  const availableHeight = Math.min(window.innerHeight * 0.42, 360);
  fitTextToBox(DOM.welcomeTitle, availableWidth, availableHeight, 18);
}

function getBannerSize(theme) {
  const active = getActiveEvent();
  if (active && typeof active.bannerSize === "number" && active.bannerSize > 0)
    return active.bannerSize;
  if (theme && typeof theme.bannerSize === "number" && theme.bannerSize > 0)
    return theme.bannerSize;
  return 64;
}

function applyBannerSize(theme) {
  const size = getBannerSize(theme || activeTheme);
  if (DOM.eventTitle) {
    DOM.eventTitle.dataset.baseFontSize = String(size);
    DOM.eventTitle.style.fontSize = `${size}px`;
  }
  if (DOM.stylePreviewHeading)
    DOM.stylePreviewHeading.style.fontSize = `${Math.max(
      20,
      Math.round(size * 0.6)
    )}px`;
  fitBannerTextToViewport();
}

function syncBannerSizeUI(theme) {
  if (!DOM.bannerSizeInput || !DOM.bannerSizeValue) return;
  const size = getBannerSize(theme || activeTheme);
  DOM.bannerSizeInput.value = String(size);
  DOM.bannerSizeValue.textContent = `${size}px`;
}

function getThemeWelcomeTitleSize(theme) {
  if (
    theme &&
    typeof theme.welcomeTitleSize === "number" &&
    theme.welcomeTitleSize > 0
  ) {
    return theme.welcomeTitleSize;
  }
  return 56;
}

function resolveWelcomeTitleSize(theme) {
  const active = getActiveEvent();
  if (
    active &&
    typeof active.welcomeTitleSize === "number" &&
    active.welcomeTitleSize > 0
  ) {
    return active.welcomeTitleSize;
  }
  return getThemeWelcomeTitleSize(theme || activeTheme);
}

function applyWelcomeTitleSize(theme) {
  const size = resolveWelcomeTitleSize(theme);
  if (size && size > 0) {
    document.documentElement.style.setProperty(
      "--welcome-title-size",
      `${size}px`
    );
    if (DOM.welcomeTitle) {
      DOM.welcomeTitle.dataset.baseFontSize = String(size);
      DOM.welcomeTitle.style.fontSize = `${size}px`;
    }
    if (DOM.stylePreviewSubheading) {
      DOM.stylePreviewSubheading.style.fontSize = `${Math.max(
        14,
        Math.round(size * 0.5)
      )}px`;
    }
  } else {
    document.documentElement.style.removeProperty("--welcome-title-size");
    if (DOM.welcomeTitle) {
      delete DOM.welcomeTitle.dataset.baseFontSize;
      DOM.welcomeTitle.style.fontSize = "";
    }
    if (DOM.stylePreviewSubheading)
      DOM.stylePreviewSubheading.style.fontSize = "";
  }
  fitWelcomeTitleToViewport();
}

function syncWelcomeTitleSizeUI(theme) {
  if (!DOM.welcomeTitleSizeInput || !DOM.welcomeTitleSizeValue) return;
  const size = getThemeWelcomeTitleSize(theme || activeTheme);
  DOM.welcomeTitleSizeInput.value = String(size);
  DOM.welcomeTitleSizeValue.textContent = `${size}px`;
}

function isPreviewEditing(node) {
  if (!node) return false;
  return document.activeElement === node;
}

function resolveBannerText() {
  const active = getActiveEvent();
  if (hasOwnEventTextValue(active, "bannerText"))
    return normalizeBannerText(active.bannerText);
  if (hasOwnEventTextValue(activeSessionTextDetails, "bannerText")) {
    const sessionText = normalizeBannerText(activeSessionTextDetails.bannerText);
    if (sessionText) return sessionText;
  }
  return resolveThemeBannerText();
}

function syncBannerText() {
  const bannerText = resolveBannerText();
  if (DOM.eventTitle) DOM.eventTitle.textContent = bannerText;
  fitBannerTextToViewport();
}

function resolveThemeBannerText() {
  const target = activeTheme || getSelectedThemeTarget();
  const themeText =
    target && typeof target.bannerText === "string"
      ? normalizeBannerText(target.bannerText)
      : "";
  if (themeText) return themeText;
  if (target && target.welcome && target.welcome.title)
    return target.welcome.title;
  const selection = getFontPickerSelection();
  const heading = selection.heading || selection.body;
  if (heading) return getFontPreviewText(heading);
  return "Welcome!";
}

function resolveCaptureLabel() {
  const active = getActiveEvent();
  if (hasOwnEventTextValue(active, "captureLabel")) {
    const eventLabel = active.captureLabel.trim();
    if (eventLabel) return eventLabel;
  }
  if (hasOwnEventTextValue(activeSessionTextDetails, "captureLabel")) {
    const sessionLabel = activeSessionTextDetails.captureLabel.trim();
    if (sessionLabel) return sessionLabel;
  }
  const themeLabel = resolveThemeCaptureLabel();
  if (themeLabel) return themeLabel;
  return resolveBoothCaptureButtonLabel(mode);
}

function syncCaptureButtonText() {
  if (DOM.captureBtn) DOM.captureBtn.textContent = resolveCaptureLabel();
}

function getBoothPersonalitySource() {
  const active = getActiveEvent();
  const target = activeTheme || getSelectedThemeTarget() || {};
  const pieces = [
    active && active.name,
    active && active.date,
    target && target.name,
    DOM.eventSelect && DOM.eventSelect.value,
    target && target.bannerText,
    target && target.welcome && target.welcome.title,
  ];
  return pieces.filter(Boolean).join(" ").toLowerCase();
}

function getBoothPersonality() {
  const source = getBoothPersonalitySource();
  if (/christmas|holiday|santa|xmas|winter/.test(source)) {
    return {
      welcome: "Capture a little holiday magic.",
      camera: "Gather close for a little holiday magic.",
      save: "Take the magic with you.",
      print: "Take home your holiday keepsake.",
      thanks: "Thank you! Enjoy your photos!",
    };
  }
  if (/wedding|bride|groom|married|love|ring/.test(source)) {
    return {
      welcome: "Celebrate the moment.",
      camera: "Get everyone you love in the frame.",
      save: "Take this moment with you.",
      print: "Take home a keepsake from the celebration.",
      thanks: "Thank you! Enjoy the celebration!",
    };
  }
  if (/birthday|bday|party|cake/.test(source)) {
    return {
      welcome: "Let's make this birthday unforgettable.",
      camera: "Bring the birthday energy.",
      save: "Take the party with you.",
      print: "Take home a birthday keepsake.",
      thanks: "Thank you! Enjoy your photos!",
    };
  }
  if (/football|hawks|team|school|game|eagles|tigers|wildcats|panthers/.test(source)) {
    const team = source.includes("hawks") ? "Go Hawks! " : "";
    return {
      welcome: `${team}Ready to make some memories?`,
      camera: "Bring the team energy.",
      save: "Take the win with you.",
      print: "Take home your game-day keepsake.",
      thanks: "Thank you! See you again!",
    };
  }
  return {
    welcome: "Ready to make some memories?",
    camera: "Get everyone in the frame!",
    save: "Take them with you.",
    print: "Take home your keepsake.",
    thanks: "Thank you! Enjoy your photos!",
  };
}

function syncBoothPersonality() {
  const personality = getBoothPersonality();
  if (DOM.welcomeHostLine) DOM.welcomeHostLine.textContent = personality.welcome;
  if (DOM.boothHostPrompt) {
    DOM.boothHostPrompt.innerHTML = "";
    DOM.boothHostPrompt.appendChild(document.createTextNode(personality.camera));
    const helper = document.createElement("span");
    helper.textContent = "Smile when the booth says so.";
    DOM.boothHostPrompt.appendChild(helper);
  }
  if (DOM.qrCodeContainer) {
    const heading = DOM.qrCodeContainer.querySelector("h2");
    if (heading) heading.textContent = personality.save;
  }
  if (DOM.qrSaveCopy) DOM.qrSaveCopy.textContent = "Scan to save your photos.";
  if (DOM.paidPrintBody) DOM.paidPrintBody.textContent = personality.print;
}

function syncWelcomeLogo() {
  if (!DOM.welcomeEventLogo) return;
  DOM.welcomeEventLogo.innerHTML = "";
  const logoSrc =
    (activeTheme && activeTheme.logo) ||
    (activeTheme && activeTheme.logoUrl) ||
    "";
  if (!logoSrc) {
    DOM.welcomeEventLogo.classList.add("hidden");
    return;
  }
  const img = document.createElement("img");
  img.src = withBust(logoSrc);
  img.alt = "";
  img.onload = () => DOM.welcomeEventLogo.classList.remove("hidden");
  img.onerror = () => DOM.welcomeEventLogo.classList.add("hidden");
  DOM.welcomeEventLogo.appendChild(img);
}

function resolveThemeCaptureLabel() {
  const target = activeTheme || getSelectedThemeTarget();
  if (
    target &&
    typeof target.captureLabel === "string" &&
    target.captureLabel.trim()
  ) {
    return target.captureLabel.trim();
  }
  return "";
}

function resolveBoothCaptureButtonLabel(targetMode = mode) {
  const normalizedMode = normalizeBoothModeValue(targetMode);
  if (normalizedMode === "message") {
    return isMessageRecording ? "Stop Recording" : "Start Recording";
  }
  const active = getActiveEvent();
  if (hasOwnEventTextValue(active, "captureLabel")) {
    const eventLabel = active.captureLabel.trim();
    if (eventLabel) return eventLabel;
  }
  if (hasOwnEventTextValue(activeSessionTextDetails, "captureLabel")) {
    const sessionLabel = activeSessionTextDetails.captureLabel.trim();
    if (sessionLabel) return sessionLabel;
  }
  const themeLabel = resolveThemeCaptureLabel();
  if (themeLabel) return themeLabel;
  if (normalizedMode === "strip") return "Start Strip";
  if (normalizedMode === "layout") return "Start Layout";
  if (normalizedMode === "live-photo" && getLivePhotoEnabled()) {
    return "Take Live Photo";
  }
  if (normalizedMode === "still-photo") return "Take Photo";
  return "Take Photo";
}

function resolveBoothHelperText(targetMode = mode) {
  return "";
}

function syncBoothHelperText() {
  if (!DOM.boothHelperText) return;
  DOM.boothHelperText.textContent = resolveBoothHelperText(mode);
}

function resolveWelcomeTitle() {
  const active = getActiveEvent();
  if (hasOwnEventTextValue(active, "welcomeTitle"))
    return active.welcomeTitle.trim();
  if (hasOwnEventTextValue(activeSessionTextDetails, "welcomeTitle")) {
    const sessionTitle = activeSessionTextDetails.welcomeTitle.trim();
    if (sessionTitle) return sessionTitle;
  }
  return resolveThemeWelcomeTitle();
}

function resolveStartButtonText() {
  const active = getActiveEvent();
  if (hasOwnEventTextValue(active, "startButtonText")) {
    const eventLabel = active.startButtonText.trim();
    if (eventLabel) return eventLabel;
  }
  if (hasOwnEventTextValue(activeSessionTextDetails, "startButtonText")) {
    const sessionLabel = activeSessionTextDetails.startButtonText.trim();
    if (sessionLabel) return sessionLabel;
  }
  return resolveThemeStartButtonText();
}

function syncWelcomeText() {
  const title = resolveWelcomeTitle();
  if (DOM.welcomeTitle) DOM.welcomeTitle.textContent = title;
  const prompt = resolveStartButtonText();
  if (DOM.startButton) DOM.startButton.textContent = prompt;
  syncBoothPersonality();
  syncWelcomeLogo();
  applyWelcomeTitleSize(activeTheme);
}

function resolveThemeWelcomeTitle() {
  const target = activeTheme || getSelectedThemeTarget();
  if (target && target.welcome && target.welcome.title)
    return target.welcome.title;
  return "Welcome!";
}

function resolveThemeStartButtonText() {
  const target = activeTheme || getSelectedThemeTarget();
  if (target && target.welcome && target.welcome.prompt)
    return target.welcome.prompt;
  return "Tap anywhere to start";
}

function resolveThemeWelcomeTitleSizeValue() {
  const target = activeTheme || getSelectedThemeTarget();
  return getThemeWelcomeTitleSize(target);
}

function slugifyThemeName(name) {
  return (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function ensureCreateThemeAssets() {
  if (!createThemeAssets) {
    createThemeAssets = {
      backgrounds: [],
      overlays: [],
      templates: [],
      logos: [],
    };
  }
  return createThemeAssets;
}

function resetCreateThemeAssets() {
  createThemeAssets = {
    backgrounds: [],
    overlays: [],
    templates: [],
    logos: [],
    characters: [],
  };
}

function resetCreateThemeModal() {
  resetCreateThemeAssets();
  if (DOM.createThemeName) DOM.createThemeName.value = "";
  if (DOM.createThemeSummary)
    DOM.createThemeSummary.textContent = "Drop a theme folder to begin.";
  if (DOM.createThemeDropZone)
    DOM.createThemeDropZone.classList.remove("dragover");
  updateThemeEditorSummary();
}

function showCreateThemeModal() {
  if (DOM.createThemeModal) DOM.createThemeModal.classList.add("show");
  updateCreateThemeSummary();
  if (DOM.createThemeName) DOM.createThemeName.focus();
}

function hideCreateThemeModal() {
  if (DOM.createThemeModal) DOM.createThemeModal.classList.remove("show");
}

function updateCreateThemeSummary() {
  const summary = DOM.createThemeSummary;
  if (!summary) return;
  if (!createThemeAssets) {
    summary.textContent = "Drop a theme folder to begin.";
    updateThemeEditorSummary();
    return;
  }
  const parts = [];
  const {
    backgrounds = [],
    overlays = [],
    templates = [],
    logos = [],
  } = createThemeAssets;
  if (backgrounds.length)
    parts.push(
      `${backgrounds.length} background${backgrounds.length === 1 ? "" : "s"}`
    );
  if (overlays.length)
    parts.push(`${overlays.length} overlay${overlays.length === 1 ? "" : "s"}`);
  if (templates.length)
    parts.push(
      `${templates.length} template${templates.length === 1 ? "" : "s"}`
    );
  if (logos.length)
    parts.push(`${logos.length} logo${logos.length === 1 ? "" : "s"}`);
  if (characters.length)
    parts.push(
      `${characters.length} character${characters.length === 1 ? "" : "s"}`
    );
  summary.textContent = parts.length
    ? `Assets ready: ${parts.join(", ")}`
    : "No assets detected yet.";
  updateThemeEditorSummary();
}

function handleCreateThemeDragOver(event) {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  if (DOM.createThemeDropZone)
    DOM.createThemeDropZone.classList.add("dragover");
}

function handleCreateThemeDragLeave(event) {
  event.preventDefault();
  if (DOM.createThemeDropZone)
    DOM.createThemeDropZone.classList.remove("dragover");
}

async function handleCreateThemeDrop(event) {
  event.preventDefault();
  if (DOM.createThemeDropZone)
    DOM.createThemeDropZone.classList.remove("dragover");
  const files = await extractFilesFromDataTransfer(event.dataTransfer);
  if (files.length) {
    handleCreateThemeFiles(files);
  }
}

function handleCreateThemeFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  resetCreateThemeAssets();
  const assets = ensureCreateThemeAssets();
  files.forEach((file) => {
    const category = categorizeThemeAsset(file);
    if (!category) return;
    assets[category].push(file);
  });
  updateCreateThemeSummary();
}

function categorizeThemeAsset(file) {
  const rel = (
    file.webkitRelativePath ||
    file._relativePath ||
    file.name ||
    ""
  ).toLowerCase();
  if (rel.includes("overlay")) return "overlays";
  if (rel.includes("template")) return "templates";
  if (rel.includes("background")) return "backgrounds";
  if (rel.includes("logo")) return "logos";
  return null;
}

async function extractFilesFromDataTransfer(dataTransfer) {
  const files = [];
  if (!dataTransfer) return files;
  if (dataTransfer.items && dataTransfer.items.length) {
    const items = Array.from(dataTransfer.items).filter(
      (item) => item.kind === "file"
    );
    const nested = await Promise.all(
      items.map(async (item) => {
        const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
        if (entry) {
          return traverseFileEntry(entry).catch(() => []);
        }
        const file = item.getAsFile();
        return file ? [file] : [];
      })
    );
    nested.forEach((list) => files.push(...list));
  } else if (dataTransfer.files && dataTransfer.files.length) {
    files.push(...Array.from(dataTransfer.files));
  }
  return files;
}

function readAllDirectoryEntries(reader) {
  return new Promise((resolve) => {
    const entries = [];
    const readEntries = () => {
      reader.readEntries(
        (batch) => {
          if (!batch.length) {
            resolve(entries);
          } else {
            entries.push(...batch);
            readEntries();
          }
        },
        () => resolve(entries)
      );
    };
    readEntries();
  });
}

async function traverseFileEntry(entry, path = "") {
  if (entry.isFile) {
    const file = await new Promise((resolve, reject) =>
      entry.file(resolve, reject)
    ).catch(() => null);
    if (!file) return [];
    file._relativePath = path + entry.name;
    return [file];
  }
  if (entry.isDirectory) {
    const entries = await readAllDirectoryEntries(entry.createReader());
    const nested = await Promise.all(
      entries.map((ent) => traverseFileEntry(ent, path + entry.name + "/"))
    );
    return nested.flat();
  }
  return [];
}

async function confirmCreateTheme() {
  const name =
    valueFromInput(DOM.createThemeName) || valueFromInput(DOM.themeName);
  const slug = slugifyThemeName(name);
  if (!slug) {
    alert("Enter a valid name for the new theme.");
    return;
  }
  if (themes[slug]) {
    alert("A theme with that name already exists.");
    return;
  }
  const assets = ensureCreateThemeAssets();
  const hasAny =
    assets.backgrounds.length +
      assets.overlays.length +
      assets.templates.length +
      assets.logos.length >
    0;
  if (!hasAny) {
    const proceed = confirm("No assets were detected. Create an empty theme?");
    if (!proceed) return;
  }
  const baseTheme = cloneThemeValue(BUILTIN_THEMES.general.themes.basic || {});
  const newTheme = mergePlainObject(baseTheme, {});
  newTheme.name = name;
  newTheme.background = "";
  newTheme.backgrounds = [];
  newTheme.overlays = [];
  newTheme.templates = [];
  newTheme.logo = "";
  newTheme.overlaysFolder = "";
  newTheme.templatesFolder = "";
  newTheme.welcome = mergePlainObject(
    baseTheme.welcome || {},
    newTheme.welcome || {}
  );
  newTheme.welcome.title = newTheme.welcome.title || name;

  const tasks = [];
  const existingGlobalLogo = getGlobalLogo();
  assets.backgrounds.forEach((file, index) => {
    tasks.push(
      uploadAsset(file, "backgrounds").then((url) => {
        if (!url) return;
        ensureArray(newTheme, "backgrounds");
        newTheme.backgrounds.push(url);
        if (!newTheme.background) newTheme.background = url;
      })
    );
  });
  assets.overlays.forEach((file) => {
    tasks.push(
      uploadAsset(file, "overlays").then((url) => {
        if (!url) return;
        ensureArray(newTheme, "overlays");
        newTheme.overlays.push(url);
      })
    );
  });
  assets.templates.forEach((file) => {
    tasks.push(
      uploadAsset(file, "templates").then((url) => {
        if (!url) return;
        ensureArray(newTheme, "templates");
        newTheme.templates.push({ src: url, layout: "double_column" });
      })
    );
  });
  if (assets.logos.length) {
    const logoFile = assets.logos[0];
    tasks.push(
      uploadAsset(logoFile, "logo").then((url) => {
        if (url) newTheme.logo = url;
      })
    );
  }

  try {
    await Promise.all(tasks);
    themes[slug] = newTheme;
    if (newTheme.logo) {
      setGlobalLogo(newTheme.logo, { quiet: true, skipSave: true });
    } else if (existingGlobalLogo) {
      newTheme.logo = existingGlobalLogo;
    }
    saveThemesToStorage();
    populateThemeSelector(slug);
    setEventSelection(slug);
    loadTheme(slug);
    if (DOM.themeName) DOM.themeName.value = newTheme.name;
    if (DOM.themeEditorModeSelect) DOM.themeEditorModeSelect.value = "edit";
    setThemeEditorMode("edit");
    hideCreateThemeModal();
    resetCreateThemeModal();
    showToast(`Theme "${name}" created`);
  } catch (err) {
    console.error("Failed to create theme", err);
    alert("Could not create theme. See console for details.");
  }
}

function handleCloneTheme() {
  if (!activeTheme) {
    alert("Select a theme to clone first.");
    return;
  }
  const name = valueFromInput(DOM.themeCloneName);
  const slug = slugifyThemeName(name);
  if (!slug) {
    alert("Enter a name for the cloned theme.");
    return;
  }
  const currentKey = DOM.eventSelect && DOM.eventSelect.value;
  const location = resolveThemeStorage(currentKey);
  const cloned = cloneThemeValue(activeTheme);
  cloned.name = name;
  cloned.welcome = mergePlainObject(
    activeTheme.welcome || {},
    cloned.welcome || {}
  );
  if (cloned.welcome) cloned.welcome.title = cloned.welcome.title || name;

  let newKey = slug;
  if (
    location.bucket &&
    location.parent &&
    typeof location.parent === "object"
  ) {
    if (!location.parent[location.bucket])
      location.parent[location.bucket] = {};
    if (location.parent[location.bucket][slug]) {
      alert("A theme with that name already exists in this category.");
      return;
    }
    location.parent[location.bucket][slug] = cloned;
    newKey = `${location.root}:${slug}`;
  } else {
    if (themes[slug]) {
      alert("A theme with that name already exists.");
      return;
    }
    themes[slug] = cloned;
  }

  saveThemesToStorage();
  populateThemeSelector(newKey);
  setEventSelection(newKey);
  loadTheme(newKey);
  if (DOM.themeCloneName) DOM.themeCloneName.value = "";
  if (DOM.themeEditorModeSelect) DOM.themeEditorModeSelect.value = "edit";
  setThemeEditorMode("edit");
  showToast(`Cloned theme as "${name}"`);
}

function applyThemeBasicsFromEditor(target) {
  target.name = valueFromInput(DOM.themeName) || target.name;
  target.accent = valueFromInput(DOM.themeAccent) || target.accent;
  target.accent2 = valueFromInput(DOM.themeAccent2) || target.accent2;
  const picker = getFontPickerSelection();
  if (picker.heading) {
    target.fontHeading = composeFontString(picker.heading);
    ensureFontLoaded(picker.heading, false);
  }
  if (picker.body) {
    target.fontBody = composeFontString(picker.body);
    ensureFontLoaded(picker.body, false);
  }
  target.font = composeFontString(
    picker.body ||
      picker.heading ||
      primaryFontFamily(target.font || "") ||
      "Comic Neue"
  );
  target.welcome = target.welcome || {};
  if (DOM.themeWelcomeTitle) target.welcome.title = DOM.themeWelcomeTitle.value;
  else if (typeof target.welcome.title !== "string") target.welcome.title = "";
  if (DOM.themeWelcomePrompt)
    target.welcome.prompt = DOM.themeWelcomePrompt.value;
  else if (typeof target.welcome.prompt !== "string")
    target.welcome.prompt = "";
}

function resolveEventLogo(theme) {
  const active = getActiveEvent();
  if (activeSessionAssets.logo) return activeSessionAssets.logo;
  if (active && typeof active.logo === "string" && active.logo)
    return active.logo;
  return theme && theme.logo ? theme.logo : "";
}

function applyCharacterPosition(theme) {
  const pos = getCharacterPosition(theme);
  document.documentElement.style.setProperty("--char-x", `${pos.left}%`);
  document.documentElement.style.setProperty("--char-bottom", `${pos.bottom}%`);
  document.documentElement.style.setProperty("--char-height", `${pos.height}%`);
  if (DOM.characterXInput) DOM.characterXInput.value = String(pos.left);
  if (DOM.characterXValue) DOM.characterXValue.textContent = `${pos.left}%`;
  if (DOM.characterBottomInput)
    DOM.characterBottomInput.value = String(pos.bottom);
  if (DOM.characterBottomValue)
    DOM.characterBottomValue.textContent = `${pos.bottom}%`;
  if (DOM.characterHeightInput)
    DOM.characterHeightInput.value = String(pos.height);
  if (DOM.characterHeightValue)
    DOM.characterHeightValue.textContent = `${pos.height}%`;
}

function normalizeFolderInput(raw) {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";
  return trimmed.endsWith("/") ? trimmed : trimmed + "/";
}

function readThemeFolderInputs() {
  return {
    overlays: DOM.themeOverlaysFolder
      ? normalizeFolderInput(valueFromInput(DOM.themeOverlaysFolder))
      : null,
    templates: DOM.themeTemplatesFolder
      ? normalizeFolderInput(valueFromInput(DOM.themeTemplatesFolder))
      : null,
  };
}

function applyThemeFolderSettings(target, folders) {
  if (typeof folders.overlays !== "undefined" && folders.overlays !== null) {
    if (folders.overlays) target.overlaysFolder = folders.overlays;
    else delete target.overlaysFolder;
  }
  if (typeof folders.templates !== "undefined" && folders.templates !== null) {
    if (folders.templates) target.templatesFolder = folders.templates;
    else delete target.templatesFolder;
  }
}

function ensureArray(target, prop) {
  if (!Array.isArray(target[prop])) target[prop] = [];
}

async function uploadThemeAssetsFromEditor(target) {
  const tasks = [];
  let backgroundsAdded = 0;
  let greenBackgroundsAdded = 0;
  let overlaysAdded = 0;
  let templatesAdded = 0;
  let logoUrl = "";
  let characterUrl = "";

  const backgroundFile =
    DOM.themeBackground && DOM.themeBackground.files
      ? DOM.themeBackground.files[0]
      : null;
  if (backgroundFile) {
    tasks.push(
      uploadAsset(backgroundFile, "backgrounds").then((url) => {
        if (!url) return;
        if (Array.isArray(target.backgrounds)) target.backgrounds.push(url);
        else if (target.background) {
          target.backgrounds = [target.background, url];
          delete target.backgroundIndex;
        } else target.background = url;
        backgroundsAdded += 1;
      })
    );
  }

  const greenBackgroundFiles =
    DOM.themeGreenBackgrounds && DOM.themeGreenBackgrounds.files
      ? Array.from(DOM.themeGreenBackgrounds.files)
      : [];
  if (greenBackgroundFiles.length) {
    if (!Array.isArray(target.greenBackgrounds)) target.greenBackgrounds = [];
    greenBackgroundFiles.forEach((file) => {
      tasks.push(
        uploadAsset(file, "greenBackgrounds").then((url) => {
          if (!url) return;
          target.greenBackgrounds.push(url);
          greenBackgroundsAdded += 1;
        })
      );
    });
  }

  const logoFile =
    DOM.themeLogo && DOM.themeLogo.files ? DOM.themeLogo.files[0] : null;
  if (logoFile) {
    tasks.push(
      uploadAsset(logoFile, "logo").then((url) => {
        if (!url) return;
        target.logo = url;
        logoUrl = url;
      })
    );
  }

  const overlayFiles =
    DOM.themeOverlays && DOM.themeOverlays.files
      ? Array.from(DOM.themeOverlays.files)
      : [];
  if (overlayFiles.length) {
    ensureArray(target, "overlays");
    overlayFiles.forEach((file) => {
      tasks.push(
        uploadAsset(file, "overlays").then((url) => {
          if (!url) return;
          target.overlays.push(url);
          overlaysAdded += 1;
        })
      );
    });
  }

  const templateFiles =
    DOM.themeTemplates && DOM.themeTemplates.files
      ? Array.from(DOM.themeTemplates.files)
      : [];
  if (templateFiles.length) {
    ensureArray(target, "templates");
    templateFiles.forEach((file) => {
      tasks.push(
        uploadAsset(file, "templates").then((url) => {
          if (!url) return;
          target.templates.push({ src: url, layout: "double_column" });
          templatesAdded += 1;
        })
      );
    });
  }

  await Promise.all(tasks);
  return {
    backgroundsAdded,
    greenBackgroundsAdded,
    overlaysAdded,
    templatesAdded,
    logoUrl,
  };
}

function clearThemeFileInputs() {
  if (DOM.themeBackground) DOM.themeBackground.value = "";
  if (DOM.themeLogo) DOM.themeLogo.value = "";
  if (DOM.themeGreenBackgrounds) DOM.themeGreenBackgrounds.value = "";
  if (DOM.themeOverlays) DOM.themeOverlays.value = "";
  if (DOM.themeTemplates) DOM.themeTemplates.value = "";
}

// --- De-duplication helpers ---
function arrayUniqueStrings(arr) {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  const out = [];
  for (const v of arr) {
    const s = (v || "").toString().trim();
    if (!s) continue;
    if (!seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}
function arrayUniqueTemplates(arr) {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  const out = [];
  for (const t of arr) {
    if (!t || !t.src) continue;
    const s = t.src.toString().trim();
    if (!s) continue;
    if (!seen.has(s)) {
      seen.add(s);
      out.push({
        ...cloneThemeValue(t),
        src: s,
        layout: normalizeTemplateLayout(t.layout || "double_column"),
        slots: t.slots,
        photoSlots: t.photoSlots,
        background: t.background,
        foreground: t.foreground,
        textFields: normalizeTemplateTextFields(t.textFields),
      });
    }
  }
  return out;
}
function normalizeThemeObject(t) {
  if (!t || typeof t !== "object") return;
  if (typeof t.name === "string") t.name = normalizeThemeName(t.name);
  if (Array.isArray(t.overlays)) t.overlays = arrayUniqueStrings(t.overlays);
  if (Array.isArray(t.templates))
    t.templates = arrayUniqueTemplates(t.templates);
  // Background normalization: ensure index in range
  const list = Array.isArray(t.backgrounds)
    ? t.backgrounds.filter(Boolean)
    : t.background
    ? [t.background]
    : [];
  if (Array.isArray(t.backgrounds)) {
    t.backgrounds = arrayUniqueStrings(list);
    if (typeof t.backgroundIndex === "number") {
      t.backgroundIndex = Math.min(
        Math.max(t.backgroundIndex, 0),
        Math.max(t.backgrounds.length - 1, 0)
      );
    }
  } else if (
    t.background &&
    typeof t.background === "string" &&
    !t.background.trim()
  ) {
    t.background = "";
  }
  const baseFont = typeof t.font === "string" && t.font.trim() ? t.font : "";
  if ((!t.fontHeading || !t.fontHeading.trim()) && baseFont)
    t.fontHeading = baseFont;
  if ((!t.fontBody || !t.fontBody.trim()) && baseFont) t.fontBody = baseFont;
  if (!t.fontHeading && t.fontBody) t.fontHeading = t.fontBody;
  if (!t.fontBody && t.fontHeading) t.fontBody = t.fontHeading;
  if (!t.font || !t.font.trim())
    t.font = t.fontBody || t.fontHeading || "'Comic Neue', cursive";
}

function normalizeThemeName(value = "") {
  return String(value)
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/[\u200D\uFE0F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAllThemes() {
  const keys = Object.keys(themes || {});
  for (const k of keys) {
    const group = themes[k];
    if (!group || typeof group !== "object") continue;
    if (typeof group.name === "string") group.name = normalizeThemeName(group.name);
    if (group.themes || group.holidays) {
      const dict = group.themes || group.holidays;
      for (const sk in dict) normalizeThemeObject(dict[sk]);
    } else {
      normalizeThemeObject(group);
    }
  }
}

function removeLegacyFlatBuiltinThemes() {
  let removed = false;
  for (const key of Object.keys(themes || {})) {
    const theme = themes[key];
    if (
      BUILTIN_THEME_LOCATIONS[key] &&
      theme &&
      typeof theme === "object" &&
      !theme.themes &&
      !theme.holidays
    ) {
      delete themes[key];
      removed = true;
    }
  }
  return removed;
}

const ASSET_DEFAULT_REPAIR_VERSION = 3;

function repairCorruptedBackgroundDefaults() {
  if (!themes || typeof themes !== "object") return false;
  if (!themes._meta || typeof themes._meta !== "object") themes._meta = {};
  if (themes._meta.assetDefaultRepairVersion >= ASSET_DEFAULT_REPAIR_VERSION)
    return false;
  const globalCatalog = new Set(getAllThemeBackgroundCatalogList());
  let repaired = false;
  forEachThemeEntry((theme) => {
    const backgrounds = Array.isArray(theme.backgrounds)
      ? theme.backgrounds.filter(Boolean)
      : [];
    const selected = new Set(backgrounds);
    const catalog = new Set(getThemeBackgroundCatalogList(theme));
    const folderBackedTheme =
      typeof theme.background === "string" && theme.background.trim().endsWith("/");
    if (
      (folderBackedTheme &&
        isCompleteBackgroundCatalogSelection(backgrounds, catalog)) ||
      isCompleteBackgroundCatalogSelection(backgrounds, globalCatalog)
    ) {
      theme.backgrounds = [];
      repaired = true;
    }
  });
  themes._meta.assetDefaultRepairVersion = ASSET_DEFAULT_REPAIR_VERSION;
  return repaired;
}

function forEachThemeEntry(callback) {
  if (!themes || typeof themes !== "object" || typeof callback !== "function")
    return;
  const visit = (collection, prefix = "") => {
    if (!collection || typeof collection !== "object") return;
    for (const key of Object.keys(collection)) {
      if (key === "_meta") continue;
      const value = collection[key];
      if (!value || typeof value !== "object") continue;
      const nextKey = prefix ? `${prefix}:${key}` : key;
      if (value.themes || value.holidays) {
        if (value.themes) visit(value.themes, nextKey);
        if (value.holidays) visit(value.holidays, nextKey);
      } else {
        callback(value, nextKey);
      }
    }
  };
  visit(themes);
}

function applyGlobalLogoToTheme(theme, logo) {
  if (!theme || typeof theme !== "object") return;
  if (typeof logo !== "string") return;
  theme.logo = logo;
}

function applyGlobalLogoToAllThemes(logo) {
  if (typeof logo !== "string") return;
  forEachThemeEntry((theme) => applyGlobalLogoToTheme(theme, logo));
}

function getGlobalLogo() {
  try {
    const value = localStorage.getItem(GLOBAL_LOGO_STORAGE_KEY);
    return value === null ? null : value;
  } catch (_) {
    return null;
  }
}

function setGlobalLogo(logo, options = {}) {
  const value = typeof logo === "string" ? logo : "";
  try {
    if (value) localStorage.setItem(GLOBAL_LOGO_STORAGE_KEY, value);
    else localStorage.removeItem(GLOBAL_LOGO_STORAGE_KEY);
  } catch (_) {}
  applyGlobalLogoToAllThemes(value);
  if (activeTheme) {
    applyGlobalLogoToTheme(activeTheme, value);
    renderCurrentAssets(activeTheme);
  }
  if (DOM.logo) DOM.logo.src = value || "";
  if (!options.skipSave) saveThemesToStorage();
  if (!options.quiet)
    showToast(
      value ? "Logo applied to all themes" : "Logo cleared for all themes"
    );
}

// Update only the font for the currently selected theme and persist to storage
function updateCurrentThemeFont() {
  const selection = getFontPickerSelection();
  if (!selection.heading && !selection.body) {
    alert("Choose heading and body fonts first.");
    return;
  }
  applyFontSelection(
    selection.heading || selection.body,
    selection.body || selection.heading,
    { keepPairing: true }
  );
}

// --- Remove asset handlers ---
function removeBackground() {
  const key = DOM.eventSelect.value;
  const t = getSelectedThemeTarget();
  if (!t) return;
  const overrides = getActiveEventOverrides();
  const eventList = Array.isArray(overrides.backgrounds)
    ? overrides.backgrounds.filter(Boolean)
    : [];
  const selected = getActiveBackground(t);
  if (selected && eventList.includes(selected)) {
    const idx = eventList.indexOf(selected);
    overrides.backgrounds.splice(idx, 1);
    if (overrides.backgroundIndex >= overrides.backgrounds.length)
      overrides.backgroundIndex = 0;
    updateActiveEventDetails({ overrides });
    applyThemeBackground(t);
    renderCurrentAssets(t);
    scheduleLocalAssetCleanup(selected);
    showToast("Event background removed");
    return;
  }
  if (!selected) return;
  const themeSources = getThemeAssetSourceSet("background", t);
  if (themeSources.has(selected)) {
    removeSessionAssetBySrc("background", selected);
    applyThemeBackground(t);
    renderCurrentAssets(t);
    renderAssetLibrary();
    updateCreatePathAssetSummary();
    updateLaunchSummary();
    scheduleLocalAssetCleanup(selected);
    showToast("Session background removed");
    return;
  }
  scheduleLocalAssetCleanup(selected);
  showToast("Background removed");
}
function removeBackgroundAt(index) {
  const key = DOM.eventSelect.value;
  const t = getSelectedThemeTarget();
  if (!t) return;
  const overrides = getActiveEventOverrides();
  const eventList = Array.isArray(overrides.backgrounds)
    ? overrides.backgrounds.filter(Boolean)
    : [];
  const combined = getBackgroundList(t).filter(Boolean);
  if (index < 0 || index >= combined.length) return;
  const selected = combined[index];
  const sessionList = Array.isArray(activeSessionAssets.backgrounds)
    ? activeSessionAssets.backgrounds.filter(Boolean)
    : [];
  if (sessionList.includes(selected) || getThemeAssetSourceSet("background", t).has(selected)) {
    removeSessionAssetBySrc("background", selected);
    applyThemeBackground(t);
    renderCurrentAssets(t);
    updateCreatePathAssetSummary();
    updateLaunchSummary();
    scheduleLocalAssetCleanup(selected);
    showToast("Session background removed");
    return;
  }
  if (eventList.includes(selected)) {
    const removeIdx = eventList.indexOf(selected);
    overrides.backgrounds.splice(removeIdx, 1);
    if (overrides.backgroundIndex >= overrides.backgrounds.length)
      overrides.backgroundIndex = 0;
    updateActiveEventDetails({ overrides });
    applyThemeBackground(t);
    renderCurrentAssets(t);
    scheduleLocalAssetCleanup(selected);
    showToast("Event background removed");
    return;
  }
  const baseList = getBaseBackgroundList(t);
  const baseIndex = baseList.indexOf(selected);
  if (baseIndex < 0) return;
  if (!Array.isArray(t.backgrounds)) t.backgrounds = baseList.slice();
  if (t.backgrounds[baseIndex])
    pushRemoved(key, "background", t.backgrounds[baseIndex], baseIndex);
  t.backgrounds.splice(baseIndex, 1);
  if (t.backgrounds.length === 0) {
    t.background = "";
    delete t.backgrounds;
    delete t.backgroundIndex;
  } else {
    if (typeof t.backgroundIndex !== "number") t.backgroundIndex = 0;
    if (baseIndex <= t.backgroundIndex)
      t.backgroundIndex = Math.max(0, t.backgroundIndex - 1);
    t.background = t.backgrounds[t.backgroundIndex] || "";
  }
  saveThemesToStorage();
  loadTheme(key);
  scheduleLocalAssetCleanup(selected);
}
function setBackgroundIndex(index) {
  const key = DOM.eventSelect.value;
  const t = getSelectedThemeTarget();
  if (!t) return;
  const overrides = getActiveEventOverrides();
  const sessionList = Array.isArray(activeSessionAssets.backgrounds)
    ? activeSessionAssets.backgrounds.filter(Boolean)
    : [];
  const eventList = Array.isArray(overrides.backgrounds)
    ? overrides.backgrounds.filter(Boolean)
    : [];
  const baseList = getBaseBackgroundList(t);
  const combined = mergeUniqueUrls(sessionList, mergeUniqueUrls(eventList, baseList));
  if (index < 0 || index >= combined.length) return;
  const selected = combined[index];
  const sessionIndex = sessionList.indexOf(selected);
  if (sessionIndex >= 0) {
    activeSessionAssets.backgroundIndex = sessionIndex;
    applyThemeBackground(t);
    renderCurrentAssets(t);
    showToast("Session background selected");
    return;
  }
  const eventIndex = eventList.indexOf(selected);
  if (eventIndex >= 0) {
    overrides.backgroundIndex = eventIndex;
    delete overrides.useBaseBackgroundIndex;
    updateActiveEventDetails({ overrides });
    applyThemeBackground(t);
    renderCurrentAssets(t);
    showToast("Event background selected");
    return;
  }
  const baseIndex = baseList.indexOf(selected);
  if (baseIndex < 0) return;
  if (eventList.length) {
    overrides.useBaseBackgroundIndex = baseIndex;
    updateActiveEventDetails({ overrides });
    applyThemeBackground(t);
    renderCurrentAssets(t);
    showToast("Background selected");
    return;
  }
  t.backgrounds = baseList.slice();
  t.background = t.backgrounds[baseIndex] || "";
  t.backgroundIndex = baseIndex;
  // Refresh live booth background immediately when editing the active theme
  if (activeTheme === t) {
    applyThemeBackground(t);
    renderCurrentAssets(t);
  }
  saveThemesToStorage();
  showToast("Background selected");
}
function removeLogo() {
  const key = DOM.eventSelect && DOM.eventSelect.value;
  if (!key) {
    alert("Select a theme first.");
    return;
  }
  const currentLogo = getGlobalLogo();
  if (!currentLogo) {
    showToast("No shared logo to remove");
    return;
  }
  pushRemoved(key, "logo", currentLogo, 0);
  setGlobalLogo("", { quiet: true, skipSave: true });
  saveThemesToStorage();
  loadTheme(key);
  scheduleLocalAssetCleanup(currentLogo);
  showToast("Logo removed from all themes");
}
function removeOverlay(index) {
  const key = DOM.eventSelect.value;
  const t = getSelectedThemeTarget();
  if (!t) return;
  const list = getEffectiveOverlayList(t);
  const removed = list[index];
  const src = getAssetEntrySrc(removed);
  if (!src) return;
  if (
    Array.isArray(activeSessionAssets.overlays) &&
    activeSessionAssets.overlays.some((item) => getAssetEntrySrc(item) === src)
  ) {
    removeSessionAssetBySrc("overlay", src);
    renderOptions();
    renderCurrentAssets(activeTheme);
    renderAssetLibrary();
    updateCreatePathAssetSummary();
    updateLaunchSummary();
    scheduleLocalAssetCleanup(src);
    showToast("Session overlay removed");
    return;
  }
  if (getThemeAssetSourceSet("overlay", t).has(src)) {
    addSessionRemovedAsset("overlay", src);
    renderOptions();
    renderCurrentAssets(activeTheme);
    renderAssetLibrary();
    updateCreatePathAssetSummary();
    updateLaunchSummary();
    scheduleLocalAssetCleanup(src);
    showToast("Session overlay removed");
    return;
  }
  if (!Array.isArray(t.overlays)) return;
  const localIndex = t.overlays.findIndex(
    (item) => (typeof item === "string" ? item : item && item.src) === src
  );
  if (localIndex < 0) return;
  const removedLocal = t.overlays.splice(localIndex, 1)[0];
  pushRemoved(key, "overlay", removedLocal, localIndex);
  saveThemesToStorage();
  loadTheme(key);
  scheduleLocalAssetCleanup(src);
  showToast("Overlay removed");
}
function removeTemplate(index) {
  const key = DOM.eventSelect.value;
  const t = getSelectedThemeTarget();
  if (!t) return;
  const list = getEffectiveTemplateList(t);
  const removed = list[index];
  const src = getAssetEntrySrc(removed);
  if (!src) return;
  if (
    Array.isArray(activeSessionAssets.templates) &&
    activeSessionAssets.templates.some((item) => getAssetEntrySrc(item) === src)
  ) {
    removeSessionAssetBySrc("template", src);
    renderOptions();
    renderCurrentAssets(activeTheme);
    renderAssetLibrary();
    updateCreatePathAssetSummary();
    updateLaunchSummary();
    scheduleLocalAssetCleanup(src);
    showToast("Session template removed");
    return;
  }
  if (getThemeAssetSourceSet("template", t).has(src)) {
    addSessionRemovedAsset("template", src);
    renderOptions();
    renderCurrentAssets(activeTheme);
    renderAssetLibrary();
    updateCreatePathAssetSummary();
    updateLaunchSummary();
    scheduleLocalAssetCleanup(src);
    showToast("Session template removed");
    return;
  }
  if (!Array.isArray(t.templates)) return;
  const localIndex = t.templates.findIndex(
    (item) => (typeof item === "string" ? item : item && item.src) === src
  );
  if (localIndex < 0) return;
  const removedLocal = t.templates.splice(localIndex, 1)[0];
  pushRemoved(key, "template", removedLocal, localIndex);
  saveThemesToStorage();
  loadTheme(key);
  scheduleLocalAssetCleanup(src);
  showToast("Template removed");
}

function removeEventOverlay(src) {
  const active = getActiveEvent();
  if (!active) return;
  const overrides = ensureEventOverrides(active);
  overrides.overlays = overrides.overlays.filter((item) => item !== src);
  updateActiveEventDetails({ overrides });
  renderOptions();
  renderCurrentAssets(activeTheme);
  scheduleLocalAssetCleanup(src);
  showToast("Event overlay removed");
}

function removeEventTemplate(src) {
  const active = getActiveEvent();
  if (!active) return;
  const overrides = ensureEventOverrides(active);
  overrides.templates = overrides.templates.filter((item) =>
    typeof item === "string" ? item !== src : item && item.src !== src
  );
  updateActiveEventDetails({ overrides });
  renderOptions();
  renderCurrentAssets(activeTheme);
  scheduleLocalAssetCleanup(src);
  showToast("Event template removed");
}

function getThemeAssetSourceSet(kind, theme) {
  const target = theme && typeof theme === "object" ? theme : null;
  if (kind === "background") {
    return new Set(getSelectedBackgroundSourceList(target));
  }
  if (kind === "overlay") {
    return new Set(
      getBaseOverlayList(target)
        .map((item) => getAssetEntrySrc(item))
        .filter(Boolean)
    );
  }
  if (kind === "template") {
    return new Set(
      getBaseTemplateList(target)
        .map((item) => getAssetEntrySrc(item))
        .filter(Boolean)
    );
  }
  return new Set();
}

function removeSessionAssetBySrc(kind, src) {
  const cleanSrc = getAssetEntrySrc(src);
  if (!cleanSrc) return;
  const baseTheme = activeTheme || getSelectedThemeTarget();
  const themeSources = getThemeAssetSourceSet(kind, baseTheme);
  if (kind === "background") {
    activeSessionAssets.backgrounds = activeSessionAssets.backgrounds.filter(
      (item) => getAssetEntrySrc(item) !== cleanSrc
    );
    if (
      activeSessionAssets.backgroundIndex >= activeSessionAssets.backgrounds.length
    ) {
      activeSessionAssets.backgroundIndex = Math.max(
        0,
        activeSessionAssets.backgrounds.length - 1
      );
    }
  } else if (kind === "overlay") {
    activeSessionAssets.overlays = activeSessionAssets.overlays.filter(
      (item) => getAssetEntrySrc(item) !== cleanSrc
    );
  } else if (kind === "template") {
    activeSessionAssets.templates = activeSessionAssets.templates.filter(
      (item) => getAssetEntrySrc(item) !== cleanSrc
    );
  }
  if (themeSources.has(cleanSrc)) addSessionRemovedAsset(kind, cleanSrc);
  else clearSessionRemovedAsset(kind, cleanSrc);
}

function removeSessionOverlay(src) {
  removeSessionAssetBySrc("overlay", src);
  renderOptions();
  renderCurrentAssets(activeTheme);
  renderAssetLibrary();
  updateCreatePathAssetSummary();
  updateLaunchSummary();
  scheduleLocalAssetCleanup(src);
  showToast("Session overlay removed");
}

function removeSessionBackground(src) {
  removeSessionAssetBySrc("background", src);
  applyThemeBackground(activeTheme);
  renderOptions();
  renderCurrentAssets(activeTheme);
  renderAssetLibrary();
  updateCreatePathAssetSummary();
  updateLaunchSummary();
  scheduleLocalAssetCleanup(src);
  showToast("Session background removed");
}

function removeSessionTemplate(src) {
  removeSessionAssetBySrc("template", src);
  renderOptions();
  renderCurrentAssets(activeTheme);
  renderAssetLibrary();
  updateCreatePathAssetSummary();
  updateLaunchSummary();
  scheduleLocalAssetCleanup(src);
  showToast("Session template removed");
}

// Hide a folder-based overlay/template by adding it to a per-theme blocklist
function removeFolderOverlay(src) {
  const key = DOM.eventSelect.value;
  const t = getSelectedThemeTarget();
  if (!t) return;
  if (!Array.isArray(t.overlaysRemoved)) t.overlaysRemoved = [];
  if (!t.overlaysRemoved.includes(src)) t.overlaysRemoved.push(src);
  pushRemoved(key, "overlay-removed", src, -1);
  saveThemesToStorage();
  loadTheme(key);
  showToast("Overlay hidden");
}
function removeFolderBackground(src) {
  const key = DOM.eventSelect.value;
  const t = getSelectedThemeTarget();
  if (!t) return;
  if (!Array.isArray(t.backgroundsRemoved)) t.backgroundsRemoved = [];
  if (!t.backgroundsRemoved.includes(src)) t.backgroundsRemoved.push(src);
  pushRemoved(key, "background-removed", src, -1);
  saveThemesToStorage();
  loadTheme(key);
  showToast("Background hidden");
}
function removeFolderTemplate(src) {
  const key = DOM.eventSelect.value;
  const t = getSelectedThemeTarget();
  if (!t) return;
  if (!Array.isArray(t.templatesRemoved)) t.templatesRemoved = [];
  if (!t.templatesRemoved.includes(src)) t.templatesRemoved.push(src);
  pushRemoved(key, "template-removed", src, -1);
  saveThemesToStorage();
  loadTheme(key);
  showToast("Template hidden");
}

function reorderAssets(kind, from, to) {
  const key = DOM.eventSelect.value;
  const t = getSelectedThemeTarget();
  if (!t) return;
  const arr = kind === "overlay" ? t.overlays : t.templates;
  if (!Array.isArray(arr)) return;
  const len = arr.length;
  if (from < 0 || from >= len || to < 0 || to >= len) return;
  const [moved] = arr.splice(from, 1);
  arr.splice(to, 0, moved);
  saveThemesToStorage();
  loadTheme(key);
  showToast("Order updated");
}

function pushRemoved(key, kind, item, index) {
  removedStack.push({ key, kind, item, index });
  updateUndoUI();
}
function updateUndoUI() {
  const btn = document.getElementById("undoBtn");
  const count = document.getElementById("undoCount");
  if (btn) btn.disabled = removedStack.length === 0;
  if (count)
    count.textContent = removedStack.length ? `(${removedStack.length})` : "";
}
function getThemeByKey(key) {
  if (!key) return null;
  if (key.includes(":")) {
    const [rootKey, subKey] = key.split(":");
    const root = themes[rootKey];
    if (!root) return null;
    if (root.themes && root.themes[subKey]) return root.themes[subKey];
    if (root.holidays && root.holidays[subKey]) return root.holidays[subKey];
    return null;
  }
  return themes[key] || null;
}
function undoLastRemoval() {
  const last = removedStack.pop();
  if (!last) return;
  if (last.kind === "logo") {
    setGlobalLogo(last.item || "", { quiet: true, skipSave: true });
  }
  const t = getThemeByKey(last.key);
  if (!t && last.kind !== "logo") {
    updateUndoUI();
    return;
  }
  if (last.kind === "background" && t) t.background = last.item;
  else if (last.kind === "overlay") {
    if (!Array.isArray(t.overlays)) t.overlays = [];
    const pos = Math.min(last.index, t.overlays.length);
    t.overlays.splice(pos, 0, last.item);
  } else if (last.kind === "template") {
    if (!Array.isArray(t.templates)) t.templates = [];
    const pos = Math.min(last.index, t.templates.length);
    t.templates.splice(pos, 0, last.item);
  } else if (last.kind === "overlay-removed") {
    if (Array.isArray(t.overlaysRemoved))
      t.overlaysRemoved = t.overlaysRemoved.filter((s) => s !== last.item);
  } else if (last.kind === "template-removed") {
    if (Array.isArray(t.templatesRemoved))
      t.templatesRemoved = t.templatesRemoved.filter((s) => s !== last.item);
  } else if (last.kind === "background-removed") {
    if (Array.isArray(t.backgroundsRemoved))
      t.backgroundsRemoved = t.backgroundsRemoved.filter(
        (s) => s !== last.item
      );
  }
  saveThemesToStorage();
  if (DOM.eventSelect && DOM.eventSelect.value === last.key) {
    loadTheme(last.key);
  }
  updateUndoUI();
  showToast("Restored");
}

function getBaseBackgroundList(theme) {
  if (!theme || typeof theme !== "object") return [];
  const removed = new Set(
    Array.isArray(theme.backgroundsRemoved) ? theme.backgroundsRemoved : []
  );
  const explicit = Array.isArray(theme.backgrounds)
    ? theme.backgrounds.filter((src) => src && !removed.has(src))
    : [];
  if (explicit.length) return mergeUniqueUrls(explicit);
  const fallback =
    typeof theme.background === "string" && theme.background.trim()
      ? [theme.background]
      : [];
  return fallback.filter((src) => src && !removed.has(src));
}

function getSelectedBackgroundSourceList(theme) {
  if (!theme || typeof theme !== "object") return [];
  const removed = new Set(
    Array.isArray(theme.backgroundsRemoved) ? theme.backgroundsRemoved : []
  );
  const explicit = Array.isArray(theme.backgrounds)
    ? theme.backgrounds.filter((src) => src && !removed.has(src))
    : [];
  const uniqueExplicit = mergeUniqueUrls(explicit);
  if (uniqueExplicit.length) {
    const catalog = getThemeBackgroundCatalogList(theme);
    const globalCatalog = getAllThemeBackgroundCatalogList();
    if (
      isCompleteBackgroundCatalogSelection(uniqueExplicit, catalog) ||
      isCompleteBackgroundCatalogSelection(uniqueExplicit, globalCatalog)
    )
      return [];
    return uniqueExplicit;
  }
  const fallback =
    typeof theme.background === "string" ? theme.background.trim() : "";
  if (!fallback || fallback.endsWith("/") || removed.has(fallback)) return [];
  return [fallback];
}

function isCompleteBackgroundCatalogSelection(sources, catalog) {
  const selected = new Set(Array.isArray(sources) ? sources : []);
  const catalogSet = catalog instanceof Set ? catalog : new Set(catalog || []);
  return (
    selected.size > 0 &&
    selected.size === catalogSet.size &&
    Array.isArray(sources) &&
    sources.length === selected.size &&
    [...catalogSet].every((src) => selected.has(src))
  );
}

function getEffectiveSelectedBackgroundList(theme) {
  if (!theme || typeof theme !== "object") return [];
  const sessionList = Array.isArray(activeSessionAssets.backgrounds)
    ? activeSessionAssets.backgrounds.filter(Boolean)
    : [];
  if (sessionList.length) return mergeUniqueUrls(sessionList).slice(0, 1);
  const removed = new Set(sessionRemovedBackgrounds.map(getAssetEntrySrc));
  return getSelectedBackgroundSourceList(theme)
    .filter((src) => !removed.has(src))
    .slice(0, 1);
}

function getBackgroundList(theme) {
  const baseList = getEffectiveBackgroundList(theme);
  const overrides = getActiveEventOverrides();
  const eventList = Array.isArray(overrides.backgrounds)
    ? overrides.backgrounds.filter(Boolean)
    : [];
  return mergeUniqueUrls(baseList, eventList);
}

function getThemeBackgroundCatalogList(theme) {
  if (!theme || typeof theme !== "object") return [];
  const removed = new Set(
    Array.isArray(theme.backgroundsRemoved) ? theme.backgroundsRemoved : []
  );
  const explicit = Array.isArray(theme.backgrounds)
    ? theme.backgrounds.filter(Boolean)
    : [];
  const tmp = Array.isArray(theme.backgroundsTmp)
    ? theme.backgroundsTmp.filter(Boolean)
    : [];
  const folder = resolveBackgroundFolderPath(theme);
  const builtin = folder ? getBuiltinFolderStrings(folder) : [];
  const single =
    typeof theme.background === "string" &&
    theme.background.trim() &&
    !theme.background.trim().endsWith("/")
      ? [theme.background.trim()]
      : [];
  return mergeUniqueUrls([...tmp, ...builtin, ...explicit, ...single], [])
    .filter((src) => src && !src.endsWith("/") && !removed.has(src));
}

function getAllThemeBackgroundCatalogList() {
  return getCanonicalAssetCollection("background").map((asset) => asset.url);
}

function getSessionBackgroundPickerList(theme) {
  return mergeUniqueUrls(
    getBackgroundList(theme),
    getCanonicalAssetCollection("background").map((asset) => asset.url)
  );
}

function getGreenBackgroundList(theme) {
  const baseList = Array.isArray(theme && theme.greenBackgrounds)
    ? theme.greenBackgrounds.filter(Boolean)
    : [];
  const overrides = getActiveEventOverrides();
  const sessionList = Array.isArray(activeSessionAssets.greenBackgrounds)
    ? activeSessionAssets.greenBackgrounds.filter(Boolean)
    : [];
  const eventList = Array.isArray(overrides.greenBackgrounds)
    ? overrides.greenBackgrounds.filter(Boolean)
    : [];
  return mergeUniqueUrls(sessionList, mergeUniqueUrls(eventList, baseList));
}

function getActiveBackground(theme) {
  const overrides = getActiveEventOverrides();
  const baseList = getEffectiveBackgroundList(theme);
  if (
    Array.isArray(activeSessionAssets.backgrounds) &&
    activeSessionAssets.backgrounds.length
  ) {
    const idx =
      typeof activeSessionAssets.backgroundIndex === "number"
        ? Math.min(
            Math.max(activeSessionAssets.backgroundIndex, 0),
            activeSessionAssets.backgrounds.length - 1
          )
        : 0;
    return activeSessionAssets.backgrounds[idx];
  }
  if (Number.isFinite(overrides.useBaseBackgroundIndex)) {
    const idx = Math.min(
      Math.max(overrides.useBaseBackgroundIndex, 0),
      baseList.length - 1
    );
    return baseList[idx] || "";
  }
  if (Array.isArray(overrides.backgrounds) && overrides.backgrounds.length) {
    const idx =
      typeof overrides.backgroundIndex === "number"
        ? Math.min(
            Math.max(overrides.backgroundIndex, 0),
            overrides.backgrounds.length - 1
          )
        : 0;
    return overrides.backgrounds[idx];
  }
  if (baseList.length === 0) return "";
  const idx =
    typeof theme.backgroundIndex === "number"
      ? Math.min(Math.max(theme.backgroundIndex, 0), baseList.length - 1)
      : 0;
  return baseList[idx];
}

function setGreenBackgroundIndex(idx) {
  const active = getActiveEvent();
  const target = activeTheme || getSelectedThemeTarget();
  if (!target) return;
  const overrides = getActiveEventOverrides();
  const sessionList = Array.isArray(activeSessionAssets.greenBackgrounds)
    ? activeSessionAssets.greenBackgrounds.filter(Boolean)
    : [];
  const eventList = Array.isArray(overrides.greenBackgrounds)
    ? overrides.greenBackgrounds.filter(Boolean)
    : [];
  const baseList = Array.isArray(target.greenBackgrounds)
    ? target.greenBackgrounds.filter(Boolean)
    : [];
  const combined = mergeUniqueUrls(sessionList, mergeUniqueUrls(eventList, baseList));
  if (idx < 0 || idx >= combined.length) return;
  const selected = combined[idx];
  const sessionIndex = sessionList.indexOf(selected);
  if (sessionIndex >= 0) {
    activeSessionAssets.greenBackgroundIndex = sessionIndex;
    renderCurrentAssets(target);
    renderOptions();
    return;
  }
  const eventIndex = eventList.indexOf(selected);
  if (active) {
    const activeOverrides = ensureEventOverrides(active);
    if (eventIndex >= 0) {
      activeOverrides.greenBackgroundIndex = eventIndex;
      delete activeOverrides.useBaseGreenBackgroundIndex;
    } else {
      const baseIndex = baseList.indexOf(selected);
      if (baseIndex < 0) return;
      if (eventList.length) {
        activeOverrides.useBaseGreenBackgroundIndex = baseIndex;
      } else {
        target.greenBackgroundIndex = baseIndex;
      }
    }
    updateActiveEventDetails({ overrides: activeOverrides });
  } else {
    const baseIndex = baseList.indexOf(selected);
    if (baseIndex < 0) return;
    target.greenBackgroundIndex = baseIndex;
    saveThemesToStorage();
  }
  renderCurrentAssets(target);
  renderOptions();
}

function removeGreenBackgroundAt(idx) {
  const active = getActiveEvent();
  const target = activeTheme || getSelectedThemeTarget();
  if (!target) return;
  const overrides = getActiveEventOverrides();
  const sessionList = Array.isArray(activeSessionAssets.greenBackgrounds)
    ? activeSessionAssets.greenBackgrounds.filter(Boolean)
    : [];
  const eventList = Array.isArray(overrides.greenBackgrounds)
    ? overrides.greenBackgrounds.filter(Boolean)
    : [];
  const baseList = Array.isArray(target.greenBackgrounds)
    ? target.greenBackgrounds.filter(Boolean)
    : [];
  const combined = mergeUniqueUrls(sessionList, mergeUniqueUrls(eventList, baseList));
  if (idx < 0 || idx >= combined.length) return;
  const selected = combined[idx];
  const sessionIndex = sessionList.indexOf(selected);
  if (sessionIndex >= 0) {
    activeSessionAssets.greenBackgrounds.splice(sessionIndex, 1);
    if (
      activeSessionAssets.greenBackgroundIndex >=
      activeSessionAssets.greenBackgrounds.length
    ) {
      activeSessionAssets.greenBackgroundIndex = Math.max(
        0,
        activeSessionAssets.greenBackgrounds.length - 1
      );
    }
    renderCurrentAssets(target);
    updateCreatePathAssetSummary();
    updateLaunchSummary();
    scheduleLocalAssetCleanup(selected);
    return;
  }
  const eventIndex = eventList.indexOf(selected);
  if (active && eventIndex >= 0) {
    const activeOverrides = ensureEventOverrides(active);
    activeOverrides.greenBackgrounds.splice(eventIndex, 1);
    if (
      activeOverrides.greenBackgroundIndex >=
      activeOverrides.greenBackgrounds.length
    ) {
      activeOverrides.greenBackgroundIndex = Math.max(
        0,
        activeOverrides.greenBackgrounds.length - 1
      );
    }
    delete activeOverrides.useBaseGreenBackgroundIndex;
    updateActiveEventDetails({ overrides: activeOverrides });
    renderCurrentAssets(target);
    scheduleLocalAssetCleanup(selected);
    return;
  }
  const baseIndex = baseList.indexOf(selected);
  if (baseIndex < 0) return;
  if (!Array.isArray(target.greenBackgrounds)) return;
  target.greenBackgrounds.splice(baseIndex, 1);
  if (target.greenBackgroundIndex >= target.greenBackgrounds.length) {
    target.greenBackgroundIndex = Math.max(
      0,
      target.greenBackgrounds.length - 1
    );
  }
  saveThemesToStorage();
  renderCurrentAssets(target);
  scheduleLocalAssetCleanup(selected);
}

function getActiveGreenBackground(theme) {
  const overrides = getActiveEventOverrides();
  const baseList = Array.isArray(theme && theme.greenBackgrounds)
    ? theme.greenBackgrounds.filter(Boolean)
    : [];
  if (
    Array.isArray(activeSessionAssets.greenBackgrounds) &&
    activeSessionAssets.greenBackgrounds.length
  ) {
    const idx =
      typeof activeSessionAssets.greenBackgroundIndex === "number"
        ? Math.min(
            Math.max(activeSessionAssets.greenBackgroundIndex, 0),
            activeSessionAssets.greenBackgrounds.length - 1
          )
        : 0;
    return activeSessionAssets.greenBackgrounds[idx];
  }
  if (Number.isFinite(overrides.useBaseGreenBackgroundIndex)) {
    const idx = Math.min(
      Math.max(overrides.useBaseGreenBackgroundIndex, 0),
      baseList.length - 1
    );
    return baseList[idx] || "";
  }
  if (
    Array.isArray(overrides.greenBackgrounds) &&
    overrides.greenBackgrounds.length
  ) {
    const idx =
      typeof overrides.greenBackgroundIndex === "number"
        ? Math.min(
            Math.max(overrides.greenBackgroundIndex, 0),
            overrides.greenBackgrounds.length - 1
          )
        : 0;
    return overrides.greenBackgrounds[idx];
  }
  const list = getGreenBackgroundList(theme);
  if (!list.length) return "";
  const idx =
    typeof theme.greenBackgroundIndex === "number"
      ? Math.min(Math.max(theme.greenBackgroundIndex, 0), list.length - 1)
      : 0;
  return list[idx];
}

function ensureFolderPath(path) {
  if (!path) return "";
  const trimmed = path.trim();
  if (!trimmed) return "";
  return trimmed.endsWith("/") ? trimmed : trimmed + "/";
}

function resolveBackgroundFolderPath(theme) {
  if (!theme || typeof theme !== "object") return "";
  const current = getActiveBackground(theme) || "";
  if (current && current.endsWith("/")) return ensureFolderPath(current);
  if (current) {
    const idx = current.lastIndexOf("/");
    if (idx >= 0) return ensureFolderPath(current.slice(0, idx + 1));
  }
  const backgroundProp =
    typeof theme.background === "string" ? theme.background.trim() : "";
  if (backgroundProp) {
    if (backgroundProp.endsWith("/")) return ensureFolderPath(backgroundProp);
    const idx = backgroundProp.lastIndexOf("/");
    if (idx >= 0) return ensureFolderPath(backgroundProp.slice(0, idx + 1));
  }
  const folderProp =
    typeof theme.backgroundFolder === "string"
      ? theme.backgroundFolder.trim()
      : "";
  if (folderProp) return ensureFolderPath(folderProp);
  return "";
}

// If a theme points its background at a folder (ends with '/'),
// pick the first existing image named one of: background.(png|jpg|jpeg|webp) or bg.(...)
async function resolveBackgroundFromFolder(theme) {
  try {
    const path = resolveBackgroundFolderPath(theme);
    if (!path || !path.endsWith("/")) return "";
    const cached = Array.isArray(theme && theme.backgroundsTmp)
      ? theme.backgroundsTmp.filter(Boolean)
      : [];
    if (cached.length) return cached[0];
    const manifestList = await resolveBackgroundListFromFolder(theme);
    if (Array.isArray(manifestList) && manifestList.length) {
      if (theme && typeof theme === "object")
        theme.backgroundsTmp = manifestList.slice();
      return manifestList[0];
    }
    const names = ["background", "bg", "backdrop", "wallpaper"];
    const exts = ["png", "jpg", "jpeg", "webp"];
    const isFileProto = String(location.protocol).startsWith("file");
    for (const n of names) {
      for (const e of exts) {
        const url = path + n + "." + e;
        try {
          if (isFileProto) {
            // Probe with Image() under file:// since fetch may be blocked
            await probeImage(url);
            return url;
          } else {
            const resp = await fetch(url, { cache: "reload" });
            if (resp && resp.ok) return url;
          }
        } catch (_) {
          /* try next */
        }
      }
    }
    return "";
  } catch (_) {
    return "";
  }
}

// Try to load a list of backgrounds from a folder via backgrounds.json.
// backgrounds.json format: ["file1.jpg", "file2.png", ...] or [{"src":"file1.jpg"}, ...]
function getBuiltinFolderStrings(folder) {
  return getBuiltinAssetManifest(folder)
    .filter((it) => typeof it === "string")
    .map((it) => folder + it);
}

function resolveAssetPath(baseFolder, src) {
  const value = String(src || "").trim();
  if (!value) return value;
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  if (value.startsWith("/")) return value;
  try {
    const folder = ensureFolderPath(String(baseFolder || "").trim());
    return new URL(value, location.origin + "/" + folder).pathname;
  } catch (_) {
    return ensureFolderPath(String(baseFolder || "")) + value;
  }
}

function qualifyAssetPath(path, folder) {
  return resolveAssetPath(folder, path);
}

function qualifyOverlayEntry(entry, folder) {
  if (typeof entry === "string") return resolveAssetPath(folder, entry);
  if (!entry || typeof entry !== "object" || typeof entry.src !== "string") {
    return null;
  }
  const next = {
    ...entry,
    src: qualifyAssetPath(entry.src, folder),
  };
  if (entry.foreground && typeof entry.foreground === "object") {
    next.foreground = {
      ...entry.foreground,
      src: qualifyAssetPath(entry.foreground.src, folder),
    };
  }
  return next;
}

function getBuiltinOverlayEntries(folder) {
  return getBuiltinAssetManifest(folder)
    .map((it) => qualifyOverlayEntry(it, folder))
    .filter(Boolean);
}

function getBuiltinTemplateEntries(folder) {
  return getBuiltinAssetManifest(folder)
    .map((it) => {
      if (typeof it === "string")
        return {
          src: resolveAssetPath(folder, it),
          layout: "double_column",
        };
      if (it && typeof it === "object" && typeof it.src === "string") {
        const entry = { ...it, src: qualifyAssetPath(it.src, folder) };
        entry.layout = normalizeTemplateLayout(entry.layout);
        if (it.foreground && typeof it.foreground === "object") {
          entry.foreground = {
            ...it.foreground,
            src: qualifyAssetPath(it.foreground.src, folder),
          };
        }
        return entry;
      }
      return null;
    })
    .filter(Boolean);
}

function populateAllThemeAssetTmp() {
  forEachThemeEntry((theme) => {
    const bgFolder = theme.backgroundFolder || theme.background || "";
    if (bgFolder) theme.backgroundsTmp = getBuiltinFolderStrings(bgFolder);
    const ovFolder = theme.overlaysFolder || "";
    if (ovFolder) theme.overlaysTmp = getBuiltinOverlayEntries(ovFolder);
    const tpFolder = theme.templatesFolder || "";
    if (tpFolder) theme.templatesTmp = getBuiltinTemplateEntries(tpFolder);
  });
}

function normalizeAssetSlots(slots) {
  if (!Array.isArray(slots)) return [];
  return slots
    .map((slot) => {
      if (!slot || typeof slot !== "object") return null;
      const x = toNumber(slot.x, NaN);
      const y = toNumber(slot.y, NaN);
      const w = toNumber(slot.w, NaN);
      const h = toNumber(slot.h, NaN);
      if (![x, y, w, h].every((value) => Number.isFinite(value))) return null;
      if (w <= 0 || h <= 0) return null;
      return { x, y, w, h };
    })
    .filter(Boolean);
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function parseAspectRatioValue(value) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  const text = String(value || "").trim();
  if (!text) return null;
  if (text.includes(":")) {
    const parts = text.split(":").map((part) => Number.parseFloat(part));
    if (
      parts.length === 2 &&
      Number.isFinite(parts[0]) &&
      Number.isFinite(parts[1]) &&
      parts[0] > 0 &&
      parts[1] > 0
    ) {
      return parts[0] / parts[1];
    }
  }
  const numeric = Number.parseFloat(text);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function buildOverlayIdFromSrc(src) {
  return String(src || "")
    .split(/[\\/]/)
    .pop()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function normalizeOverlayLayerDescriptor(layer, fallbackSrc = "") {
  if (!layer && !fallbackSrc) return null;
  if (typeof layer === "string") {
    return { type: "image", src: layer };
  }
  if (!layer || typeof layer !== "object") {
    return fallbackSrc ? { type: "image", src: fallbackSrc } : null;
  }
  if (layer.type === "color") {
    return {
      type: "color",
      value: String(layer.value || layer.color || "#ffffff"),
    };
  }
  if (layer.type === "image" || layer.src || fallbackSrc) {
    return {
      type: "image",
      src: String(layer.src || layer.value || fallbackSrc || "").trim(),
    };
  }
  return null;
}

function normalizePhotoSlotDescriptor(slot, index = 0) {
  if (!slot || typeof slot !== "object") return null;
  const x = Number(slot.x);
  const y = Number(slot.y);
  const width = Number(slot.width ?? slot.w);
  const height = Number(slot.height ?? slot.h);
  if (![x, y, width, height].every((value) => Number.isFinite(value))) {
    return null;
  }
  const photoSlot = {
    x: clamp01(x),
    y: clamp01(y),
    width: clamp01(width),
    height: clamp01(height),
    borderRadius: clamp01(Number(slot.borderRadius || 0)),
    objectFit: slot.objectFit === "contain" ? "contain" : "cover",
    objectPosition: String(slot.objectPosition || "center").trim() || "center",
  };
  if (Number.isFinite(Number(slot.rotation))) {
    photoSlot.rotation = Number(slot.rotation);
  }
  if (slot.mask) {
    photoSlot.mask = slot.mask;
  }
  if (Number.isFinite(Number(slot.sourceIndex))) {
    photoSlot.sourceIndex = Math.max(0, Math.floor(Number(slot.sourceIndex)));
  } else {
    photoSlot.sourceIndex = index;
  }
  return photoSlot;
}

function normalizeOverlayPhotoSlots(entry) {
  const source = Array.isArray(entry && entry.photoSlots)
    ? entry.photoSlots
    : Array.isArray(entry && entry.slots)
    ? entry.slots
    : [];
  const normalized = source
    .map((slot, index) => normalizePhotoSlotDescriptor(slot, index))
    .filter(Boolean);
  if (normalized.length) return normalized;
  return [
    {
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      borderRadius: 0,
      objectFit: "cover",
      objectPosition: "center",
      sourceIndex: 0,
    },
  ];
}

function hasExplicitPhotoSlots(entry) {
  return Array.isArray(entry && entry.photoSlots) && entry.photoSlots.length > 0;
}

function logTemplateSlotResolution(template, normalizedSlots, outputW, outputH) {
  console.debug("[template-photo-slots]", {
    template: template && (template.src || template.id || template.name),
    rawManifestPhotoSlots: template && template.photoSlots,
    normalizedSlots,
    outputW,
    outputH,
  });
}

function normalizeOverlayDefinition(entry) {
  if (!entry) return null;
  if (typeof entry === "string") {
    const src = getAssetEntrySrc(entry);
    if (!src) return null;
    return {
      id: buildOverlayIdFromSrc(src),
      name: buildOverlayIdFromSrc(src) || src,
      type: "overlay",
      category: "general",
      aspectRatio: null,
      background: null,
      foreground: { type: "image", src },
      photoSlots: normalizeOverlayPhotoSlots({}),
      src,
      renderSrc: src,
    };
  }
  if (typeof entry !== "object") return null;
  const src = getAssetEntrySrc(entry.src) || getAssetEntrySrc(entry.renderSrc);
  if (!src) return null;
  const renderSrc = getAssetEntrySrc(entry.renderSrc) || src;
  const photoSlots = normalizeOverlayPhotoSlots(entry);
  const aspectRatio =
    parseAspectRatioValue(entry.aspectRatio) ||
    parseAspectRatioValue(entry.layoutAspectRatio) ||
    null;
  const foreground = normalizeOverlayLayerDescriptor(
    entry.foreground,
    renderSrc
  );
  const background = normalizeOverlayLayerDescriptor(entry.background, "");
  if (
    foreground &&
    foreground.type === "image" &&
    renderSrc &&
    foreground.src === src &&
    renderSrc !== src
  ) {
    foreground.src = renderSrc;
  }
  const isStrip =
    photoSlots.length > 1 ||
    String(entry.type || entry.layout || src).toLowerCase().includes("strip");
  return {
    ...entry,
    id: String(entry.id || buildOverlayIdFromSrc(src) || src),
    name: String(entry.name || entry.id || buildOverlayIdFromSrc(src) || src),
    type: String(entry.type || (isStrip ? "photo-strip-layout" : "overlay")),
    category: String(entry.category || "general"),
    aspectRatio: aspectRatio ? String(entry.aspectRatio || "") : "",
    background,
    foreground: foreground || { type: "image", src: renderSrc },
    photoSlots,
    src,
    renderSrc,
    slots: Array.isArray(entry.slots) ? entry.slots : undefined,
    textFields: normalizeTemplateTextFields(entry.textFields),
  };
}

function overlayUsesPhotoSlots(overlay) {
  return Array.isArray(overlay && overlay.photoSlots) && overlay.photoSlots.length > 0;
}

function getOverlayAspectRatio(overlay) {
  const parsed = parseAspectRatioValue(overlay && overlay.aspectRatio);
  if (parsed) return parsed;
  return null;
}

function getOverlayEntryBySrc(theme, src) {
  if (!src) return null;
  const list = getOverlayList(theme);
  return (
    list.find((item) => {
      if (!item) return false;
      if (typeof item === "string") return item === src;
      return item.src === src;
    }) || null
  );
}

function resolveOverlayRenderSrc(theme, src) {
  const entry = getOverlayEntryBySrc(theme, src);
  if (
    entry &&
    typeof entry === "object" &&
    entry.foreground &&
    entry.foreground.type === "image" &&
    entry.foreground.src
  ) {
    return entry.foreground.src;
  }
  if (entry && typeof entry === "object" && entry.renderSrc) {
    return entry.renderSrc;
  }
  return src;
}

function resolveOverlaySlots(theme, src) {
  const entry = getOverlayEntryBySrc(theme, src);
  if (!entry || typeof entry !== "object") return [];
  return Array.isArray(entry.photoSlots) ? entry.photoSlots : [];
}

async function resolveBackgroundListFromFolder(theme) {
  try {
    const path = resolveBackgroundFolderPath(theme);
    if (!path || !path.endsWith("/")) return [];
    const cached = Array.isArray(theme && theme.backgroundsTmp)
      ? theme.backgroundsTmp.filter(Boolean)
      : [];
    if (cached.length) return cached.slice();
    const builtin = getBuiltinFolderStrings(path);
    // Only try fetching manifest under http(s). Browsers restrict file:// fetch.
    if (!String(location.protocol).startsWith("http")) {
      if (theme && typeof theme === "object")
        theme.backgroundsTmp = builtin.slice();
      return builtin;
    }
    const manifestUrl = path + "backgrounds.json";
    const resp = await fetch(manifestUrl, { cache: "reload" });
    if (!resp.ok) return builtin;
    const json = await resp.json();
    const out = [];
    if (Array.isArray(json)) {
      for (const it of json) {
        if (typeof it === "string") out.push(path + it);
        else if (it && typeof it === "object" && typeof it.src === "string")
          out.push(path + it.src);
      }
    }
    const resolved = out.length ? out : builtin;
    if (theme && typeof theme === "object")
      theme.backgroundsTmp = resolved.slice();
    return resolved;
  } catch (_) {
    const path = resolveBackgroundFolderPath(theme);
    return getBuiltinFolderStrings(path);
  }
}

function probeImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => reject(new Error("not-found"));
    img.src = url + (url.includes("?") ? "&" : "?") + "v=" + Date.now();
  });
}

const overlaySvgFixCache = new Map();

function readSvgTagAttr(tag, attrName) {
  if (!tag || !attrName) return "";
  const pattern = new RegExp(`${attrName}="([^"]*)"`, "i");
  const match = tag.match(pattern);
  return match ? match[1].trim() : "";
}

function readSvgNumericAttr(tag, attrName) {
  const value = readSvgTagAttr(tag, attrName);
  if (!value) return null;
  const numeric = Number.parseFloat(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function readSvgOpacity(tag) {
  const opacity = readSvgNumericAttr(tag, "opacity");
  if (opacity !== null) return opacity;
  const fillOpacity = readSvgNumericAttr(tag, "fill-opacity");
  if (fillOpacity !== null) return fillOpacity;
  return 1;
}

function getSvgCanvasSize(svgMarkup) {
  if (typeof svgMarkup !== "string" || !svgMarkup.trim()) return null;
  const svgTagMatch = svgMarkup.match(/<svg\b[^>]*>/i);
  const svgTag = svgTagMatch ? svgTagMatch[0] : "";
  if (!svgTag) return null;
  const viewBox = readSvgTagAttr(svgTag, "viewBox");
  if (viewBox) {
    const values = viewBox
      .split(/[\s,]+/)
      .map((part) => Number.parseFloat(part))
      .filter((part) => Number.isFinite(part));
    if (values.length === 4) {
      return { width: values[2], height: values[3] };
    }
  }
  const width = readSvgNumericAttr(svgTag, "width");
  const height = readSvgNumericAttr(svgTag, "height");
  if (width !== null && height !== null) {
    return { width, height };
  }
  return null;
}

function isOpaqueSvgFill(fillValue) {
  const fill = String(fillValue || "").trim().toLowerCase();
  if (!fill) return false;
  if (fill === "none" || fill === "transparent") return false;
  if (fill === "rgba(0,0,0,0)" || fill === "rgba(0, 0, 0, 0)") return false;
  return true;
}

function rectLooksLikePhotoBlockingCover(tag, canvas) {
  const width = readSvgNumericAttr(tag, "width");
  const height = readSvgNumericAttr(tag, "height");
  const x = readSvgNumericAttr(tag, "x") || 0;
  const y = readSvgNumericAttr(tag, "y") || 0;
  const fill = readSvgTagAttr(tag, "fill");
  const stroke = readSvgTagAttr(tag, "stroke");
  if (width === null || height === null) return false;
  const widthRatio = width / canvas.width;
  const heightRatio = height / canvas.height;
  if (widthRatio < 0.85 || heightRatio < 0.85) return false;
  if (Math.abs(x) > canvas.width * 0.1 || Math.abs(y) > canvas.height * 0.1) {
    return false;
  }
  if (!isOpaqueSvgFill(fill)) return false;
  return {
    hasStroke: !!(stroke && stroke.toLowerCase() !== "none"),
    opacity: readSvgOpacity(tag),
  };
}

function svgNeedsPhotoWindowFix(svgMarkup) {
  const canvas = getSvgCanvasSize(svgMarkup);
  if (!canvas) return false;
  const rects = svgMarkup.match(/<rect\b[^>]*>/gi) || [];
  return rects.some((tag) => {
    const cover = rectLooksLikePhotoBlockingCover(tag, canvas);
    return !!(cover && cover.opacity > 0.2);
  });
}

function sanitizeSvgOverlayMarkup(svgMarkup) {
  const canvas = getSvgCanvasSize(svgMarkup);
  if (!canvas) return svgMarkup;
  return svgMarkup.replace(/<rect\b[^>]*>/gi, (tag) => {
    const cover = rectLooksLikePhotoBlockingCover(tag, canvas);
    if (!cover || cover.opacity <= 0.2) return tag;
    if (!cover.hasStroke) return "";
    if (/fill="/i.test(tag)) {
      return tag.replace(/fill="[^"]*"/i, 'fill="none"');
    }
    return tag.replace(/^<rect/i, '<rect fill="none"');
  });
}

function buildSanitizedSvgDataUrl(svgMarkup) {
  return (
    "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svgMarkup)
  );
}

async function getOverlayFixedAsset(entry) {
  const src =
    typeof entry === "string" ? entry : entry && typeof entry.src === "string"
      ? entry.src
      : "";
  if (!src) return entry;
  if (!/\.svg(?:[?#].*)?$/i.test(src)) return entry;
  if (overlaySvgFixCache.has(src)) {
    const cached = overlaySvgFixCache.get(src);
    return typeof entry === "string"
      ? cached.renderSrc === src
        ? src
        : { src, renderSrc: cached.renderSrc }
      : { ...entry, renderSrc: cached.renderSrc };
  }
  try {
    const resp = await fetch(src, { cache: "reload" });
    if (!resp.ok) {
      overlaySvgFixCache.set(src, { renderSrc: src });
      return entry;
    }
    const svgMarkup = await resp.text();
    const renderSrc = svgNeedsPhotoWindowFix(svgMarkup)
      ? buildSanitizedSvgDataUrl(sanitizeSvgOverlayMarkup(svgMarkup))
      : src;
    overlaySvgFixCache.set(src, { renderSrc });
    return typeof entry === "string"
      ? renderSrc === src
        ? src
        : { src, renderSrc }
      : { ...entry, renderSrc };
  } catch (_) {
    overlaySvgFixCache.set(src, { renderSrc: src });
    return entry;
  }
}

async function fixOverlayEntries(entries) {
  const source = Array.isArray(entries) ? entries : [];
  const fixed = [];
  for (const entry of source) {
    fixed.push(await getOverlayFixedAsset(entry));
  }
  return fixed;
}

// Load overlays from a folder using overlays.json manifest (HTTP/HTTPS only)
async function resolveOverlaysFromFolder(theme) {
  try {
    const folder =
      theme && typeof theme.overlaysFolder === "string"
        ? theme.overlaysFolder
        : "";
    if (!folder || !folder.endsWith("/")) return [];
    const builtin = getBuiltinOverlayEntries(folder);
    if (!String(location.protocol).startsWith("http")) {
      return fixOverlayEntries(builtin);
    }
    const url = folder + "overlays.json";
    const resp = await fetch(url, { cache: "reload" });
    if (!resp.ok) return fixOverlayEntries(builtin);
    const json = await resp.json();
    const out = [];
    if (Array.isArray(json)) {
      for (const it of json) {
        const entry = qualifyOverlayEntry(it, folder);
        if (entry) out.push(entry);
      }
    }
    return fixOverlayEntries(out.length ? out : builtin);
  } catch (_) {
    const folder =
      theme && typeof theme.overlaysFolder === "string"
        ? theme.overlaysFolder
        : "";
    return fixOverlayEntries(getBuiltinOverlayEntries(folder));
  }
}

// Load templates from a folder using templates.json manifest (HTTP/HTTPS only)
async function resolveTemplatesFromFolder(theme) {
  try {
    const folder =
      theme && typeof theme.templatesFolder === "string"
        ? theme.templatesFolder
        : "";
    if (!folder || !folder.endsWith("/")) return [];
    const builtin = getBuiltinTemplateEntries(folder);
    if (!String(location.protocol).startsWith("http")) return builtin;
    const url = folder + "templates.json";
    const resp = await fetch(url, { cache: "reload" });
    if (!resp.ok) return builtin;
    const json = await resp.json();
    const out = [];
    if (Array.isArray(json)) {
      for (const it of json) {
        if (typeof it === "string")
          out.push({
            src: resolveAssetPath(folder, it),
            layout: "double_column",
          });
        else if (it && typeof it === "object" && typeof it.src === "string") {
          const entry = {
            ...it,
            src: qualifyAssetPath(it.src, folder),
            layout: normalizeTemplateLayout(it.layout),
            slots: it.slots,
            photoSlots: it.photoSlots,
            background: it.background,
            foreground: it.foreground,
            textFields: normalizeTemplateTextFields(it.textFields),
          };
          if (entry.foreground && typeof entry.foreground === "object") {
            entry.foreground = {
              ...entry.foreground,
              src: qualifyAssetPath(entry.foreground.src, folder),
            };
          }
          out.push(entry);
        }
      }
    }
    return out.length ? out : builtin;
  } catch (_) {
    const folder =
      theme && typeof theme.templatesFolder === "string"
        ? theme.templatesFolder
        : "";
    return getBuiltinTemplateEntries(folder);
  }
}

function copyText(s) {
  try {
    navigator.clipboard.writeText(s);
    showToast("Copied");
  } catch (_) {
    alert("Copy: " + s);
  }
}

// Helpers to derive overlay/template lists from theme + folder manifests
function getBaseOverlayList(theme) {
  if (!theme || typeof theme !== "object") return [];
  const removed = new Set(
    Array.isArray(theme.overlaysRemoved) ? theme.overlaysRemoved : []
  );
  const localArr = Array.isArray(theme.overlays)
    ? theme.overlays
        .map((item) => normalizeOverlayDefinition(item))
        .filter((item) => item && !removed.has(item.src))
    : [];
  const folderArr = Array.isArray(theme.overlaysTmp)
    ? theme.overlaysTmp
        .map((item) => normalizeOverlayDefinition(item))
        .filter((item) => item && !removed.has(item.src))
    : [];
  const seen = new Set();
  const out = [];
  for (const o of [...localArr, ...folderArr]) {
    const k = (o && o.src ? o.src : "").toString().trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(o);
  }
  return out;
}

function getBaseTemplateList(theme) {
  if (!theme || typeof theme !== "object") return [];
  const removed = new Set(
    Array.isArray(theme.templatesRemoved) ? theme.templatesRemoved : []
  );
  const localArr = Array.isArray(theme.templates)
    ? theme.templates
        .filter((t) => t && t.src && !removed.has(t.src))
        .map((t) => ({
          ...cloneThemeValue(t),
          src: t.src,
          layout: normalizeTemplateLayout(t.layout),
          slots: t.slots,
          photoSlots: t.photoSlots,
          background: t.background,
          foreground: t.foreground,
          textFields: normalizeTemplateTextFields(t.textFields),
        }))
    : [];
  const folderArr = Array.isArray(theme.templatesTmp)
    ? theme.templatesTmp
        .filter((t) => t && t.src && !removed.has(t.src))
        .map((t) => ({
          ...cloneThemeValue(t),
          src: t.src,
          layout: normalizeTemplateLayout(t.layout),
          slots: t.slots,
          photoSlots: t.photoSlots,
          background: t.background,
          foreground: t.foreground,
          textFields: normalizeTemplateTextFields(t.textFields),
        }))
    : [];
  const seen = new Set();
  const out = [];
  for (const t of [...localArr, ...folderArr]) {
    const k = (t && t.src ? t.src : "").toString().trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

function getSessionRemovedAssetList(category = "") {
  const normalized = normalizeUploadedAssetCategory(category);
  if (normalized === "background") return sessionRemovedBackgrounds;
  if (normalized === "overlay") return sessionRemovedOverlays;
  if (normalized === "template") return sessionRemovedTemplates;
  return [];
}

function getSessionRemovedAssetSourceSet(category = "") {
  return createAssetSelectionSet(getSessionRemovedAssetList(category));
}

function clearSessionRemovedAsset(category = "", src = "") {
  const normalized = normalizeUploadedAssetCategory(category);
  const cleanSrc = getAssetEntrySrc(src);
  if (!cleanSrc) return;
  if (normalized === "background") {
    sessionRemovedBackgrounds = sessionRemovedBackgrounds.filter(
      (item) => item !== cleanSrc
    );
  } else if (normalized === "overlay") {
    sessionRemovedOverlays = sessionRemovedOverlays.filter(
      (item) => item !== cleanSrc
    );
  } else if (normalized === "template") {
    sessionRemovedTemplates = sessionRemovedTemplates.filter(
      (item) => item !== cleanSrc
    );
  }
}

function addSessionRemovedAsset(category = "", src = "") {
  const normalized = normalizeUploadedAssetCategory(category);
  const cleanSrc = getAssetEntrySrc(src);
  if (!cleanSrc) return;
  if (normalized === "background") {
    if (!sessionRemovedBackgrounds.includes(cleanSrc))
      sessionRemovedBackgrounds.push(cleanSrc);
  } else if (normalized === "overlay") {
    if (!sessionRemovedOverlays.includes(cleanSrc))
      sessionRemovedOverlays.push(cleanSrc);
  } else if (normalized === "template") {
    if (!sessionRemovedTemplates.includes(cleanSrc))
      sessionRemovedTemplates.push(cleanSrc);
  }
}

function getEffectiveAssetList(baseEntries = [], sessionEntries = [], removedEntries = []) {
  const removed = new Set(
    (Array.isArray(removedEntries) ? removedEntries : [])
      .map(getAssetEntrySrc)
      .filter(Boolean)
  );
  const seen = new Set();
  const out = [];
  for (const entry of [...sessionEntries, ...baseEntries]) {
    const src = getAssetEntrySrc(entry);
    if (!src || removed.has(src) || seen.has(src)) continue;
    seen.add(src);
    out.push(entry);
  }
  return out;
}

function getEffectiveBackgroundList(theme) {
  if (!theme || typeof theme !== "object") return [];
  const sessionList = Array.isArray(activeSessionAssets.backgrounds)
    ? activeSessionAssets.backgrounds.filter(Boolean)
    : [];
  return getEffectiveAssetList(
    getBaseBackgroundList(theme),
    sessionList,
    sessionRemovedBackgrounds
  );
}

function getEffectiveOverlayList(theme) {
  if (!theme || typeof theme !== "object") return [];
  const sessionList = Array.isArray(activeSessionAssets.overlays)
    ? activeSessionAssets.overlays
        .map((item) => normalizeOverlayDefinition(item))
        .filter(Boolean)
    : [];
  return getEffectiveAssetList(
    getBaseOverlayList(theme),
    sessionList,
    sessionRemovedOverlays
  );
}

function getEffectiveTemplateList(theme) {
  if (!theme || typeof theme !== "object") return [];
  const sessionList = Array.isArray(activeSessionAssets.templates)
    ? activeSessionAssets.templates
        .map((item) => {
          const src = getAssetEntrySrc(item);
          if (!src) return null;
          return typeof item === "object"
            ? {
                ...cloneThemeValue(item),
                src,
                layout: normalizeTemplateLayout(item.layout),
                slots: item.slots,
                photoSlots: item.photoSlots,
                background: item.background,
                foreground: item.foreground,
                textFields: normalizeTemplateTextFields(item.textFields),
              }
            : {
                src,
                layout: "double_column",
                __session: true,
              };
        })
        .filter(Boolean)
    : [];
  return getEffectiveAssetList(
    getBaseTemplateList(theme),
    sessionList,
    sessionRemovedTemplates
  );
}

function getAssetDebugSources(list = []) {
  return (Array.isArray(list) ? list : [])
    .map(getAssetEntrySrc)
    .filter(Boolean)
    .slice(0, 10);
}

function logEffectiveAssetState(theme, reason = "effective-assets") {
  if (!theme || typeof theme !== "object") return;
  const backgrounds = getEffectiveBackgroundList(theme);
  const overlays = getEffectiveOverlayList(theme);
  const templates = getEffectiveTemplateList(theme);
  console.info("[photobooth effective assets]", {
    reason,
    theme: theme.name || theme.key || "(unnamed theme)",
    backgroundCount: backgrounds.length,
    overlayCount: overlays.length,
    templateCount: templates.length,
    backgroundFirst10: getAssetDebugSources(backgrounds),
    overlayFirst10: getAssetDebugSources(overlays),
    templateFirst10: getAssetDebugSources(templates),
  });
}

function getOverlayList(theme) {
  if (!theme || typeof theme !== "object") return [];
  const overrides = getActiveEventOverrides();
  const eventArr = Array.isArray(overrides.overlays)
    ? overrides.overlays
        .map((item) => normalizeOverlayDefinition(item))
        .filter(Boolean)
    : [];
  const effective = getEffectiveOverlayList(theme);
  const seen = new Set();
  const out = [];
  for (const item of [...effective, ...eventArr]) {
    const src = getAssetEntrySrc(item);
    if (!src || seen.has(src)) continue;
    seen.add(src);
    out.push(item);
  }
  return out;
}

function getAllThemeOverlayCatalogList(theme) {
  const bySrc = new Map();
  const add = (entry) => {
    const normalized = normalizeOverlayDefinition(entry);
    if (normalized && normalized.src && !bySrc.has(normalized.src)) {
      bySrc.set(normalized.src, normalized);
    }
  };
  getOverlayList(theme).forEach(add);
  getCanonicalAssetCollection("overlay")
    .map((asset) =>
      normalizeOverlayDefinition({
        ...(asset.raw && typeof asset.raw === "object" ? asset.raw : {}),
        src: asset.url,
        name: asset.name,
        tags: asset.tags,
        textFields: asset.editableFields,
        __library: true,
      })
    )
    .forEach(add);
  return Array.from(bySrc.values());
}

function getTemplateList(theme) {
  if (!theme || typeof theme !== "object") return [];
  const overrides = getActiveEventOverrides();
  const eventArr = Array.isArray(overrides.templates)
    ? overrides.templates
        .map((item) =>
          typeof item === "string"
            ? {
                src: item,
                layout: "double_column",
                __event: true,
              }
            : {
                ...cloneThemeValue(item),
                src: item.src,
                layout: normalizeTemplateLayout(item.layout),
                slots: item.slots,
                photoSlots: item.photoSlots,
                background: item.background,
                foreground: item.foreground,
                textFields: normalizeTemplateTextFields(item.textFields),
                __event: true,
              }
        )
        .filter((item) => item && item.src)
    : [];
  const effective = getEffectiveTemplateList(theme);
  const seen = new Set();
  const out = [];
  for (const item of [...effective, ...eventArr]) {
    const src = getAssetEntrySrc(item);
    if (!src || seen.has(src)) continue;
    seen.add(src);
    out.push(item);
  }
  return out;
}

// --- PWA Install Button ---
function setupInstallPrompt() {
  let deferredPrompt = null;
  const btn = DOM.installBtn;
  if (btn) btn.classList.add("hidden");
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (btn) btn.classList.remove("hidden");
  });
  if (btn)
    btn.onclick = async () => {
      if (!deferredPrompt) {
        // iOS Safari has no beforeinstallprompt; show a hint
        alert("On iPhone/iPad: tap Share → Add to Home Screen");
        return;
      }
      deferredPrompt.prompt();
      try {
        await deferredPrompt.userChoice;
      } catch (_) {}
      deferredPrompt = null;
      btn.classList.add("hidden");
    };
}

window.addEventListener("storage", (event) => {
  if (!event || event.key !== STORAGE_KEYS.THEMES) return;
  loadThemesFromStorage();
  const selectedKey = (DOM.eventSelect && DOM.eventSelect.value) || "";
  const preferredKey = selectedKey || DEFAULT_THEME_KEY;
  const resolvedKey = populateThemeSelector(preferredKey);
  if (resolvedKey) {
    setEventSelection(resolvedKey);
    loadTheme(resolvedKey);
  }
});

window.addEventListener("message", (event) => {
  if (!event || event.origin !== window.location.origin) return;
  const data = event.data || {};
  if (data.type !== "photobooth-assets-updated") return;
  loadThemesFromStorage();
  const preferredKey =
    (typeof data.themeKey === "string" && data.themeKey) ||
    ((DOM.eventSelect && DOM.eventSelect.value) || DEFAULT_THEME_KEY);
  const resolvedKey = populateThemeSelector(preferredKey);
  if (resolvedKey) {
    setEventSelection(resolvedKey);
    loadTheme(resolvedKey);
  }
  showToast("Builder asset added");
});

Object.assign(window, {
  addFontByFamily,
  addFontByUrl,
  __photoboothQA: {
    auditLayout: auditBoothLayout,
    enterState: enterBoothQaState,
    isTestMode: isBoothTestMode,
  },
  __photoboothTest: {
    composeStrip,
    finalizeToPrint,
    getActiveEvent: () => getActiveEvent(),
    getThemes: () => themes,
    getBaseBackgroundList: (theme = activeTheme) => getBaseBackgroundList(theme),
    getBaseTemplateList: (theme = activeTheme) => getBaseTemplateList(theme),
    getAllThemeBackgroundCatalogList,
    repairCorruptedBackgroundDefaults,
    openAssetThemeDefaultsModal,
    getEffectiveBackgroundList: () => getEffectiveBackgroundList(activeTheme),
    getEffectiveOverlayList: () => getEffectiveOverlayList(activeTheme),
    getEffectiveTemplateList: () => getEffectiveTemplateList(activeTheme),
    getOverlayList: () => getOverlayList(activeTheme),
    getActiveTheme: () => activeTheme,
    getPhotoOverlayOrientation: (entry) => getPhotoOverlayOrientation(entry),
    getPhotoOverlayFormat: () => photoOverlayOrientation,
    setPhotoOverlayFormat: (orientation) => setPhotoOverlayOrientation(orientation),
    getResolvedCaptureAspectRatio: () => getResolvedCaptureAspectRatio(),
    getPrintSizeForOrientation: (orientation) =>
      getPrintSizeForOrientation(orientation),
    createPrintCanvas: (orientation) => createPrintCanvas(orientation).canvas,
    patchActiveTheme: (patch = {}) => {
      if (!activeTheme || !patch || typeof patch !== "object") return null;
      Object.assign(activeTheme, patch);
      applyThemeBasics(activeTheme);
      renderCurrentAssets(activeTheme);
      updateCurrentEventAssetsPanel(activeTheme);
      renderOptions();
      updateStylePreview();
      return activeTheme;
    },
    getOverlayFixedAsset,
    normalizeOverlayDefinition: (entry) => normalizeOverlayDefinition(entry),
    setTestOverlays: (overlays = []) => {
      if (!activeTheme || typeof activeTheme !== "object") return [];
      activeTheme.overlays = Array.isArray(overlays)
        ? overlays
            .map((item) => normalizeOverlayDefinition(item))
            .filter(Boolean)
        : [];
      activeTheme.overlaysTmp = [];
      const overlayList = getOverlayList(activeTheme);
      selectedOverlay = overlayList[0] ? overlayList[0].src : null;
      lastPhotoOverlay = selectedOverlay;
      lastPhotoOverlayByOrientation[photoOverlayOrientation] = selectedOverlay;
      renderOptions();
      syncOverlayPreviewSurface({ mode: "live" });
      return overlayList;
    },
    probeOverlayAutofill: (overlaySrc, width = 1800, height = 1350) => {
      const overlayDefinition = getOverlayList(activeTheme).find(
        (item) => item && item.src === overlaySrc
      );
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      const calls = [];
      const originalFillText = ctx.fillText.bind(ctx);
      ctx.fillText = (text, ...args) => {
        calls.push(String(text));
        return originalFillText(text, ...args);
      };
      drawTemplateTextFields(
        ctx,
        width,
        height,
        overlayDefinition && overlayDefinition.textFields,
        getActiveEvent(),
        activeTheme
      );
      return calls;
    },
    probeTemplateAutofill: (template, width = 1200, height = 1800) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      const calls = [];
      const originalFillText = ctx.fillText.bind(ctx);
      ctx.fillText = (text, ...args) => {
        calls.push(String(text));
        return originalFillText(text, ...args);
      };
      drawTemplateTextFields(
        ctx,
        width,
        height,
        template && template.textFields,
        getActiveEvent(),
        activeTheme
      );
      return calls;
    },
  },
  appendEmailText,
  cancelHideTimer,
  capturePhotoFlow,
  clearAnalytics,
  closeConfirm,
  confirmTemplate,
  copyEventGalleryLink,
  connectMotorRelay,
  copyShareLink,
  copyStaffPrintQueueUrl,
  downloadShareImage,
  exitFinalPreview,
  exportCurrentEvent,
  goAdmin,
  goBackFromBooth,
  goBackFromWelcome,
  beginWelcome,
  hideWelcome,
  startBooth: startBoothFromAdmin,
  startCamera: startCameraFlow,
  handlePrimaryAction,
  nextFilter,
  prevFilter,
  makeAvailableOffline,
  migrateAllManagedLocalAssets,
  openShareLink,
  openLayoutBuilder,
  openEventGalleryLink,
  openBoothLaunchConfirm,
  retakePhoto,
  saveCloudinarySettings,
  savePrintSettings,
  saveEmailJsSettings,
  saveTheme,
  sendEmail,
  sendPendingNow,
  sendTestEmail,
  setMode,
  setSetupLaunchMode,
  syncNow,
  closeBoothLaunchConfirm,
  confirmBoothLaunch,
  toggleAnalytics,
  undoLastRemoval,
});
