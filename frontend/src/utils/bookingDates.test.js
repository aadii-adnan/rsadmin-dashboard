import test from "node:test";
import assert from "node:assert/strict";
import { DateTime } from "luxon";
import {
  calculateParkingDays,
  updateBookingDateField,
  validateBookingDates,
} from "./bookingDates.js";

const validDates = {
  parkingFromDate: "2026-08-30",
  parkingFromTime: "10:00",
  carCollectionDate: "2026-09-02",
  carCollectionTime: "11:00",
};

test("parking days include both the drop-off and pickup dates", () => {
  assert.equal(calculateParkingDays(validDates), 4);
  assert.equal(calculateParkingDays({
    ...validDates,
    carCollectionDate: validDates.parkingFromDate,
  }), 1);
});

test("moving drop-off after pickup clears the pickup date", () => {
  assert.deepEqual(
    updateBookingDateField(validDates, "parkingFromDate", "2026-09-03"),
    {
      ...validDates,
      parkingFromDate: "2026-09-03",
      carCollectionDate: "",
    },
  );
});

test("validation rejects incomplete and reversed booking periods", () => {
  const now = DateTime.fromISO("2026-08-26T10:00:00", { zone: "Europe/Dublin" });
  assert.match(validateBookingDates({}, 4, now).error, /select both/i);
  assert.match(validateBookingDates({
    ...validDates,
    carCollectionDate: "2026-08-29",
  }, 4, now).error, /after drop-off/i);
});

test("minimum notice is calculated using Dublin local time", () => {
  const now = DateTime.fromISO("2026-07-01T23:30:00Z");
  const tooSoon = {
    parkingFromDate: "2026-07-02",
    parkingFromTime: "04:20",
    carCollectionDate: "2026-07-03",
    carCollectionTime: "10:00",
  };
  const onBoundary = {
    ...tooSoon,
    parkingFromTime: "04:30",
  };

  assert.match(validateBookingDates(tooSoon, 4, now).error, /at least 4 hours/i);
  assert.deepEqual(validateBookingDates(onBoundary, 4, now), {
    error: "",
    noOfDays: 2,
  });
});
