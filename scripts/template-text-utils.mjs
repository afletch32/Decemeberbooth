function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeKey(value) {
  return (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function buildTemplateTextMap(event = {}) {
  const partner1 = cleanText(event.partner1);
  const partner2 = cleanText(event.partner2);
  const birthdayName = cleanText(event.birthdayName);
  const expoCompany = cleanText(event.expoCompany);
  const eventName = cleanText(event.name);
  const eventDate = cleanText(event.date);
  const coupleNames =
    partner1 && partner2 ? `${partner1} & ${partner2}` : partner1 || partner2;

  return {
    partner1,
    partner2,
    birthday_name: birthdayName,
    expo_company: expoCompany,
    event_name: eventName,
    event_date: eventDate,
    couple_names: coupleNames,
  };
}

export function resolveTemplateTextValue(key, event = {}) {
  const normalized = normalizeKey(key);
  const values = buildTemplateTextMap(event);
  const aliases = {
    birthdayname: "birthday_name",
    birthday_name: "birthday_name",
    expocompany: "expo_company",
    expo_company: "expo_company",
    eventname: "event_name",
    event_name: "event_name",
    eventdate: "event_date",
    event_date: "event_date",
    couplenames: "couple_names",
    couple_names: "couple_names",
  };
  const resolvedKey = aliases[normalized] || normalized;
  return values[resolvedKey] || "";
}

export function normalizeTemplateTextField(field = {}) {
  if (!field || typeof field !== "object") return null;
  const key = cleanText(field.key || field.token || field.source);
  if (!key) return null;

  const x = toFiniteNumber(field.x);
  const y = toFiniteNumber(field.y);
  const w = toFiniteNumber(field.w || field.width);
  const h = toFiniteNumber(field.h || field.height);
  const xPct = toFiniteNumber(field.xPct || field.x_pct);
  const yPct = toFiniteNumber(field.yPct || field.y_pct);
  const wPct = toFiniteNumber(field.wPct || field.w_pct || field.widthPct);
  const hPct = toFiniteNumber(field.hPct || field.h_pct || field.heightPct);
  const hasAbsoluteRect = x !== null && y !== null && w !== null && h !== null;
  const hasRelativeRect =
    xPct !== null && yPct !== null && wPct !== null && hPct !== null;
  if (!hasAbsoluteRect && !hasRelativeRect) return null;

  return {
    key: normalizeKey(key),
    x,
    y,
    w,
    h,
    xPct,
    yPct,
    wPct,
    hPct,
    fontFamily: cleanText(field.fontFamily),
    fontWeight: cleanText(field.fontWeight) || "600",
    fontSize: toFiniteNumber(field.fontSize || field.size),
    minFontSize: toFiniteNumber(field.minFontSize || field.minSize),
    lineHeight: toFiniteNumber(field.lineHeight),
    color: cleanText(field.color),
    align: normalizeKey(field.align) || "center",
    uppercase: field.uppercase === true,
  };
}

export function normalizeTemplateTextFields(fields = []) {
  if (!Array.isArray(fields)) return [];
  return fields.map((field) => normalizeTemplateTextField(field)).filter(Boolean);
}

export function resolveTemplateTextRect(field, width, height) {
  if (!field || !width || !height) return null;
  const normalized = normalizeTemplateTextField(field);
  if (!normalized) return null;
  if (
    normalized.x !== null &&
    normalized.y !== null &&
    normalized.w !== null &&
    normalized.h !== null
  ) {
    return {
      x: normalized.x,
      y: normalized.y,
      w: normalized.w,
      h: normalized.h,
    };
  }
  if (
    normalized.xPct === null ||
    normalized.yPct === null ||
    normalized.wPct === null ||
    normalized.hPct === null
  ) {
    return null;
  }
  return {
    x: Math.round(normalized.xPct * width),
    y: Math.round(normalized.yPct * height),
    w: Math.round(normalized.wPct * width),
    h: Math.round(normalized.hPct * height),
  };
}

export function validateCreatePathEventDetails(style, details = {}) {
  const normalizedStyle = normalizeKey(style);
  const partner1 = cleanText(details.partner1);
  const partner2 = cleanText(details.partner2);
  const birthdayName = cleanText(details.birthdayName);
  const date = cleanText(details.date);

  if (normalizedStyle === "wedding") {
    if (!partner1 || !partner2) {
      return {
        ok: false,
        message: "Enter both partner names for a wedding event.",
      };
    }
    if (!date) {
      return {
        ok: false,
        message: "Enter the wedding date.",
      };
    }
  }

  if (normalizedStyle === "birthday") {
    if (!birthdayName) {
      return {
        ok: false,
        message: "Enter the birthday name.",
      };
    }
    if (!date) {
      return {
        ok: false,
        message: "Enter the birthday date.",
      };
    }
  }

  return { ok: true, message: "" };
}
