import assert from "node:assert/strict";
import test from "node:test";

import {
  getCancellationPolicy,
  isDepartureLocked,
  isReturnLocked,
} from "./bookingRules.js";

const missedPickupBooking = {
  status: { name: "Missed Pickup" },
  service_name: "Meet & Greet Parking",
  departure_time: "2026-08-01T05:00:00Z",
  return_time: "2026-08-08T17:00:00Z",
};

test("missed pickup is treated as a terminal booking status", () => {
  const now = new Date("2026-07-01T00:00:00Z");
  const policy = getCancellationPolicy(missedPickupBooking, now);

  assert.equal(policy.allowed, false);
  assert.equal(policy.refundEligible, false);
  assert.equal(isDepartureLocked(missedPickupBooking, now), true);
  assert.equal(isReturnLocked(missedPickupBooking, now), true);
});
