// First-touch marketing attribution.
// Captures UTM params / click ids / referrer on the visitor's FIRST arrival
// and persists them so they survive the multi-step booking flow.

const STORAGE_KEY = "firstTouchAttribution";

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
];

/**
 * Capture attribution data on first visit. Write-once: never overwrites an
 * existing record, so the original (first-touch) source is preserved even if
 * the visitor returns later via a different channel.
 */
export function captureAttribution() {
  try {
    if (localStorage.getItem(STORAGE_KEY)) return; // already captured

    const params = new URLSearchParams(window.location.search);
    const data = {};
    UTM_KEYS.forEach((key) => {
      const value = params.get(key);
      if (value) data[key] = value;
    });

    // Only record an external referrer (ignore same-origin navigations)
    const referrer = document.referrer || "";
    if (referrer && !referrer.startsWith(window.location.origin)) {
      data.referrer_url = referrer;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable (private mode / SSR) — attribution is best-effort
  }
}

/**
 * Returns the stored first-touch attribution object (or {} if none).
 */
export function getAttribution() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
