const SOUND_CUES = ["tap", "countdown", "flash", "success", "qr", "goodbye"];

export const THEME_SOUND_SLOTS = Object.freeze([
  {
    key: "start",
    label: "Start",
    description: "Guest taps the welcome screen",
    fallbackCue: "tap",
  },
  {
    key: "tap",
    label: "Button Tap",
    description: "Guest chooses an option or starts capture",
    fallbackCue: "tap",
  },
  {
    key: "countdown",
    label: "Countdown",
    description: "Each countdown number",
    fallbackCue: "countdown",
  },
  {
    key: "photoCaptured",
    label: "Photo Captured",
    description: "The finished photo is captured",
    fallbackCue: "success",
  },
  {
    key: "shareReady",
    label: "QR Ready",
    description: "The share QR code is ready",
    fallbackCue: "qr",
  },
  {
    key: "goodbye",
    label: "Thank You",
    description: "The guest finishes the booth flow",
    fallbackCue: "goodbye",
  },
]);

const SUPPORTED_SOUND_EXTENSIONS = new Set([
  "aac",
  "m4a",
  "mp3",
  "oga",
  "ogg",
  "wav",
]);

const SUPPORTED_SOUND_TYPES = new Set([
  "audio/aac",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/x-m4a",
  "audio/x-wav",
]);

export const MAX_THEME_SOUND_BYTES = 10 * 1024 * 1024;

const PROFILES = {
  classic: {
    tap: [[520, 0, 0.07, 0.03, "sine"]],
    countdown: [[660, 0, 0.11, 0.035, "sine"]],
    flash: [[920, 0, 0.15, 0.045, "triangle", 520]],
    success: [
      [660, 0, 0.11, 0.035, "sine"],
      [880, 0.09, 0.16, 0.04, "sine"],
    ],
    qr: [
      [784, 0, 0.1, 0.03, "sine"],
      [1046, 0.08, 0.16, 0.035, "sine"],
    ],
    goodbye: [
      [660, 0, 0.14, 0.03, "sine"],
      [523, 0.12, 0.2, 0.028, "sine"],
    ],
  },
  celebration: {
    tap: [
      [620, 0, 0.055, 0.026, "square"],
      [930, 0.035, 0.075, 0.018, "sine"],
    ],
    countdown: [[760, 0, 0.1, 0.034, "square"]],
    flash: [[1120, 0, 0.13, 0.045, "triangle", 620]],
    success: [
      [660, 0, 0.09, 0.03, "triangle"],
      [880, 0.07, 0.1, 0.034, "triangle"],
      [1100, 0.14, 0.17, 0.038, "triangle"],
    ],
    qr: [
      [880, 0, 0.1, 0.03, "triangle"],
      [1174, 0.08, 0.18, 0.036, "triangle"],
    ],
    goodbye: [
      [1046, 0, 0.13, 0.032, "triangle"],
      [784, 0.1, 0.18, 0.03, "triangle"],
    ],
  },
  elegant: {
    tap: [[523, 0, 0.1, 0.022, "sine"]],
    countdown: [
      [659, 0, 0.12, 0.024, "sine"],
      [988, 0.02, 0.16, 0.012, "sine"],
    ],
    flash: [[980, 0, 0.18, 0.032, "triangle", 440]],
    success: [
      [659, 0, 0.15, 0.022, "sine"],
      [784, 0.11, 0.18, 0.024, "sine"],
      [1046, 0.23, 0.3, 0.026, "sine"],
    ],
    qr: [
      [784, 0, 0.16, 0.022, "sine"],
      [988, 0.12, 0.24, 0.024, "sine"],
    ],
    goodbye: [
      [784, 0, 0.18, 0.022, "sine"],
      [659, 0.15, 0.2, 0.02, "sine"],
      [523, 0.3, 0.26, 0.018, "sine"],
    ],
  },
  modern: {
    tap: [[700, 0, 0.05, 0.027, "triangle"]],
    countdown: [[880, 0, 0.07, 0.03, "square"]],
    flash: [[1280, 0, 0.11, 0.038, "sawtooth", 640]],
    success: [
      [660, 0, 0.07, 0.027, "triangle"],
      [990, 0.06, 0.1, 0.03, "triangle"],
    ],
    qr: [
      [990, 0, 0.07, 0.028, "triangle"],
      [1320, 0.06, 0.12, 0.03, "triangle"],
    ],
    goodbye: [[880, 0, 0.16, 0.026, "triangle", 660]],
  },
  school: {
    tap: [[587, 0, 0.065, 0.029, "square"]],
    countdown: [[784, 0, 0.1, 0.034, "triangle"]],
    flash: [[988, 0, 0.14, 0.043, "triangle", 494]],
    success: [
      [523, 0, 0.085, 0.03, "triangle"],
      [659, 0.07, 0.1, 0.033, "triangle"],
      [784, 0.14, 0.14, 0.036, "triangle"],
    ],
    qr: [
      [784, 0, 0.09, 0.03, "triangle"],
      [1046, 0.07, 0.11, 0.034, "triangle"],
      [1318, 0.14, 0.15, 0.032, "triangle"],
    ],
    goodbye: [
      [784, 0, 0.12, 0.03, "triangle"],
      [659, 0.1, 0.18, 0.028, "triangle"],
    ],
  },
  spooky: {
    tap: [[330, 0, 0.13, 0.026, "sine", 220]],
    countdown: [
      [392, 0, 0.14, 0.03, "sine", 311],
      [196, 0.02, 0.18, 0.018, "triangle", 155],
    ],
    flash: [[130, 0, 0.22, 0.052, "sawtooth", 55]],
    success: [
      [392, 0, 0.13, 0.028, "sine"],
      [466, 0.1, 0.16, 0.03, "sine"],
      [587, 0.22, 0.2, 0.032, "sine"],
    ],
    qr: [
      [587, 0, 0.13, 0.028, "sine"],
      [466, 0.1, 0.2, 0.026, "sine"],
    ],
    goodbye: [
      [392, 0, 0.18, 0.028, "sine", 311],
      [196, 0.15, 0.28, 0.022, "triangle", 130],
    ],
  },
  holiday: {
    tap: [
      [988, 0, 0.08, 0.022, "triangle"],
      [1318, 0.035, 0.11, 0.018, "sine"],
    ],
    countdown: [
      [784, 0, 0.11, 0.026, "triangle"],
      [1174, 0.025, 0.15, 0.016, "sine"],
    ],
    flash: [[1174, 0, 0.15, 0.038, "triangle", 587]],
    success: [
      [784, 0, 0.12, 0.026, "triangle"],
      [988, 0.08, 0.15, 0.029, "triangle"],
      [1318, 0.17, 0.22, 0.032, "triangle"],
    ],
    qr: [
      [988, 0, 0.11, 0.027, "triangle"],
      [1318, 0.08, 0.18, 0.03, "triangle"],
    ],
    goodbye: [
      [988, 0, 0.15, 0.026, "triangle"],
      [784, 0.12, 0.22, 0.024, "triangle"],
      [659, 0.26, 0.26, 0.021, "sine"],
    ],
  },
  romantic: {
    tap: [[587, 0, 0.11, 0.02, "sine"]],
    countdown: [
      [698, 0, 0.13, 0.022, "sine"],
      [880, 0.025, 0.17, 0.012, "sine"],
    ],
    flash: [[880, 0, 0.18, 0.03, "triangle", 440]],
    success: [
      [587, 0, 0.16, 0.021, "sine"],
      [698, 0.12, 0.2, 0.023, "sine"],
      [880, 0.25, 0.28, 0.025, "sine"],
    ],
    qr: [
      [698, 0, 0.17, 0.022, "sine"],
      [880, 0.13, 0.24, 0.024, "sine"],
    ],
    goodbye: [
      [880, 0, 0.18, 0.022, "sine"],
      [698, 0.15, 0.23, 0.02, "sine"],
      [587, 0.31, 0.26, 0.018, "sine"],
    ],
  },
};

