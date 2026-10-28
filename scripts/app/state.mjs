import { createDOMCache } from "./dom.mjs";
import { createBuiltinThemeData } from "./themes/builtin-catalog.mjs";

export function createAppState(dependencies = {}) {
  const { STANDARD_DOUBLE_COLUMN_STRIP_SLOTS, migrateHalloweenEventAssets, migrateHalloweenThemeAssets, CanvasBuffer, offscreenToDataURL, buildBoothVideoUrl, buildCloudinaryImageTransformationUrl, buildAssetIndexKey, buildDateSessionFolderPath, buildEventAssetFolderPath, buildEventFolderPath, getCloudinaryDerivedUrl, clampZoom, applyThemeText, getEventTextOverrides, hasEventTextOverrides, inferThemeEventStyle, mergeUniqueUrls, normalizeEventStyle, normalizeTemplateTextFields, resolveTemplateTextRect, resolveTemplateTextValue, validateCreatePathEventDetails, formatRecordingTime, shouldEnableRemoteSync, getGuestVisibleBeautyPresets, createThemeAdminState, pruneUnapprovedThemes, detectEditableFieldsFromText, getAssetEditableFieldLabel, getAssetLibraryId, getAssetLibraryUrlKey, normalizeAssetLibraryRecords, normalizeAssetTags, normalizeEditableFields, normalizeIdleButtonZone, normalizeIdleScreenOrientation, normalizeLegacyAssetUrl, normalizeUploadedAssetCategory, filterAssetLibraryRows, getAssetLibraryFilterCategories, themeKeyToCategory, loadEmailJsLibrary, loadQrCodeLibrary, loadSelfieSegmentationLibrary, getVideoPreviewPosterSrc, resolvePreviewAssetSrc, getThemeSoundCue, resolveThemeSoundProfileName, THEME_SOUND_SLOTS, validateThemeSoundFile } = dependencies;
  function createEmptySessionAssets() {
    return {
      backgrounds: [],
      greenBackgrounds: [],
      overlays: [],
      templates: [],
      idleScreens: [],
      backgroundIndex: 0,
      greenBackgroundIndex: 0,
      logo: "",
    };
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

  const themeAdminState = createThemeAdminState();

  const THEME_EDITOR = themeAdminState.editor;

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

  const RESERVED_PHOTO_MARKER = {
    color: "#ff00ff",
    tolerance: 12,
    minAreaRatio: 0.001,
  };

  const reservedPhotoMarkerCache = new Map();

  const decodedImageCache = new Map();

  const DECODED_IMAGE_CACHE_LIMIT = 40;

  let relayPort = null;

  let spinAbortController = null;

  const RELAY_COMMANDS = {
    ON: new Uint8Array([0xa0, 0x01, 0x01, 0xa2]),
    OFF: new Uint8Array([0xa0, 0x01, 0x00, 0xa1]),
  };

  const APPROVED_THEME_KEYS = new Set([
    "general:averyBirthday",
    "general:backToSchool",
    "general:summer",
    "fall:halloween",
    "fall:cuteHalloween",
    "school:hawks",
    "school:hawksTitansStadium",
    "school:hawksCheer",
    "school:ane",
    "school:streamNight",
  ]);

  const __builtinThemeData = createBuiltinThemeData({
    pruneUnapprovedThemes,
    approvedThemeKeys: APPROVED_THEME_KEYS,
  });
  let themes = __builtinThemeData.themes;
  const BUILTIN_THEMES = __builtinThemeData.BUILTIN_THEMES;
  const HOLIDAY_THEME_INDEX = __builtinThemeData.holidayThemeIndex;
  const HOLIDAY_THEME_CATALOG = __builtinThemeData.holidayThemeCatalog;

  const DEFAULT_THEME_KEY = "general:summer";

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

  const DOM = createDOMCache();

  const PRINT_SIZES = {
    landscape: { width: 1800, height: 1200, aspect: 3 / 2, cssAspect: "3 / 2" },
    portrait: { width: 1200, height: 1800, aspect: 2 / 3, cssAspect: "2 / 3" },
  };

  const RECORDING_MODE_STORAGE_KEY = "photoboothRecordingMode";

  let activeTheme = null;

  let mode = "live-photo";

  let currentMode = "photo";

  let stream;

  let torchEnabled = false;

  let selectedOverlay = null;

  let captureFlashArmed = false;

  let lastPhotoOverlay = null;

  let selectedFilter = "natural";

  let photoOverlayOrientation =
    window.innerWidth >= window.innerHeight ? "landscape" : "portrait";

  let lastPhotoOverlayByOrientation = { portrait: null, landscape: null };

  let photoOverlayOrientationCache = {};

  let photoOverlayOrientationPending = {};

  let pendingTemplate = null;

  let hidePreviewTimer = null;

  let allowRetake = true;

  const ALLOW_RETAKES_STORAGE_KEY = "photoboothAllowRetakes";

  let isStartingCamera = false;

  let capturePreviewFrozen = false;

  let liveImagingLoopStarted = false;

  let liveImagingFramePending = false;

  let liveImagingLastFrameAt = 0;

  const LIVE_PREVIEW_MAX_DIMENSION = 480;

  const LIVE_PREVIEW_FRAME_INTERVAL_MS = 83;

  let livePreviewStream = null;

  let latestProcessedFrameCanvas = null;

  let beautyEngineModulePromise = null;

  let lastCaptureFlow = null;

  let removedStack = [];

  let toastTimer = null;

  let lastShareUrl = null;

  let activeFinalUploadToken = 0;

  let lastOutputSurfaceTrace = null;

  let demoMode = false;

  let showcaseDemoActive = false;

  let showcaseDemoCurrentKey = "";

  let welcomeFlowStep = "demo";

  let captureAspectRatio = null;

  const SETUP_LAUNCH_MODE_STORAGE_KEY = "photoboothSetupLaunchMode";

  let setupLaunchMode = "single_photo";

  const ASSET_PICKER_INITIAL_LIMIT = 24;

  const ASSET_PICKER_PAGE_SIZE = 24;

  let assetPickerVisibleLimits = {
    photo: ASSET_PICKER_INITIAL_LIMIT,
    strip: ASSET_PICKER_INITIAL_LIMIT,
    layout: ASSET_PICKER_INITIAL_LIMIT,
  };

  const BOOTH_TEST_SHARE_URL = "https://example.com/photobooth-test-final.png";

  let FILTER_EFFECTS = getGuestVisibleBeautyPresets().map(cloneThemeValue);

  const BEAUTY_PRESET_CONTROL_DEFINITIONS = [
    ["beauty", "skinSmooth", "Skin smoothing", 0, 12],
    ["beauty", "blemish", "Blemish correction", 0, 12],
    ["beauty", "teeth", "Teeth brightening", 0, 30],
    ["beauty", "underEye", "Under-eye lift", 0, 10],
    ["lighting", "exposure", "Exposure", -20, 20],
    ["lighting", "contrast", "Contrast", -20, 20],
    ["lighting", "warmth", "Warmth", -20, 20],
    ["lighting", "vibrance", "Vibrance", -20, 20],
    ["lighting", "highlights", "Highlights", -30, 10],
    ["lighting", "shadows", "Shadows", -10, 30],
    ["lighting", "sharpness", "Sharpness", 0, 20],
  ];

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

  let activeSessionAssets = createEmptySessionAssets();

  let activeSessionThemeKey = "";

  let sessionRemovedBackgrounds = [];

  let sessionRemovedOverlays = [];

  let sessionRemovedTemplates = [];

  let activeThemeDefaultsAsset = null;

  let activeIdleScreenEditorAsset = null;

  let activeOverlaySlotEditorAsset = null;

  let overlaySlotEditorSlot = null;

  let overlaySlotEditorSlots = [];

  let overlaySlotEditorSelectedIndex = 0;

  let idleScreenEditorZone = { x: 50, y: 73, width: 28, height: 20 };

  let photoChoiceEditorZones = {
    singlePhoto: { x: 34, y: 59, width: 27, height: 50 },
    photoStrip: { x: 66, y: 59, width: 27, height: 50 },
  };

  let activeSessionTextDetails = {};

  let weddingSetupRequested = false;

  let weddingThemeChoiceDirty = false;

  let boothAudioContext = null;

  let boothAudioEnabled = false;

  let boothThemeAudio = null;

  const themeSoundEffectIndexes = new WeakMap();

  const GLOBAL_BUTTON_SOUND_CHOICES = [
    "/assets/sounds/button-ui-sound-effect-395762.mp3",
    "/assets/sounds/magic-button-click-453258.mp3",
    "/assets/sounds/old-radio-button-click-97549.mp3",
  ];

  const THEME_SOUND_STORAGE_KEY = "photoboothThemeSounds";

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

  let createThemeAssets = null;

  let createEventAssets = null;

  let createEventMode = "create";

  let createEventTextOverrides = null;

  const SESSION_BUST = Date.now();

  const GLOBAL_LOGO_STORAGE_KEY = "photoboothGlobalLogo";

  const THEME_FAVORITES_STORAGE_KEY = "photoboothThemeFavorites";

  const ASSET_LIBRARY_FAVORITES_STORAGE_KEY = "photoboothAssetLibraryFavorites";

  const ASSET_LIBRARY_RECENTS_STORAGE_KEY = "photoboothAssetLibraryRecents";

  const ASSET_LIBRARY_RECENT_LIMIT = 80;

  const LAST_THEME_KEY_STORAGE = "photoboothLastThemeKey";

  const QUICK_START_SESSION_DATE_KEY = "photoboothQuickStartDate";

  const SHOWCASE_DEMO_THEME_CANDIDATES = {
    birthday: ["general:birthday"],
    general: ["general:summer", DEFAULT_THEME_KEY],
  };

  const ASSET_PANEL_STATE_KEY = "photoboothAssetPanels";

  let idleTimer;

  const IDLE_TIMEOUT_MS = 30000;

  const THEME_SETUP_GROUP_ORDER = [
    "General",
    "Seasonal",
    "Holidays",
    "Wedding",
    "Sports",
    "Youth",
  ];

  const THEME_SETUP_GROUP_ITEM_ORDER = {
    General: [
      "Back to School",
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
      "Fourth of July",
      "Halloween",
      "Happy Halloween",
      "Christmas",
      "Valentine's Day",
      "St. Patrick's Day",
    ],
    Wedding: ["Wedding"],
    Youth: [
      "Spring Hill Hawks",
      "Spring Hill Hawks at Titans Stadium",
      "Spring Hill Hawks Cheer",
      "Amanda North Back to School",
      "Amanda North STREAM Night",
    ],
  };

  const THEME_SETUP_LABEL_OVERRIDES = {
    "back to school": "Back to School",
    birthday: "Birthday",
    summer: "Summer",
    fall: "Fall",
    winter: "Winter",
    spring: "Spring",
    expo: "Expo",
    "4th of july": "Fourth of July",
    "fourth of july": "Fourth of July",
    fourthofjuly: "Fourth of July",
    halloween: "Halloween",
    christmas: "Christmas",
    valentines: "Valentine's Day",
    "valentine's day": "Valentine's Day",
    "st patricks day": "St. Patrick's Day",
    "st patrick s day": "St. Patrick's Day",
    "st patrick's day": "St. Patrick's Day",
    "st patricks": "St. Patrick's Day",
    "st patrick's": "St. Patrick's Day",
    "garden vows": "Wedding",
    hawks: "Spring Hill Hawks",
    hawkscheer: "Spring Hill Hawks Cheer",
    "hawks cheer": "Spring Hill Hawks Cheer",
    "school hawkscheer": "Spring Hill Hawks Cheer",
    ane: "Amanda North Back to School",
    "stream night": "Amanda North STREAM Night",
    "winter wonderland": "Winter Wonderland",
    "santa s workshop": "Santa's Workshop",
    "santa's workshop": "Santa's Workshop",
    "valentine s day": "Valentine's Day",
    "new year": "New Year",
  };

  let activeThemeQuickFilter = "All";

  const themeQuickCardsByKey = new Map();

  const themeQuickOrderByKey = new Map();

  let themeQuickPreviewObserver = null;

  const THEME_QUICK_FILTERS = ["All", "Celebrations", "Weddings", "Sports", "Schools", "Seasons", "Holidays"];

  let activeSetupSection = "event";

  const EMPTY_LAUNCH_THUMBNAIL_SRC =
    "data:image/gif;base64,R0lGODlhAQABAAAAACw=";

  const EDIT_SCALE_CONFIG = [
    {
      min: 0.6,
      max: 1.4,
      posVar: "--edit-header-y",
      posKey: "editPosHeader",
      id: "header",
      label: "Header",
      cssVar: "--edit-header-scale",
      storageKey: "editScaleHeader",
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

  const REMOTE_SYNC_DEBOUNCE_MS = 2000;

  let pendingThemesSyncTimer = null;

  let pendingEventsSyncTimer = null;

  let pendingFontsSyncTimer = null;

  let pendingFontsSyncPayload = null;

  let fontsRemoteRequested = false;

  const EMAILJS_SERVICE_ID_DEFAULT = "service_wf13ozc";

  const EMAILJS_TEMPLATE_ID_DEFAULT = "template_yankxhd";

  const EMAILJS_PUBLIC_KEY_DEFAULT = "pzgt5QUA4x12IOITx";

  let emailJsClientPromise = null;

  const CLOUDINARY_CLOUD_NAME = "afletch32";

  const CLOUDINARY_UPLOAD_PRESET = "photobooth_unsigned";

  const CLOUDINARY_FOLDER_BASE_DEFAULT = "photobooth/events";

  const PRINT_SETTINGS_STORAGE_KEY = "photoboothPrintSettings";

  const DEFAULT_PRINT_SETTINGS = {
    mode: "off",
    panelTitle: "Printed Photo Upgrade",
    panelBody: "Take home a 4x6 keepsake print for $3.",
    instructions: "Scan the payment code below to complete your purchase. Your print will be prepared after payment is confirmed.",
    paymentQr: "",
    eventId: "",
    noPaymentRequired: false,
  };

  let paypalPrintSdkPromise = null;

  const SPOT_MASK = {
    enabled: true,
    color: RESERVED_PHOTO_MARKER.color,
    tolerance: RESERVED_PHOTO_MARKER.tolerance,
  };

  let customArtworkLoadTimer = null;

  let welcomeArtworkLoadId = 0;

  const COUNTDOWN_SCALE_KEY = "photoboothCountdownScale";

  let pendingFinalPrintImageUrl = "";

  let finalPrintPriceRequestId = 0;

  const EVENTS_STORAGE_KEY = "photoboothEvents";

  const ACTIVE_EVENT_KEY = "photoboothActiveEventId";

  const WEDDING_THEME_ASSETS = "/assets/themes/eucalyptus-wedding";

  const OFFLINE_DB_NAME = "PhotoboothOfflineQueue";

  const OFFLINE_DB_STORE = "pendingUploads";

  let offlineQueueDbPromise = null;

  let isFlushingPendingUploads = false;

  let isFlushingPendingGalleryRecords = false;

  let pendingQueueWakeLock = null;

  const managedLocalAssetMigrationCache = new Map();

  const loadedAssetLibraryThemeCategories = new Set();

  const THEME_DEFAULTS_GROUP_ORDER = [
    "General",
    "Wedding",
    "Expo",
    "School",
    "Spring",
    "Summer",
    "Fall",
    "Winter",
    "Other",
  ];

  const ASSET_LIBRARY_PAGE_SIZE = 12;

  let assetLibraryState = {
    selectedCategory: "",
    selectedHolidayThemeKey: "",
    searchQuery: "",
    visibleCount: ASSET_LIBRARY_PAGE_SIZE,
  };

  const MAX_MANAGED_ASSET_UPLOAD_BYTES = 100 * 1024 * 1024;

  const activeManagedAssetUploads = new Map();

  const supportedVideoUploadExtensions = new Set([
    "mp4",
    "m4v",
    "mov",
    "webm",
    "ogv",
    "ogg",
  ]);

  const supportedVideoUploadTypes = new Set([
    "video/mp4",
    "video/x-m4v",
    "video/quicktime",
    "video/webm",
    "video/ogg",
  ]);

  const stringOrEmpty = (val) => (typeof val === "string" ? val.trim() : "");

  const arrayFromMaybeList = (list) =>
    Array.isArray(list) ? list.filter(Boolean) : [];

  const hasValues = (arr) => Array.isArray(arr) && arr.length > 0;

  const FONT_FALLBACK_STACK =
    "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";

  const DEFAULT_FONT_PREVIEW = "Welcome to Fletch Photobooth";

  let fontCatalog = { available: [], defaults: {}, pairings: [] };

  let fontPickerInitialized = false;

  let fontPickerSetupPromise = null;

  const ASSET_DEFAULT_REPAIR_VERSION = 3;

  const overlaySvgFixCache = new Map();

  const context = Object.assign({}, dependencies);
  Object.defineProperties(context, {
    "themeAdminState": { enumerable: true, get: () => themeAdminState, set: (value) => { themeAdminState = value; } },
    "THEME_EDITOR": { enumerable: true, get: () => THEME_EDITOR, set: (value) => { THEME_EDITOR = value; } },
    "APP_CONFIG": { enumerable: true, get: () => APP_CONFIG, set: (value) => { APP_CONFIG = value; } },
    "RESERVED_PHOTO_MARKER": { enumerable: true, get: () => RESERVED_PHOTO_MARKER, set: (value) => { RESERVED_PHOTO_MARKER = value; } },
    "reservedPhotoMarkerCache": { enumerable: true, get: () => reservedPhotoMarkerCache, set: (value) => { reservedPhotoMarkerCache = value; } },
    "decodedImageCache": { enumerable: true, get: () => decodedImageCache, set: (value) => { decodedImageCache = value; } },
    "DECODED_IMAGE_CACHE_LIMIT": { enumerable: true, get: () => DECODED_IMAGE_CACHE_LIMIT, set: (value) => { DECODED_IMAGE_CACHE_LIMIT = value; } },
    "relayPort": { enumerable: true, get: () => relayPort, set: (value) => { relayPort = value; } },
    "spinAbortController": { enumerable: true, get: () => spinAbortController, set: (value) => { spinAbortController = value; } },
    "RELAY_COMMANDS": { enumerable: true, get: () => RELAY_COMMANDS, set: (value) => { RELAY_COMMANDS = value; } },
    "APPROVED_THEME_KEYS": { enumerable: true, get: () => APPROVED_THEME_KEYS, set: (value) => { APPROVED_THEME_KEYS = value; } },
    "themes": { enumerable: true, get: () => themes, set: (value) => { themes = value; } },
    "BUILTIN_THEMES": { enumerable: true, get: () => BUILTIN_THEMES },
    "HOLIDAY_THEME_INDEX": { enumerable: true, get: () => HOLIDAY_THEME_INDEX },
    "HOLIDAY_THEME_CATALOG": { enumerable: true, get: () => HOLIDAY_THEME_CATALOG },
    "DEFAULT_THEME_KEY": { enumerable: true, get: () => DEFAULT_THEME_KEY, set: (value) => { DEFAULT_THEME_KEY = value; } },
    "BUILTIN_THEME_LOCATIONS": { enumerable: true, get: () => BUILTIN_THEME_LOCATIONS, set: (value) => { BUILTIN_THEME_LOCATIONS = value; } },
    "PRINT_SIZES": { enumerable: true, get: () => PRINT_SIZES, set: (value) => { PRINT_SIZES = value; } },
    "RECORDING_MODE_STORAGE_KEY": { enumerable: true, get: () => RECORDING_MODE_STORAGE_KEY, set: (value) => { RECORDING_MODE_STORAGE_KEY = value; } },
    "activeTheme": { enumerable: true, get: () => activeTheme, set: (value) => { activeTheme = value; } },
    "mode": { enumerable: true, get: () => mode, set: (value) => { mode = value; } },
    "currentMode": { enumerable: true, get: () => currentMode, set: (value) => { currentMode = value; } },
    "stream": { enumerable: true, get: () => stream, set: (value) => { stream = value; } },
    "torchEnabled": { enumerable: true, get: () => torchEnabled, set: (value) => { torchEnabled = value; } },
    "selectedOverlay": { enumerable: true, get: () => selectedOverlay, set: (value) => { selectedOverlay = value; } },
    "captureFlashArmed": { enumerable: true, get: () => captureFlashArmed, set: (value) => { captureFlashArmed = value; } },
    "lastPhotoOverlay": { enumerable: true, get: () => lastPhotoOverlay, set: (value) => { lastPhotoOverlay = value; } },
    "selectedFilter": { enumerable: true, get: () => selectedFilter, set: (value) => { selectedFilter = value; } },
    "photoOverlayOrientation": { enumerable: true, get: () => photoOverlayOrientation, set: (value) => { photoOverlayOrientation = value; } },
    "lastPhotoOverlayByOrientation": { enumerable: true, get: () => lastPhotoOverlayByOrientation, set: (value) => { lastPhotoOverlayByOrientation = value; } },
    "photoOverlayOrientationCache": { enumerable: true, get: () => photoOverlayOrientationCache, set: (value) => { photoOverlayOrientationCache = value; } },
    "photoOverlayOrientationPending": { enumerable: true, get: () => photoOverlayOrientationPending, set: (value) => { photoOverlayOrientationPending = value; } },
    "pendingTemplate": { enumerable: true, get: () => pendingTemplate, set: (value) => { pendingTemplate = value; } },
    "hidePreviewTimer": { enumerable: true, get: () => hidePreviewTimer, set: (value) => { hidePreviewTimer = value; } },
    "allowRetake": { enumerable: true, get: () => allowRetake, set: (value) => { allowRetake = value; } },
    "ALLOW_RETAKES_STORAGE_KEY": { enumerable: true, get: () => ALLOW_RETAKES_STORAGE_KEY, set: (value) => { ALLOW_RETAKES_STORAGE_KEY = value; } },
    "isStartingCamera": { enumerable: true, get: () => isStartingCamera, set: (value) => { isStartingCamera = value; } },
    "capturePreviewFrozen": { enumerable: true, get: () => capturePreviewFrozen, set: (value) => { capturePreviewFrozen = value; } },
    "liveImagingLoopStarted": { enumerable: true, get: () => liveImagingLoopStarted, set: (value) => { liveImagingLoopStarted = value; } },
    "liveImagingFramePending": { enumerable: true, get: () => liveImagingFramePending, set: (value) => { liveImagingFramePending = value; } },
    "liveImagingLastFrameAt": { enumerable: true, get: () => liveImagingLastFrameAt, set: (value) => { liveImagingLastFrameAt = value; } },
    "LIVE_PREVIEW_MAX_DIMENSION": { enumerable: true, get: () => LIVE_PREVIEW_MAX_DIMENSION, set: (value) => { LIVE_PREVIEW_MAX_DIMENSION = value; } },
    "LIVE_PREVIEW_FRAME_INTERVAL_MS": { enumerable: true, get: () => LIVE_PREVIEW_FRAME_INTERVAL_MS, set: (value) => { LIVE_PREVIEW_FRAME_INTERVAL_MS = value; } },
    "livePreviewStream": { enumerable: true, get: () => livePreviewStream, set: (value) => { livePreviewStream = value; } },
    "latestProcessedFrameCanvas": { enumerable: true, get: () => latestProcessedFrameCanvas, set: (value) => { latestProcessedFrameCanvas = value; } },
    "beautyEngineModulePromise": { enumerable: true, get: () => beautyEngineModulePromise, set: (value) => { beautyEngineModulePromise = value; } },
    "lastCaptureFlow": { enumerable: true, get: () => lastCaptureFlow, set: (value) => { lastCaptureFlow = value; } },
    "removedStack": { enumerable: true, get: () => removedStack, set: (value) => { removedStack = value; } },
    "toastTimer": { enumerable: true, get: () => toastTimer, set: (value) => { toastTimer = value; } },
    "lastShareUrl": { enumerable: true, get: () => lastShareUrl, set: (value) => { lastShareUrl = value; } },
    "activeFinalUploadToken": { enumerable: true, get: () => activeFinalUploadToken, set: (value) => { activeFinalUploadToken = value; } },
    "lastOutputSurfaceTrace": { enumerable: true, get: () => lastOutputSurfaceTrace, set: (value) => { lastOutputSurfaceTrace = value; } },
    "demoMode": { enumerable: true, get: () => demoMode, set: (value) => { demoMode = value; } },
    "showcaseDemoActive": { enumerable: true, get: () => showcaseDemoActive, set: (value) => { showcaseDemoActive = value; } },
    "showcaseDemoCurrentKey": { enumerable: true, get: () => showcaseDemoCurrentKey, set: (value) => { showcaseDemoCurrentKey = value; } },
    "welcomeFlowStep": { enumerable: true, get: () => welcomeFlowStep, set: (value) => { welcomeFlowStep = value; } },
    "captureAspectRatio": { enumerable: true, get: () => captureAspectRatio, set: (value) => { captureAspectRatio = value; } },
    "SETUP_LAUNCH_MODE_STORAGE_KEY": { enumerable: true, get: () => SETUP_LAUNCH_MODE_STORAGE_KEY, set: (value) => { SETUP_LAUNCH_MODE_STORAGE_KEY = value; } },
    "setupLaunchMode": { enumerable: true, get: () => setupLaunchMode, set: (value) => { setupLaunchMode = value; } },
    "ASSET_PICKER_INITIAL_LIMIT": { enumerable: true, get: () => ASSET_PICKER_INITIAL_LIMIT, set: (value) => { ASSET_PICKER_INITIAL_LIMIT = value; } },
    "ASSET_PICKER_PAGE_SIZE": { enumerable: true, get: () => ASSET_PICKER_PAGE_SIZE, set: (value) => { ASSET_PICKER_PAGE_SIZE = value; } },
    "assetPickerVisibleLimits": { enumerable: true, get: () => assetPickerVisibleLimits, set: (value) => { assetPickerVisibleLimits = value; } },
    "BOOTH_TEST_SHARE_URL": { enumerable: true, get: () => BOOTH_TEST_SHARE_URL, set: (value) => { BOOTH_TEST_SHARE_URL = value; } },
    "FILTER_EFFECTS": { enumerable: true, get: () => FILTER_EFFECTS, set: (value) => { FILTER_EFFECTS = value; } },
    "BEAUTY_PRESET_CONTROL_DEFINITIONS": { enumerable: true, get: () => BEAUTY_PRESET_CONTROL_DEFINITIONS, set: (value) => { BEAUTY_PRESET_CONTROL_DEFINITIONS = value; } },
    "LIVE_PHOTO_DEFAULT": { enumerable: true, get: () => LIVE_PHOTO_DEFAULT, set: (value) => { LIVE_PHOTO_DEFAULT = value; } },
    "LIVE_PHOTO_DURATION_MS": { enumerable: true, get: () => LIVE_PHOTO_DURATION_MS, set: (value) => { LIVE_PHOTO_DURATION_MS = value; } },
    "MESSAGE_DURATION_MS": { enumerable: true, get: () => MESSAGE_DURATION_MS, set: (value) => { MESSAGE_DURATION_MS = value; } },
    "CAMERA_ZOOM_DEFAULT": { enumerable: true, get: () => CAMERA_ZOOM_DEFAULT, set: (value) => { CAMERA_ZOOM_DEFAULT = value; } },
    "GREEN_SCREEN_DEFAULT": { enumerable: true, get: () => GREEN_SCREEN_DEFAULT, set: (value) => { GREEN_SCREEN_DEFAULT = value; } },
    "AI_BACKGROUND_DEFAULT": { enumerable: true, get: () => AI_BACKGROUND_DEFAULT, set: (value) => { AI_BACKGROUND_DEFAULT = value; } },
    "lastLiveClipUrl": { enumerable: true, get: () => lastLiveClipUrl, set: (value) => { lastLiveClipUrl = value; } },
    "lastLiveClipBlob": { enumerable: true, get: () => lastLiveClipBlob, set: (value) => { lastLiveClipBlob = value; } },
    "lastShareType": { enumerable: true, get: () => lastShareType, set: (value) => { lastShareType = value; } },
    "isImporting360Video": { enumerable: true, get: () => isImporting360Video, set: (value) => { isImporting360Video = value; } },
    "isRunning360Sequence": { enumerable: true, get: () => isRunning360Sequence, set: (value) => { isRunning360Sequence = value; } },
    "isMessageRecording": { enumerable: true, get: () => isMessageRecording, set: (value) => { isMessageRecording = value; } },
    "messageRecorder": { enumerable: true, get: () => messageRecorder, set: (value) => { messageRecorder = value; } },
    "messageStopTimer": { enumerable: true, get: () => messageStopTimer, set: (value) => { messageStopTimer = value; } },
    "messageStopper": { enumerable: true, get: () => messageStopper, set: (value) => { messageStopper = value; } },
    "aiSegmentation": { enumerable: true, get: () => aiSegmentation, set: (value) => { aiSegmentation = value; } },
    "aiSegmentationResolver": { enumerable: true, get: () => aiSegmentationResolver, set: (value) => { aiSegmentationResolver = value; } },
    "aiSegmentationPromise": { enumerable: true, get: () => aiSegmentationPromise, set: (value) => { aiSegmentationPromise = value; } },
    "pendingBulkAssetFiles": { enumerable: true, get: () => pendingBulkAssetFiles, set: (value) => { pendingBulkAssetFiles = value; } },
    "assetLibrary": { enumerable: true, get: () => assetLibrary, set: (value) => { assetLibrary = value; } },
    "activeSessionAssets": { enumerable: true, get: () => activeSessionAssets, set: (value) => { activeSessionAssets = value; } },
    "activeSessionThemeKey": { enumerable: true, get: () => activeSessionThemeKey, set: (value) => { activeSessionThemeKey = value; } },
    "sessionRemovedBackgrounds": { enumerable: true, get: () => sessionRemovedBackgrounds, set: (value) => { sessionRemovedBackgrounds = value; } },
    "sessionRemovedOverlays": { enumerable: true, get: () => sessionRemovedOverlays, set: (value) => { sessionRemovedOverlays = value; } },
    "sessionRemovedTemplates": { enumerable: true, get: () => sessionRemovedTemplates, set: (value) => { sessionRemovedTemplates = value; } },
    "activeThemeDefaultsAsset": { enumerable: true, get: () => activeThemeDefaultsAsset, set: (value) => { activeThemeDefaultsAsset = value; } },
    "activeIdleScreenEditorAsset": { enumerable: true, get: () => activeIdleScreenEditorAsset, set: (value) => { activeIdleScreenEditorAsset = value; } },
    "activeOverlaySlotEditorAsset": { enumerable: true, get: () => activeOverlaySlotEditorAsset, set: (value) => { activeOverlaySlotEditorAsset = value; } },
    "overlaySlotEditorSlot": { enumerable: true, get: () => overlaySlotEditorSlot, set: (value) => { overlaySlotEditorSlot = value; } },
    "overlaySlotEditorSlots": { enumerable: true, get: () => overlaySlotEditorSlots, set: (value) => { overlaySlotEditorSlots = value; } },
    "overlaySlotEditorSelectedIndex": { enumerable: true, get: () => overlaySlotEditorSelectedIndex, set: (value) => { overlaySlotEditorSelectedIndex = value; } },
    "idleScreenEditorZone": { enumerable: true, get: () => idleScreenEditorZone, set: (value) => { idleScreenEditorZone = value; } },
    "photoChoiceEditorZones": { enumerable: true, get: () => photoChoiceEditorZones, set: (value) => { photoChoiceEditorZones = value; } },
    "activeSessionTextDetails": { enumerable: true, get: () => activeSessionTextDetails, set: (value) => { activeSessionTextDetails = value; } },
    "weddingSetupRequested": { enumerable: true, get: () => weddingSetupRequested, set: (value) => { weddingSetupRequested = value; } },
    "weddingThemeChoiceDirty": { enumerable: true, get: () => weddingThemeChoiceDirty, set: (value) => { weddingThemeChoiceDirty = value; } },
    "boothAudioContext": { enumerable: true, get: () => boothAudioContext, set: (value) => { boothAudioContext = value; } },
    "boothAudioEnabled": { enumerable: true, get: () => boothAudioEnabled, set: (value) => { boothAudioEnabled = value; } },
    "boothThemeAudio": { enumerable: true, get: () => boothThemeAudio, set: (value) => { boothThemeAudio = value; } },
    "themeSoundEffectIndexes": { enumerable: true, get: () => themeSoundEffectIndexes, set: (value) => { themeSoundEffectIndexes = value; } },
    "GLOBAL_BUTTON_SOUND_CHOICES": { enumerable: true, get: () => GLOBAL_BUTTON_SOUND_CHOICES, set: (value) => { GLOBAL_BUTTON_SOUND_CHOICES = value; } },
    "THEME_SOUND_STORAGE_KEY": { enumerable: true, get: () => THEME_SOUND_STORAGE_KEY, set: (value) => { THEME_SOUND_STORAGE_KEY = value; } },
    "ACCENT_PRESET_COLORS": { enumerable: true, get: () => ACCENT_PRESET_COLORS, set: (value) => { ACCENT_PRESET_COLORS = value; } },
    "createThemeAssets": { enumerable: true, get: () => createThemeAssets, set: (value) => { createThemeAssets = value; } },
    "createEventAssets": { enumerable: true, get: () => createEventAssets, set: (value) => { createEventAssets = value; } },
    "createEventMode": { enumerable: true, get: () => createEventMode, set: (value) => { createEventMode = value; } },
    "createEventTextOverrides": { enumerable: true, get: () => createEventTextOverrides, set: (value) => { createEventTextOverrides = value; } },
    "SESSION_BUST": { enumerable: true, get: () => SESSION_BUST, set: (value) => { SESSION_BUST = value; } },
    "GLOBAL_LOGO_STORAGE_KEY": { enumerable: true, get: () => GLOBAL_LOGO_STORAGE_KEY, set: (value) => { GLOBAL_LOGO_STORAGE_KEY = value; } },
    "THEME_FAVORITES_STORAGE_KEY": { enumerable: true, get: () => THEME_FAVORITES_STORAGE_KEY, set: (value) => { THEME_FAVORITES_STORAGE_KEY = value; } },
    "ASSET_LIBRARY_FAVORITES_STORAGE_KEY": { enumerable: true, get: () => ASSET_LIBRARY_FAVORITES_STORAGE_KEY, set: (value) => { ASSET_LIBRARY_FAVORITES_STORAGE_KEY = value; } },
    "ASSET_LIBRARY_RECENTS_STORAGE_KEY": { enumerable: true, get: () => ASSET_LIBRARY_RECENTS_STORAGE_KEY, set: (value) => { ASSET_LIBRARY_RECENTS_STORAGE_KEY = value; } },
    "ASSET_LIBRARY_RECENT_LIMIT": { enumerable: true, get: () => ASSET_LIBRARY_RECENT_LIMIT, set: (value) => { ASSET_LIBRARY_RECENT_LIMIT = value; } },
    "LAST_THEME_KEY_STORAGE": { enumerable: true, get: () => LAST_THEME_KEY_STORAGE, set: (value) => { LAST_THEME_KEY_STORAGE = value; } },
    "QUICK_START_SESSION_DATE_KEY": { enumerable: true, get: () => QUICK_START_SESSION_DATE_KEY, set: (value) => { QUICK_START_SESSION_DATE_KEY = value; } },
    "SHOWCASE_DEMO_THEME_CANDIDATES": { enumerable: true, get: () => SHOWCASE_DEMO_THEME_CANDIDATES, set: (value) => { SHOWCASE_DEMO_THEME_CANDIDATES = value; } },
    "ASSET_PANEL_STATE_KEY": { enumerable: true, get: () => ASSET_PANEL_STATE_KEY, set: (value) => { ASSET_PANEL_STATE_KEY = value; } },
    "idleTimer": { enumerable: true, get: () => idleTimer, set: (value) => { idleTimer = value; } },
    "IDLE_TIMEOUT_MS": { enumerable: true, get: () => IDLE_TIMEOUT_MS, set: (value) => { IDLE_TIMEOUT_MS = value; } },
    "THEME_SETUP_GROUP_ORDER": { enumerable: true, get: () => THEME_SETUP_GROUP_ORDER, set: (value) => { THEME_SETUP_GROUP_ORDER = value; } },
    "THEME_SETUP_GROUP_ITEM_ORDER": { enumerable: true, get: () => THEME_SETUP_GROUP_ITEM_ORDER, set: (value) => { THEME_SETUP_GROUP_ITEM_ORDER = value; } },
    "THEME_SETUP_LABEL_OVERRIDES": { enumerable: true, get: () => THEME_SETUP_LABEL_OVERRIDES, set: (value) => { THEME_SETUP_LABEL_OVERRIDES = value; } },
    "activeThemeQuickFilter": { enumerable: true, get: () => activeThemeQuickFilter, set: (value) => { activeThemeQuickFilter = value; } },
    "themeQuickCardsByKey": { enumerable: true, get: () => themeQuickCardsByKey, set: (value) => { themeQuickCardsByKey = value; } },
    "themeQuickOrderByKey": { enumerable: true, get: () => themeQuickOrderByKey, set: (value) => { themeQuickOrderByKey = value; } },
    "themeQuickPreviewObserver": { enumerable: true, get: () => themeQuickPreviewObserver, set: (value) => { themeQuickPreviewObserver = value; } },
    "THEME_QUICK_FILTERS": { enumerable: true, get: () => THEME_QUICK_FILTERS, set: (value) => { THEME_QUICK_FILTERS = value; } },
    "activeSetupSection": { enumerable: true, get: () => activeSetupSection, set: (value) => { activeSetupSection = value; } },
    "EMPTY_LAUNCH_THUMBNAIL_SRC": { enumerable: true, get: () => EMPTY_LAUNCH_THUMBNAIL_SRC, set: (value) => { EMPTY_LAUNCH_THUMBNAIL_SRC = value; } },
    "EDIT_SCALE_CONFIG": { enumerable: true, get: () => EDIT_SCALE_CONFIG, set: (value) => { EDIT_SCALE_CONFIG = value; } },
    "EDIT_TARGET_MAP": { enumerable: true, get: () => EDIT_TARGET_MAP, set: (value) => { EDIT_TARGET_MAP = value; } },
    "editModeActive": { enumerable: true, get: () => editModeActive, set: (value) => { editModeActive = value; } },
    "activeEditTarget": { enumerable: true, get: () => activeEditTarget, set: (value) => { activeEditTarget = value; } },
    "REMOTE_SYNC_DEBOUNCE_MS": { enumerable: true, get: () => REMOTE_SYNC_DEBOUNCE_MS, set: (value) => { REMOTE_SYNC_DEBOUNCE_MS = value; } },
    "pendingThemesSyncTimer": { enumerable: true, get: () => pendingThemesSyncTimer, set: (value) => { pendingThemesSyncTimer = value; } },
    "pendingEventsSyncTimer": { enumerable: true, get: () => pendingEventsSyncTimer, set: (value) => { pendingEventsSyncTimer = value; } },
    "pendingFontsSyncTimer": { enumerable: true, get: () => pendingFontsSyncTimer, set: (value) => { pendingFontsSyncTimer = value; } },
    "pendingFontsSyncPayload": { enumerable: true, get: () => pendingFontsSyncPayload, set: (value) => { pendingFontsSyncPayload = value; } },
    "fontsRemoteRequested": { enumerable: true, get: () => fontsRemoteRequested, set: (value) => { fontsRemoteRequested = value; } },
    "EMAILJS_SERVICE_ID_DEFAULT": { enumerable: true, get: () => EMAILJS_SERVICE_ID_DEFAULT, set: (value) => { EMAILJS_SERVICE_ID_DEFAULT = value; } },
    "EMAILJS_TEMPLATE_ID_DEFAULT": { enumerable: true, get: () => EMAILJS_TEMPLATE_ID_DEFAULT, set: (value) => { EMAILJS_TEMPLATE_ID_DEFAULT = value; } },
    "EMAILJS_PUBLIC_KEY_DEFAULT": { enumerable: true, get: () => EMAILJS_PUBLIC_KEY_DEFAULT, set: (value) => { EMAILJS_PUBLIC_KEY_DEFAULT = value; } },
    "emailJsClientPromise": { enumerable: true, get: () => emailJsClientPromise, set: (value) => { emailJsClientPromise = value; } },
    "CLOUDINARY_CLOUD_NAME": { enumerable: true, get: () => CLOUDINARY_CLOUD_NAME, set: (value) => { CLOUDINARY_CLOUD_NAME = value; } },
    "CLOUDINARY_UPLOAD_PRESET": { enumerable: true, get: () => CLOUDINARY_UPLOAD_PRESET, set: (value) => { CLOUDINARY_UPLOAD_PRESET = value; } },
    "CLOUDINARY_FOLDER_BASE_DEFAULT": { enumerable: true, get: () => CLOUDINARY_FOLDER_BASE_DEFAULT, set: (value) => { CLOUDINARY_FOLDER_BASE_DEFAULT = value; } },
    "PRINT_SETTINGS_STORAGE_KEY": { enumerable: true, get: () => PRINT_SETTINGS_STORAGE_KEY, set: (value) => { PRINT_SETTINGS_STORAGE_KEY = value; } },
    "DEFAULT_PRINT_SETTINGS": { enumerable: true, get: () => DEFAULT_PRINT_SETTINGS, set: (value) => { DEFAULT_PRINT_SETTINGS = value; } },
    "paypalPrintSdkPromise": { enumerable: true, get: () => paypalPrintSdkPromise, set: (value) => { paypalPrintSdkPromise = value; } },
    "SPOT_MASK": { enumerable: true, get: () => SPOT_MASK, set: (value) => { SPOT_MASK = value; } },
    "customArtworkLoadTimer": { enumerable: true, get: () => customArtworkLoadTimer, set: (value) => { customArtworkLoadTimer = value; } },
    "welcomeArtworkLoadId": { enumerable: true, get: () => welcomeArtworkLoadId, set: (value) => { welcomeArtworkLoadId = value; } },
    "COUNTDOWN_SCALE_KEY": { enumerable: true, get: () => COUNTDOWN_SCALE_KEY, set: (value) => { COUNTDOWN_SCALE_KEY = value; } },
    "pendingFinalPrintImageUrl": { enumerable: true, get: () => pendingFinalPrintImageUrl, set: (value) => { pendingFinalPrintImageUrl = value; } },
    "finalPrintPriceRequestId": { enumerable: true, get: () => finalPrintPriceRequestId, set: (value) => { finalPrintPriceRequestId = value; } },
    "EVENTS_STORAGE_KEY": { enumerable: true, get: () => EVENTS_STORAGE_KEY, set: (value) => { EVENTS_STORAGE_KEY = value; } },
    "ACTIVE_EVENT_KEY": { enumerable: true, get: () => ACTIVE_EVENT_KEY, set: (value) => { ACTIVE_EVENT_KEY = value; } },
    "WEDDING_THEME_ASSETS": { enumerable: true, get: () => WEDDING_THEME_ASSETS, set: (value) => { WEDDING_THEME_ASSETS = value; } },
    "OFFLINE_DB_NAME": { enumerable: true, get: () => OFFLINE_DB_NAME, set: (value) => { OFFLINE_DB_NAME = value; } },
    "OFFLINE_DB_STORE": { enumerable: true, get: () => OFFLINE_DB_STORE, set: (value) => { OFFLINE_DB_STORE = value; } },
    "offlineQueueDbPromise": { enumerable: true, get: () => offlineQueueDbPromise, set: (value) => { offlineQueueDbPromise = value; } },
    "isFlushingPendingUploads": { enumerable: true, get: () => isFlushingPendingUploads, set: (value) => { isFlushingPendingUploads = value; } },
    "isFlushingPendingGalleryRecords": { enumerable: true, get: () => isFlushingPendingGalleryRecords, set: (value) => { isFlushingPendingGalleryRecords = value; } },
    "pendingQueueWakeLock": { enumerable: true, get: () => pendingQueueWakeLock, set: (value) => { pendingQueueWakeLock = value; } },
    "managedLocalAssetMigrationCache": { enumerable: true, get: () => managedLocalAssetMigrationCache, set: (value) => { managedLocalAssetMigrationCache = value; } },
    "loadedAssetLibraryThemeCategories": { enumerable: true, get: () => loadedAssetLibraryThemeCategories, set: (value) => { loadedAssetLibraryThemeCategories = value; } },
    "THEME_DEFAULTS_GROUP_ORDER": { enumerable: true, get: () => THEME_DEFAULTS_GROUP_ORDER, set: (value) => { THEME_DEFAULTS_GROUP_ORDER = value; } },
    "ASSET_LIBRARY_PAGE_SIZE": { enumerable: true, get: () => ASSET_LIBRARY_PAGE_SIZE, set: (value) => { ASSET_LIBRARY_PAGE_SIZE = value; } },
    "assetLibraryState": { enumerable: true, get: () => assetLibraryState, set: (value) => { assetLibraryState = value; } },
    "MAX_MANAGED_ASSET_UPLOAD_BYTES": { enumerable: true, get: () => MAX_MANAGED_ASSET_UPLOAD_BYTES, set: (value) => { MAX_MANAGED_ASSET_UPLOAD_BYTES = value; } },
    "activeManagedAssetUploads": { enumerable: true, get: () => activeManagedAssetUploads, set: (value) => { activeManagedAssetUploads = value; } },
    "supportedVideoUploadExtensions": { enumerable: true, get: () => supportedVideoUploadExtensions, set: (value) => { supportedVideoUploadExtensions = value; } },
    "supportedVideoUploadTypes": { enumerable: true, get: () => supportedVideoUploadTypes, set: (value) => { supportedVideoUploadTypes = value; } },
    "stringOrEmpty": { enumerable: true, get: () => stringOrEmpty, set: (value) => { stringOrEmpty = value; } },
    "arrayFromMaybeList": { enumerable: true, get: () => arrayFromMaybeList, set: (value) => { arrayFromMaybeList = value; } },
    "hasValues": { enumerable: true, get: () => hasValues, set: (value) => { hasValues = value; } },
    "FONT_FALLBACK_STACK": { enumerable: true, get: () => FONT_FALLBACK_STACK, set: (value) => { FONT_FALLBACK_STACK = value; } },
    "DEFAULT_FONT_PREVIEW": { enumerable: true, get: () => DEFAULT_FONT_PREVIEW, set: (value) => { DEFAULT_FONT_PREVIEW = value; } },
    "fontCatalog": { enumerable: true, get: () => fontCatalog, set: (value) => { fontCatalog = value; } },
    "fontPickerInitialized": { enumerable: true, get: () => fontPickerInitialized, set: (value) => { fontPickerInitialized = value; } },
    "fontPickerSetupPromise": { enumerable: true, get: () => fontPickerSetupPromise, set: (value) => { fontPickerSetupPromise = value; } },
    "ASSET_DEFAULT_REPAIR_VERSION": { enumerable: true, get: () => ASSET_DEFAULT_REPAIR_VERSION, set: (value) => { ASSET_DEFAULT_REPAIR_VERSION = value; } },
    "overlaySvgFixCache": { enumerable: true, get: () => overlaySvgFixCache, set: (value) => { overlaySvgFixCache = value; } },
  });
  context.cloneThemeValue = cloneThemeValue;
  context.createEmptySessionAssets = createEmptySessionAssets;
  context.DOM = DOM;
  return context;
}
