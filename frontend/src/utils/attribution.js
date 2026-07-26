// First-touch marketing attribution for the current booking journey.
// Captures campaign parameters / click IDs / referrer and persists them so
// they survive the multi-step booking flow.

const STORAGE_KEY = "firstTouchAttribution";

const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "gbraid",
  "wbraid",
  "gad_source",
  "msclkid",
  "fbclid",
  "referrer_url",
];

function normalizeAttribution(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return ATTRIBUTION_KEYS.reduce((data, key) => {
    const rawValue = value[key];
    if (typeof rawValue === "string" && rawValue.trim()) {
      data[key] = rawValue.trim();
    }
    return data;
  }, {});
}

function readStoredAttribution() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};

  try {
    return normalizeAttribution(JSON.parse(raw));
  } catch {
    return {};
  }
}

/**
 * Capture the first meaningful touch for the current booking journey.
 * Empty or malformed legacy records do not block a later tagged visit.
 */
export function captureAttribution() {
  try {
    if (Object.keys(readStoredAttribution()).length > 0) return;

    const params = new URLSearchParams(window.location.search);
    const data = {};
    ATTRIBUTION_KEYS.forEach((key) => {
      if (key === "referrer_url") return;
      const value = params.get(key);
      if (value) data[key] = value;
    });

    // Only record an external referrer (ignore same-origin navigations).
    const referrer = document.referrer || "";
    if (referrer && !referrer.startsWith(window.location.origin)) {
      data.referrer_url = referrer;
    }

    const attribution = normalizeAttribution(data);
    if (Object.keys(attribution).length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
    } else {
      // Remove legacy empty/corrupt values so a future tagged visit can win.
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable (private mode / SSR) - attribution is best-effort.
  }
}

/**
 * Returns the stored first-touch attribution object (or {} if none).
 */
export function getAttribution() {
  try {
    return readStoredAttribution();
  } catch {
    return {};
  }
}

/**
 * End the current journey after a new booking is stored so the next booking
 * can be attributed to its own first meaningful visit.
 */
export function clearAttribution() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable - attribution is best-effort.
  }
}
