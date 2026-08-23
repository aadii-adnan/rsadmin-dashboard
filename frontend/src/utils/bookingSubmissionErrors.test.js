import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeBookingSubmissionError,
  parseBookingErrorResponse,
} from "./bookingSubmissionErrors.js";

test("normalizes Django field errors separately from summary errors", () => {
  const result = normalizeBookingSubmissionError({
    email: ["Enter a valid email address."],
    car_registration_no: ["This field is required."],
    non_field_errors: ["The collection time must be after drop-off."],
  });

  assert.deepEqual(result.fieldErrors, {
    email: ["Enter a valid email address."],
    car_registration_no: ["This field is required."],
  });
  assert.deepEqual(result.summaryMessages, [
    "The collection time must be after drop-off.",
  ]);
});

test("keeps multiple and nested API errors", () => {
  const result = normalizeBookingSubmissionError({
    add_ons: { 0: ["Invalid add-on."], 1: ["This add-on is unavailable."] },
    detail: "Please review the booking",
  });

  assert.deepEqual(result.fieldErrors, {});
  assert.deepEqual(result.summaryMessages, [
    "Add-ons: Invalid add-on.",
    "Add-ons: This add-on is unavailable.",
    "Please review the booking.",
  ]);
});

test("turns coupon failures into actionable guidance", () => {
  const result = normalizeBookingSubmissionError({
    error: "Coupon has been fully used",
  });

  assert.deepEqual(result.summaryMessages, [
    "This coupon has reached its usage limit. Remove it or apply another coupon, then try again.",
  ]);
});

test("provides network and server fallbacks", () => {
  const networkResult = normalizeBookingSubmissionError(null, {
    networkError: true,
  });
  const serverResult = normalizeBookingSubmissionError(
    { detail: "Upstream connection failed" },
    { status: 503 },
  );

  assert.match(networkResult.summaryMessages[0], /internet connection/i);
  assert.match(serverResult.summaryMessages[0], /temporarily unavailable/i);
});

test("handles non-JSON error responses", async () => {
  const response = {
    status: 502,
    text: async () => "<html>Bad gateway</html>",
  };

  const result = await parseBookingErrorResponse(response);

  assert.deepEqual(result.fieldErrors, {});
  assert.match(result.summaryMessages[0], /temporarily unavailable/i);
});