function includesAny(value, words) {
  return words.some((word) => value.includes(word));
}

export function resolveThemeSoundProfileName(themeKey = "", theme = {}) {
  const explicit = String(theme?.soundProfileName || "").trim().toLowerCase();
  if (PROFILES[explicit]) return explicit;

  const searchable = [
    themeKey,
    theme?.name,
    theme?.vibeSummary,
    theme?.fontPairingStyle,
    ...(Array.isArray(theme?.eventTypes) ? theme.eventTypes : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (includesAny(searchable, ["valentine", "garden vows", "romantic"])) {
    return "romantic";
  }
  if (includesAny(searchable, ["wedding", "timeless romance"])) {
    return "elegant";
  }
  if (includesAny(searchable, ["halloween", "spooky", "haunt", "graveyard"])) {
    return "spooky";
  }
  if (
    includesAny(searchable, [
      "backtoschool",
      "back to school",
      "school",
      "hawks",
      "stream night",
      "education",
    ])
  ) {
    return "school";
  }
  if (
    includesAny(searchable, [
      "newyear",
      "new year",
      "fourthofjuly",
      "fourth of july",
      "stpatricksday",
      "st. patrick",
    ])
  ) {
    return "celebration";
  }
  if (
    includesAny(searchable, [
      "christmas",
      "winter",
      "santa",
      "holiday",
      "workshop",
    ])
  ) {
    return "holiday";
  }
  if (
    includesAny(searchable, [
      "expo",
      "brand studio",
      "lead capture",
      "corporate",
    ])
  ) {
    return "modern";
  }
  if (
    includesAny(searchable, [
      "birthday",
      "summer",
      "party",
      "carnival",
    ])
  ) {
    return "celebration";
  }
  return "classic";
}

function normalizeTone(tone) {
  const [frequency, delay, duration, gain, type, endFrequency] = tone;
  return {
    frequency,
    delay,
    duration,
    gain,
    type,
    ...(endFrequency ? { endFrequency } : {}),
  };
}

export function getThemeSoundCue(themeKey = "", theme = {}, kind = "tap") {
  const cueKind = SOUND_CUES.includes(kind) ? kind : "tap";
  const profileName = resolveThemeSoundProfileName(themeKey, theme);
  return {
    profileName,
    tones: PROFILES[profileName][cueKind].map(normalizeTone),
  };
}

export function validateThemeSoundFile(file) {
  if (!file) return { valid: false, message: "Choose a sound file first." };
  if (Number(file.size) === 0) {
    return { valid: false, message: "That sound file is empty." };
  }
  if (Number(file.size) > MAX_THEME_SOUND_BYTES) {
    return {
      valid: false,
      message: "Use a sound file smaller than 10 MB.",
    };
  }
  const type = String(file.type || "").trim().toLowerCase();
  const name = String(file.name || "");
  const match = name.match(/\.([a-z0-9]+)$/i);
  const extension = match ? match[1].toLowerCase() : "";
  if (
    !SUPPORTED_SOUND_TYPES.has(type) &&
    !SUPPORTED_SOUND_EXTENSIONS.has(extension)
  ) {
    return {
      valid: false,
      message: "Use an MP3, WAV, M4A, AAC, or OGG sound file.",
    };
  }
  return { valid: true, extension: extension || "mp3" };
}

export const THEME_SOUND_PROFILE_NAMES = Object.freeze(Object.keys(PROFILES));
