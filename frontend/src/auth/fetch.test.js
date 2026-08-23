import assert from "node:assert/strict";
import test from "node:test";

import customFetch, { isUsableToken } from "./fetch.js";

test("recognizes only real stored access tokens", () => {
  assert.equal(isUsableToken(null), false);
  assert.equal(isUsableToken(""), false);
  assert.equal(isUsableToken("null"), false);
  assert.equal(isUsableToken("undefined"), false);
  assert.equal(isUsableToken("header.payload.signature"), true);
});

test("guest requests do not send an Authorization header", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocalStorage = globalThis.localStorage;
  let requestOptions;

  globalThis.localStorage = {
    getItem: () => null,
  };
  globalThis.fetch = async (_url, options) => {
    requestOptions = options;
    return { ok: true, status: 200 };
  };

  try {
    await customFetch("https://example.test/public-booking/", {
      method: "POST",
      body: { car_model: "Defender" },
    });

    assert.equal("Authorization" in requestOptions.headers, false);
    assert.equal(requestOptions.headers["Content-Type"], "application/json");
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.localStorage = originalLocalStorage;
  }
});
