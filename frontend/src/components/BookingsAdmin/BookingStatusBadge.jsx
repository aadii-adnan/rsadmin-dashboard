import React from "react";

const STATUS_CLASS = {
  completed: "is-completed",
  confirmed: "is-confirmed",
  cancelled: "is-cancelled",
  "payment failed": "is-cancelled",
  rescheduled: "is-rescheduled",
  pending: "is-pending",
  started: "is-started",
  "no show": "is-no-show",
  "missed pickup": "is-cancelled",
};

export default function BookingStatusBadge({ status }) {
  const normalized = String(status || "").toLowerCase();
  return <span className={`booking-status ${STATUS_CLASS[normalized] || ""}`}>{status || "—"}</span>;
}
