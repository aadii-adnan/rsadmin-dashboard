import test from "node:test";
import assert from "node:assert/strict";
import {
  dateToIsoDate,
  formatIrishDate,
  getDublinTodayIso,
  isIsoDateOnOrAfter,
  isoDateToLocalDate,
  parseIrishDate,
} from "./irishDate.js";

test("Irish dates round-trip without UTC conversion", () => {
  assert.equal(parseIrishDate("09/08/2026"), "2026-08-09");
  assert.equal(formatIrishDate("2026-08-09"), "09/08/2026");
  assert.equal(dateToIsoDate(isoDateToLocalDate("2026-08-09")), "2026-08-09");
});

test("Irish parser rejects impossible and non-Irish dates", () => {
  assert.equal(parseIrishDate("02/29/2026"), "");
  assert.equal(parseIrishDate("31/04/2026"), "");
  assert.equal(parseIrishDate("29/02/2025"), "");
  assert.equal(parseIrishDate("29/02/2024"), "2024-02-29");
});

test("Dublin today follows Dublin midnight and daylight-saving time", () => {
  assert.equal(getDublinTodayIso(new Date("2026-01-01T00:30:00Z")), "2026-01-01");
  assert.equal(getDublinTodayIso(new Date("2026-07-01T23:30:00Z")), "2026-07-02");
});

test("minimum date comparisons use ISO calendar-day ordering", () => {
  assert.equal(isIsoDateOnOrAfter("2026-08-10", "2026-08-10"), true);
  assert.equal(isIsoDateOnOrAfter("2026-08-11", "2026-08-10"), true);
  assert.equal(isIsoDateOnOrAfter("2026-08-09", "2026-08-10"), false);
  assert.equal(isIsoDateOnOrAfter("not-a-date", "2026-08-10"), false);
});
