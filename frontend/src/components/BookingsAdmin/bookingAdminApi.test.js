import assert from "node:assert/strict";
import test from "node:test";
import { buildStaffBookingActionUrl, buildStaffBookingBulkActionUrl, buildStaffBookingCreateUrl, buildStaffBookingDetailUrl, buildStaffBookingsParams } from "./bookingAdminApi.js";

test("buildStaffBookingsParams sends only non-empty server-side filters", () => {
  const params = buildStaffBookingsParams({
    search: "  BK-100  ",
    status: "3",
    departure_date_from: "2026-10-01",
    service: "",
    ordering: "-created_at",
  }, 2);

  assert.deepEqual(Object.fromEntries(params), {
    page: "2",
    search: "BK-100",
    departure_date_from: "2026-10-01",
    status: "3",
    ordering: "-created_at",
  });
});

test("buildStaffBookingDetailUrl keeps the requested identifier in the staff route", () => {
  assert.equal(buildStaffBookingDetailUrl(42), "/bookings/staff/42/");
});

test("buildStaffBookingCreateUrl uses the dedicated staff-create route", () => {
  assert.equal(buildStaffBookingCreateUrl(), "/bookings/staff/create/");
});

test("buildStaffBookingBulkActionUrl keeps bulk actions inside the staff route", () => {
  assert.equal(buildStaffBookingBulkActionUrl("invoice-zip"), "/bookings/staff/bulk/invoice-zip/");
});

test("buildStaffBookingActionUrl creates scoped document and status action paths", () => {
  assert.equal(buildStaffBookingActionUrl(42, "documents/invoice/"), "/bookings/staff/42/documents/invoice/");
  assert.equal(buildStaffBookingActionUrl(42, "actions/status/"), "/bookings/staff/42/actions/status/");
  assert.equal(buildStaffBookingActionUrl(42, "actions/save-and-notify/"), "/bookings/staff/42/actions/save-and-notify/");
});
