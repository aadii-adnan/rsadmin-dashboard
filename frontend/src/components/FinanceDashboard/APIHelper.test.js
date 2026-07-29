import assert from "node:assert/strict";
import test from "node:test";
import { buildFinanceParams } from "./APIHelper.js";

test("finance range filters use the canonical query contract", () => {
  const params = buildFinanceParams({
    periodType: "range",
    startMonth: "2026-04",
    endMonth: "2026-06",
    website: "rsexpressparking",
  });

  assert.deepEqual(Object.fromEntries(params), {
    period_type: "range",
    website: "rsexpressparking",
    start_month: "2026-04",
    end_month: "2026-06",
  });
});

test("year and all-time filters omit irrelevant month parameters", () => {
  const year = Object.fromEntries(buildFinanceParams({
    periodType: "year",
    year: "2025",
    website: "all",
  }));
  const allTime = Object.fromEntries(buildFinanceParams({
    periodType: "all",
    website: "dublinairportparking",
  }));

  assert.deepEqual(year, {
    period_type: "year",
    website: "all",
    year: "2025",
  });
  assert.deepEqual(allTime, {
    period_type: "all",
    website: "dublinairportparking",
  });
});
