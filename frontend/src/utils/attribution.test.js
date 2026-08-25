import test, { afterEach } from "node:test";
import assert from "node:assert/strict";

import {
  captureAttribution,
  clearAttribution,
  getAttribution,
} from "./attribution.js";

const STORAGE_KEY = "firstTouchAttribution";

class MemoryStorage {
  constructor(initial = {}) {
    this.values = new Map(Object.entries(initial));
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

function installBrowser({ url, referrer = "", storage = new MemoryStorage() }) {
  globalThis.localStorage = storage;
  globalThis.window = {
    location: new URL(url),
    localStorage: storage,
  };
  globalThis.document = { referrer };
  return storage;
}

afterEach(() => {
  delete globalThis.localStorage;
  delete globalThis.window;
  delete globalThis.document;
});

test("a direct visit does not store an empty attribution record", () => {
  const storage = installBrowser({
    url: "https://rsexpressparking.com/",
    storage: new MemoryStorage({ [STORAGE_KEY]: "{}" }),
  });

  captureAttribution();

  assert.equal(storage.getItem(STORAGE_KEY), null);
  assert.deepEqual(getAttribution(), {});
});

test("a tagged visit replaces an empty legacy record", () => {
  const storage = installBrowser({
    url: "https://rsexpressparking.com/?gclid=new-click&utm_source=google&utm_medium=cpc",
    storage: new MemoryStorage({ [STORAGE_KEY]: "{}" }),
  });

  captureAttribution();

  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)), {
    utm_source: "google",
    utm_medium: "cpc",
    gclid: "new-click",
  });
});

test("Google privacy-safe and Microsoft click parameters are captured", () => {
  installBrowser({
    url: "https://rsexpressparking.com/?gbraid=app-click&wbraid=web-click&gad_source=1&msclkid=bing-click",
  });

  captureAttribution();

  assert.deepEqual(getAttribution(), {
    gbraid: "app-click",
    wbraid: "web-click",
    gad_source: "1",
    msclkid: "bing-click",
  });
});

test("an unsupported app referrer is not stored or sent", () => {
  const storage = installBrowser({
    url: "https://rsexpressparking.com/",
    referrer: "android-app://com.google.android.googlequicksearchbox/https/www.google.com",
  });

  captureAttribution();

  assert.equal(storage.getItem(STORAGE_KEY), null);
  assert.deepEqual(getAttribution(), {});
});

test("invalid legacy attribution is discarded without losing valid fields", () => {
  installBrowser({
    url: "https://rsexpressparking.com/",
    storage: new MemoryStorage({
      [STORAGE_KEY]: JSON.stringify({
        gclid: "valid-click",
        utm_campaign: "x".repeat(256),
        referrer_url: "not-a-url",
      }),
    }),
  });

  assert.deepEqual(getAttribution(), { gclid: "valid-click" });
});

test("the first meaningful touch is preserved during a booking journey", () => {
  const original = JSON.stringify({
    utm_source: "facebook",
    utm_medium: "paid_social",
    fbclid: "first-click",
  });
  const storage = installBrowser({
    url: "https://rsexpressparking.com/?gclid=later-click",
    storage: new MemoryStorage({ [STORAGE_KEY]: original }),
  });

  captureAttribution();

  assert.equal(storage.getItem(STORAGE_KEY), original);
});

test("stored attribution is allow-listed before it is sent to the API", () => {
  installBrowser({
    url: "https://rsexpressparking.com/",
    storage: new MemoryStorage({
      [STORAGE_KEY]: JSON.stringify({
        gclid: "valid-click",
        source_channel: "Injected source",
        total_price: "0",
      }),
    }),
  });

  assert.deepEqual(getAttribution(), { gclid: "valid-click" });
});

test("clearing attribution starts a new booking journey", () => {
  const storage = installBrowser({
    url: "https://rsexpressparking.com/?gclid=first-click",
  });
  captureAttribution();

  clearAttribution();

  assert.equal(storage.getItem(STORAGE_KEY), null);
  assert.deepEqual(getAttribution(), {});
});
