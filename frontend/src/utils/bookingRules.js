// Frontend mirror of backend/bookings/booking_rules.py — used for instant
// validation/UX only. The backend enforces all of these rules server-side.

export const RESCHEDULE_DAY_RATE = 20; // € per extra day when extending
export const RESCHEDULE_MIN_HOURS = 24;
export const NO_REFUND_WINDOW_HOURS = 72;
export const CANCELLATION_FEE = 15;

// Services that forfeit any refund when cancelled within 72h of departure
const CANCEL_72H_SERVICES = [
  "standard meet & greet parking",
  "meet & greet parking",
];

// {allowed, reason, refundEligible}
export const getCancellationPolicy = (booking, now = new Date()) => {
  const statusName = (booking.status?.name || "").toLowerCase();
  if (["cancelled", "completed", "started", "no show", "missed pickup"].includes(statusName)) {
    return {
      allowed: false,
      reason: "This booking can no longer be cancelled.",
      refundEligible: false,
    };
  }

  const departure = new Date(booking.departure_time);
  if (now >= departure) {
    return {
      allowed: false,
      reason: "Bookings can only be cancelled before the departure time.",
      refundEligible: false,
    };
  }

  let refundEligible = true;
  const serviceName = (booking.service_name || "").trim().toLowerCase();
  if (CANCEL_72H_SERVICES.includes(serviceName)) {
    const cutoff = new Date(departure.getTime() - NO_REFUND_WINDOW_HOURS * 60 * 60 * 1000);
    refundEligible = now <= cutoff;
  }

  return { allowed: true, reason: null, refundEligible };
};

// The departure can only be changed until 24h before the current departure
// (and never once the booking has started).
export const isDepartureLocked = (booking, now = new Date()) => {
  const statusName = (booking.status?.name || "").toLowerCase();
  if (["started", "cancelled", "completed", "no show", "missed pickup"].includes(statusName)) return true;
  const cutoff = new Date(
    new Date(booking.departure_time).getTime() - RESCHEDULE_MIN_HOURS * 60 * 60 * 1000
  );
  return now > cutoff;
};

// The return can only be changed until 24h before the current return.
export const isReturnLocked = (booking, now = new Date()) => {
  const statusName = (booking.status?.name || "").toLowerCase();
  if (["cancelled", "completed", "no show", "missed pickup"].includes(statusName)) return true;
  const cutoff = new Date(
    new Date(booking.return_time).getTime() - RESCHEDULE_MIN_HOURS * 60 * 60 * 1000
  );
  return now > cutoff;
};
